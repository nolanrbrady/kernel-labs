import type {
  Express,
  Request,
  Response
} from "express"

import {
  PROBLEM_FLAG_REASONS,
  type ProblemReviewQueueStore
} from "../../problems/problem-review-queue.js"
import { getSeedProblemPack } from "../../problems/seed-problem-pack.js"
import type { ProblemSpecV2 } from "../../problems/problem-spec-v2.js"
import { verifyProblemCard } from "../../problems/card-verification-pipeline.js"
import { runPaperProblemGeneration } from "../../problems/paper-problem-generation.js"
import {
  summarizeSuggestTopicValidationResult,
  validateSuggestTopicDraftAgainstProblemSpecV2
} from "../../problems/suggest-topic-spec-v2.js"

export function registerProblemRoutes(options: {
  app: Express
  problemReviewQueueStore: ProblemReviewQueueStore
}): void {
  const { app, problemReviewQueueStore } = options

  app.post("/api/problems/suggest-topic", (request: Request, response: Response) => {
    const rawBody = request.body as {
      title?: unknown
      problemType?: unknown
      difficulty?: unknown
      learningObjective?: unknown
      context?: unknown
      inputSpecification?: unknown
      outputSpecification?: unknown
      constraintsAndEdgeCases?: unknown
      starterSignature?: unknown
      visibleTestCasePlan?: unknown
      hints?: unknown
      paperLink?: unknown
      notes?: unknown
    }

    if (
      typeof rawBody.title !== "string" ||
      typeof rawBody.problemType !== "string" ||
      typeof rawBody.difficulty !== "string" ||
      typeof rawBody.learningObjective !== "string" ||
      typeof rawBody.context !== "string" ||
      typeof rawBody.inputSpecification !== "string" ||
      typeof rawBody.outputSpecification !== "string" ||
      typeof rawBody.constraintsAndEdgeCases !== "string" ||
      typeof rawBody.starterSignature !== "string" ||
      typeof rawBody.visibleTestCasePlan !== "string" ||
      (typeof rawBody.hints !== "undefined" &&
        typeof rawBody.hints !== "string") ||
      (typeof rawBody.paperLink !== "undefined" &&
        typeof rawBody.paperLink !== "string") ||
      (typeof rawBody.notes !== "undefined" &&
        typeof rawBody.notes !== "string")
    ) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message:
          "Suggest topic request requires all core string fields and optional string metadata."
      })
      return
    }

    const validation = validateSuggestTopicDraftAgainstProblemSpecV2({
      title: rawBody.title,
      problemType: rawBody.problemType,
      difficulty: rawBody.difficulty,
      learningObjective: rawBody.learningObjective,
      context: rawBody.context,
      inputSpecification: rawBody.inputSpecification,
      outputSpecification: rawBody.outputSpecification,
      constraintsAndEdgeCases: rawBody.constraintsAndEdgeCases,
      starterSignature: rawBody.starterSignature,
      visibleTestCasePlan: rawBody.visibleTestCasePlan,
      hints: rawBody.hints,
      paperLink: rawBody.paperLink,
      notes: rawBody.notes
    })

    response.status(200).json({
      status: validation.ok ? "valid" : "invalid",
      summary: summarizeSuggestTopicValidationResult(validation),
      errors: validation.errors,
      warnings: validation.warnings,
      provisionalSpecId: validation.provisionalSpec.id
    })
  })

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

  app.post("/api/problems/verify-card", (request: Request, response: Response) => {
    const rawBody = request.body
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message: "verify-card expects a ProblemSpecV2 object payload."
      })
      return
    }

    try {
      const verification = verifyProblemCard(rawBody as ProblemSpecV2)
      response.status(200).json({
        status: verification.status,
        approvalType: verification.approvalType,
        blockers: verification.blockers,
        warnings: verification.warnings,
        diagnostics: verification.diagnostics,
        decisionMetadata: verification.decisionMetadata
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to verify card payload."
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_CARD_PAYLOAD",
        message
      })
    }
  })

  app.post("/api/problems/generate-from-paper", async (request: Request, response: Response) => {
    const rawBody = request.body as {
      paperLinks?: unknown
      paperPdfs?: unknown
      targetDescription?: unknown
      maxIterations?: unknown
      model?: unknown
      temperature?: unknown
      maxOutputTokens?: unknown
      promptPatch?: unknown
    }

    try {
      const generation = await runPaperProblemGeneration({
        paperLinks: rawBody.paperLinks,
        paperPdfs: rawBody.paperPdfs,
        targetDescription: rawBody.targetDescription,
        maxIterations: rawBody.maxIterations,
        model: rawBody.model,
        temperature: rawBody.temperature,
        maxOutputTokens: rawBody.maxOutputTokens,
        promptPatch: rawBody.promptPatch
      })

      response.status(200).json({
        status: "ok",
        generation
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to run paper generation."
      response.status(400).json({
        status: "failure",
        errorCode: "PAPER_GENERATION_FAILED",
        message
      })
    }
  })

  app.get(
    "/api/problems/verification-status",
    (_request: Request, response: Response) => {
      response.status(200).json({
        statusByProblemId: problemReviewQueueStore.getVerificationStatusSnapshot(),
        statusDetailsByProblemId:
          problemReviewQueueStore.getVerificationStatusDetailsSnapshot()
      })
    }
  )

  app.get("/api/problems/seed", (_request: Request, response: Response) => {
    response.status(200).json(getSeedProblemPack())
  })
}
