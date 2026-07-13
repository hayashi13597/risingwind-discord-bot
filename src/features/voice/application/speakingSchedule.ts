import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  StreamType,
  VoiceConnection,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import ffmpegStatic from "ffmpeg-static";
import schedule, { Job } from "node-schedule";
import { spawn } from "node:child_process";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { PING_TIMEZONE } from "../../../shared/config";
import { NOTIFICATION_SCHEDULE } from "../../notifications/domain/schedule";

// ─── Enum & constant ─────────────────────────────────────
// Thời lượng Guild War: 30 phút = 1800 giây.
const WAR_DURATION_SECONDS = 30 * 60;

/**
 * Tính số giây còn lại của Guild War tính từ mốc (phút, giây) trong 30 phút.
 * Công thức: 1800 − (phút × 60 + giây).
 * Kết quả dương nghĩa là token nằm trước hết giờ; âm nghĩa là đã vượt qua.
 * @param minutes - Số phút đã trôi qua trong Guild War (0–29)
 * @param seconds - Số giây lẻ (0–59)
 * @returns Số giây còn lại của Guild War tại mốc đã cho
 */
function gwRemaining(minutes: number, seconds = 0): number {
  return WAR_DURATION_SECONDS - (minutes * 60 + seconds);
}

// ─── Kiểu dữ liệu nội bộ ──────────────────────────────────

/**
 * Một file audio đã phân tích:
 * - filePath: đường dẫn tuyệt đối tới file mp3
 * - offsets: mảng các mốc offset (giây) trích từ tên file
 */
type ParsedAudio = {
  filePath: string;
  offsets: number[];
};

/**
 * Trạng thái runtime của một bot voice:
 * - guildId: guild đang kết nối (null nếu chưa join)
 * - connection: kết nối @discordjs/voice (null nếu chưa join)
 * - player: AudioPlayer dùng để phát audio
 * - jobs: mảng node-schedule Job đang hoạt động
 * - queue: hàng đợi file mp3 chờ phát
 * - activeSchedule: true nếu đang chạy lịch phát audio
 * - currentFfmpeg: tiến trình ffmpeg đang chạy (null nếu đang rảnh)
 */
type RuntimeState = {
  guildId: string | null;
  connection: VoiceConnection | null;
  player: AudioPlayer;
  jobs: Job[];
  queue: string[];
  activeSchedule: boolean;
  currentFfmpeg: ReturnType<typeof spawn> | null;
};

/**
 * Bộ dependency tiêm cho createSpeakingScheduleRuntime.
 * Cho phép mock createAudioPlayer, joinVoiceChannel, entersState khi test.
 */
type SpeakingScheduleRuntimeDeps = {
  createAudioPlayer: typeof createAudioPlayer;
  joinVoiceChannel: typeof joinVoiceChannel;
  entersState: typeof entersState;
};

/**
 * Thông tin mục tiêu voice cần thiết khi join.
 * - guildId, channelId: id guild và voice channel
 * - channelName: tên hiển thị để dùng trong message trả lời
 * - adapterCreator: adapter lấy từ guild.voiceAdapterCreator
 * - group: nhóm voice connection (cho primary/secondary bot)
 */
export type JoinVoiceTarget = {
  guildId: string;
  channelId: string;
  channelName: string;
  adapterCreator: Parameters<typeof joinVoiceChannel>[0]["adapterCreator"];
  group: string;
};

const defaultRuntimeDeps: SpeakingScheduleRuntimeDeps = {
  createAudioPlayer,
  joinVoiceChannel,
  entersState,
};

/**
 * API công khai của speaking schedule runtime.
 */
export type SpeakingScheduleRuntime = {
  joinVoice(target: JoinVoiceTarget): Promise<[ok: boolean, detail: string]>;
  leaveVoice(): [ok: boolean, detail: string];
  startSpeakingSchedule(): Promise<[ok: boolean, detail: string]>;
  stopSpeakingSchedule(): [count: number, detail: string];
  getVoiceStateSummary(): { joined: boolean; activeSchedule: boolean };
};

// ─── Hàm tiện ích ────────────────────────────────────────

/**
 * Trả về đường dẫn tuyệt đối tới thư mục chứa file audio mp3.
 * Mặc định là `<cwd>/src/audios`.
 * @returns Đường dẫn thư mục audio
 */
function getAudioDirectory(): string {
  return path.join(process.cwd(), "src", "audios");
}

