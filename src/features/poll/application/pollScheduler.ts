// src/features/poll/application/pollScheduler.ts

import { Client, TextChannel } from "discord.js";
import {
  POLL_CHANNEL_ID,
  POLL_CRON,
} from "../../../shared/config";
import {
  buildPollTitle,
  getCurrentPollWeek,
  POLL_ANSWERS,
} from "../domain/pollWeek";

let _client: Client | null = null;

/**
 * In-memory lock to prevent concurrent poll creation within the same process.
 * Shared between the scheduler and manual command.
 */
let isCreatingPolls = false;

/**
 * Set the Discord client for the poll scheduler to use.
 * Must be called once during bot startup before scheduling.
 * @param client - The Discord client instance
 */
export function setSchedulerClient(client: Client): void {
  _client = client;
}

/**
 * Check if the channel already contains polls for the current week.
 * Fetches recent messages and looks for poll questions matching the
 * expected Saturday/Sunday titles.
 * @param channel - The text channel to check
 * @param week - The current poll week
 * @returns true if polls for this week already exist
 */
async function hasExistingPolls(channel: TextChannel, week: ReturnType<typeof getCurrentPollWeek>): Promise<boolean> {
  try {
    const messages = await channel.messages.fetch({ limit: 20 });
    const saturdayTitle = buildPollTitle("saturday", week.saturday);
    const sundayTitle = buildPollTitle("sunday", week.sunday);
    for (const [, message] of messages) {
      if (message.poll?.question?.text === saturdayTitle) return true;
      if (message.poll?.question?.text === sundayTitle) return true;
    }
    return false;
  } catch {
    // If we can't check, assume no duplicates and proceed
    return false;
  }
}

/**
 * Core poll creation logic with dedup protection.
 * Used by both the cron scheduler and the manual /poll create command.
 *
 * Logic:
 * 1. If no client set, skip
 * 2. Calculate current week
 * 3. Fetch poll channel — skip if not found
 * 4. Check for existing polls this week — skip if already created
 * 5. Create both polls
 *
 * @param source - "scheduled" or "manual" for logging
 * @returns Promise<[ok: boolean, detail: string]>
 */
export async function createPollsCore(
  source: "scheduled" | "manual",
): Promise<[ok: boolean, detail: string]> {
  if (!_client) return [false, "Discord client not ready."];
  if (!POLL_CHANNEL_ID) return [false, "POLL_CHANNEL_ID is not configured."];

  // In-memory lock: prevent overlapping async calls within the same process
  if (isCreatingPolls) {
    return [false, "Poll creation already in progress."];
  }

  isCreatingPolls = true;
  try {
    const week = getCurrentPollWeek();

    // Fetch the poll channel
    let channel: TextChannel | null = null;
    try {
      const fetched = await _client.channels.fetch(POLL_CHANNEL_ID);
      if (fetched instanceof TextChannel) channel = fetched;
    } catch {
      return [false, "Failed to fetch configured poll channel."];
    }

    if (!channel) return [false, "Configured channel is not a text channel."];

    // Discord-side dedup: skip if polls for this week already exist
    if (await hasExistingPolls(channel, week)) {
      console.info(
        `Skipped ${source} poll creation — polls for week ${week.weekKey} already exist in #${channel.name}`,
      );
      return [false, `Polls for week ${week.weekKey} already exist.`];
    }

    try {
      // Create Saturday poll
      const saturdayPoll = await channel.send({
        poll: {
          question: { text: buildPollTitle("saturday", week.saturday) },
          answers: POLL_ANSWERS,
          duration: week.durationHours,
          allowMultiselect: false,
        },
      });

      // Create Sunday poll
      const sundayPoll = await channel.send({
        poll: {
          question: { text: buildPollTitle("sunday", week.sunday) },
          answers: POLL_ANSWERS,
          duration: week.durationHours,
          allowMultiselect: false,
        },
      });

      console.info(
        `Auto-created polls for week ${week.weekKey} in #${channel.name} (${source})`,
      );
      return [true, `Created polls for week ${week.weekKey}.`];
    } catch (error) {
      console.error(`Poll creation failed (${source})`, error);
      return [false, "Failed to create polls."];
    }
  } finally {
    isCreatingPolls = false;
  }
}

/**
 * Create polls for the current week if not already created.
 * Called automatically by the cron scheduler.
 *
 * @returns Promise<[ok: boolean, detail: string]>
 */
export async function createPollsIfMissing(): Promise<[ok: boolean, detail: string]> {
  return createPollsCore("scheduled");
}

/**
 * The cron expression for the auto poll scheduler.
 * Exposed for the main bootstrap to register with node-cron.
 * @example "1 0 * * 1" — every Monday at 00:01
 */
export const POLL_CRON_EXPRESSION = POLL_CRON;