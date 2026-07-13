// src/features/antibangw/application/autoBanChannelStore.ts

import type { AutoBanChannelState } from "../domain/autoBanChannel";

/**
 * In-memory store mapping guildId → AutoBanChannelState.
 * Not persisted to disk — resets on bot restart.
 * One auto-ban channel per guild.
 */
const active = new Map<string, AutoBanChannelState>();

/**
 * Check if a specific channel in a guild is the auto-ban channel.
 * @param guildId - Discord guild ID
 * @param channelId - Discord channel ID to check
 * @returns true if this channel is the configured auto-ban channel for this guild
 */
export function isAutoBanChannel(guildId: string, channelId: string): boolean {
  const entry = active.get(guildId);
  if (!entry) return false;
  return entry.guildId === guildId && entry.channelId === channelId;
}

/**
 * Set the auto-ban channel for a guild.
 * Overwrites any existing entry for the same guild.
 * @param state - The auto-ban channel state to store
 */
export function setAutoBanChannel(state: AutoBanChannelState): void {
  active.set(state.guildId, state);
}

/**
 * Clear (remove) the auto-ban channel for a guild.
 * @param guildId - Discord guild ID
 */
export function clearAutoBanChannel(guildId: string): void {
  active.delete(guildId);
}

/**
 * Get the current auto-ban channel state for a guild.
 * @param guildId - Discord guild ID
 * @returns The stored state or null if not set
 */
export function getAutoBanChannel(guildId: string): AutoBanChannelState | null {
  return active.get(guildId) ?? null;
}

/**
 * Reset the entire store. Used only in tests.
 */
export function resetAutoBanChannelStoreForTests(): void {
  active.clear();
}