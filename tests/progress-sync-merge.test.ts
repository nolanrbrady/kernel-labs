import assert from "node:assert/strict"
import test from "node:test"

import { mergeAnonymousProgressIntoAccount } from "../src/progress/progress-sync-merge.js"

test("merge keeps non-overlapping anonymous and account records", () => {
  const merged = mergeAnonymousProgressIntoAccount({
    mergedAt: "2026-02-16T18:15:00Z",
    anonymousProgress: {
      version: 1,
      updatedAt: "2026-02-16T17:00:00Z",
      completedProblemIds: ["attention_scaled_dot_product_v1"],
      attemptHistory: [
        {
          problemId: "attention_scaled_dot_product_v1",
          correctness: "pass",
          hintTierUsed: 1,
          timeSpentMinutes: 16,
          submittedAt: "2026-02-16T17:00:00Z"
        }
      ]
    },
    accountProgress: {
      version: 1,
      updatedAt: "2026-02-16T16:00:00Z",
      completedProblemIds: ["normalization_layernorm_v1"],
      attemptHistory: [
        {
          problemId: "normalization_layernorm_v1",
          correctness: "partial",
          hintTierUsed: 2,
          timeSpentMinutes: 22,
          submittedAt: "2026-02-16T16:00:00Z"
        }
      ]
    }
  })

  assert.deepEqual(merged.completedProblemIds.sort(), [
    "attention_scaled_dot_product_v1",
    "normalization_layernorm_v1"
  ])
  assert.equal(merged.attemptHistory.length, 2)
  assert.equal(merged.updatedAt, "2026-02-16T18:15:00Z")
})

test("merge de-duplicates overlapping records without dropping unique attempts", () => {
  const merged = mergeAnonymousProgressIntoAccount({
    mergedAt: "2026-02-16T18:15:30Z",
    anonymousProgress: {
      version: 1,
      updatedAt: "2026-02-16T17:00:00Z",
      completedProblemIds: ["attention_scaled_dot_product_v1"],
      attemptHistory: [
        {
          problemId: "attention_scaled_dot_product_v1",
          correctness: "pass",
          hintTierUsed: 1,
          timeSpentMinutes: 16,
          submittedAt: "2026-02-16T17:00:00Z"
        },
        {
          problemId: "lstm_cell_v1",
          correctness: "fail",
          hintTierUsed: 3,
          timeSpentMinutes: 25,
          submittedAt: "2026-02-16T17:30:00Z"
        }
      ]
    },
    accountProgress: {
      version: 1,
      updatedAt: "2026-02-16T18:00:00Z",
      completedProblemIds: ["attention_scaled_dot_product_v1"],
      attemptHistory: [
        {
          problemId: "attention_scaled_dot_product_v1",
          correctness: "pass",
          hintTierUsed: 1,
          timeSpentMinutes: 16,
          submittedAt: "2026-02-16T17:00:00Z"
        }
      ]
    }
  })

  assert.equal(merged.attemptHistory.length, 2)
  assert.deepEqual(merged.completedProblemIds.sort(), [
    "attention_scaled_dot_product_v1",
    "lstm_cell_v1"
  ])
})
