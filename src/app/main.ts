// src/app/main.ts

import "dotenv/config";
import type { ChatInputCommandInteraction } from "discord.js";
import { validateConfig } from "../shared/config";
import type { VoiceCoordinator } from "../features/voice/application/voiceCoordinator";
import { replyEphemeralSafe } from "../shared/discord/interaction";
import { createBotClients } from "./lifecycle/createClients";
import { createReadyVoiceCoordinator } from "./lifecycle/createVoiceCoordinator";
import { registerSchedulers } from "./lifecycle/registerSchedulers";
import { createEnabledModules } from "./modules";
import { registerCommands } from "./registry/commandRegistry";
import { handleInteractionCreate } from "./registry/interactionRouter";
import { handleMessageCreate } from "./registry/messageRouter";

// Validate env before anything else
validateConfig();

/**
 * Create two Discord clients — primary and secondary.
 * Primary: handles all interactions, polls, auto-ban, notifications.
 * Secondary: joins as second voice bot for audio.
 */
const { primaryClient: client, secondaryClient } = createBotClients();

/**
 * Voice coordinator — manages primary + secondary audio runtimes.
 * Initialized after both clients are ready (clientReady events).
 */
let voiceCoordinator: VoiceCoordinator | null = null;

const context = {
  primaryClient: client,
  secondaryClient,
};

let modules = createEnabledModules({
  getVoiceCoordinator: () => voiceCoordinator,
});

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
  modules = createEnabledModules({
    getVoiceCoordinator: () => voiceCoordinator,
  });
  registerCommands(client, modules)
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
    voiceCoordinator = createReadyVoiceCoordinator(client, secondaryClient);
  }

  syncCommandsWhenCoordinatorReady();
}

// ─── Primary client ready ──────────────────────────────────
client.once("clientReady", async () => {
  console.info(`Logged in as ${client.user?.tag} (ID: ${client.user?.id})`);
  tryInitVoiceCoordinator();

  for (const module of modules) {
    await module.onPrimaryReady?.(context);
  }
  registerSchedulers(context, modules);
});

// ─── Secondary client ready ─────────────────────────────────
secondaryClient.once("clientReady", async () => {
  console.info(
    `Logged in secondary bot as ${secondaryClient.user?.tag} (ID: ${secondaryClient.user?.id})`,
  );
  for (const module of modules) {
    await module.onSecondaryReady?.(context);
  }
  tryInitVoiceCoordinator();
});

// ─── Message handling ──────────────────────────────────────
client.on("messageCreate", async (message) => {
  await handleMessageCreate(message, context, modules);
});

// ─── Interaction handling (slash commands) ─────────────────
client.on("interactionCreate", async (interaction) => {
  try {
    await handleInteractionCreate(interaction, modules);
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
