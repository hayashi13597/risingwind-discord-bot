// tests/features/antibangw/application/autoBanChannelStore.test.ts
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  resetAutoBanChannelStoreForTests,
  setAutoBanChannel,
  isAutoBanChannel,
  getAutoBanChannel,
  clearAutoBanChannel,
} from "../../../../src/features/antibangw/application/autoBanChannelStore";

beforeEach(() => {
  resetAutoBanChannelStoreForTests();
});

test("isAutoBanChannel returns false when no channel is set", () => {
  assert.equal(isAutoBanChannel("123", "456"), false);
});

test("isAutoBanChannel returns true when matching channel is set", () => {
  setAutoBanChannel({ guildId: "123", channelId: "456", enabledAt: "2026-01-01T00:00:00Z" });
  assert.equal(isAutoBanChannel("123", "456"), true);
});

test("isAutoBanChannel returns false for wrong channel", () => {
  setAutoBanChannel({ guildId: "123", channelId: "456", enabledAt: "2026-01-01T00:00:00Z" });
  assert.equal(isAutoBanChannel("123", "789"), false);
});

test("clearAutoBanChannel removes the entry", () => {
  setAutoBanChannel({ guildId: "123", channelId: "456", enabledAt: "2026-01-01T00:00:00Z" });
  clearAutoBanChannel("123");
  assert.equal(getAutoBanChannel("123"), null);
  assert.equal(isAutoBanChannel("123", "456"), false);
});

test("getAutoBanChannel returns the stored state", () => {
  const state = { guildId: "123", channelId: "456", enabledAt: "2026-01-01T00:00:00Z" };
  setAutoBanChannel(state);
  const got = getAutoBanChannel("123");
  assert.deepEqual(got, state);
});