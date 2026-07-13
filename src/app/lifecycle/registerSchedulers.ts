import cron from "node-cron";
import type {
  BotContext,
  BotModule,
  ScheduledJobDefinition,
} from "../types/botModule";

export function collectScheduledJobs(
  modules: BotModule[],
): ScheduledJobDefinition[] {
  return modules.flatMap((module) => module.scheduledJobs ?? []);
}

export function registerSchedulers(
  context: BotContext,
  modules: BotModule[],
): void {
  for (const job of collectScheduledJobs(modules)) {
    cron.schedule(job.cron, () => {
      Promise.resolve(job.run(context)).catch((err) =>
        console.error(`Scheduled job failed: ${job.name}`, err),
      );
    });
  }
}
