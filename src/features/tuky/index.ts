// src/features/tuky/index.ts

import {
  ChatInputCommandInteraction,
  Client,
  Message,
  MessageFlags,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import type { BotContext, BotModule } from "../../app/types/botModule";
import { TUKY_CHANNEL_ID } from "../../shared/config";
import { replyEphemeralSafe } from "../../shared/discord/interaction";
import { ensureManageGuildAccess } from "../../shared/discord/permission";
import type { SlashCommandData } from "../../shared/types/command";
import { generateAutoReply, generateDramaScript } from "./services/geminiService";

// State
let configuredChannelId: string | null = TUKY_CHANNEL_ID ?? null;
let autoReplyRate = 0.2; // 20% random reply rate default
let isDramaRunning = false;

let storedPrimaryClient: Client | null = null;
let storedSecondaryClient: Client | null = null;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks if a text channel has been silent (no new messages) for at least `requiredSilentHours` hours.
 */
export async function isChannelSilentForHours(
  channel: TextChannel,
  requiredSilentHours: number = 3,
): Promise<boolean> {
  try {
    const recentMessages = await channel.messages.fetch({ limit: 1 });
    const lastMsg = recentMessages.first();
    if (!lastMsg) {
      return true; // No messages in channel -> considered silent
    }
    const msDiff = Date.now() - lastMsg.createdTimestamp;
    const hoursDiff = msDiff / (1000 * 60 * 60);
    return hoursDiff >= requiredSilentHours;
  } catch (err) {
    console.error("[TukyModule] Failed to check channel silence:", err);
    return false;
  }
}

/**
 * Execute the 2-bot ping-pong drama sequence in a text channel.
 */
export async function runDramaSequence(
  primaryClient: Client,
  secondaryClient: Client,
  channel: TextChannel,
  turnsCount: number = 6,
): Promise<{ success: boolean; count: number; error?: string }> {
  if (isDramaRunning) {
    return { success: false, count: 0, error: "Drama đang diễn ra rồi!" };
  }

  isDramaRunning = true;
  try {
    const script = await generateDramaScript(turnsCount);
    if (!script || script.length === 0) {
      return { success: false, count: 0, error: "Không thể tạo kịch bản Gemini AI." };
    }

    // Fetch channel with secondary client as well
    const secondaryChannel = await secondaryClient.channels
      .fetch(channel.id)
      .catch(() => null);

    let sentCount = 0;
    for (const turn of script) {
      if (turn.bot === 1) {
        await channel.send(turn.text);
        sentCount++;
      } else if (turn.bot === 2 && secondaryChannel && secondaryChannel.isTextBased()) {
        await (secondaryChannel as TextChannel).send(turn.text);
        sentCount++;
      } else {
        // Fallback if secondary client channel missing
        await channel.send(`[Chị gái Guild War Dzu Nhỏ]: ${turn.text}`);
        sentCount++;
      }
      // Wait 2.5 seconds between replies for natural pacing
      await delay(2500);
    }

    return { success: true, count: sentCount };
  } catch (err) {
    console.error("[TukyModule] Error running drama sequence:", err);
    return { success: false, count: 0, error: String(err) };
  } finally {
    isDramaRunning = false;
  }
}

/**
 * Slash command definition for /tuky
 */
export const tukyCommandData: SlashCommandData = new SlashCommandBuilder()
  .setName("tuky")
  .setDescription("Quản lý tính năng Bot Trả Treo & Bot Tự Kỷ")
  .addSubcommand((sub) =>
    sub.setName("drama").setDescription("Kích hoạt ngay màn 2 bot tự kỷ cãi nhau trong kênh"),
  )
  .addSubcommand((sub) =>
    sub
      .setName("set-channel")
      .setDescription("Cài đặt kênh chính phát sóng drama tự kỷ")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Kênh text muốn chọn")
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("rate")
      .setDescription("Điều chỉnh tỷ lệ trả treo ngẫu nhiên (0 - 100%)")
      .addIntegerOption((opt) =>
        opt
          .setName("percent")
          .setDescription("Tỷ lệ % (vd: 20)")
          .setMinValue(0)
          .setMaxValue(100)
          .setRequired(true),
      ),
  );

/**
 * Handle slash command /tuky
 */
export async function handleTukyCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();

  if (sub === "drama") {
    if (!interaction.guildId || !(interaction.channel instanceof TextChannel)) {
      await replyEphemeralSafe(interaction, "Lệnh này chỉ dùng được trong kênh văn bản server.");
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!storedPrimaryClient || !storedSecondaryClient) {
      await interaction.editReply("Bot clients chưa chuẩn bị xong.");
      return;
    }

    await interaction.editReply("🎭 Đang chuẩn bị kịch bản drama tự kỷ giữa Em Gái DzuTo & Chị Gái Dzu Nhỏ...");

    const result = await runDramaSequence(
      storedPrimaryClient,
      storedSecondaryClient,
      interaction.channel,
      6,
    );

    if (result.success) {
      await interaction.followUp({
        content: `✅ Màn drama tự kỷ đã hoàn tất với ${result.count} lượt hội thoại!`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.followUp({
        content: `❌ Không thể chạy drama: ${result.error}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  } else if (sub === "set-channel") {
    if (!(await ensureManageGuildAccess(interaction))) return;

    const channel = interaction.options.getChannel("channel");
    if (!(channel instanceof TextChannel)) {
      await replyEphemeralSafe(interaction, "Vui lòng chọn 1 Text Channel hợp lệ.");
      return;
    }

    configuredChannelId = channel.id;
    await replyEphemeralSafe(interaction, `✅ Đã cài đặt kênh tự kỷ chính là: <#${channel.id}>`);
  } else if (sub === "rate") {
    if (!(await ensureManageGuildAccess(interaction))) return;

    const percent = interaction.options.getInteger("percent", true);
    autoReplyRate = percent / 100;

    await replyEphemeralSafe(
      interaction,
      `✅ Đã cập nhật tỷ lệ trả treo ngẫu nhiên thành **${percent}%**.`,
    );
  }
}

/**
 * Handle auto-reply (trả treo) for incoming user messages
 */
export async function handleAutoReply(
  message: Message,
  context: BotContext,
): Promise<boolean> {
  // Ignore bots and non-text messages
  if (message.author.bot || !message.content || message.content.trim() === "") {
    return false;
  }

  const primaryBotId = context.primaryClient.user?.id;
  const isMentioned = primaryBotId ? message.mentions.has(primaryBotId) : false;
  const contentLower = message.content.toLowerCase();
  const isKeyword =
    contentLower.includes("bot") ||
    contentLower.includes("risingwind") ||
    contentLower.includes("trả treo");

  const roll = Math.random();
  const shouldReply = isMentioned || isKeyword || roll < autoReplyRate;

  if (!shouldReply) return false;

  const authorName = message.member?.displayName || message.author.username;
  const aiReply = await generateAutoReply(message.content, authorName);

  if (aiReply) {
    await message.reply(aiReply).catch((err) => {
      console.error("[TukyModule] Failed to send auto-reply message:", err);
    });
    return true;
  }

  return false;
}

export const tukyModule: BotModule = {
  name: "tuky",
  commands: [
    {
      name: "tuky",
      data: tukyCommandData,
      handle: handleTukyCommand,
    },
  ],
  messageHandlers: [
    {
      name: "tuky.autoReply",
      handle: async (message, context) => handleAutoReply(message, context),
    },
  ],
  onPrimaryReady: ({ primaryClient, secondaryClient }) => {
    storedPrimaryClient = primaryClient;
    storedSecondaryClient = secondaryClient;
  },
  scheduledJobs: [
    {
      name: "tuky.randomDrama",
      cron: "0,30 * * * *", // Check every 30 minutes
      run: async (context) => {
        if (!configuredChannelId) return;
        const fetched = await context.primaryClient.channels
          .fetch(configuredChannelId)
          .catch(() => null);

        if (fetched instanceof TextChannel) {
          const isSilent = await isChannelSilentForHours(fetched, 3);
          if (isSilent) {
            console.info("[TukyModule] Channel has been silent for >= 3 hours. Triggering drama.");
            await runDramaSequence(context.primaryClient, context.secondaryClient, fetched, 6);
          }
        }
      },
    },
  ],
};
