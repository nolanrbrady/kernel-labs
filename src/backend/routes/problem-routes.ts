import type {
  Express,
  Request,
  Response
} from "express"

import {
  PROBLEM_FLAG_REASONS,
  type ProblemReviewQueueStore
} from "../../problems/problem-review-queue.js"
import { getSeedProblemPackV1 } from "../../problems/seed-problem-pack.js"

export function registerProblemRoutes(options: {
  app: Express
  problemReviewQueueStore: ProblemReviewQueueStore
}): void {
  const { app, problemReviewQueueStore } = options

  app.post("/api/problems/flag", (request: Request, response: Response) => {
    const rawBody = request.body as {
      problemId?: unknown
      problemVersion?: unknown
      reason?: unknown
      notes?: unknown
      sessionId?: unknown
      userCodeHash?: unknown
      evaluationCorrectness?: unknown
      evaluationExplanation?: unknown
      submittedAt?: unknown
    }

    if (
      typeof rawBody.problemId !== "string" ||
      typeof rawBody.reason !== "string" ||
      !PROBLEM_FLAG_REASONS.includes(rawBody.reason as (typeof PROBLEM_FLAG_REASONS)[number]) ||
      (typeof rawBody.problemVersion !== "undefined" &&
        typeof rawBody.problemVersion !== "number") ||
      (typeof rawBody.notes !== "undefined" &&
        typeof rawBody.notes !== "string") ||
      (typeof rawBody.sessionId !== "undefined" &&
        typeof rawBody.sessionId !== "string") ||
      (typeof rawBody.userCodeHash !== "undefined" &&
        typeof rawBody.userCodeHash !== "string") ||
      (typeof rawBody.evaluationCorrectness !== "undefined" &&
        rawBody.evaluationCorrectness !== "pass" &&
        rawBody.evaluationCorrectness !== "partial" &&
        rawBody.evaluationCorrectness !== "fail") ||
      (typeof rawBody.evaluationExplanation !== "undefined" &&
        typeof rawBody.evaluationExplanation !== "string") ||
      (typeof rawBody.submittedAt !== "undefined" &&
        typeof rawBody.submittedAt !== "string")
    ) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message:
          "Problem flag request requires problemId, valid reason, and optional string metadata fields."
      })
      return
    }

    const flagResult = problemReviewQueueStore.submitFlag({
      problemId: rawBody.problemId,
      problemVersion: rawBody.problemVersion,
      reason: rawBody.reason as (typeof PROBLEM_FLAG_REASONS)[number],
      notes: rawBody.notes,
      sessionId: rawBody.sessionId,
      userCodeHash: rawBody.userCodeHash,
      evaluationCorrectness: rawBody.evaluationCorrectness as
        | "pass"
        | "partial"
        | "fail"
        | undefined,
      evaluationExplanation: rawBody.evaluationExplanation,
      submittedAt: rawBody.submittedAt
    })

    if (flagResult.rateLimited) {
      response.status(429).json({
        status: "failure",
        errorCode: "FLAG_RATE_LIMITED",
        message: flagResult.message
      })
      return
    }

    if (!flagResult.accepted) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message: flagResult.message
      })
      return
    }

    response.status(200).json({
      status: "accepted",
      deduplicated: flagResult.deduplicated,
      verificationStatus: flagResult.verificationStatus,
      triageAction: flagResult.triageAction,
      reviewQueueSize: flagResult.reviewQueueSize,
      flag: flagResult.flag,
      message: flagResult.message
    })
  })

  app.get("/api/problems/review-queue", (_request: Request, response: Response) => {
    response.status(200).json(problemReviewQueueStore.getReviewQueueSnapshot())
  })

  app.get(
    "/api/problems/verification-status",
    (_request: Request, response: Response) => {
      response.status(200).json(problemReviewQueueStore.getVerificationStatusSnapshot())
    }
  )

  app.get("/api/problems/seed", (_request: Request, response: Response) => {
    response.status(200).json(getSeedProblemPackV1())
  })
}
