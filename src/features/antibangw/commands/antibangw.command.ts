// src/features/antibangw/commands/antibangw.command.ts

import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { SlashCommandData } from "../../../shared/types/command";
import { replyEphemeralSafe } from "../../../shared/discord/interaction";
import { ensureManageGuildAccess } from "../../../shared/discord/permission";
import {
  getAutoBanChannel,
  setAutoBanChannel,
  clearAutoBanChannel,
} from "../application/autoBanChannelStore";

/**
 * Slash command definition for /antibangw.
 * Subcommands:
 * - set: Set current channel as auto-ban target
 * - unset: Disable auto-ban for this guild
 * - status: Show current auto-ban settings
 *
 * Requires Manage Server permission (setDefaultMemberPermissions(0)).
 */
export const antibangwCommand: SlashCommandData = new SlashCommandBuilder()
  .setName("antibangw")
  .setDescription("Quản lý auto-ban channel")
  .setDefaultMemberPermissions(0)
  .addSubcommand((s) =>
    s.setName("set").setDescription("Đặt channel hiện tại làm auto-ban target"),
  )
  .addSubcommand((s) =>
    s.setName("unset").setDescription("Tắt auto-ban channel"),
  )
  .addSubcommand((s) =>
    s.setName("status").setDescription("Xem cấu hình auto-ban hiện tại"),
  );

/**
 * Handle /antibangw command — dispatches to subcommand handlers.
 * All subcommands require Manage Server permission.
 * @param interaction - The chat input command interaction
 */
export async function handleAntibangw(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!(await ensureManageGuildAccess(interaction))) return;

  const sub = interaction.options.getSubcommand();

  // Subcommand: set — mark current channel as auto-ban target
  if (sub === "set") {
    if (!interaction.channel || !interaction.guild) {
      await replyEphemeralSafe(
        interaction,
        "This command can only be used in a server channel.",
      );
      return;
    }

    setAutoBanChannel({
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      enabledAt: new Date().toISOString(),
    });
    await replyEphemeralSafe(
      interaction,
      `Auto-ban channel set to <#${interaction.channel.id}>`,
    );
    return;
  }

  // Subcommand: unset — remove auto-ban for this guild
  if (sub === "unset") {
    if (!interaction.guild) {
      await replyEphemeralSafe(
        interaction,
        "This command can only be used in a server.",
      );
      return;
    }

    clearAutoBanChannel(interaction.guild.id);
    await replyEphemeralSafe(interaction, "Auto-ban channel disabled.");
    return;
  }

  // Subcommand: status — show current auto-ban settings
  const current = getAutoBanChannel(interaction.guild!.id);
  if (!current) {
    await replyEphemeralSafe(interaction, "No auto-ban channel configured.");
    return;
  }

  await replyEphemeralSafe(
    interaction,
    `Auto-ban channel: <#${current.channelId}>`,
  );
}