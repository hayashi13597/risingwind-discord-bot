import type { BotModule } from "../../app/types/botModule";
import { pollCommand, handlePollCreate } from "./commands/poll.command";
import {
  POLL_CRON_EXPRESSION,
  createPollsIfMissing,
  setSchedulerClient,
} from "./application/pollScheduler";

export const pollModule: BotModule = {
  name: "poll",
  commands: [
    {
      name: "poll",
      data: pollCommand,
      handle: async (interaction) => {
        const sub = interaction.options.getSubcommand();
        if (sub === "create") await handlePollCreate(interaction);
      },
    },
  ],
  onPrimaryReady: ({ primaryClient }) => {
    setSchedulerClient(primaryClient);
  },
  scheduledJobs: [
    {
      name: "poll.createIfMissing",
      cron: POLL_CRON_EXPRESSION,
      run: async () => {
        await createPollsIfMissing();
      },
    },
  ],
};
