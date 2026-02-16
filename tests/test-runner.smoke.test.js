import assert from "node:assert/strict";
import test from "node:test";

test("test runner bootstraps and executes assertions", () => {
  assert.equal(2 + 2, 4);
});
