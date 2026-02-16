export type CategoryAnalyticsMetric = {
  category: string
  averageHintTierUsed: number
  averageTimeSpentMinutes: number
  resurfacingFrequencyPerWeek: number
}

export type SupportiveAnalyticsSummary = {
  category: string
  summary: string
  drivers: {
    hintPressure: "low" | "moderate" | "high"
    timePressure: "low" | "moderate" | "high"
    resurfacingPressure: "low" | "moderate" | "high"
  }
}

export type SupportiveAnalyticsResult = {
  summaries: SupportiveAnalyticsSummary[]
}

function toPressureLevel(
  value: number,
  thresholds: { lowUpperBound: number; moderateUpperBound: number }
): "low" | "moderate" | "high" {
  if (value <= thresholds.lowUpperBound) {
    return "low"
  }

  if (value <= thresholds.moderateUpperBound) {
    return "moderate"
  }

  return "high"
}

function buildCategorySummary(metric: CategoryAnalyticsMetric): SupportiveAnalyticsSummary {
  const hintPressure = toPressureLevel(metric.averageHintTierUsed, {
    lowUpperBound: 1.4,
    moderateUpperBound: 2.2
  })
  const timePressure = toPressureLevel(metric.averageTimeSpentMinutes, {
    lowUpperBound: 14,
    moderateUpperBound: 22
  })
  const resurfacingPressure = toPressureLevel(metric.resurfacingFrequencyPerWeek, {
    lowUpperBound: 1.2,
    moderateUpperBound: 2.2
  })
  const summaryFragments: string[] = []

  if (resurfacingPressure !== "low") {
    summaryFragments.push(
      `${metric.category} is resurfacing more often than your calmer categories`
    )
  } else {
    summaryFragments.push(
      `${metric.category} resurfacing is currently steady`
    )
  }

  if (hintPressure === "high") {
    summaryFragments.push(
      "hints are doing more guidance work right now"
    )
  } else if (hintPressure === "moderate") {
    summaryFragments.push(
      "hint usage looks balanced"
    )
  } else {
    summaryFragments.push(
      "you are relying on few hints"
    )
  }

  if (timePressure === "high") {
    summaryFragments.push(
      "time per attempt is trending longer, so a smaller first pass may help"
    )
  } else if (timePressure === "moderate") {
    summaryFragments.push(
      "time per attempt remains in a workable range"
    )
  } else {
    summaryFragments.push(
      "time per attempt is efficient"
    )
  }

  return {
    category: metric.category,
    summary: `${summaryFragments.join("; ")}.`,
    drivers: {
      hintPressure,
      timePressure,
      resurfacingPressure
    }
  }
}

export function buildSupportiveAnalyticsSummaries(options: {
  categoryMetrics: CategoryAnalyticsMetric[]
}): SupportiveAnalyticsResult {
  if (options.categoryMetrics.length === 0) {
    return {
      summaries: [
        {
          category: "system",
          summary:
            "Your private analytics summary is ready as soon as fresh session data arrives.",
          drivers: {
            hintPressure: "low",
            timePressure: "low",
            resurfacingPressure: "low"
          }
        }
      ]
    }
  }

  return {
    summaries: options.categoryMetrics.map(buildCategorySummary)
  }
}
