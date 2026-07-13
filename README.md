# RisingWind Bot

Discord bot cho quản lý guild: tạo poll GVG tự động, thông báo định kỳ, tự ban tin nhắn spam, và lập lịch phát audio trên voice channel.

## Tính năng

| Module | Lệnh | Mô tả |
|---|---|---|
| **poll** | `/poll create` | Tạo poll GVG trong kênh cố định. Tự động chạy theo cron mỗi tuần. |
| **notifications** | — (scheduled) | Gửi @everyone ping theo giờ và ngày trong tuần đã cấu hình. |
| **antibangw** | `/antibangw` | Tự động ban user gửi tin nhắn spam/bangw trong kênh được theo dõi. |
| **voice** | `/join`, `/leave`, `/speak_schedule`, `/stop_schedule` | Điều khiển bot vào/ra voice channel và phát audio theo lịch (MP3 trong `src/audios/`). |
| **help** | `/help` | Hiển thị danh sách lệnh của tất cả module đang bật. |

## Cấu trúc

```
src/
  app/              # Khung ứng dụng: lifecycle, registry, types
    types/botModule.ts        # BotModule interface (commands, messageHandlers, scheduledJobs, onReady)
    modules.ts                # Điểm bật/tắt module (createEnabledModules)
    lifecycle/                # Khởi tạo client, scheduler, voice coordinator
    registry/                 # Router cho slash commands và message handlers
  features/         # Module tính năng (mỗi thư mục con = 1 module)
    poll/
    notifications/
    antibangw/
    voice/
    help/
  shared/
    config/         # Đọc + validate env, parsing helpers
    discord/         # Tiện ích interaction, permission
    types/
  audios/            # File MP3 (format: MM_SS-MM_SS.mp3)
tests/              # Test song song với src/ (node:test runner)
```

Module hóa qua `BotModule`: mỗi feature export một `BotModule` với `commands[]`, `messageHandlers[]`, `scheduledJobs[]`, `onPrimaryReady()`. Thêm/bỏ feature chỉ cần sửa `src/app/modules.ts`.

## Setup

1. Copy `.env.example` sang `.env` và điền giá trị
2. Đặt file MP3 vào `src/audios/` (format tên: `MM_SS-MM_SS.mp3`)
3. `pnpm install`
4. `pnpm build && pnpm start`

Dev: `pnpm dev` (ts-node)
Test: `pnpm test`

## Biến môi trường

| Biến | Bắt buộc | Mặc định | Mô tả |
|---|---|---|---|
| `DISCORD_TOKEN` | Có | — | Token bot chính |
| `DISCORD_TOKEN_2` | Có | — | Token bot phụ (voice) |
| `POLL_CHANNEL_ID` | Có | — | ID kênh tạo poll |
| `POLL_TIMEZONE` | Không | `Asia/Bangkok` | Timezone cho poll scheduler |
| `POLL_CRON` | Không | `1 0 * * 1` | Cron tạo poll tự động (mặc định: thứ 2 00:01) |
| `PING_CHANNEL_ID` | Không | — | ID kênh gửi ping (bỏ qua nếu không set) |
| `PING_TIMEZONE` | Không | `Asia/Bangkok` | Timezone cho ping scheduler |
| `PING_TIMES` | Không | `20:00` | Giờ gửi, phân tách bằng dấu phẩy (VD: `20:00,21:00`) |
| `PING_WEEKDAYS` | Không | `0,1,2,3,4` | Ngày gửi (Mon=0…Sun=6) |
| `PING_MESSAGE` | Không | built-in | Override nội dung ping (mặc định có sẵn mention role/channel) |

## Tech

- **Runtime:** Node.js + TypeScript
- **Discord:** discord.js v14, @discordjs/voice
- **Scheduler:** node-schedule
- **Package manager:** pnpm
- **Test:** node:test runner
