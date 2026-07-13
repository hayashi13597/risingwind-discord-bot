// src/features/voice/application/voiceCoordinator.ts
//
// Voice Coordinator — Điều phối hai bot voice (primary + secondary).
//
// File này định nghĩa lớp điều phối (coordinator) quản lý nhiều
// SpeakingScheduleRuntime (mỗi bot một runtime). Coordinator đóng vai trò
// facade trước cho slash command: command chỉ cần gọi coordinator.join(...)
// hoặc coordinator.startScheduleForAll() thay vì tương tác trực tiếp từng
// runtime riêng biệt.

import type {
  APIApplicationCommandOptionChoice,
  Client,
  Guild,
  VoiceBasedChannel,
} from "discord.js";
import type { SpeakingScheduleRuntime } from "./speakingSchedule";

// ─── Kiểu dữ liệu ─────────────────────────────────────────

/**
 * Khoá định danh bot voice. "primary" là bot chính, "secondary" là bot phụ.
 */
export type VoiceBotKey = "primary" | "secondary";

/**
 * Tập hợp các phương thức mà coordinator cần từ SpeakingScheduleRuntime.
 * Pick giúp ta chỉ phụ thuộc vào một phần interface, dễ mock khi viết test.
 */
export type VoiceRuntimeLike = Pick<
  SpeakingScheduleRuntime,
  | "joinVoice"
  | "leaveVoice"
  | "startSpeakingSchedule"
  | "stopSpeakingSchedule"
  | "getVoiceStateSummary"
>;

/**
 * Một bot voice hoàn chỉnh gồm:
 * - key   : khoá định danh ("primary" | "secondary")
 * - label : nhãn hiển thị cho slash command choice
 * - runtime : API SpeakingScheduleRuntime tương ứng
 * - client  : Discord Client chạy bot đó
 */
export type VoiceBotRuntime = {
  key: VoiceBotKey;
  label: string;
  runtime: VoiceRuntimeLike;
  client: Client;
};

/**
 * Kết quả của một action voice (join / leave / ...).
 * - ok     : true nếu thành công
 * - detail : thông báo mô tả kết quả (hiển thị cho người dùng)
 */
export type VoiceActionResult = {
  ok: boolean;
  detail: string;
};

/**
 * Kết quả của stopScheduleForAll().
 * - count  : tổng số node-schedule Job đã huỷ trên tất cả bot
 * - detail : thông báo gộp từng bot
 */
export type StopAllResult = {
  count: number;
  detail: string;
};

/**
 * API công khai của VoiceCoordinator.
 */
export type VoiceCoordinator = {
  /** Trả về danh sách choice cho slash command option "bot". */
  getBotChoices(): APIApplicationCommandOptionChoice<string>[];

  /** Kiểm tra một chuỗi có phải VoiceBotKey hợp lệ hay không. */
  hasBot(key: string): key is VoiceBotKey;

  /** Yêu cầu bot đã chọn tham gia voice channel. */
  join(
    key: VoiceBotKey,
    guildId: string,
    channelId: string,
  ): Promise<VoiceActionResult>;

  /** Yêu cầu bot đã chọn rời voice channel. */
  leave(key: VoiceBotKey): VoiceActionResult;

  /** Bắt đầu lịch phát audio trên tất cả bot. */
  startScheduleForAll(): Promise<VoiceActionResult>;

  /** Dừng lịch phát audio trên tất cả bot. */
  stopScheduleForAll(): StopAllResult;

  /** Trả về tóm tắt trạng thái voice của bot đã chọn. */
  getStateSummary(key: VoiceBotKey): {
    joined: boolean;
    activeSchedule: boolean;
  };
};

// ─── Hàm nội bộ ──────────────────────────────────────────

/**
 * Type guard: kiểm tra một chuỗi có phải "primary" hoặc "secondary".
 */
function isVoiceBotKey(key: string): key is VoiceBotKey {
  return key === "primary" || key === "secondary";
}

/**
 * Tạo chuỗi thông báo lỗi khi startSpeakingSchedule ném exception.
 * @param error - Đối tượng lỗi bắt được
 * @returns Chuỗi thông báo tiếng Việt
 */
