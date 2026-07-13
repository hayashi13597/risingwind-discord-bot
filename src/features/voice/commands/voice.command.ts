// src/features/voice/commands/voice.command.ts
//
// Voice Slash Commands — Định nghĩa và xử lý 4 lệnh slash cho voice:
// - /join            : Yêu cầu bot đã chọn tham gia voice channel
// - /leave           : Yêu cầu bot đã chọn rời voice channel
// - /speak_schedule  : Bắt đầu lịch phát audio trên tất cả bot
// - /stop_schedule   : Dừng lịch phát audio trên tất cả bot
//
// Mỗi lệnh (trừ speak_schedule/stop_schedule) có tuỳ chọn "bot" bắt buộc
// để chọn bot primary hay secondary. speak_schedule/stop_schedule chạy trên
// cả hai bot cùng lúc.

import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  type APIApplicationCommandOptionChoice,
} from "discord.js";
import { SlashCommandData } from "../../../shared/types/command";
import type {
  VoiceBotKey,
  VoiceCoordinator,
} from "../application/voiceCoordinator";

// ─── Tuỳ chọn fallback cho option "bot" ────────────────────

/**
 * Danh sách choice mặc định cho slash command option "bot".
 * Sử dụng khi không truyền danh sách choice từ coordinator.
 * Mỗi phần tử: { name: nhãn hiển thị, value: khoá bot }.
 */
const fallbackBotChoices: APIApplicationCommandOptionChoice<string>[] = [
  { name: "Primary Bot", value: "primary" },
  { name: "Secondary Bot", value: "secondary" },
];

// ─── Hàm tiện ích ─────────────────────────────────────────

/**
 * Thêm option "bot" (string, required) vào slash command builder.
 * Option này cho phép người dùng chọn bot primary hoặc secondary.
 *
 * @param builder   - SlashCommandBuilder cần thêm option
 * @param botChoices - Danh sách choice cho option "bot"
 * @returns Builder đã được thêm option (kiểu SlashCommandOptionsOnlyBuilder)
 */
function addBotOption(
  builder: SlashCommandBuilder,
  botChoices: APIApplicationCommandOptionChoice<string>[],
): SlashCommandOptionsOnlyBuilder {
  return builder.addStringOption((opt) =>
    opt
      .setName("bot")
      .setDescription("Bot voice sẽ thực hiện lệnh")
      .setRequired(true)
      .addChoices(...botChoices),
  );
}

/**
 * Lấy khoá bot từ option "bot" của interaction và xác thực qua coordinator.
 *
 * @param interaction - Slash command interaction
 * @param coordinator - VoiceCoordinator dùng để kiểm tra tính hợp lệ
 * @returns VoiceBotKey nếu hợp lệ, null nếu không hợp lệ
 */
function getSelectedBotKey(
  interaction: ChatInputCommandInteraction,
  coordinator: VoiceCoordinator,
): VoiceBotKey | null {
  const key = interaction.options.getString("bot", true);
  if (!coordinator.hasBot(key)) {
    return null;
  }
  return key;
}

// ─── Định nghĩa Slash Command ─────────────────────────────

/**
 * Tạo slash command /join với:
 * - Option "bot" (required): chọn bot primary/secondary
 * - Option "voice_channel" (required): chọn voice channel cần tham gia
 *
 * @param botChoices - Danh sách choice cho option "bot" (mặc định fallback)
 * @returns SlashCommandData cho /join
 */
export function createJoinCommand(
  botChoices = fallbackBotChoices,
): SlashCommandData {
  return addBotOption(
    new SlashCommandBuilder()
      .setName("join")
      .setDescription("Cho bot tham gia voice channel"),
    botChoices,
  ).addChannelOption((opt) =>
    opt
      .setName("voice_channel")
      .setDescription("Voice channel mà bot sẽ tham gia")
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildVoice),
  );
}

/**
 * Tạo slash command /leave với:
 * - Option "bot" (required): chọn bot primary/secondary
 *
 * @param botChoices - Danh sách choice cho option "bot" (mặc định fallback)
 * @returns SlashCommandData cho /leave
 */
export function createLeaveCommand(
  botChoices = fallbackBotChoices,
): SlashCommandData {
  return addBotOption(
    new SlashCommandBuilder()
      .setName("leave")
      .setDescription("Cho bot thoát khỏi voice channel đang tham gia"),
    botChoices,
  );
}

/**
 * Slash command /join mặc định (dùng fallback bot choices).
 */
export const joinCommand = createJoinCommand();

/**
 * Slash command /leave mặc định (dùng fallback bot choices).
 */
export const leaveCommand = createLeaveCommand();

/**
 * Slash command /speak_schedule — Bắt đầu phát file mp3 theo lịch Guild War.
 * Lệnh này chạy trên cả hai bot cùng lúc (startScheduleForAll).
 */
export const speakScheduleCommand: SlashCommandData = new SlashCommandBuilder()
  .setName("speak_schedule")
  .setDescription("Bắt đầu phát file mp3 theo lịch Guild War");

/**
 * Slash command /stop_schedule — Dừng lịch phát mp3 đang chạy.
 * Lệnh này dừng trên cả hai bot cùng lúc (stopScheduleForAll).
 */
