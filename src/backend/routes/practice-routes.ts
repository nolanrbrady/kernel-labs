import type {
  Express,
  Request,
  Response
} from "express"

import {
  runStarterCodeAgainstToyInputs,
  type RuntimeRunRequest
} from "../../runtime/runtime-execution.js"
import { evaluateOutputAgainstFixture } from "../../evaluator/evaluator-engine.js"
import {
  createActiveSession,
  submitSessionAttempt
} from "../../session/submission-session.js"
import { evaluateSessionTimeCap } from "../../session/session-timer.js"
import { createOptionalAccount } from "../../auth/optional-auth.js"

export function registerPracticeRoutes(app: Express): void {
  app.post(
    "/api/runtime/run",
    (request: Request<unknown, unknown, Partial<RuntimeRunRequest>>, response: Response) => {
      const problemId = request.body.problemId
      const userCode = request.body.userCode

      if (typeof problemId !== "string" || typeof userCode !== "string") {
        response.status(400).json({
          status: "failure",
          errorCode: "INVALID_REQUEST",
          message:
            "Run request is missing required fields. Provide problemId and userCode."
        })
        return
      }

      const runtimeResult = runStarterCodeAgainstToyInputs({
        problemId,
        userCode
      })

      response.status(200).json(runtimeResult)
    }
  )

  app.post("/api/auth/create-optional-account", (request: Request, response: Response) => {
    const rawBody = request.body as { displayName?: unknown }

    if (
      rawBody.displayName !== undefined &&
      typeof rawBody.displayName !== "string"
    ) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message: "displayName must be a string when provided."
      })
      return
    }

    const account = createOptionalAccount({
      displayName: rawBody.displayName
    })

    response.status(200).json({
      account,
      message: "Optional account created. Anonymous solving remains available."
    })
  })

  app.post("/api/evaluator/evaluate", (request: Request, response: Response) => {
    const rawBody = request.body as {
      problemId?: unknown
      candidateOutput?: unknown
    }
    const problemId = rawBody.problemId
    const candidateOutput = rawBody.candidateOutput

    if (typeof problemId !== "string") {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message:
          "Evaluator request must include a problemId string."
      })
      return
    }

    response.status(200).json(
      evaluateOutputAgainstFixture({
        problemId,
        candidateOutput
      })
    )
  })

  app.post("/api/session/submit", (request: Request, response: Response) => {
    const rawBody = request.body as {
      sessionId?: unknown
      problemId?: unknown
      correctness?: unknown
      explanation?: unknown
      submittedAt?: unknown
    }

    if (
      typeof rawBody.sessionId !== "string" ||
      typeof rawBody.problemId !== "string" ||
      (rawBody.correctness !== "pass" &&
        rawBody.correctness !== "partial" &&
        rawBody.correctness !== "fail") ||
      typeof rawBody.explanation !== "string"
    ) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message:
          "Submit request requires sessionId, problemId, correctness, and explanation."
      })
      return
    }

    const sessionState = createActiveSession({
      sessionId: rawBody.sessionId,
      problemId: rawBody.problemId
    })
    const transition = submitSessionAttempt(sessionState, {
      correctness: rawBody.correctness,
      explanation: rawBody.explanation,
      submittedAt:
        typeof rawBody.submittedAt === "string" ? rawBody.submittedAt : undefined
    })

    response.status(200).json(transition)
  })

  app.post("/api/session/timer", (request: Request, response: Response) => {
    const rawBody = request.body as {
      startedAt?: unknown
      now?: unknown
    }

    if (typeof rawBody.startedAt !== "string") {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message: "Timer request requires a startedAt timestamp."
      })
      return
    }

    const nowTimestamp =
      typeof rawBody.now === "string"
        ? rawBody.now
        : new Date().toISOString()

    try {
      response.status(200).json(
        evaluateSessionTimeCap({
          startedAt: rawBody.startedAt,
          now: nowTimestamp
        })
      )
    } catch (error) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message: error instanceof Error ? error.message : "Invalid timer request."
      })
    }
  })
}
