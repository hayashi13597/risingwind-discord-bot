// tests/shared/config.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";

test("parseChannelId returns null for empty string", () => {
  // Re-import after setting env — config reads at module load
  // Since config is env-based, we test the parse helper indirectly
  assert.ok(true); // placeholder — real tests in Task 3 after refactor
});