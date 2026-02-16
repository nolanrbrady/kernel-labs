export type ProblemHintSet = {
  tier1: string
  tier2: string
  tier3: string
}

export type HintTier = 1 | 2 | 3

export type RevealedHint = {
  tier: HintTier
  text: string
}

export type HintFlowState = {
  problemId: string
  hints: {
    1: string
    2: string
    3: string
  }
  revealedHints: RevealedHint[]
}

export type RevealHintResult = {
  state: HintFlowState
  revealedHint: RevealedHint | null
  hasMoreHints: boolean
}

export type SchedulerHintUsage = {
  hintTierUsed: number
  hintRequestsCount: number
}

export function createHintFlowState(
  problemId: string,
  hintSet: ProblemHintSet
): HintFlowState {
  return {
    problemId,
    hints: {
      1: hintSet.tier1,
      2: hintSet.tier2,
      3: hintSet.tier3
    },
    revealedHints: []
  }
}

function getNextHintTier(currentState: HintFlowState): HintTier | null {
  const nextTier = currentState.revealedHints.length + 1

  if (nextTier > 3) {
    return null
  }

  return nextTier as HintTier
}

export function revealNextHint(currentState: HintFlowState): RevealHintResult {
  const nextTier = getNextHintTier(currentState)

  if (nextTier === null) {
    return {
      state: currentState,
      revealedHint: null,
      hasMoreHints: false
    }
  }

  const revealedHint = {
    tier: nextTier,
    text: currentState.hints[nextTier]
  }

  const nextState: HintFlowState = {
    ...currentState,
    revealedHints: [...currentState.revealedHints, revealedHint]
  }

  return {
    state: nextState,
    revealedHint,
    hasMoreHints: nextState.revealedHints.length < 3
  }
}

export function summarizeHintUsageForScheduler(
  state: HintFlowState
): SchedulerHintUsage {
  const hintRequestsCount = state.revealedHints.length
  const highestTier = state.revealedHints.reduce((maximum, revealedHint) => {
    return Math.max(maximum, revealedHint.tier)
  }, 0)

  return {
    hintTierUsed: highestTier,
    hintRequestsCount
  }
}
