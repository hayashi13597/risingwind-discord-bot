import { REST, Routes, type Client } from "discord.js";
import { DISCORD_TOKEN } from "../../shared/config";
import type { BotModule } from "../types/botModule";

export function buildCommandData(modules: BotModule[]): unknown[] {
  return modules.flatMap((module) =>
    (module.commands ?? []).map((command) => command.data.toJSON()),
  );
}

export async function registerCommands(
  client: Client,
  modules: BotModule[],
): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  const commandData = buildCommandData(modules);

  const appId = client.application?.id;
  if (!appId) {
    throw new Error("Cannot register commands: application ID not available yet.");
  }

  const synced = await rest.put(Routes.applicationCommands(appId), {
    body: commandData,
  });
  console.info(`Synced ${(synced as unknown[]).length} slash command(s)`);
}
