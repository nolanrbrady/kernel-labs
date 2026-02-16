import assert from "node:assert/strict"
import test from "node:test"

import {
  createHintFlowState,
  revealNextHint,
  summarizeHintUsageForScheduler
} from "../src/hints/hint-tier-flow.js"

test("hints are revealed strictly in tier order", () => {
  const initialState = createHintFlowState("attention_scaled_dot_product_v1", {
    tier1: "Start by checking expected tensor shapes for q, k, and v.",
    tier2: "Compute scores with q @ k^T before applying any mask.",
    tier3: "Apply softmax(scores / sqrt(d_k)) then multiply by v."
  })

  const firstReveal = revealNextHint(initialState)
  const secondReveal = revealNextHint(firstReveal.state)
  const thirdReveal = revealNextHint(secondReveal.state)
  const fourthReveal = revealNextHint(thirdReveal.state)

  assert.equal(firstReveal.revealedHint?.tier, 1)
  assert.equal(secondReveal.revealedHint?.tier, 2)
  assert.equal(thirdReveal.revealedHint?.tier, 3)
  assert.equal(fourthReveal.revealedHint, null)
  assert.equal(fourthReveal.hasMoreHints, false)
})

test("hint usage summary tracks scheduler-facing tier and count", () => {
  const initialState = createHintFlowState("normalization_layernorm_v1", {
    tier1: "Center each token by subtracting the mean over hidden size.",
    tier2: "Use variance + epsilon before taking sqrt for stability.",
    tier3: "Scale with gamma and shift with beta after normalization."
  })

  const firstReveal = revealNextHint(initialState)
  const secondReveal = revealNextHint(firstReveal.state)

  const summary = summarizeHintUsageForScheduler(secondReveal.state)

  assert.equal(summary.hintTierUsed, 2)
  assert.equal(summary.hintRequestsCount, 2)
})
