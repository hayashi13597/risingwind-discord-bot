import { test } from "node:test";
import assert from "node:assert/strict";
import { isRecentDuplicate } from "../../../../src/features/notifications/application/pingService";

test("isRecentDuplicate returns false for null message", () => {
  assert.equal(isRecentDuplicate(null, Date.now()), false);
});

test("isRecentDuplicate returns false for message without GVG keyword", () => {
  const msg = {
    content: "Hello world, no GVG ping here",
    createdTimestamp: Date.now() - 10_000,
  } as any;
  assert.equal(isRecentDuplicate(msg, Date.now()), false);
});

test("isRecentDuplicate returns true for recent message with GVG keyword", () => {
  const now = Date.now();
  const msg = {
    content: "🎖️🎖️🎖️ĐĂNG KÝ GVG CUỐI TUẦN🎖️🎖️🎖️\n\nAnh em vào...",
    createdTimestamp: now - 10_000, // 10 seconds ago
  } as any;
  assert.equal(isRecentDuplicate(msg, now), true);
});

test("isRecentDuplicate returns false for old message with GVG keyword", () => {
  const now = Date.now();
  const msg = {
    content: "🎖️🎖️🎖️ĐĂNG KÝ GVG CUỐI TUẦN🎖️🎖️🎖️",
    createdTimestamp: now - 10 * 60 * 1000, // 10 minutes ago (> 5min window)
  } as any;
  assert.equal(isRecentDuplicate(msg, now), false);
});
