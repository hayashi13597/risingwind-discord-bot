// src/features/poll/commands/poll.command.ts

import {
  ChatInputCommandInteraction,
  Message,
  MessageFlags,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { SlashCommandData } from "../../../shared/types/command";
import { replyEphemeralSafe } from "../../../shared/discord/interaction";
import { ensureManageGuildAccess } from "../../../shared/discord/permission";
import {
  POLL_CHANNEL_ID,
  POLL_TIMEZONE,
} from "../../../shared/config";
import { buildPollTitle, getCurrentPollWeek } from "../domain/pollWeek";
import { createPollsCore } from "../application/pollScheduler";

/**
 * Build a Discord message URL from guild, channel, and message IDs.
 * @param guildId - Discord guild ID
 * @param channelId - Discord channel ID
 * @param messageId - Discord message ID
 * @returns Full URL to the message
 */
export function buildMessageUrl(guildId: string, channelId: string, messageId: string): string {
  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

/**
 * Fetch the poll channel from Discord client.
 * @param interaction - The command interaction (provides client access)
 * @returns TextChannel or null if channel not found/not a text channel
 */
async function getPollChannel(
  interaction: ChatInputCommandInteraction,
): Promise<TextChannel | null> {
  if (!POLL_CHANNEL_ID) return null;
  const fetched = await interaction.client.channels.fetch(POLL_CHANNEL_ID);
  return fetched instanceof TextChannel ? fetched : null;
}

/**
 * Slash command definition for /poll.
 * Subcommand: "create" — manually create GVG polls for current week.
 */
export const pollCommand: SlashCommandData = new SlashCommandBuilder()
  .setName("poll")
  .setDescription("Tạo poll vote GVG cho T7 và CN")
  .addSubcommand((sub) =>
    sub.setName("create").setDescription("Tạo poll GVG cho tuần hiện tại"),
  );

/**
 * Handle /poll create — creates Saturday and Sunday polls in the configured channel.
 *
 * Logic:
 * 1. Verify caller has Manage Server permission
 * 2. Fetch poll channel → error if not text channel
 * 3. Create Saturday poll (2 options: Full / Tham gia sau 8 giờ)
 * 4. Create Sunday poll (same 2 options)
 * 5. Reply with links to both polls
 *
 * @param interaction - The chat input command interaction
 */
export async function handlePollCreate(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  // Permission check — only server managers can create polls
  if (!(await ensureManageGuildAccess(interaction))) return;

  if (!interaction.guildId) {
    await replyEphemeralSafe(interaction, "This command can only be used in a server.");
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Validate config — poll channel must be set
  if (!POLL_CHANNEL_ID) {
    await interaction.editReply("Thiếu cấu hình `POLL_CHANNEL_ID` trong .env.");
    return;
  }

  const week = getCurrentPollWeek();

  // Fetch the poll channel
  const channel = await getPollChannel(interaction);
  if (!channel) {
    await interaction.editReply(
      "Channel cấu hình cho poll không tồn tại hoặc không phải text channel.",
    );
    return;
  }

  try {
    const [ok, detail] = await createPollsCore("manual");

    if (!ok) {
      await interaction.editReply(`Không thể tạo poll: ${detail}`);
      return;
    }

    // Fetch the newly created polls to build links
    const messages = await channel.messages.fetch({ limit: 5 });
    const saturdayTitle = buildPollTitle("saturday", week.saturday);
    const sundayTitle = buildPollTitle("sunday", week.sunday);

    let saturdayMsg: Message | undefined;
    let sundayMsg: Message | undefined;

    for (const [, message] of messages) {
      if (message.poll?.question?.text === saturdayTitle) saturdayMsg = message;
      if (message.poll?.question?.text === sundayTitle) sundayMsg = message;
    }

    const lines = [
      `Đã tạo poll GVG tuần hiện tại trong <#${channel.id}>.`,
    ];

    if (saturdayMsg) {
      lines.push(`T7: ${buildMessageUrl(interaction.guildId, channel.id, saturdayMsg.id)}`);
    }
    if (sundayMsg) {
      lines.push(`CN: ${buildMessageUrl(interaction.guildId, channel.id, sundayMsg.id)}`);
    }
    lines.push(`Múi giờ poll: \`${POLL_TIMEZONE}\`.`);

    await interaction.editReply(lines.join("\n"));
  } catch (error) {
    console.error("Failed to create polls", error);
    await interaction.editReply(
      "Không thể tạo poll. Vui lòng kiểm tra quyền gửi poll của bot.",
    );
  }
}