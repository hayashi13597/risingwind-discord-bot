// src/app/main.ts

import "dotenv/config";
import cron from "node-cron";
import type { ChatInputCommandInteraction } from "discord.js";
import { validateConfig } from "../shared/config";
import { POLL_CRON_EXPRESSION } from "../features/poll/application/pollScheduler";
import { setSchedulerClient } from "../features/poll/application/pollScheduler";
import { createPollsIfMissing } from "../features/poll/application/pollScheduler";
import {
  setClient,
  runScheduledPing,
} from "../features/notifications/application/pingService";
import {
  createSpeakingScheduleRuntime,
} from "../features/voice/application/speakingSchedule";
import {
  createVoiceCoordinator,
  type VoiceCoordinator,
} from "../features/voice/application/voiceCoordinator";
import { replyEphemeralSafe } from "../shared/discord/interaction";
import { registerCommands } from "./commandRegistry";
import { createDiscordClient } from "./discordClient";
import {
  handleInteractionCreate,
  isVoiceCommandInteraction,
} from "./interactionRouter";
import { handleMessageCreate } from "./messageRouter";

// Validate env before anything else
validateConfig();

/**
 * Create two Discord clients — primary and secondary.
 * Primary: handles all interactions, polls, auto-ban, notifications.
 * Secondary: joins as second voice bot for audio.
 */
const client = createDiscordClient();
const secondaryClient = createDiscordClient();

/**
 * Voice coordinator — manages primary + secondary audio runtimes.
 * Initialized after both clients are ready (clientReady events).
 */
let voiceCoordinator: VoiceCoordinator | null = null;

/** Whether slash commands have been successfully registered. */
let commandsRegistered = false;
/** Whether command registration is currently in progress. */
let registeringCommands = false;
/** Retry timer if registration fails. */
let commandRegistrationRetry: NodeJS.Timeout | null = null;
const COMMAND_REGISTRATION_RETRY_DELAY_MS = 30_000;

/**
 * Attempt to register slash commands once the voice coordinator is ready.
 * Retries on failure after a 30-second delay.
 * Bot choices come from the coordinator (primary/secondary display names).
 */
function syncCommandsWhenCoordinatorReady(): void {
  if (!voiceCoordinator || commandsRegistered || registeringCommands) return;

  registeringCommands = true;
  registerCommands(client, voiceCoordinator.getBotChoices())
    .then(() => {
      commandsRegistered = true;
      if (commandRegistrationRetry) {
        clearTimeout(commandRegistrationRetry);
        commandRegistrationRetry = null;
      }
    })
    .catch((err) => {
      console.error("Failed to register slash commands", err);
      if (!commandsRegistered && !commandRegistrationRetry) {
        commandRegistrationRetry = setTimeout(() => {
          commandRegistrationRetry = null;
          syncCommandsWhenCoordinatorReady();
        }, COMMAND_REGISTRATION_RETRY_DELAY_MS);
      }
    })
    .finally(() => {
      registeringCommands = false;
    });
}

/**
 * Initialize the voice coordinator once both clients are ready.
 * Creates two runtimes (primary + secondary) and passes them to the coordinator.
 */
function tryInitVoiceCoordinator(): void {
  if (!client.user || !secondaryClient.user) return;

  if (!voiceCoordinator) {
    voiceCoordinator = createVoiceCoordinator([
      {
        key: "primary",
        label: client.user.displayName ?? client.user.username,
        runtime: createSpeakingScheduleRuntime(),
        client,
      },
      {
        key: "secondary",
        label: secondaryClient.user.displayName ?? secondaryClient.user.username,
        runtime: createSpeakingScheduleRuntime(),
        client: secondaryClient,
      },
    ]);
  }

  syncCommandsWhenCoordinatorReady();
}

// ─── Primary client ready ──────────────────────────────────
client.once("clientReady", async () => {
  console.info(`Logged in as ${client.user?.tag} (ID: ${client.user?.id})`);
  tryInitVoiceCoordinator();

  // Set the Discord client for notification ping service
  setClient(client);

  // Set the Discord client for poll auto-scheduler
  setSchedulerClient(client);

  // Schedule auto poll creation via cron
  cron.schedule(POLL_CRON_EXPRESSION, () => {
    createPollsIfMissing().catch((err) =>
      console.error("Auto poll creation error", err),
    );
  });

  // Schedule notification ping check every minute
  cron.schedule("* * * * *", () => {
    runScheduledPing().catch((err) =>
      console.error("Scheduled ping error", err),
    );
  });
});

// ─── Secondary client ready ─────────────────────────────────
secondaryClient.once("clientReady", () => {
  console.info(
    `Logged in secondary bot as ${secondaryClient.user?.tag} (ID: ${secondaryClient.user?.id})`,
  );
  tryInitVoiceCoordinator();
});

// ─── Message handling (auto-ban) ───────────────────────────
client.on("messageCreate", async (message) => {
  await handleMessageCreate(client, message);
});

// ─── Interaction handling (slash commands) ─────────────────
client.on("interactionCreate", async (interaction) => {
  try {
    // If voice command but coordinator not ready, warn user
    if (!voiceCoordinator && isVoiceCommandInteraction(interaction)) {
      await replyEphemeralSafe(
        interaction as ChatInputCommandInteraction,
        "Voice bot runtime chưa sẵn sàng, vui lòng thử lại sau.",
      );
      return;
    }

    await handleInteractionCreate(client, interaction, voiceCoordinator);
  } catch (err) {
    console.error("Error handling interaction", err);
    const msg = "Có lỗi xảy ra khi xử lý lệnh này.";
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    await replyEphemeralSafe(cmd, msg).catch(() => {});
  }
});

// ─── Login both clients ────────────────────────────────────
client.login(process.env.DISCORD_TOKEN!).catch((err) => {
  console.error("Failed to login to Discord", err);
  process.exit(1);
});

secondaryClient.login(process.env.DISCORD_TOKEN_2!).catch((err) => {
  console.error("Failed to login secondary Discord bot", err);
  process.exit(1);
});