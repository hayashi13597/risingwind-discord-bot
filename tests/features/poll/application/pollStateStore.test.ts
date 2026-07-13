// tests/features/poll/application/pollStateStore.test.ts
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

// We'll need to mock process.cwd or use a temp dir
// For now, test the pure validation function

import {
  isPollStateExpired,
} from "../../../../src/features/poll/application/pollStateStore";

test("isPollStateExpired returns true when expiresAt is in the past", () => {
  const state = {
    weekKey: "2026-07-18",
    channelId: "123",
    saturdayMessageId: "456",
    sundayMessageId: "789",
    expiresAt: "2026-07-19T23:59:00.000Z",
  };
  const now = new Date("2026-07-20T00:00:00.000Z");
  assert.equal(isPollStateExpired(state, now), true);
});

test("isPollStateExpired returns false when expiresAt is in the future", () => {
  const state = {
    weekKey: "2026-07-18",
    channelId: "123",
    saturdayMessageId: "456",
    sundayMessageId: "789",
    expiresAt: "2026-07-19T23:59:00.000Z",
  };
  const now = new Date("2026-07-19T12:00:00.000Z");
  assert.equal(isPollStateExpired(state, now), false);
});