/**
 * Phân tích một token dạng "MM_SS" (ví dụ "25_30") thành số giây offset.
 * Quy tắc offset: gwRemaining(MM, SS) = 1800 − (MM×60 + SS).
 * Token hợp lệ nếu:
 * - Khớp regex /^(\d{1,2})_(\d{2})$/
 * - 0 ≤ phút, 0 ≤ giây ≤ 59
 * - offset kết quả nằm trong [0, 1800]
 * @param token - Chuỗi token từ tên file (ví dụ "25_30")
 * @returns Số giây offset hoặc null nếu token không hợp lệ
 */
function parseOffsetToken(token: string): number | null {
  const match = token.match(/^(\d{1,2})_(\d{2})$/);
  if (!match) return null;

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (
    !Number.isInteger(minutes) ||
    !Number.isInteger(seconds) ||
    minutes < 0 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null;
  }

  const offset = gwRemaining(minutes, seconds);
  if (offset < 0 || offset > WAR_DURATION_SECONDS) return null;
  return offset;
}

/**
 * Đọc toàn bộ file mp3 trong thư mục audio, parse tên file thành mảng offset.
 * Tên file có dạng `MM_SS-MM_SS.mp3` (mỗi token ngăn bằng dấu "-").
 * File không hợp lệ sẽ bị bỏ qua kèm cảnh báo.
 * @returns Mảng ParsedAudio với filePath và offsets đã parse
 */
async function loadParsedAudios(): Promise<ParsedAudio[]> {
  const audioDir = getAudioDirectory();
  const entries = await fs.readdir(audioDir, { withFileTypes: true });

  const parsed: ParsedAudio[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith(".mp3")) continue;

    const baseName = entry.name.slice(0, -4);
    const tokens = baseName.split("-").map((t) => t.trim());
    const offsets = tokens
      .map(parseOffsetToken)
      .filter((v): v is number => v !== null);

    if (offsets.length === 0 || offsets.length !== tokens.length) {
      console.warn(`Ignored invalid audio filename: ${entry.name}`);
      continue;
    }

    parsed.push({
      filePath: path.join(audioDir, entry.name),
      offsets,
    });
  }

  return parsed;
}

// ─── Factory chính ───────────────────────────────────────

/**
 * Tạo một speaking schedule runtime — bộ điều phối audio hoàn chỉnh.
 *
 * Runtime quản lý:
 * 1. Kết nối voice channel (joinVoice / leaveVoice)
 * 2. Lên lịch phát audio theo offset (startSpeakingSchedule / stopSpeakingSchedule)
 * 3. Hàng đợi phát lại mp3 qua ffmpeg → AudioPlayer
 * 4. Truy vấn trạng thái (getVoiceStateSummary)
 *
 * @param deps - Dependency có thể mock (mặc định dùng @discordjs/voice thật)
 * @returns Đối tượng SpeakingScheduleRuntime với 5 phương thức công khai
 */
