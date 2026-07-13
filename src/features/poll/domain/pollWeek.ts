// src/features/poll/domain/pollWeek.ts

import { POLL_TIMEZONE } from "../../../shared/config";

/**
 * Days of the week for poll creation.
 * Each poll covers one day: Saturday or Sunday.
 */
export type PollDay = "saturday" | "sunday";

/**
 * Represents the current poll week with all calculated dates.
 * @property now      - Current time in configured timezone
 * @property monday   - Start of week (Monday 00:00)
 * @property saturday - Saturday date (00:00)
 * @property sunday   - Sunday date (00:00)
 * @property weekKey  - Unique key for this week (YYYY-MM-DD based on Saturday)
 * @property expiresAt - When the poll expires (Sunday 23:59)
 * @property durationHours - Poll duration in hours (from now to expiresAt)
 */
export type PollWeek = {
  now: Date;
  monday: Date;
  saturday: Date;
  sunday: Date;
  weekKey: string;
  expiresAt: Date;
  durationHours: number;
};

/**
 * Poll answer options for each poll.
 * Op1: "Full" — participant will join the full session.
 * Op2: "Tham gia sau 8 giờ" — participant will join after 8 PM (20:00).
 */
export const POLL_ANSWERS = [
  { text: "Full" },
  { text: "Tham gia sau 8 giờ" },
] as const;

/**
 * Duration of Guild War in seconds (30 minutes).
 * Used to calculate audio playback offsets.
 */
export const WAR_DURATION_SECONDS = 30 * 60;

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Pad a number to 2 digits with leading zero.
 * @param value - Number to pad
 * @returns 2-digit string (e.g. "05", "30")
 */
function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

/**
 * Get the current date/time in the configured poll timezone.
 * Uses toLocaleString with en-US formatting, then parses back to Date.
 * This gives us a Date object representing the "wall clock" time in that timezone.
 * @returns Date adjusted for POLL_TIMEZONE
 */
export function nowInPollTimezone(): Date {
  const localized = new Date().toLocaleString("en-US", {
    timeZone: POLL_TIMEZONE,
  });
  return new Date(localized);
}

/**
 * Calculate the current poll week based on a given date (defaults to now in timezone).
 * Computes Monday (start of week), Saturday, and Sunday dates.
 * The weekKey is formatted as "YYYY-MM-DD" based on Saturday's date.
 * Poll expires at Sunday 23:59.
 * @param now - Reference date (defaults to current time in POLL_TIMEZONE)
 * @returns PollWeek object with all calculated fields
 */
export function getCurrentPollWeek(now: Date = nowInPollTimezone()): PollWeek {
  // Convert JS getDay() (0=Sunday … 6=Saturday) to our week (0=Monday … 6=Sunday)
  const jsWeekday = (now.getDay() + 6) % 7;

  // Monday = start of current week
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - jsWeekday);

  // Saturday = Monday + 5 days
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  saturday.setHours(0, 0, 0, 0);

  // Sunday = Monday + 6 days
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(0, 0, 0, 0);

  // Poll expires at Sunday 23:59
  const expiresAt = new Date(sunday);
  expiresAt.setHours(23, 59, 0, 0);

  // Duration in hours from now to expiry (minimum 1 hour)
  const durationHours = Math.max(
    1,
    Math.ceil((expiresAt.getTime() - now.getTime()) / ONE_HOUR_MS),
  );

  return {
    now,
    monday,
    saturday,
    sunday,
    weekKey: `${saturday.getFullYear()}-${pad2(saturday.getMonth() + 1)}-${pad2(saturday.getDate())}`,
    expiresAt,
    durationHours,
  };
}

/**
 * Build the poll title for a given day and date.
 * Format: "GVG T7 18/9 19H00 Tập trung !" for Saturday, "GVG CN 19/9 19H00 Tập trung !" for Sunday.
 * @param day - "saturday" or "sunday"
 * @param date - The date of the poll day
 * @returns Formatted poll title string
 */
export function buildPollTitle(day: PollDay, date: Date): string {
  const prefix = day === "saturday" ? "T7" : "CN";
  return `GVG ${prefix} ${date.getDate()}/${date.getMonth() + 1} 19H00 Tập trung !`;
}