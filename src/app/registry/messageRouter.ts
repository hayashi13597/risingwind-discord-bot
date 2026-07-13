import type { Message } from "discord.js";
import type { BotContext, BotModule } from "../types/botModule";

export async function handleMessageCreate(
  message: Message,
  context: BotContext,
  modules: BotModule[],
): Promise<boolean> {
  for (const module of modules) {
    for (const handler of module.messageHandlers ?? []) {
      if (await handler.handle(message, context)) return true;
    }
  }
  return false;
}
