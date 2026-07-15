import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PING_MESSAGE } from "../../src/shared/config";

test("DEFAULT_PING_MESSAGE contains invisible GVG_PING marker", () => {
  assert.ok(
    DEFAULT_PING_MESSAGE.includes("<!-- GVG_PING -->"),
    "Default ping message must contain the <!-- GVG_PING --> marker for deduplication",
  );
});
