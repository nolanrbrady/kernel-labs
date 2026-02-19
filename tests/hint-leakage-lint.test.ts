import assert from "node:assert/strict"
import test from "node:test"

import { lintHintLeakage } from "../src/problems/hint-leakage-lint.js"
import { getReferencePythonSolution } from "../src/problems/reference-python-solutions.js"
import { getSeedProblemPack } from "../src/problems/seed-problem-pack.js"

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

test("hint leakage lint accepts seed hints that preserve challenge", () => {
  const problem = getSeedProblemPack()[0]
  const referenceSolution = getReferencePythonSolution(problem.id)
  assert.notEqual(referenceSolution, null)

  const result = lintHintLeakage({
    problem,
    referenceSolution: referenceSolution ?? ""
  })

  assert.equal(result.ok, true, JSON.stringify(result.issues, null, 2))
  assert.deepEqual(result.issues, [])
})

test("hint leakage lint blocks tier1 executable hint content", () => {
  const problem = clone(getSeedProblemPack()[0])
  const referenceSolution = getReferencePythonSolution(problem.id)
  assert.notEqual(referenceSolution, null)

  problem.hints.tier1 = "def solve(x): y = x @ w; return y"

  const result = lintHintLeakage({
    problem,
    referenceSolution: referenceSolution ?? ""
  })

  assert.equal(result.ok, false)
  assert.equal(
    result.issues.some((issue) => issue.code === "TIER1_CODE_LEAK"),
    true
  )
})
