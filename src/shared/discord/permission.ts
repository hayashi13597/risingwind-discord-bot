// src/shared/discord/permission.ts

import {
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  PermissionsBitField,
} from "discord.js";

/**
 * Check if the interaction caller has Manage Server or Administrator permission.
 * Checks memberPermissions first (from interaction cache), then falls back to
 * fetching the member from the guild for accuracy.
 * @param interaction - The chat input command interaction
 * @returns true if the user has ManageGuild or Administrator permission
 */
export async function hasManageGuildAccess(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  if (!interaction.guild) return false;
  const perms = interaction.memberPermissions;
  if (
    perms?.has(PermissionsBitField.Flags.ManageGuild) ||
    perms?.has(PermissionsBitField.Flags.Administrator)
  ) {
    return true;
  }
  let member: GuildMember | null = null;
  try {
    member = await interaction.guild.members.fetch(interaction.user.id);
  } catch {
    return false;
  }
  return (
    member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
    member.permissions.has(PermissionsBitField.Flags.Administrator)
  );
}

/**
 * Ensure the caller has Manage Server permission.
 * If not, replies with an ephemeral error message and returns false.
 * Use as a guard at the start of admin-only command handlers.
 * @param interaction - The chat input command interaction
 * @returns true if access is allowed, false if denied (already replied)
 */
export async function ensureManageGuildAccess(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  if (!interaction.guild) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }
  if (!(await hasManageGuildAccess(interaction))) {
    await interaction.reply({
      content: "Bạn cần quyền `Manage Server` để dùng lệnh này.",
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }
  return true;
}