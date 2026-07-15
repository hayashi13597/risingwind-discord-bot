import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PING_MESSAGE } from "../../src/shared/config";

test("DEFAULT_PING_MESSAGE contains GVG keyword for dedup detection", () => {
  assert.ok(
    DEFAULT_PING_MESSAGE.includes("ĐĂNG KÝ GVG"),
    "Default ping message must contain 'ĐĂNG KÝ GVG' for dedup detection",
  );
});
