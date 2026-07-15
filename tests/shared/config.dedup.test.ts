import { test } from "node:test";
import assert from "node:assert/strict";
import { PING_DEDUP_WINDOW_MS } from "../../src/shared/config";

test("PING_DEDUP_WINDOW_MS defaults to 5 minutes", () => {
  assert.equal(PING_DEDUP_WINDOW_MS, 5 * 60 * 1000);
});
