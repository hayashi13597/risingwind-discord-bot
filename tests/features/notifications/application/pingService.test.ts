import { test } from "node:test";
import assert from "node:assert/strict";
import { isRecentDuplicate } from "../../../../src/features/notifications/application/pingService";

test("isRecentDuplicate returns false for null message", () => {
  assert.equal(isRecentDuplicate(null, Date.now()), false);
});

test("isRecentDuplicate returns false for message without marker", () => {
  const msg = {
    content: "Hello world, no marker here",
    createdTimestamp: Date.now() - 10_000,
  } as any;
  assert.equal(isRecentDuplicate(msg, Date.now()), false);
});

test("isRecentDuplicate returns true for recent message with marker", () => {
  const now = Date.now();
  const msg = {
    content: "GVG ping message <!-- GVG_PING -->",
    createdTimestamp: now - 10_000, // 10 seconds ago
  } as any;
  assert.equal(isRecentDuplicate(msg, now), true);
});

test("isRecentDuplicate returns false for old message with marker", () => {
  const now = Date.now();
  const msg = {
    content: "GVG ping message <!-- GVG_PING -->",
    createdTimestamp: now - 10 * 60 * 1000, // 10 minutes ago
  } as any;
  assert.equal(isRecentDuplicate(msg, now), false);
});
