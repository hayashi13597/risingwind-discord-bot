// src/shared/types/command.ts

/**
 * Minimal type for slash command builders.
 * SlashCommandBuilder from discord.js satisfies this via toJSON().
 */
export type SlashCommandData = {
  toJSON(): unknown;
};