export function createSpeakingScheduleRuntime(
  deps: SpeakingScheduleRuntimeDeps = defaultRuntimeDeps,
): SpeakingScheduleRuntime {
  const state: RuntimeState = {
    guildId: null,
    connection: null,
    player: deps.createAudioPlayer(),
    jobs: [],
    queue: [],
    activeSchedule: false,
    currentFfmpeg: null,
  };

  /**
   * Huỷ toàn bộ node-schedule Job đang hoạt động.
   * Dùng khi stopSpeakingSchedule hoặc trước khi tạo lịch mới.
   * @returns Số lượng job đã huỷ
   */
  function clearJobs(): number {
    const n = state.jobs.length;
    for (const job of state.jobs) {
      job.cancel();
    }
    state.jobs.length = 0;
    return n;
  }

  /**
   * Kill tiến trình ffmpeg đang chạy (nếu có) và đặt currentFfmpeg = null.
   * Đảm bảo không còn đệm stdin/stdout treo khi chuyển file.
   */
  function stopCurrentPlaybackProcess(): void {
    if (state.currentFfmpeg) {
      state.currentFfmpeg.kill("SIGKILL");
      state.currentFfmpeg = null;
    }
  }

  /**
   * Lấy file kế tiếp trong hàng đợi và phát qua ffmpeg → AudioResource.
   * Logic:
   * 1. Kiểm tra connection còn kết nối không
   * 2. Lấy file đầu tiên từ queue (shift)
   * 3. Kill ffmpeg cũ nếu còn đang chạy
   * 4. Spawn ffmpeg để decode mp3 → opus stream trên stdout
   * 5. Tạo AudioResource từ ffmpeg.stdout và player.play()
   * Khi player chuyển sang Idle thì playNextInQueue() tự động được gọi lại.
   */
  function playNextInQueue(): void {
    if (!state.connection) return;
    const nextFile = state.queue.shift();
    if (!nextFile) return;

    stopCurrentPlaybackProcess();

    const ffmpegPath =
      ffmpegStatic && existsSync(ffmpegStatic) ? ffmpegStatic : "ffmpeg";
    const ffmpeg = spawn(ffmpegPath, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      nextFile,
      "-f",
      "opus",
      "-ar",
      "48000",
      "-ac",
      "2",
      "pipe:1",
    ]);
    state.currentFfmpeg = ffmpeg;

    ffmpeg.once("exit", () => {
      if (state.currentFfmpeg === ffmpeg) {
        state.currentFfmpeg = null;
      }
    });

    ffmpeg.stderr.on("data", (chunk: Buffer) => {
      const msg = chunk.toString().trim();
      if (msg) {
        console.warn(`ffmpeg warning for ${path.basename(nextFile)}: ${msg}`);
      }
    });

    const resource = createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.OggOpus,
    });
    state.player.play(resource);
  }

  // Khi player hết file (chuyển sang Idle) thì tự động phát file kế tiếp.
  state.player.on(AudioPlayerStatus.Idle, () => {
    playNextInQueue();
  });

  // Khi player lỗi thì log và thử phát file kế tiếp.
  state.player.on("error", (err) => {
    console.error("Audio player error", err);
    playNextInQueue();
  });

  /**
   * Tham gia một voice channel.
   * Nếu đã kết nối ở guild khác thì leave trước, sau đó join mới.
   * Chờ connection chuyển sang Ready trong 15 giây, nếu timeout thì báo lỗi.
   * @param target - Thông tin guild/channel/adapter cần join
   * @returns [ok, detail] — ok=true nếu thành công, detail là message tiếng Việt
   */
  async function joinVoice(
    target: JoinVoiceTarget,
  ): Promise<[ok: boolean, detail: string]> {
    try {
      if (state.connection) {
        leaveVoice();
      }

      const connection = deps.joinVoiceChannel({
        guildId: target.guildId,
        channelId: target.channelId,
        adapterCreator: target.adapterCreator,
        selfDeaf: false,
        group: target.group,
      });

      await deps.entersState(connection, VoiceConnectionStatus.Ready, 15_000);
      connection.subscribe(state.player);

      state.connection = connection;
      state.guildId = target.guildId;
      return [true, `Đã tham gia voice channel **${target.channelName}**.`];
    } catch (err) {
      console.error("Failed to join voice channel", err);
      return [false, "Không thể tham gia voice channel."];
    }
  }

  /**
   * Rời voice channel hiện tại.
   * Huỷ toàn bộ lịch phát audio trước, rồi destroy connection.
   * Nếu connection đã destroy thì bỏ qua lỗi "already been destroyed".
   * @returns [ok, detail] — ok=false nếu chưa join channel nào
   */
  function leaveVoice(): [ok: boolean, detail: string] {
    stopSpeakingSchedule();
    if (!state.connection) {
      state.guildId = null;
      return [false, "Bot chưa tham gia voice channel nào."];
    }

    try {
      state.connection.destroy();
    } catch (err) {
      if (!(err instanceof Error) || !err.message.includes("already been destroyed")) {
        throw err;
      }
    }
    state.connection = null;
    state.guildId = null;
    return [true, "Đã rời voice channel."];
  }

  /**
   * Bắt đầu lên lịch phát audio theo offset.
   * Logic chính:
   * 1. Kiểm tra đã join voice chưa
   * 2. Stop lịch cũ (nếu có)
   * 3. Đọc mp3 từ src/audios và parse tên file → offsets
   * 4. Dựng timeline: mỗi offset → runAt = warStart + offset giây
   *    - Bỏ qua mốc đã qua (runAt ≤ now) hoặc vượt quá hết giờ (runAt ≥ warEnd)
   * 5. Sắp xếp timeline theo runAt, tiebreak theo tên file
   * 6. Tạo node-schedule Job cho từng mốc — khi tới giờ push file vào queue
   *    và nếu player đang Idle thì playNextInQueue() ngay
   * 7. Dựng message preview: Giờ phát — thông báo NOTIFICATION_SCHEDULE tương ứng
   * @returns [ok, detail] — ok=true kèm summary danh sách mốc phát
   */
  async function startSpeakingSchedule(): Promise<[ok: boolean, detail: string]> {
    if (!state.connection) {
      return [false, "Bot chưa tham gia voice channel. Dùng /join trước."];
    }

    stopSpeakingSchedule();

    let parsed: ParsedAudio[];
    try {
      parsed = await loadParsedAudios();
    } catch (err) {
      console.error("Failed to load audio files", err);
      return [false, "Không thể đọc thư mục audio. Kiểm tra `src/audios`."];
    }

    if (parsed.length === 0) {
      return [false, "Không có file mp3 hợp lệ trong `src/audios`."];
    }

    const warStart = new Date();
    warStart.setMilliseconds(0);
    const nowMs = Date.now();
    const warEndMs = warStart.getTime() + WAR_DURATION_SECONDS * 1000;

    const timeline: Array<{ runAt: Date; filePath: string; offsetSec: number }> =
      [];

    for (const audio of parsed) {
      for (const offsetSec of audio.offsets) {
        const runAt = new Date(warStart.getTime() + offsetSec * 1000);
        const runAtMs = runAt.getTime();
        if (runAtMs <= nowMs || runAtMs >= warEndMs) continue;
        timeline.push({ runAt, filePath: audio.filePath, offsetSec });
      }
    }

    timeline.sort((a, b) => {
      const diff = a.runAt.getTime() - b.runAt.getTime();
      if (diff !== 0) return diff;
      return path.basename(a.filePath).localeCompare(path.basename(b.filePath));
    });

    if (timeline.length === 0) {
      return [false, "Không có mốc audio nào trong tương lai để phát."];
    }

    for (const item of timeline) {
      const job = schedule.scheduleJob(item.runAt, () => {
        state.queue.push(item.filePath);
        if (state.player.state.status === AudioPlayerStatus.Idle) {
          playNextInQueue();
        }
      });
      state.jobs.push(job);
    }

    state.activeSchedule = true;
    const messageByOffset = new Map<number, string>();
    for (const entry of NOTIFICATION_SCHEDULE) {
      if (!messageByOffset.has(entry.offsetSec)) {
        messageByOffset.set(entry.offsetSec, entry.message);
      }
    }

    const startHms = warStart.toLocaleTimeString("vi-VN", {
      timeZone: PING_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const previewLines = timeline.map((item) => {
      const hms = item.runAt.toLocaleTimeString("vi-VN", {
        timeZone: PING_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      const reminderMessage =
        messageByOffset.get(item.offsetSec) ?? path.basename(item.filePath);
      return `- ${hms} — ${reminderMessage}`;
    });

    const summary =
      `Đã lên lịch **${timeline.length}** lượt phát audio. Guild War bắt đầu lúc **${startHms}** \n` +
      previewLines.join("\n");

    return [true, summary];
  }

  /**
   * Dừng lịch phát audio đang chạy.
   * Thực hiện:
   * 1. Huỷ toàn bộ node-schedule Job
   * 2. Đặt activeSchedule = false
   * 3. Xoá hàng đợi queue
   * 4. player.stop(true) — dừng phát hiện tại
   * 5. Kill ffmpeg nếu đang chạy
   * @returns [count, detail] — count = số job đã huỷ
   */
  function stopSpeakingSchedule(): [count: number, detail: string] {
    const cancelled = clearJobs();
    state.activeSchedule = false;
    state.queue.length = 0;
    state.player.stop(true);
    stopCurrentPlaybackProcess();

    if (cancelled === 0) {
      return [0, "Không có lịch phát audio nào đang chạy."];
    }

    return [cancelled, `Đã dừng lịch phát audio (**${cancelled}** job).`];
  }

  /**
   * Trả về tóm tắt trạng thái voice hiện tại.
   * - joined: true nếu bot đang ở trong voice channel
   * - activeSchedule: true nếu đang chạy lịch phát audio
   * @returns Đối tượng trạng thái { joined, activeSchedule }
   */
  function getVoiceStateSummary(): {
    joined: boolean;
    activeSchedule: boolean;
  } {
    return {
      joined: Boolean(state.connection),
      activeSchedule: state.activeSchedule,
    };
  }

  return {
    joinVoice,
    leaveVoice,
    startSpeakingSchedule,
    stopSpeakingSchedule,
    getVoiceStateSummary,
  };
}

export default createSpeakingScheduleRuntime;