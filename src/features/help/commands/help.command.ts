// src/features/help/commands/help.command.ts

import { SlashCommandBuilder } from "discord.js";
import type { SlashCommandData } from "../../../shared/types/command";
import type { BotModule } from "../../../app/types/botModule";

/**
 * Extract { name, description, subcommands } from a SlashCommandData JSON.
 * Subcommands are options with type === 1 (SUB_COMMAND).
 */
type SubcommandInfo = { name: string; description: string };
type CommandInfo = {
  name: string;
  description: string;
  subcommands: SubcommandInfo[];
};

function extractCommandInfo(data: SlashCommandData): CommandInfo {
  const json = data.toJSON() as {
    name: string;
    description: string;
    options?: Array<{ type: number; name: string; description: string }>;
  };

  const subcommands: SubcommandInfo[] = (json.options ?? [])
    .filter((opt) => opt.type === 1) // ApplicationCommandOptionType.Subcommand
    .map((opt) => ({ name: opt.name, description: opt.description }));

  return {
    name: json.name,
    description: json.description,
    subcommands,
  };
}

/**
 * Build the /help reply text from all registered modules.
 * Iterates modules → commands → subcommands, formatting as:
 *
 *   📖 Danh sách lệnh
 *
 *   /poll — Tạo poll vote GVG cho T7 và CN
 *     create — Tạo poll GVG cho tuần hiện tại
 *
 *   /join — Cho bot tham gia voice channel
 *
 * Modules without commands are skipped.
 */
export function formatHelpText(modules: BotModule[]): string {
  const lines: string[] = ["📖 Danh sách lệnh", ""];

  for (const mod of modules) {
    if (!mod.commands || mod.commands.length === 0) continue;

    for (const cmd of mod.commands) {
      const info = extractCommandInfo(cmd.data);
      lines.push(`**/${info.name}** — ${info.description}`);

      for (const sub of info.subcommands) {
        lines.push(`  • ${sub.name} — ${sub.description}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n").trimEnd();
}

/**
 * Slash command definition for /help.
 */
export const helpCommand: SlashCommandData = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Hiển thị danh sách tất cả lệnh");
