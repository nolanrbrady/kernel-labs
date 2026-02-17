import type {
  Express,
  Request,
  Response
} from "express"

import {
  calculateSpacedRepetitionSchedule,
  planSessionAssignment,
  rankSessionCandidates,
  type ResurfacedCandidate
} from "../../scheduler/spaced-repetition-scheduler.js"
import type { ProblemReviewQueueStore } from "../../problems/problem-review-queue.js"

function buildExcludedProblemIdsByVerification(options: {
  requestedNewProblemIds: string[]
  requestedResurfacedCandidates: ResurfacedCandidate[]
  schedulableNewProblemIds: string[]
  schedulableResurfacedCandidates: ResurfacedCandidate[]
}): string[] {
  const {
    requestedNewProblemIds,
    requestedResurfacedCandidates,
    schedulableNewProblemIds,
    schedulableResurfacedCandidates
  } = options

  return Array.from(
    new Set([
      ...requestedNewProblemIds.filter((problemId) => {
        return !schedulableNewProblemIds.includes(problemId)
      }),
      ...requestedResurfacedCandidates
        .map((candidate) => candidate.problemId)
        .filter((problemId) => {
          return !schedulableResurfacedCandidates.some((candidate) => {
            return candidate.problemId === problemId
          })
        })
    ])
  )
}

export function registerSchedulerRoutes(options: {
  app: Express
  problemReviewQueueStore: ProblemReviewQueueStore
}): void {
  const { app, problemReviewQueueStore } = options

  app.post("/api/scheduler/decision", (request: Request, response: Response) => {
    const rawBody = request.body as {
      correctness?: unknown
      timeSpentMinutes?: unknown
      hintTierUsed?: unknown
      priorSuccessfulCompletions?: unknown
      daysSinceLastExposure?: unknown
    }

    if (
      (rawBody.correctness !== "pass" &&
        rawBody.correctness !== "partial" &&
        rawBody.correctness !== "fail") ||
      typeof rawBody.timeSpentMinutes !== "number" ||
      typeof rawBody.hintTierUsed !== "number" ||
      typeof rawBody.priorSuccessfulCompletions !== "number" ||
      typeof rawBody.daysSinceLastExposure !== "number"
    ) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message:
          "Scheduler decision requires correctness, timeSpentMinutes, hintTierUsed, priorSuccessfulCompletions, and daysSinceLastExposure."
      })
      return
    }

    response.status(200).json(
      calculateSpacedRepetitionSchedule({
        correctness: rawBody.correctness,
        timeSpentMinutes: rawBody.timeSpentMinutes,
        hintTierUsed: rawBody.hintTierUsed,
        priorSuccessfulCompletions: rawBody.priorSuccessfulCompletions,
        daysSinceLastExposure: rawBody.daysSinceLastExposure
      })
    )
  })

  app.post("/api/scheduler/rank", (request: Request, response: Response) => {
    const rawBody = request.body as {
      newProblemIds?: unknown
      resurfacedCandidates?: unknown
      interchangeableThreshold?: unknown
    }

    if (
      !Array.isArray(rawBody.newProblemIds) ||
      !Array.isArray(rawBody.resurfacedCandidates) ||
      (typeof rawBody.interchangeableThreshold !== "undefined" &&
        typeof rawBody.interchangeableThreshold !== "number")
    ) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message:
          "Scheduler rank requires newProblemIds/resurfacedCandidates arrays and optional numeric interchangeableThreshold."
      })
      return
    }

    const requestedNewProblemIds = rawBody.newProblemIds as string[]
    const requestedResurfacedCandidates = rawBody.resurfacedCandidates as ResurfacedCandidate[]
    const schedulableNewProblemIds = problemReviewQueueStore.filterSchedulableProblemIds(
      requestedNewProblemIds
    )
    const schedulableResurfacedCandidates =
      problemReviewQueueStore.filterSchedulableResurfacedCandidates(
        requestedResurfacedCandidates
      )

    response.status(200).json({
      ...rankSessionCandidates({
        newProblemIds: schedulableNewProblemIds,
        resurfacedCandidates: schedulableResurfacedCandidates,
        interchangeableThreshold: rawBody.interchangeableThreshold as
          | number
          | undefined
      }),
      excludedProblemIdsByVerification: buildExcludedProblemIdsByVerification({
        requestedNewProblemIds,
        requestedResurfacedCandidates,
        schedulableNewProblemIds,
        schedulableResurfacedCandidates
      })
    })
  })

  app.post("/api/scheduler/plan", (request: Request, response: Response) => {
    const rawBody = request.body as {
      newProblemIds?: unknown
      resurfacedCandidates?: unknown
      interchangeableThreshold?: unknown
      selectedProblemId?: unknown
    }

    if (
      !Array.isArray(rawBody.newProblemIds) ||
      !Array.isArray(rawBody.resurfacedCandidates) ||
      (typeof rawBody.interchangeableThreshold !== "undefined" &&
        typeof rawBody.interchangeableThreshold !== "number") ||
      (typeof rawBody.selectedProblemId !== "undefined" &&
        rawBody.selectedProblemId !== null &&
        typeof rawBody.selectedProblemId !== "string")
    ) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message:
          "Scheduler plan requires newProblemIds/resurfacedCandidates arrays, optional numeric interchangeableThreshold, and optional selectedProblemId string."
      })
      return
    }

    const requestedNewProblemIds = rawBody.newProblemIds as string[]
    const requestedResurfacedCandidates = rawBody.resurfacedCandidates as ResurfacedCandidate[]
    const schedulableNewProblemIds = problemReviewQueueStore.filterSchedulableProblemIds(
      requestedNewProblemIds
    )
    const schedulableResurfacedCandidates =
      problemReviewQueueStore.filterSchedulableResurfacedCandidates(
        requestedResurfacedCandidates
      )

    response.status(200).json({
      ...planSessionAssignment({
        newProblemIds: schedulableNewProblemIds,
        resurfacedCandidates: schedulableResurfacedCandidates,
        interchangeableThreshold: rawBody.interchangeableThreshold as
          | number
          | undefined,
        selectedProblemId: rawBody.selectedProblemId as string | null | undefined
      }),
      excludedProblemIdsByVerification: buildExcludedProblemIdsByVerification({
        requestedNewProblemIds,
        requestedResurfacedCandidates,
        schedulableNewProblemIds,
        schedulableResurfacedCandidates
      })
    })
  })
}