function getStartScheduleErrorDetail(error: unknown): string {
  const prefix = "Có lỗi xảy ra khi bắt đầu lịch phát audio.";
  if (error instanceof Error && error.message) {
    return `${prefix} ${error.message}`;
  }
  return prefix;
}

/**
 * Kiểm tra một kênh bất kỳ có phải VoiceBasedChannel hay không.
 * Dùng duck-type: kiểm tra có phương thức isVoiceBased() trả true.
 * @param channel - Đối tượng kênh cần kiểm tra
 * @returns true nếu là VoiceBasedChannel
 */
function isVoiceBasedChannel(channel: unknown): channel is VoiceBasedChannel {
  return (
    typeof channel === "object" &&
    channel !== null &&
    "isVoiceBased" in channel &&
    typeof channel.isVoiceBased === "function" &&
    channel.isVoiceBased()
  );
}

// ─── Factory chính ───────────────────────────────────────

/**
 * Tạo VoiceCoordinator từ danh sách VoiceBotRuntime.
 *
 * Quá trình:
 * 1. Đưa mỗi runtime vào Map theo key, kiểm tra không trùng key.
 * 2. Yêu cầu cả "primary" và "secondary" đều phải có mặt.
 * 3. Trả về đối tượng coordinator với các method điều phối.
 *
 * @param runtimes - Mảng VoiceBotRuntime (primary + secondary)
 * @throws Error nếu thiếu key hoặc trùng key
 * @returns Đối tượng VoiceCoordinator
 */
