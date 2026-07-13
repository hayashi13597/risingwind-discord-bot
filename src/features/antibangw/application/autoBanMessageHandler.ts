import type { Message } from "discord.js";
import { isAutoBanChannel } from "./autoBanChannelStore";

export async function handleAutoBanMessage(message: Message): Promise<boolean> {
  if (message.author.bot) return false;
  if (!message.guild) return false;
  if (!isAutoBanChannel(message.guild.id, message.channel.id)) return false;

  try {
    const member =
      message.member ??
      (await message.guild.members.fetch(message.author.id));
    if (
      member?.permissions?.has("Administrator") ||
      member?.permissions?.has("ManageGuild")
    ) {
      return false;
    }
  } catch {
    // If we can't fetch the member, proceed with ban (safer)
  }

  try {
    await message.delete();
    await message.guild.members.ban(message.author.id, {
      deleteMessageSeconds: 60,
    });
    return true;
  } catch (err) {
    console.error("Auto-ban failed", err);
    return true;
  }
}
