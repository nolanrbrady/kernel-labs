import assert from "node:assert/strict"
import test from "node:test"

import { startServer } from "../src/backend/server.js"

test("suggest-topic endpoint validates draft against ProblemSpecV2 and returns valid status", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/problems/suggest-topic`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "Rotary Position Encoding For Toy Attention Projections",
        problemType: "Positional Encoding",
        difficulty: "Medium",
        learningObjective:
          "Implement rotary position encoding correctly for toy attention projections, preserving shape semantics while validating deterministic rotational behavior under fixed sinusoidal inputs.",
        context:
          "Rotary position encoding is used in transformer attention stacks to inject relative position information through pairwise channel rotations. This suggestion focuses on the smallest runnable unit so learners can see exactly how even and odd feature channels are combined with cosine and sine terms, and why preserving shape and numeric stability matters when moving from conceptual formulas to executable code. The problem should keep operations deterministic and transparent for debugging.",
        inputSpecification:
          "q: [2, 4]; k: [2, 4]; cos: [2, 2]; sin: [2, 2]",
        outputSpecification:
          "Return rotated q and k tensors with shape [2, 4], preserving finite values, deterministic behavior, and correct pairwise channel rotation semantics under fixed toy sinusoidal coefficients.",
        constraintsAndEdgeCases:
          "toy tensors only; verify finite output values; enforce even hidden dimension for pairwise channel rotation; validate deterministic outputs on fixed coefficients; include edge behavior for repeated rows",
        starterSignature: "def apply_rope(q, k, cos, sin):",
        visibleTestCasePlan:
          "Case 1 baseline deterministic rotation; Case 2 repeated-row stability check; Case 3 shape-preserving finite-output verification",
        hints:
          "Start by grouping feature channels into rotation pairs and verify that each pair is transformed consistently for every toy sequence position before combining outputs.; Apply cosine and sine coefficients per channel pair in explicit intermediate steps so you can inspect deterministic rotated values and confirm that no unintended broadcasting or axis swaps occur.; Validate deterministic outputs, finite-value behavior, shape invariants, and repeated-row consistency across all visible cases before treating the implementation as correct under the provisional ProblemSpecV2 contract.",
        paperLink: "https://arxiv.org/abs/2104.09864",
        notes:
          "Keep this atomic and runnable in under 30 minutes with deterministic toy tensors only."
      })
    }
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.status, "valid")
  assert.equal(typeof payload.provisionalSpecId, "string")
  assert.equal(payload.provisionalSpecId.endsWith("_v1"), true)
  assert.deepEqual(payload.errors, [])
})

test("suggest-topic endpoint returns invalid status with ProblemSpecV2 errors for shallow drafts", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/problems/suggest-topic`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "Short",
        problemType: "Attention",
        difficulty: "Easy",
        learningObjective: "Learn attention.",
        context: "Short context.",
        inputSpecification: "x",
        outputSpecification: "y",
        constraintsAndEdgeCases: "toy",
        starterSignature: "def solve(x):",
        visibleTestCasePlan: "Case 1 basic",
        hints: "hint",
        paperLink: "https://arxiv.org/abs/1706.03762",
        notes: "note"
      })
    }
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.status, "invalid")
  assert.equal(Array.isArray(payload.errors), true)
  assert.equal(payload.errors.length > 0, true)
  assert.equal(
    payload.errors.some((entry: string) => {
      return entry.includes("learning_objective is too short")
    }),
    true
  )
})
