import type { BotModule } from "../../app/types/botModule";
import { antibangwCommand, handleAntibangw } from "./commands/antibangw.command";
import { handleAutoBanMessage } from "./application/autoBanMessageHandler";

export const antibangwModule: BotModule = {
  name: "antibangw",
  commands: [
    {
      name: "antibangw",
      data: antibangwCommand,
      handle: handleAntibangw,
    },
  ],
  messageHandlers: [
    {
      name: "antibangw.autoBanMessage",
      handle: async (message) => handleAutoBanMessage(message),
    },
  ],
};
