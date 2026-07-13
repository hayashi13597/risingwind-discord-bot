// src/features/notifications/application/pingService.ts

import { AllowedMentionsTypes, type Client, TextChannel } from "discord.js";
import {
  ALLOWED_PING_TIMES,
  ALLOWED_PING_WEEKDAYS,
  PING_CHANNEL_ID,
  PING_MESSAGE_TEMPLATE,
  PING_TIMEZONE,
  renderPingMessage,
} from "../../../shared/config";

// ─── Client lưu trữ ───────────────────────────────────────
// Biến nội bộ lưu Discord client, được gán qua setClient().
// Dùng cho sendPingNotification() và runScheduledPing().
let _client: Client | null = null;

/**
 * Lưu Discord client để service có thể truy cập channel và gửi tin nhắn.
 * Phải được gọi một lần khi bot bắt đầu chạy.
 * @param client - Discord Client instance
 */
export function setClient(client: Client): void {
  _client = client;
}

// ─── Helper: lấy thời gian theo múi giờ cấu hình ───────────
/**
 * Trả về đối tượng Date hiện tại trong múi giờ đã cấu hình (PING_TIMEZONE).
 * Dùng toLocaleString để chuyển đổi sang đúng thời gian địa phương.
 * @param tz - Chuỗi múi giờ IANA (vd: "Asia/Bangkok")
 * @returns Date biểu diễn thời gian hiện tại trong múi giờ đó
 */
function nowInTz(tz: string): Date {
  const str = new Date().toLocaleString("en-US", { timeZone: tz });
  return new Date(str);
}

// ─── Gửi thông báo ping ────────────────────────────────────
/**
 * Gửi thông báo @everyone vào PING_CHANNEL_ID.
 *
 * Quy trình:
 * 1. Kiểm tra PING_CHANNEL_ID và client đã sẵn sàng
 * 2. Fetch channel từ Discord client
 * 3. Render tin nhắn (thay {WEEKEND_RANGE} bằng khoảng ngày T7-CN)
 * 4. Gửi với allowedMentions: @everyone và @role
 *
 * @param opts - Tuỳ chọn:
 *   - now: Date mô phỏng (mặc định = thời gian thực theo PING_TIMEZONE)
 *   - markSlot: (dự phòng) đánh dấu slot đã gửi
 *   - source: Nguơn gửi ("manual" | "scheduled") — dùng cho log
 * @returns [ok, detail] — ok=true nếu gửi thành công, detail là mô tả kết quả
 */
export async function sendPingNotification(opts: {
  now?: Date;
  markSlot?: boolean;
  source?: string;
}): Promise<[ok: boolean, detail: string]> {
  const { source = "manual" } = opts;

  // Kiểm tra channel ID đã cấu hình
  if (!PING_CHANNEL_ID) return [false, "PING_CHANNEL_ID is not configured."];
  // Kiểm tra client đã được set
  if (!_client) return [false, "Discord client not ready."];

  // Lấy thời gian hiện tại theo múi giờ cấu hình
  const now = opts.now ?? nowInTz(PING_TIMEZONE);

  // Fetch channel từ Discord
  let channel: TextChannel | null = null;
  try {
    const fetched = await _client.channels.fetch(PING_CHANNEL_ID);
    if (fetched instanceof TextChannel) channel = fetched;
  } catch {
    return [false, "Failed to fetch configured ping channel."];
  }

  // Đảm bảo channel là text channel
  if (!channel) return [false, "Configured channel is not a text channel."];

  // Gửi thông báo @everyone với tin nhắn đã render
  try {
    const message = renderPingMessage(PING_MESSAGE_TEMPLATE, now);
    await channel.send({
      content: message,
      allowedMentions: {
        parse: [AllowedMentionsTypes.Everyone, AllowedMentionsTypes.Role],
      },
    });
    console.info(`Sent ${source} @everyone ping to #${channel.name}`);
    return [true, `Sent notification to #${channel.name}.`];
  } catch (err) {
    console.error(`Failed to send ${source} @everyone ping`, err);
    return [false, "Failed to send ping message."];
  }
}

// ─── Ping theo lịch trình (cron) ───────────────────────────
// Lưu slot gần nhất đã gửi để chống trùng lặp trong cùng một phút.
let lastPingSlot: string | null = null;

/**
 * Kiểm tra thời gian hiện tại và gửi ping nếu:
 * 1. Ngày trong tuần nằm trong ALLOWED_PING_WEEKDAYS
 * 2. Giờ:phút hiện tại nằm trong ALLOWED_PING_TIMES
 * 3. Slot này chưa được gửi trước đó (chống gửi trùng trong cùng phút)
 *
 * Nên được gọi bởi cron job mỗi phút (vd: node-cron "* * * * *").
 */
export async function runScheduledPing(): Promise<void> {
  // Bỏ qua nếu chưa cấu hình channel
  if (!PING_CHANNEL_ID) return;

  // Lấy thời gian hiện tại theo múi giờ cấu hình
  const now = nowInTz(PING_TIMEZONE);

  // Chuyển đổi JS getDay() (0=Sun..6=Sat) sang tuần Mon=0..Sun=6
  const jsWeekday = (now.getDay() + 6) % 7;

  // Kiểm tra ngày trong tuần có được phép không
  if (!ALLOWED_PING_WEEKDAYS.has(jsWeekday)) return;

  // Tạo khoá slot theo định dạng "H:M" và kiểm tra có trong danh sách giờ cho phép
  const slotKey = `${now.getHours()}:${now.getMinutes()}`;
  if (!ALLOWED_PING_TIMES.has(slotKey)) return;

  // Tạo khoá duy nhất cho slot này trong ngày để chống trùng lặp
  const todaySlot = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}_${slotKey}`;
  if (lastPingSlot === todaySlot) return;

  // Gửi thông báo và đánh dấu đã gửi nếu thành công
  const [sent] = await sendPingNotification({
    now,
    source: "scheduled",
  });
  if (sent) lastPingSlot = todaySlot;
}