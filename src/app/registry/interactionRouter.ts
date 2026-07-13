import type { ChatInputCommandInteraction, Interaction } from "discord.js";
import { replyEphemeralSafe } from "../../shared/discord/interaction";
import type { BotModule, CommandDefinition } from "../types/botModule";

function getCommands(modules: BotModule[]): CommandDefinition[] {
  return modules.flatMap((module) => module.commands ?? []);
}

function findCommand(
  modules: BotModule[],
  name: string,
): CommandDefinition | undefined {
  return getCommands(modules).find((command) => command.name === name);
}

export function isModuleCommandInteraction(
  interaction: Interaction,
  modules: BotModule[],
): interaction is ChatInputCommandInteraction {
  return (
    interaction.isChatInputCommand() &&
    findCommand(modules, interaction.commandName) !== undefined
  );
}

export async function handleInteractionCreate(
  interaction: Interaction,
  modules: BotModule[],
): Promise<void> {
  if (interaction.isAutocomplete()) return;
  if (!interaction.isChatInputCommand()) return;

  const command = findCommand(modules, interaction.commandName);
  if (!command) return;

  if (command.requiresReady && !command.requiresReady()) {
    await replyEphemeralSafe(
      interaction,
      command.notReadyMessage ?? "Command runtime chưa sẵn sàng, vui lòng thử lại sau.",
    );
    return;
  }

  await command.handle(interaction);
}
