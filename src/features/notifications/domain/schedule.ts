// src/features/notifications/domain/schedule.ts

/**
 * Calculate the remaining seconds from the start of a 30-minute Guild War
 * given the elapsed minutes and seconds.
 * @param minutes - Minutes elapsed in the war
 * @param seconds - Additional seconds (default 0)
 * @returns Seconds remaining in the war
 */
function gwRemaining(minutes: number, seconds = 0): number {
  return 30 * 60 - (minutes * 60 + seconds);
}

/**
 * Represents a single notification entry in the Guild War schedule.
 * @property offsetSec - Seconds from war start when this notification triggers
 * @property message  - Text message shown in the schedule preview
 */
export interface NotificationEntry {
  offsetSec: number;
  message: string;
}

/**
 * The full Guild War notification schedule (30 minutes).
 * Each entry defines an audio playback time and a human-readable message.
 *
 * Timing: offsetSec is calculated as WAR_DURATION - (elapsed minutes * 60 + seconds).
 * Example: gwRemaining(27, 0) = 1800 - 1620 = 180 → 3 minutes into the war.
 *
 * This schedule is used by:
 * - speakingSchedule.ts → schedules audio playback at each offset from war start
 * - Schedule preview display → shows "HH:MM:SS — message" lines
 */
export const NOTIFICATION_SCHEDULE: NotificationEntry[] = [
  { offsetSec: gwRemaining(27, 0), message: "Mua 4 con gà chuẩn bị cho tinh anh" },
  { offsetSec: gwRemaining(26, 30), message: "1 phút 30 giây xuất hiện tinh anh và quái rừng" },
  { offsetSec: gwRemaining(26, 0), message: "1 phút xuất hiện tinh anh và quái rừng, Team cầm gà và team rừng chuẩn bị" },
  { offsetSec: gwRemaining(25, 30), message: "30 giây xuất hiện tinh anh và quái rừng, team cầm gà và team rừng vào vị trí" },
  { offsetSec: gwRemaining(25, 15), message: "15 giây xuất hiện tinh anh và quái rừng, team cầm gà và team rừng vào vị trí" },
  { offsetSec: gwRemaining(25, 10), message: "10 giây xuất hiện tinh anh và quái rừng" },
  { offsetSec: gwRemaining(21, 30), message: "1 phút 30 giây sẽ PvP, PvP đổi đồ" },
  { offsetSec: gwRemaining(20, 30), message: "30 giây xuất hiện quái rừng" },
  { offsetSec: gwRemaining(20, 15), message: "15 giây xuất hiện quái rừng" },
  { offsetSec: gwRemaining(20, 10), message: "10 giây xuất hiện quái rừng" },
  { offsetSec: gwRemaining(17, 0), message: "Mua 4 con gà chuẩn bị cho tinh anh" },
  { offsetSec: gwRemaining(16, 0), message: "1 phút xuất hiện tinh anh và quái rừng, Team cầm gà và team rừng chuẩn bị" },
  { offsetSec: gwRemaining(15, 30), message: "30 giây xuất hiện tinh anh và quái rừng, team cầm gà và team rừng vào vị trí" },
  { offsetSec: gwRemaining(15, 15), message: "15 giây xuất hiện tinh anh và quái rừng, team cầm gà và team rừng vào vị trí" },
  { offsetSec: gwRemaining(15, 10), message: "10 giây xuất hiện tinh anh và quái rừng" },
  { offsetSec: gwRemaining(11, 0), message: "1 phút xuất hiện quái rừng" },
  { offsetSec: gwRemaining(10, 30), message: "30 giây xuất hiện quái rừng" },
  { offsetSec: gwRemaining(10, 15), message: "15 giây xuất hiện quái rừng" },
  { offsetSec: gwRemaining(10, 10), message: "10 giây xuất hiện quái rừng" },
  { offsetSec: gwRemaining(6, 0), message: "1 phút xuất hiện quái rừng" },
  { offsetSec: gwRemaining(5, 30), message: "30 giây xuất hiện quái rừng" },
  { offsetSec: gwRemaining(5, 15), message: "15 giây xuất hiện quái rừng" },
  { offsetSec: gwRemaining(5, 10), message: "10 giây xuất hiện quái rừng" },
];