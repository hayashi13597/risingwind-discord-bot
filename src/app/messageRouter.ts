// src/app/messageRouter.ts

import type { Client, Message } from "discord.js";
import { isAutoBanChannel } from "../features/antibangw/application/autoBanChannelStore";

/**
 * Check if a message should trigger auto-ban.
 *
 * Auto-ban logic:
 * 1. Skip if the author is a bot
 * 2. Skip if not in a guild
 * 3. Skip if the channel is not the guild's auto-ban channel
 * 4. Skip if the author has Administrator or ManageGuild permission
 * 5. Otherwise: delete the message and ban the author (deleteMessageSeconds: 60)
 *
 * @param client - Discord client (unused but kept for future extensibility)
 * @param message - The incoming message to check
 * @returns true if auto-ban was triggered (message handled), false otherwise
 */
export async function tryHandleAutoBanChannel(
  _client: Client,
  message: Message,
): Promise<boolean> {
  // Skip bot messages
  if (message.author.bot) return false;

  // Only works in guilds (not DMs)
  if (!message.guild) return false;

  // Check if this channel is the guild's auto-ban channel
  if (!isAutoBanChannel(message.guild.id, message.channel.id)) return false;

  // Skip admins and server managers — they can speak freely
  try {
    const member =
      message.member ??
      (await message.guild.members.fetch(message.author.id));
    if (
      member?.permissions?.has("Administrator") ||
      member?.permissions?.has("ManageGuild")
    ) {
      return false;
    }
  } catch {
    // If we can't fetch the member, proceed with ban (safer)
  }

  // Ban the author and delete their message
  try {
    await message.delete();
    await message.guild.members.ban(message.author.id, {
      deleteMessageSeconds: 60,
    });
    return true;
  } catch (err) {
    console.error("Auto-ban failed", err);
    return true; // Still treat as handled to prevent further processing
  }
}

/**
 * Handle messageCreate event.
 * Currently only processes auto-ban channel messages.
 * @param client - Discord client
 * @param message - The incoming message
 * @returns true if handled, false otherwise
 */
export async function handleMessageCreate(
  client: Client,
  message: Message,
): Promise<boolean> {
  return tryHandleAutoBanChannel(client, message);
}