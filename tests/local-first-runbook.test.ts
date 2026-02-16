import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("local-first runbook documents required stack and operation commands", async () => {
  const runbook = await readFile("docs/local-first-runbook.md", "utf8")

  assert.equal(runbook.includes("React + TypeScript"), true)
  assert.equal(runbook.includes("Express + TypeScript"), true)
  assert.equal(runbook.includes("Playwright"), true)
  assert.equal(runbook.includes("npm start"), true)
  assert.equal(runbook.includes("make test"), true)
  assert.equal(runbook.includes("Minimal Deployment Path"), true)
})
