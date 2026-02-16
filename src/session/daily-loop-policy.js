function normalizeProblemIds(problemIds) {
  if (!Array.isArray(problemIds)) {
    return []
  }

  return problemIds.filter((problemId) => {
    return typeof problemId === "string" && problemId.length > 0
  })
}

export function planDailySession(options = {}) {
  const availableNewProblemIds = normalizeProblemIds(options.availableNewProblemIds)
  const availableResurfacedProblemIds = normalizeProblemIds(
    options.availableResurfacedProblemIds
  )

  const hasNewProblem = availableNewProblemIds.length > 0
  const primaryProblemId = hasNewProblem
    ? availableNewProblemIds[0]
    : availableResurfacedProblemIds[0] ?? null

  const assignedProblemIds = primaryProblemId === null ? [] : [primaryProblemId]
  const resurfacedAssignedCount =
    hasNewProblem || primaryProblemId === null ? 0 : 1

  return {
    primaryProblemId,
    assignedProblemIds,
    sessionProblemCount: assignedProblemIds.length,
    resurfacedAssignedCount,
    backlogCount: 0,
    missedDayPenaltyApplied: false,
    schedulingNotes: {
      newProblemsPrioritized: hasNewProblem,
      missedDaysIgnoredForLoad: true
    }
  }
}

export function canSubmitSession(_sessionState = {}) {
  return true
}
