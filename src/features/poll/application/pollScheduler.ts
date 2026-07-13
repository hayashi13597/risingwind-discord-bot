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
import {
  isPollStateExpired,
  loadPollState,
  savePollState,
} from "./pollStateStore";

let _client: Client | null = null;

/**
 * Set the Discord client for the poll scheduler to use.
 * Must be called once during bot startup before scheduling.
 * @param client - The Discord client instance
 */
export function setSchedulerClient(client: Client): void {
  _client = client;
}

/**
 * Create polls for the current week if not already created.
 * Called automatically by the cron scheduler or can be triggered manually.
 *
 * Logic:
 * 1. If no client set, skip
 * 2. Calculate current week
 * 3. Check existing state — skip if valid poll already exists for this week
 * 4. Fetch poll channel — skip if not found
 * 5. Create both polls and save state
 *
 * @returns Promise<[ok: boolean, detail: string]>
 */
export async function createPollsIfMissing(): Promise<[ok: boolean, detail: string]> {
  if (!_client) return [false, "Discord client not ready."];
  if (!POLL_CHANNEL_ID) return [false, "POLL_CHANNEL_ID is not configured."];

  const week = getCurrentPollWeek();

  // Skip if valid poll already exists for this week
  const existing = await loadPollState();
  if (existing && existing.weekKey === week.weekKey && !isPollStateExpired(existing, week.now)) {
    return [false, `Poll for week ${week.weekKey} already exists.`];
  }

  // Fetch the poll channel
  let channel: TextChannel | null = null;
  try {
    const fetched = await _client.channels.fetch(POLL_CHANNEL_ID);
    if (fetched instanceof TextChannel) channel = fetched;
  } catch {
    return [false, "Failed to fetch configured poll channel."];
  }

  if (!channel) return [false, "Configured channel is not a text channel."];

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

    // Save state for dedup
    await savePollState({
      weekKey: week.weekKey,
      channelId: channel.id,
      saturdayMessageId: saturdayPoll.id,
      sundayMessageId: sundayPoll.id,
      expiresAt: week.expiresAt.toISOString(),
    });

    console.info(`Auto-created polls for week ${week.weekKey} in #${channel.name}`);
    return [true, `Created polls for week ${week.weekKey}.`];
  } catch (error) {
    console.error("Auto poll creation failed", error);
    return [false, "Failed to create polls."];
  }
}

/**
 * The cron expression for the auto poll scheduler.
 * Exposed for the main bootstrap to register with node-cron.
 * @example "1 0 * * 1" — every Monday at 00:01
 */
export const POLL_CRON_EXPRESSION = POLL_CRON;