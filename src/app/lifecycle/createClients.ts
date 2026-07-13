import type { Client } from "discord.js";
import { createDiscordClient } from "../discordClient";

export type BotClients = {
  primaryClient: Client;
  secondaryClient: Client;
};

export function createBotClients(): BotClients {
  return {
    primaryClient: createDiscordClient(),
    secondaryClient: createDiscordClient(),
  };
}
