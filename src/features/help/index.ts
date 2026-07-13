import type { BotModule } from "../../app/types/botModule";
import { replyEphemeralSafe } from "../../shared/discord/interaction";
import {
  formatHelpText,
  helpCommand,
} from "./commands/help.command";

/**
 * Create the help module.
 * @param getModules - Getter for the current module list (used to enumerate commands at runtime)
 */
export function createHelpModule(options: {
  getModules: () => BotModule[];
}): BotModule {
  return {
    name: "help",
    commands: [
      {
        name: "help",
        data: helpCommand,
        handle: async (interaction) => {
          const text = formatHelpText(options.getModules());
          await replyEphemeralSafe(interaction, text);
        },
      },
    ],
  };
}
