// src/features/poll/application/pollStateStore.ts

import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { PollState } from "../domain/pollTypes";

/**
 * Directory and file path for poll state persistence.
 * State is stored as JSON in data/poll-state/current-week.json.
 */
const POLL_STATE_DIR = path.join(process.cwd(), "data", "poll-state");
const POLL_STATE_FILE = path.join(POLL_STATE_DIR, "current-week.json");

/**
 * Type guard: check if a value is a non-empty string.
 * @param value - Unknown value
 * @returns true if value is a non-empty string
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Normalize and validate a raw parsed JSON object into a PollState.
 * Returns null if any required field is missing or not a non-empty string.
 * @param input - Parsed JSON object
 * @returns Valid PollState or null
 */
export function normalizeState(input: unknown): PollState | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  if (
    !isNonEmptyString(raw.weekKey) ||
    !isNonEmptyString(raw.channelId) ||
    !isNonEmptyString(raw.saturdayMessageId) ||
    !isNonEmptyString(raw.sundayMessageId) ||
    !isNonEmptyString(raw.expiresAt)
  ) {
    return null;
  }
  return {
    weekKey: raw.weekKey.trim(),
    channelId: raw.channelId.trim(),
    saturdayMessageId: raw.saturdayMessageId.trim(),
    sundayMessageId: raw.sundayMessageId.trim(),
    expiresAt: raw.expiresAt.trim(),
  };
}

/**
 * Load the current poll state from the JSON file.
 * Returns null if the file doesn't exist or contains invalid data.
 * @returns Promise resolving to PollState or null
 */
export async function loadPollState(): Promise<PollState | null> {
  try {
    const raw = await fs.readFile(POLL_STATE_FILE, "utf8");
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    console.warn("Failed to read poll state", error);
    return null;
  }
}

/**
 * Save the current poll state to the JSON file.
 * Creates the directory if it doesn't exist.
 * @param state - PollState to persist
 */
export async function savePollState(state: PollState): Promise<void> {
  await fs.mkdir(POLL_STATE_DIR, { recursive: true });
  await fs.writeFile(POLL_STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

/**
 * Clear (delete) the current poll state file.
 * Silently handles ENOENT (file doesn't exist).
 */
export async function clearPollState(): Promise<void> {
  try {
    await fs.unlink(POLL_STATE_FILE);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") throw error;
  }
}

/**
 * Check if a saved poll state has expired.
 * @param state - The poll state to check
 * @param now - Current time (defaults to new Date())
 * @returns true if the state's expiresAt is before now
 */
export function isPollStateExpired(state: PollState, now: Date = new Date()): boolean {
  return Date.parse(state.expiresAt) < now.getTime();
}