const SESSION_CAP_SECONDS = 30 * 60

export type SessionTimeCapEvaluation = {
  status: "active" | "timed_out"
  hasTimedOut: boolean
  elapsedSeconds: number
  remainingSeconds: number
  message: string
}

export function evaluateSessionTimeCap(options: {
  startedAt: string
  now: string
}): SessionTimeCapEvaluation {
  const startedAtTime = Date.parse(options.startedAt)
  const nowTime = Date.parse(options.now)

  if (!Number.isFinite(startedAtTime) || !Number.isFinite(nowTime)) {
    throw new Error("Invalid timer input: startedAt and now must be ISO date strings.")
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((nowTime - startedAtTime) / 1000)
  )
  const remainingSeconds = Math.max(0, SESSION_CAP_SECONDS - elapsedSeconds)
  const hasTimedOut = elapsedSeconds >= SESSION_CAP_SECONDS

  if (hasTimedOut) {
    return {
      status: "timed_out",
      hasTimedOut: true,
      elapsedSeconds,
      remainingSeconds,
      message:
        "Session complete for today. Submit when ready and continue fresh next session."
    }
  }

  return {
    status: "active",
    hasTimedOut: false,
    elapsedSeconds,
    remainingSeconds,
    message: "Session in progress. Keep going at your own pace."
  }
}
