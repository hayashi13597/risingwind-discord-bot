// src/features/poll/domain/pollTypes.ts

/**
 * Represents the persisted state of the current poll week.
 * Stored as JSON in data/poll-state/current-week.json.
 * Used to:
 * - Prevent duplicate poll creation for the same week
 * - Detect expired polls for cleanup
 * @property weekKey          - Unique key for this week (YYYY-MM-DD)
 * @property channelId        - Discord channel ID where polls were posted
 * @property saturdayMessageId - Discord message ID of the Saturday poll
 * @property sundayMessageId   - Discord message ID of the Sunday poll
 * @property expiresAt        - ISO timestamp when poll expires (Sunday 23:59)
 */
export interface PollState {
  weekKey: string;
  channelId: string;
  saturdayMessageId: string;
  sundayMessageId: string;
  expiresAt: string;
}