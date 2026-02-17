import assert from "node:assert/strict"
import test from "node:test"

import { lintProblemBank } from "../src/problems/problem-bank-lint.js"

test("problem bank lint enforces high-quality question standards", () => {
  const result = lintProblemBank()

  assert.equal(result.ok, true, result.errors.join("\n"))
  assert.deepEqual(result.warnings, [])
})

