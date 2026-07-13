import { test } from "node:test";
import assert from "node:assert/strict";
import { collectScheduledJobs } from "../../../src/app/lifecycle/registerSchedulers";
import type { BotModule } from "../../../src/app/types/botModule";

test("collectScheduledJobs flattens jobs from modules", () => {
  const modules: BotModule[] = [
    { name: "empty" },
    {
      name: "jobs",
      scheduledJobs: [
        { name: "job-a", cron: "* * * * *", run: () => {} },
        { name: "job-b", cron: "0 * * * *", run: () => {} },
      ],
    },
  ];

  const jobs = collectScheduledJobs(modules);

  assert.deepEqual(
    jobs.map((job) => job.name),
    ["job-a", "job-b"],
  );
});
