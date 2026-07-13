// src/features/antibangw/domain/autoBanChannel.ts

/**
 * Represents the state of an auto-ban channel for a guild.
 * When set, any non-admin user who sends a message in this channel
 * will have their message deleted and be banned from the server.
 * @property guildId    - Discord guild ID
 * @property channelId  - Discord channel ID to monitor for auto-ban
 * @property enabledAt  - ISO timestamp when auto-ban was enabled
 */
export interface AutoBanChannelState {
  guildId: string;
  channelId: string;
  enabledAt: string;
}