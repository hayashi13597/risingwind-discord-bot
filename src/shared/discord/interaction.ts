// src/shared/discord/interaction.ts

import { ChatInputCommandInteraction, DiscordAPIError, MessageFlags } from "discord.js";

/**
 * Check if a Discord API error is "interaction already acknowledged" (code 40060).
 * This happens when we try to reply/defer twice on the same interaction.
 * @param err - Unknown error from try/catch
 * @returns true if the error is a duplicate acknowledgement error
 */
function isAlreadyAcknowledgedError(err: unknown): boolean {
  if (err instanceof DiscordAPIError) return err.code === 40060;
  if (!err || typeof err !== "object") return false;
  return "code" in err && (err as { code?: unknown }).code === 40060;
}

/**
 * Safely reply to an interaction with an ephemeral message.
 * Handles three cases:
 * 1. Not yet replied → interaction.reply()
 * 2. Already replied/deferred → interaction.followUp()
 * 3. Already acknowledged (code 40060) → silently skip (log warning)
 * @param interaction - The chat input command interaction
 * @param content - Text content for the ephemeral message
 */
export async function replyEphemeralSafe(
  interaction: ChatInputCommandInteraction,
  content: string,
): Promise<void> {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
  } catch (err) {
    if (isAlreadyAcknowledgedError(err)) {
      console.warn(
        "Skipped duplicate interaction response for command",
        interaction.commandName,
      );
      return;
    }
    throw err;
  }
}