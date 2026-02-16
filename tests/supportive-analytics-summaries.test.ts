import assert from "node:assert/strict"
import test from "node:test"

import { buildSupportiveAnalyticsSummaries } from "../src/analytics/supportive-analytics-summaries.js"

test("analytics summaries surface hint/time/resurfacing trends with supportive wording", () => {
  const analytics = buildSupportiveAnalyticsSummaries({
    categoryMetrics: [
      {
        category: "Attention",
        averageHintTierUsed: 2.6,
        averageTimeSpentMinutes: 24,
        resurfacingFrequencyPerWeek: 2.8
      }
    ]
  })

  assert.equal(analytics.summaries.length, 1)
  assert.equal(
    analytics.summaries[0]?.summary.includes("resurfacing more often"),
    true
  )
  assert.equal(analytics.summaries[0]?.summary.includes("hints"), true)
  assert.equal(analytics.summaries[0]?.summary.includes("time"), true)
})

test("analytics summaries avoid punitive language", () => {
  const analytics = buildSupportiveAnalyticsSummaries({
    categoryMetrics: [
      {
        category: "RNNs",
        averageHintTierUsed: 3,
        averageTimeSpentMinutes: 28,
        resurfacingFrequencyPerWeek: 3.5
      }
    ]
  })

  const combinedText = analytics.summaries
    .map((summary) => summary.summary)
    .join(" ")
    .toLowerCase()

  assert.equal(combinedText.includes("penalty"), false)
  assert.equal(combinedText.includes("behind"), false)
  assert.equal(combinedText.includes("bad"), false)
  assert.equal(combinedText.includes("failure"), false)
})

test("analytics fallback stays supportive when no metrics are provided", () => {
  const analytics = buildSupportiveAnalyticsSummaries({
    categoryMetrics: []
  })

  assert.equal(analytics.summaries.length, 1)
  assert.equal(analytics.summaries[0]?.category, "system")
  assert.equal(analytics.summaries[0]?.summary.includes("ready"), true)
})
