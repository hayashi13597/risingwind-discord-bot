import { test } from "node:test";
import assert from "node:assert/strict";
import { handleMessageCreate } from "../../../src/app/registry/messageRouter";
import type { BotContext, BotModule } from "../../../src/app/types/botModule";

const context = {} as BotContext;
const message = {} as never;

test("handleMessageCreate stops after first handler returns true", async () => {
  const calls: string[] = [];
  const modules: BotModule[] = [
    {
      name: "first",
      messageHandlers: [
        {
          name: "first-handler",
          handle: async () => {
            calls.push("first");
            return true;
          },
        },
      ],
    },
    {
      name: "second",
      messageHandlers: [
        {
          name: "second-handler",
          handle: async () => {
            calls.push("second");
            return true;
          },
        },
      ],
    },
  ];

  const handled = await handleMessageCreate(message, context, modules);

  assert.equal(handled, true);
  assert.deepEqual(calls, ["first"]);
});
