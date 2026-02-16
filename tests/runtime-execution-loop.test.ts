import assert from "node:assert/strict"
import test from "node:test"

import { getRuntimeProblemFixture } from "../src/problems/runtime-problem-fixtures.js"
import { runStarterCodeAgainstToyInputs } from "../src/runtime/runtime-execution.js"

const CORRECT_ATTENTION_CODE = `
def scaled_dot_product_attention(q, k, v, mask=None):
    import numpy as np
    scores = (q @ k.T) / np.sqrt(k.shape[-1])
    if mask is not None:
        scores = scores + mask
    weights = np.exp(scores - np.max(scores, axis=-1, keepdims=True))
    weights = weights / np.sum(weights, axis=-1, keepdims=True)
    return weights @ v
`

test("runtime run success path executes submitted code against deterministic toy input", () => {
  const fixture = getRuntimeProblemFixture("attention_scaled_dot_product_v1")
  assert.notEqual(fixture, null)

  const successfulRun = runStarterCodeAgainstToyInputs({
    problemId: "attention_scaled_dot_product_v1",
    userCode: CORRECT_ATTENTION_CODE
  })

  assert.equal(successfulRun.status, "success")

  if (successfulRun.status === "success") {
    assert.equal(successfulRun.problemId, "attention_scaled_dot_product_v1")
    assert.equal(Array.isArray(successfulRun.inputs.q), true)
    assert.equal(Array.isArray(successfulRun.output), true)
    assert.deepEqual(successfulRun.output, fixture?.expectedOutput)
    assert.equal(Array.isArray(successfulRun.testCaseResults), true)
    assert.equal(successfulRun.testCaseResults.length > 0, true)
    assert.equal(successfulRun.testCaseResults.every((entry) => entry.passed), true)
    assert.equal(typeof successfulRun.runtimeStdout, "string")
    assert.equal(successfulRun.preloadedPackages.includes("numpy"), true)
    assert.equal(successfulRun.message.includes("Run complete"), true)
  }
})

test("runtime run output changes when submitted solution changes", () => {
  const incorrectRun = runStarterCodeAgainstToyInputs({
    problemId: "attention_scaled_dot_product_v1",
    userCode:
      "def scaled_dot_product_attention(q, k, v, mask=None):\n    return q @ k.T"
  })
  const correctRun = runStarterCodeAgainstToyInputs({
    problemId: "attention_scaled_dot_product_v1",
    userCode: CORRECT_ATTENTION_CODE
  })

  assert.equal(incorrectRun.status, "success")
  assert.equal(correctRun.status, "success")

  if (incorrectRun.status === "success" && correctRun.status === "success") {
    assert.notDeepEqual(incorrectRun.output, correctRun.output)
    assert.equal(
      incorrectRun.testCaseResults.some((entry) => entry.passed === false),
      true
    )
    assert.equal(correctRun.testCaseResults.every((entry) => entry.passed), true)
  }
})

test("runtime preloads torch and pandas aliases for user code when available", () => {
  const runResult = runStarterCodeAgainstToyInputs({
    problemId: "attention_scaled_dot_product_v1",
    userCode: `
def scaled_dot_product_attention(q, k, v, mask=None):
    print("preloaded", "np" in globals(), "torch" in globals(), "pd" in globals())
    if "torch" in globals() and "pd" in globals():
        frame = pd.DataFrame(q)
        as_tensor = torch.tensor(frame.values, dtype=torch.float64)
        return as_tensor.tolist()
    return q.tolist()
`
  })

  assert.equal(runResult.status, "success")
  if (runResult.status === "success") {
    assert.equal(runResult.preloadedPackages.includes("numpy"), true)
    assert.equal(runResult.runtimeStdout.includes("preloaded"), true)
  }
})

test("runtime run failure path returns supportive actionable feedback for execution errors", () => {
  const failedRun = runStarterCodeAgainstToyInputs({
    problemId: "attention_scaled_dot_product_v1",
    userCode:
      "def scaled_dot_product_attention(q, k, v, mask=None):\n    raise ValueError('broken')"
  })

  assert.equal(failedRun.status, "failure")

  if (failedRun.status === "failure") {
    assert.equal(failedRun.problemId, "attention_scaled_dot_product_v1")
    assert.equal(failedRun.errorCode, "EXECUTION_ERROR")
    assert.equal(failedRun.message.length > 0, true)
    assert.equal(failedRun.actionableSteps.length > 0, true)
    assert.equal(failedRun.supportiveTone, true)
  }
})

test("runtime run failure includes captured stdout for print-based debugging", () => {
  const failedRun = runStarterCodeAgainstToyInputs({
    problemId: "attention_scaled_dot_product_v1",
    userCode:
      "def scaled_dot_product_attention(q, k, v, mask=None):\n    print('debug-shape', q.shape)\n    raise ValueError('broken')"
  })

  assert.equal(failedRun.status, "failure")

  if (failedRun.status === "failure") {
    assert.equal(typeof failedRun.runtimeStdout, "string")
    assert.equal(failedRun.runtimeStdout?.includes("debug-shape"), true)
  }
})
