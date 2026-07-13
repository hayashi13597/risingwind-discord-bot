// src/app/discordClient.ts

import { Client, GatewayIntentBits } from "discord.js";

/**
 * Create a Discord Client with the required intent flags.
 * Intents needed:
 * - Guilds: basic guild events (commands, interactions)
 * - GuildMessages: message events for auto-ban
 * - GuildMessagePolls: poll vote events (for future use)
 * - MessageContent: reading message content (for auto-ban check)
 * - GuildVoiceStates: voice state changes (for audio join/leave)
 * @returns A new Discord Client instance
 */
export function createDiscordClient(): Client {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessagePolls,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });
}