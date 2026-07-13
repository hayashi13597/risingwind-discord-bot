// src/shared/config/index.ts

/**
 * Config module — reads all environment variables at module load time.
 * Exports typed constants and parsing helpers.
 * Validates required fields via validateConfig().
 */

// ─── Discord ───────────────────────────────────────────────
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN ?? "";
export const DISCORD_TOKEN_2 = process.env.DISCORD_TOKEN_2 ?? "";

// ─── Poll ──────────────────────────────────────────────────
const POLL_CHANNEL_ID_RAW = process.env.POLL_CHANNEL_ID;
export const POLL_TIMEZONE = process.env.POLL_TIMEZONE ?? "Asia/Bangkok";
export const POLL_CRON = process.env.POLL_CRON ?? "1 0 * * 1";

// ─── Ping/Notification ────────────────────────────────────
const PING_CHANNEL_ID_RAW = process.env.PING_CHANNEL_ID;
export const PING_TIMEZONE = process.env.PING_TIMEZONE ?? "Asia/Bangkok";
const PING_TIMES_RAW = process.env.PING_TIMES ?? "20:00";
const PING_WEEKDAYS_RAW = process.env.PING_WEEKDAYS ?? "0,1,2,3,4";
const PING_MESSAGE_RAW = process.env.PING_MESSAGE;

/**
 * Default ping message template for weekend GVG notification.
 * Uses {WEEKEND_RANGE} placeholder for auto-calculated Saturday-Sunday date range.
 */
export const DEFAULT_PING_MESSAGE =
  `📢 THÔNG BÁO GVG CUỐI TUẦN\n\n` +
  `Anh em vào mục điểm danh GVG cuối tuần này: [ {WEEKEND_RANGE} ]\n\n` +
  `👉 @everyone điểm danh sớm để G sắp xếp đội hình cho hợp lý.\n`;

// ─── Parsing helpers ───────────────────────────────────────

/**
 * Parse a channel ID string from env. Returns null if empty or absent.
 * @param value - Raw env string
 * @returns Parsed channel ID or null
 */
export function parseChannelId(value: string | undefined): string | null {
  if (!value || value.trim() === "") return null;
  return value.trim();
}

/**
 * Parse comma-separated "HH:MM" time strings into a Set of normalized "H:M" keys.
 * Falls back to "12:0" if no valid entries found.
 * @param value - Comma-separated time strings (e.g. "20:00,21:00")
 * @returns Set of "H:M" strings
 */
export function parsePingTimes(value: string): Set<string> {
  const parsed = new Set<string>();
  for (const raw of value.split(",")) {
    const token = raw.trim();
    if (!token) continue;
    const parts = token.split(":");
    if (parts.length !== 2) continue;
    const hour = parseInt(parts[0]!, 10);
    const minute = parseInt(parts[1]!, 10);
    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      continue;
    }
    parsed.add(`${hour}:${minute}`);
  }
  if (parsed.size === 0) {
    parsed.add("12:0");
  }
  return parsed;
}

/**
 * Parse comma-separated weekday numbers (0=Mon … 6=Sun) into a Set.
 * Falls back to Mon-Fri (0-4) if no valid entries found.
 * @param value - Comma-separated weekday numbers
 * @returns Set of weekday numbers
 */
export function parsePingWeekdays(value: string): Set<number> {
  const parsed = new Set<number>();
  for (const raw of value.split(",")) {
    const token = raw.trim();
    if (!token) continue;
    const day = parseInt(token, 10);
    if (isNaN(day) || day < 0 || day > 6) continue;
    parsed.add(day);
  }
  if (parsed.size === 0) {
    return new Set([0, 1, 2, 3, 4]);
  }
  return parsed;
}

/**
 * Resolve ping message — falls back to default if env value is empty or just "@everyone".
 * @param value - Raw env string or undefined
 * @returns Final message template
 */
export function resolvePingMessage(value: string | undefined): string {
  if (!value) return DEFAULT_PING_MESSAGE;
  const normalized = value.trim();
  if (!normalized || normalized === "@everyone") return DEFAULT_PING_MESSAGE;
  return value;
}

/**
 * Render ping message by replacing {WEEKEND_RANGE} or [ date - date ] pattern
 * with the calculated Saturday-Sunday date range for the current week.
 * @param template - Message template string
 * @param now - Current date (in configured timezone)
 * @returns Final rendered message
 */
export function renderPingMessage(template: string, now: Date): string {
  const day = now.getDay();
  const jsWeekday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - jsWeekday);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekendRange = `${saturday.getDate()}/${saturday.getMonth() + 1} - ${sunday.getDate()}/${sunday.getMonth() + 1}`;
  if (template.includes("{WEEKEND_RANGE}")) {
    return template.replace("{WEEKEND_RANGE}", weekendRange);
  }
  return template.replace(/\[\s*\d{1,2}\/\d{1,2}\s*-\s*\d{1,2}\/\d{1,2}\s*\]/, `[ ${weekendRange} ]`);
}

// ─── Resolved exports ──────────────────────────────────────
export const POLL_CHANNEL_ID = parseChannelId(POLL_CHANNEL_ID_RAW);
export const PING_CHANNEL_ID = parseChannelId(PING_CHANNEL_ID_RAW);
export const ALLOWED_PING_WEEKDAYS = parsePingWeekdays(PING_WEEKDAYS_RAW);
export const ALLOWED_PING_TIMES = parsePingTimes(PING_TIMES_RAW);
export const PING_MESSAGE_TEMPLATE = resolvePingMessage(PING_MESSAGE_RAW);

/**
 * Validate that all required environment variables are set.
 * Throws Error with descriptive message if any are missing.
 */
export function validateConfig(): void {
  if (!DISCORD_TOKEN) throw new Error("Missing DISCORD_TOKEN in .env");
  if (!DISCORD_TOKEN_2) throw new Error("Missing DISCORD_TOKEN_2 in .env");
  if (!POLL_CHANNEL_ID) {
    throw new Error("Missing or invalid POLL_CHANNEL_ID in .env");
  }
}