export const stopScheduleCommand: SlashCommandData = new SlashCommandBuilder()
  .setName("stop_schedule")
  .setDescription("Dừng lịch phát mp3 đang chạy");

// ─── Handler cho từng lệnh ────────────────────────────────

/**
 * Xử lý lệnh /join — Yêu cầu bot đã chọn tham gia voice channel.
 *
 * Luồng xử lý:
 * 1. Kiểm tra lệnh được dùng trong server (guild)
 * 2. Lấy khoá bot từ option, xác thực qua coordinator
 * 3. Lấy voice channel từ option, kiểm tra loại channel
 * 4. Gọi coordinator.join() để bot tham gia channel
 * 5. Phản hồi kết quả (ephemeral nếu lỗi)
 *
 * @param interaction - Slash command interaction
 * @param coordinator - VoiceCoordinator điều phối bot voice
 */
export async function handleJoinCommand(
  interaction: ChatInputCommandInteraction,
  coordinator: VoiceCoordinator,
): Promise<void> {
  // Lệnh chỉ dùng được trong server, không dùng được trong DM
  if (!interaction.guild) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Lấy khoá bot từ option "bot" và xác thực
  const botKey = getSelectedBotKey(interaction, coordinator);
  if (!botKey) {
    await interaction.reply({
      content: "Bot được chọn không hợp lệ.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Lấy voice channel từ option "voice_channel"
  const target = interaction.options.getChannel("voice_channel", true);
  // Kiểm tra channel có phải voice channel hay không
  if (target.type !== ChannelType.GuildVoice) {
    await interaction.reply({
      content: "Channel được chọn không phải voice channel.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Yêu cầu coordinator cho bot tham gia voice channel
  const result = await coordinator.join(botKey, interaction.guild.id, target.id);
  // Phản hồi kết quả: ephemeral nếu thất bại, công khai nếu thành công
  await interaction.reply({
    content: result.detail,
    flags: result.ok ? undefined : MessageFlags.Ephemeral,
  });
}

/**
 * Xử lý lệnh /leave — Yêu cầu bot đã chọn rời voice channel.
 *
 * Luồng xử lý:
 * 1. Lấy khoá bot từ option, xác thực qua coordinator
 * 2. Gọi coordinator.leave() để bot rời channel
 * 3. Phản hồi kết quả (ephemeral nếu lỗi)
 *
 * @param interaction - Slash command interaction
 * @param coordinator - VoiceCoordinator điều phối bot voice
 */
export async function handleLeaveCommand(
  interaction: ChatInputCommandInteraction,
  coordinator: VoiceCoordinator,
): Promise<void> {
  // Lấy khoá bot từ option "bot" và xác thực
  const botKey = getSelectedBotKey(interaction, coordinator);
  if (!botKey) {
    await interaction.reply({
      content: "Bot được chọn không hợp lệ.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Yêu cầu coordinator cho bot rời voice channel
  const result = coordinator.leave(botKey);
  // Phản hồi kết quả: ephemeral nếu thất bại, công khai nếu thành công
  await interaction.reply({
    content: result.detail,
    flags: result.ok ? undefined : MessageFlags.Ephemeral,
  });
}

/**
 * Xử lý lệnh /speak_schedule — Bắt đầu lịch phát audio trên tất cả bot.
 *
 * Luồng xử lý:
 * 1. Defer reply (ephemeral) vì có thể mất thời gian khởi động lịch
 * 2. Gọi coordinator.startScheduleForAll() để bắt đầu lịch trên cả hai bot
 * 3. followUp với kết quả chi tiết từng bot
 *
 * @param interaction - Slash command interaction
 * @param coordinator - VoiceCoordinator điều phối bot voice
 */
export async function handleSpeakScheduleCommand(
  interaction: ChatInputCommandInteraction,
  coordinator: VoiceCoordinator,
): Promise<void> {
  // Defer reply vì bắt đầu lịch có thể mất thời gian
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  // Bắt đầu lịch phát audio trên tất cả bot
  const result = await coordinator.startScheduleForAll();
  // Phản hồi kết quả chi tiết từng bot
  await interaction.followUp({
    content: result.detail,
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * Xử lý lệnh /stop_schedule — Dừng lịch phát audio trên tất cả bot.
 *
 * Luồng xử lý:
 * 1. Gọi coordinator.stopScheduleForAll() để dừng lịch trên cả hai bot
 * 2. Phản hồi kết quả chi tiết từng bot (ephemeral)
 *
 * @param interaction - Slash command interaction
 * @param coordinator - VoiceCoordinator điều phối bot voice
 */
export async function handleStopScheduleCommand(
  interaction: ChatInputCommandInteraction,
  coordinator: VoiceCoordinator,
): Promise<void> {
  // Dừng lịch phát audio trên tất cả bot (đồng bộ, không cần defer)
  const result = coordinator.stopScheduleForAll();
  // Phản hồi kết quả chi tiết từng bot
  await interaction.reply({
    content: result.detail,
    flags: MessageFlags.Ephemeral,
  });
}