import type { BotModule } from "../../app/types/botModule";
import { runScheduledPing, setClient } from "./application/pingService";

export const notificationsModule: BotModule = {
  name: "notifications",
  onPrimaryReady: ({ primaryClient }) => {
    setClient(primaryClient);
  },
  scheduledJobs: [
    {
      name: "notifications.runScheduledPing",
      cron: "* * * * *",
      run: async () => {
        await runScheduledPing();
      },
    },
  ],
};
