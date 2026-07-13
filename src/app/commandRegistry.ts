// src/app/commandRegistry.ts

import {
  REST,
  Routes,
  type APIApplicationCommandOptionChoice,
  type Client,
} from "discord.js";
import { DISCORD_TOKEN } from "../shared/config";
import { pollCommand } from "../features/poll/commands/poll.command";
import { antibangwCommand } from "../features/antibangw/commands/antibangw.command";
import {
  createJoinCommand,
  createLeaveCommand,
  speakScheduleCommand,
  stopScheduleCommand,
} from "../features/voice/commands/voice.command";
import type { SlashCommandData } from "../shared/types/command";

/**
 * Build the array of slash command JSON data for registration.
 * @param voiceBotChoices - Choices for the /join and /leave "bot" option
 * @returns Array of command JSON objects
 */
export function buildCommandData(
  voiceBotChoices: APIApplicationCommandOptionChoice<string>[],
): unknown[] {
  return [
    pollCommand.toJSON(),
    antibangwCommand.toJSON(),
    createJoinCommand(voiceBotChoices).toJSON(),
    createLeaveCommand(voiceBotChoices).toJSON(),
    speakScheduleCommand.toJSON(),
    stopScheduleCommand.toJSON(),
  ];
}

/**
 * Register all slash commands with Discord via the REST API.
 * Uses applicationCommands endpoint (global commands, available in all guilds).
 * @param client - Discord client (provides application ID)
 * @param voiceBotChoices - Bot choices for voice command options
 */
export async function registerCommands(
  client: Client,
  voiceBotChoices: APIApplicationCommandOptionChoice<string>[],
): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

  const commandData = buildCommandData(voiceBotChoices);

  const appId = client.application?.id;
  if (!appId) {
    throw new Error("Cannot register commands: application ID not available yet.");
  }

  const synced = await rest.put(Routes.applicationCommands(appId), {
    body: commandData,
  });
  console.info(`Synced ${(synced as unknown[]).length} slash command(s)`);
}