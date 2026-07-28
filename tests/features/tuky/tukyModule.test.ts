// tests/features/tuky/tukyModule.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { tukyModule, handleAutoReply } from "../../../src/features/tuky";

test("tukyModule has valid name and handlers", () => {
  assert.equal(tukyModule.name, "tuky");
  assert.ok(Array.isArray(tukyModule.commands));
  assert.equal(tukyModule.commands?.length, 1);
  assert.equal(tukyModule.commands?.[0]?.name, "tuky");
  assert.ok(Array.isArray(tukyModule.messageHandlers));
});

test("handleAutoReply ignores bot messages", async () => {
  const mockMessage: any = {
    author: { bot: true, username: "OtherBot" },
    content: "hello bot",
  };

  const mockContext: any = {
    primaryClient: { user: { id: "primary-123" } },
    secondaryClient: { user: { id: "secondary-456" } },
  };

  const handled = await handleAutoReply(mockMessage, mockContext);
  assert.equal(handled, false);
});
