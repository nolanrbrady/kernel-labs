import assert from "node:assert/strict"
import test from "node:test"

import { getSeedProblemPack } from "../src/problems/seed-problem-pack.js"
import { getRuntimeProblemFixture } from "../src/problems/runtime-problem-fixtures.js"
import { getReferencePythonSolution } from "../src/problems/reference-python-solutions.js"
import { runStarterCodeAgainstToyInputs } from "../src/runtime/runtime-execution.js"

function isClose(left: number, right: number): boolean {
  const absoluteTolerance = 1e-6
  const relativeTolerance = 1e-5
  const delta = Math.abs(left - right)

  if (delta <= absoluteTolerance) {
    return true
  }

  const scale = Math.max(1, Math.abs(left), Math.abs(right))
  return delta <= relativeTolerance * scale
}

function areMatricesClose(actual: number[][], expected: number[][]): boolean {
  if (actual.length !== expected.length) {
    return false
  }

  for (let rowIndex = 0; rowIndex < actual.length; rowIndex += 1) {
    const actualRow = actual[rowIndex] ?? []
    const expectedRow = expected[rowIndex] ?? []
    if (actualRow.length !== expectedRow.length) {
      return false
    }

    for (let colIndex = 0; colIndex < actualRow.length; colIndex += 1) {
      if (!isClose(actualRow[colIndex] ?? 0, expectedRow[colIndex] ?? 0)) {
        return false
      }
    }
  }

  return true
}

test("reference Python solutions match runtime fixtures across the problem bank", () => {
  const seedIds = getSeedProblemPack().map((problem) => problem.id)
  const problemIds = Array.from(new Set([...seedIds, "attention_scaled_dot_product_v1"]))

  problemIds.forEach((problemId) => {
    const fixture = getRuntimeProblemFixture(problemId)
    assert.notEqual(fixture, null, `Missing runtime fixture for ${problemId}`)

    const referenceSolution = getReferencePythonSolution(problemId)
    assert.notEqual(referenceSolution, null, `Missing reference solution for ${problemId}`)

    const runResult = runStarterCodeAgainstToyInputs({
      problemId,
      userCode: referenceSolution ?? ""
    })

    assert.equal(
      runResult.status,
      "success",
      runResult.status === "failure"
        ? `${problemId}: ${runResult.errorCode} - ${runResult.message}`
        : `${problemId}: expected success`
    )

    if (runResult.status === "success") {
      assert.equal(
        areMatricesClose(runResult.output, fixture!.expectedOutput),
        true,
        `${problemId}: output mismatch for primary fixture`
      )
      assert.equal(
        runResult.testCaseResults.every((entry) => entry.passed),
        true,
        `${problemId}: failed cases: ${runResult.testCaseResults
          .filter((entry) => !entry.passed)
          .map((entry) => entry.id)
          .join(", ")}`
      )
    }
  })
})
