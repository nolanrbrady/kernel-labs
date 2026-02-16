import assert from "node:assert/strict"
import test from "node:test"

import { buildMinimalProgressView } from "../src/progress/minimal-progress-view.js"

test("progress view includes required non-punitive fields", () => {
  const view = buildMinimalProgressView({
    categorySnapshots: [
      {
        category: "Attention",
        completedCount: 6,
        freshnessScore: 0.82,
        lastPracticedAt: "2026-02-16T18:00:00Z"
      },
      {
        category: "RNNs",
        completedCount: 2,
        freshnessScore: 0.38,
        lastPracticedAt: "2026-02-12T18:00:00Z"
      }
    ],
    recentFocusCategories: ["Attention"]
  })

  assert.equal(view.categories.length, 2)
  assert.deepEqual(view.categories[0], {
    category: "Attention",
    completedCount: 6,
    freshnessLabel: "Sharp",
    recentFocus: true
  })
  assert.deepEqual(view.categories[1], {
    category: "RNNs",
    completedCount: 2,
    freshnessLabel: "Cooling",
    recentFocus: false
  })
})

test("progress view excludes streak and punitive comparison fields", () => {
  const view = buildMinimalProgressView({
    categorySnapshots: [
      {
        category: "Normalization",
        completedCount: 3,
        freshnessScore: 0.55,
        lastPracticedAt: "2026-02-16T18:00:00Z"
      }
    ],
    recentFocusCategories: []
  })

  assert.equal(Object.hasOwn(view, "streak"), false)
  assert.equal(Object.hasOwn(view, "daysMissed"), false)
  assert.equal(Object.hasOwn(view, "rank"), false)
  assert.equal(Object.hasOwn(view, "negativeComparison"), false)
})
