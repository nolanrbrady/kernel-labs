export type CategoryProgressSnapshot = {
  category: string
  completedCount: number
  freshnessScore: number
  lastPracticedAt: string
}

export type MinimalProgressView = {
  categories: Array<{
    category: string
    completedCount: number
    freshnessLabel: "Cold" | "Cooling" | "Warm" | "Solid" | "Sharp"
    recentFocus: boolean
  }>
}

function toFreshnessLabel(
  freshnessScore: number
): "Cold" | "Cooling" | "Warm" | "Solid" | "Sharp" {
  if (freshnessScore >= 0.8) {
    return "Sharp"
  }

  if (freshnessScore >= 0.65) {
    return "Solid"
  }

  if (freshnessScore >= 0.5) {
    return "Warm"
  }

  if (freshnessScore >= 0.3) {
    return "Cooling"
  }

  return "Cold"
}

export function buildMinimalProgressView(options: {
  categorySnapshots: CategoryProgressSnapshot[]
  recentFocusCategories: string[]
}): MinimalProgressView {
  const recentFocusSet = new Set(options.recentFocusCategories)

  return {
    categories: options.categorySnapshots.map((snapshot) => {
      return {
        category: snapshot.category,
        completedCount: snapshot.completedCount,
        freshnessLabel: toFreshnessLabel(snapshot.freshnessScore),
        recentFocus: recentFocusSet.has(snapshot.category)
      }
    })
  }
}