export function createVoiceCoordinator(
  runtimes: VoiceBotRuntime[],
): VoiceCoordinator {
  // Lưu runtime theo key để truy xuất nhanh
  const runtimeMap = new Map<VoiceBotKey, VoiceBotRuntime>();
  for (const botRuntime of runtimes) {
    if (runtimeMap.has(botRuntime.key)) {
      throw new Error(`Duplicate voice bot runtime key: ${botRuntime.key}`);
    }
    runtimeMap.set(botRuntime.key, botRuntime);
  }

  // Yêu cầu bot chính phải tồn tại
  if (!runtimeMap.has("primary")) {
    throw new Error("Missing voice bot runtime for primary");
  }

  // Yêu cầu bot phụ phải tồn tại
  if (!runtimeMap.has("secondary")) {
    throw new Error("Missing voice bot runtime for secondary");
  }

  /**
   * Lấy runtime theo key, ném lỗi nếu không tìm thấy (an toàn).
   */
  function getRuntime(key: VoiceBotKey): VoiceBotRuntime {
    const runtime = runtimeMap.get(key);
    if (!runtime) {
      throw new Error(`Unknown voice bot: ${key}`);
    }
    return runtime;
  }

  /**
   * Định dạng danh sách kết quả thành nhiều dòng markdown.
   * Mỗi dòng: **<label>**: <detail>
   */
  function formatDetailLines(
    items: Array<{ label: string; detail: string }>,
  ): string {
    return items
      .map(({ label, detail }) => `**${label}**: ${detail}`)
      .join("\n");
  }

  /**
   * Rút gọn chuỗi detail khi startSchedule thành công: chỉ lấy dòng đầu.
   * Nếu thất bại thì trả nguyên detail để hiển thị đầy đủ lỗi.
   */
  function compactSuccessfulScheduleDetail(ok: boolean, detail: string): string {
    if (!ok) return detail;
    return detail.split("\n", 1)[0]?.trimEnd() ?? detail;
  }

  // ── Trả về đối tượng coordinator ──

  return {
    /**
     * Trả về danh sách choice cho slash command option "bot".
     * Mỗi phần tử: { name: label, value: key }.
     */
    getBotChoices() {
      return runtimes.map(({ key, label }) => ({ name: label, value: key }));
    },

    /**
     * Kiểm tra một chuỗi có phải key bot hợp lệ.
     * Dùng làm type guard cho command handler.
     */
    hasBot(key: string): key is VoiceBotKey {
      return isVoiceBotKey(key);
    },

    /**
     * Yêu cầu bot đã chọn tham gia voice channel.
     *
     * Bước:
     * 1. Lấy runtime theo key.
     * 2. Fetch guild từ cache hoặc API.
     * 3. Fetch channel theo channelId.
     * 4. Kiểm tra channel là VoiceBasedChannel.
     * 5. Gọi runtime.joinVoice với JoinVoiceTarget đầy đủ.
     *
     * @param key       - Khoá bot ("primary" | "secondary")
     * @param guildId   - ID guild chứa voice channel
     * @param channelId - ID voice channel cần join
     * @returns VoiceActionResult { ok, detail }
     */
    async join(key, guildId, channelId) {
      const bot = getRuntime(key);

      // Lấy guild: ưu tiên cache, fallback sang fetch từ API
      const guild =
        bot.client.guilds.cache.get(guildId) ??
        (await bot.client.guilds.fetch(guildId).catch(() => null));

      // Lấy channel theo id (bỏ qua lỗi nếu không tìm thấy)
      const channel = await guild?.channels.fetch(channelId).catch(() => null);

      // Nếu guild không tồn tại hoặc channel không phải voice → báo lỗi
      if (!guild || !isVoiceBasedChannel(channel)) {
        return {
          ok: false,
          detail: "Không thể lấy thông tin voice channel cho bot được chọn.",
        };
      }

      // Ủy quyền join voice cho runtime của bot đã chọn
      const [ok, detail] = await bot.runtime.joinVoice({
        guildId: guild.id,
        channelId: channel.id,
        channelName: channel.name,
        adapterCreator: guild.voiceAdapterCreator,
        group: bot.key,
      });
      return { ok, detail };
    },

    /**
     * Yêu cầu bot đã chọn rời voice channel.
     * Ủy quyền trực tiếp sang runtime.leaveVoice().
     * @param key - Khoá bot
     * @returns VoiceActionResult { ok, detail }
     */
    leave(key) {
      const [ok, detail] = getRuntime(key).runtime.leaveVoice();
      return { ok, detail };
    },

    /**
     * Bắt đầu lịch phát audio trên tất cả bot cùng lúc (Promise.all).
     *
     * Mỗi bot chạy độc lập:
     * - Thành công: rút gọn detail chỉ dòng đầu (compactSuccessfulScheduleDetail).
     * - Ném exception: bắt lỗi, tạo detail tiếng Việt.
     *
     * Kết quả gộp:
     * - ok = true nếu ít nhất một bot thành công
     * - detail = nhiều dòng, mỗi dòng một bot
     *
     * @returns VoiceActionResult { ok, detail }
     */
    async startScheduleForAll() {
      const results = await Promise.all(
        runtimes.map(async ({ label, runtime }) => {
          try {
            const [ok, detail] = await runtime.startSpeakingSchedule();
            return {
              label,
              ok,
              detail: compactSuccessfulScheduleDetail(ok, detail),
            };
          } catch (error) {
            return {
              label,
              ok: false,
              detail: getStartScheduleErrorDetail(error),
            };
          }
        }),
      );

      return {
        ok: results.some((result) => result.ok),
        detail: formatDetailLines(results),
      };
    },

    /**
     * Dừng lịch phát audio trên tất cả bot (đồng bộ, tuần tự).
     *
     * Mỗi bot:
     * - runtime.stopSpeakingSchedule() trả về [count, detail]
     *
     * Kết quả gộp:
     * - count  = tổng số job đã huỷ trên mọi bot
     * - detail = nhiều dòng, mỗi dòng một bot
     *
     * @returns StopAllResult { count, detail }
     */
    stopScheduleForAll() {
      const results = runtimes.map(({ label, runtime }) => {
        const [count, detail] = runtime.stopSpeakingSchedule();
        return { label, count, detail };
      });

      return {
        count: results.reduce((sum, result) => sum + result.count, 0),
        detail: formatDetailLines(results),
      };
    },

    /**
     * Trả về tóm tắt trạng thái voice của bot đã chọn.
     * - joined         : true nếu đang ở trong voice channel
     * - activeSchedule : true nếu đang chạy lịch phát audio
     * @param key - Khoá bot
     */
    getStateSummary(key) {
      return getRuntime(key).runtime.getVoiceStateSummary();
    },
  };
}