import assert from "node:assert/strict";
import test from "node:test";

import { bootstrapAppShell } from "../src/app-shell.js";

test("app shell bootstraps editor-first workspace without auth gate", () => {
  const appShell = bootstrapAppShell();

  assert.equal(appShell.route, "/");
  assert.equal(appShell.screen, "problem-workspace");
  assert.equal(appShell.requiresAuth, false);
  assert.deepEqual(appShell.primaryActions, ["run", "submit"]);
});
