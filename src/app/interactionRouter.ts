// src/app/interactionRouter.ts

import type {
  ChatInputCommandInteraction,
  Client,
  Interaction,
} from "discord.js";
import type { VoiceCoordinator } from "../features/voice/application/voiceCoordinator";
import { replyEphemeralSafe } from "../shared/discord/interaction";
import { handlePollCreate } from "../features/poll/commands/poll.command";
import { handleAntibangw } from "../features/antibangw/commands/antibangw.command";
import {
  handleJoinCommand,
  handleLeaveCommand,
  handleSpeakScheduleCommand,
  handleStopScheduleCommand,
} from "../features/voice/commands/voice.command";

/**
 * Set of command names that require a voice coordinator.
 * Used to check if the coordinator is ready before dispatching.
 */
const voiceCommandNames = new Set([
  "join",
  "leave",
  "speak_schedule",
  "stop_schedule",
]);

/**
 * Check if an interaction is a voice command that requires the coordinator.
 * @param interaction - Discord interaction
 * @returns true if it's a voice command interaction
 */
export function isVoiceCommandInteraction(
  interaction: Interaction,
): interaction is ChatInputCommandInteraction {
  return (
    interaction.isChatInputCommand() &&
    voiceCommandNames.has(interaction.commandName)
  );
}

/**
 * Dispatch an interaction to the appropriate command handler.
 * Order: autocomplete → chat input commands → fallback
 * @param client - Discord client
 * @param interaction - The interaction to dispatch
 * @param voiceCoordinator - Voice coordinator (may be null if not ready)
 */
export async function handleInteractionCreate(
  _client: Client,
  interaction: Interaction,
  voiceCoordinator: VoiceCoordinator | null,
): Promise<void> {
  // Handle autocomplete (not used currently, but reserved for future)
  if (interaction.isAutocomplete()) return;

  // Only handle chat input commands
  if (!interaction.isChatInputCommand()) return;

  const cmd = interaction as ChatInputCommandInteraction;

  // /poll create → manual poll creation
  if (cmd.commandName === "poll") {
    const sub = cmd.options.getSubcommand();
    if (sub === "create") return handlePollCreate(cmd);
    return;
  }

  // /antibangw set|unset|status → auto-ban management
  if (cmd.commandName === "antibangw") return handleAntibangw(cmd);

  // Voice commands — require coordinator to be ready
  if (cmd.commandName === "join") {
    if (!voiceCoordinator) {
      await replyEphemeralSafe(cmd, "Voice bot runtime chưa sẵn sàng, vui lòng thử lại sau.");
      return;
    }
    return handleJoinCommand(cmd, voiceCoordinator);
  }

  if (cmd.commandName === "leave") {
    if (!voiceCoordinator) {
      await replyEphemeralSafe(cmd, "Voice bot runtime chưa sẵn sàng, vui lòng thử lại sau.");
      return;
    }
    return handleLeaveCommand(cmd, voiceCoordinator);
  }

  if (cmd.commandName === "speak_schedule") {
    if (!voiceCoordinator) {
      await replyEphemeralSafe(cmd, "Voice bot runtime chưa sẵn sàng, vui lòng thử lại sau.");
      return;
    }
    return handleSpeakScheduleCommand(cmd, voiceCoordinator);
  }

  if (cmd.commandName === "stop_schedule") {
    if (!voiceCoordinator) {
      await replyEphemeralSafe(cmd, "Voice bot runtime chưa sẵn sàng, vui lòng thử lại sau.");
      return;
    }
    return handleStopScheduleCommand(cmd, voiceCoordinator);
  }
}