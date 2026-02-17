import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response
} from "express"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import {
  ProblemWorkspaceScreen,
  createEditorFirstLandingRoute,
  type QuestionLibraryItem,
  type WorkspaceProblem
} from "../frontend/problem-workspace-route.js"
import {
  runStarterCodeAgainstToyInputs,
  type RuntimeRunRequest
} from "../runtime/runtime-execution.js"
import { evaluateOutputAgainstFixture } from "../evaluator/evaluator-engine.js"
import {
  createActiveSession,
  submitSessionAttempt
} from "../session/submission-session.js"
import { evaluateSessionTimeCap } from "../session/session-timer.js"
import {
  createFileAnonymousProgressStore,
  createInitialAnonymousProgressSnapshot,
  type AnonymousProgressSnapshot
} from "../progress/anonymous-progress-store.js"
import { createOptionalAccount } from "../auth/optional-auth.js"
import { mergeAnonymousProgressIntoAccount } from "../progress/progress-sync-merge.js"
import { buildMinimalProgressView } from "../progress/minimal-progress-view.js"
import { getSeedProblemPackV1 } from "../problems/seed-problem-pack.js"
import { buildSupportiveAnalyticsSummaries } from "../analytics/supportive-analytics-summaries.js"
import {
  calculateSpacedRepetitionSchedule,
  planSessionAssignment,
  rankSessionCandidates
} from "../scheduler/spaced-repetition-scheduler.js"

const currentDir = dirname(fileURLToPath(import.meta.url))
const frontendStaticDir = join(currentDir, "..", "frontend")
const staticAssetVersion =
  process.env.STATIC_ASSET_VERSION ??
  String(Math.floor(Date.now() / 1000))

const DEFAULT_QUESTION_LIBRARY: QuestionLibraryItem[] = [
  {
    id: "attention_scaled_dot_product_v1",
    title: "Implement Scaled Dot-Product Attention",
    problemType: "Attention",
    summary:
      "Compute query-key scores, apply mask handling, and return weighted values on toy tensors.",
    estimatedMinutes: 30
  },
  ...getSeedProblemPackV1().map((problem) => {
    return {
      id: problem.id,
      title: problem.title,
      problemType: problem.category,
      summary: problem.learning_context,
      estimatedMinutes: problem.estimated_time_minutes
    }
  })
]

const DEFAULT_WORKSPACE_PROBLEM: WorkspaceProblem = {
  id: "attention_scaled_dot_product_v1",
  title: "Implement Scaled Dot-Product Attention",
  category: "Attention",
  goal: "Compute scaled dot-product attention on deterministic toy tensors with optional additive masking (single-sequence 2D simplification).",
  conceptDescription:
    "Scaled dot-product attention computes query-key similarity scores, turns them into a probability distribution via softmax, and uses the weights to mix value vectors. This workspace uses a single-sequence, 2D toy formulation (`q, k, v` shaped `[seq_len, d_k]`) so you can focus on the core math before adding batch/head dimensions.",
  inputSpecification:
    "Inputs use toy tensors only: `q`, `k`, `v` are 2D arrays shaped `[seq_len, d_k]` (single sequence). Optional `mask` is an additive bias matrix shaped `[seq_len, seq_len]` (use large negative values like -1e9 to suppress attention targets) and is applied before softmax.",
  expectedOutputSpecification:
    "Return a 2D context tensor shaped `[seq_len, d_k]`. Masked locations should contribute ~0 probability mass after softmax. Outputs must remain finite on deterministic fixtures.",
  formulaNotes: [
    "\\mathrm{scores} = \\frac{QK^{\\top}}{\\sqrt{d_k}}",
    "\\mathrm{scores} = \\mathrm{scores} + \\mathrm{mask\\_bias}",
    "\\mathrm{attention\\_weights} = \\mathrm{softmax}(\\mathrm{scores}, axis=-1)",
    "\\mathrm{context} = \\mathrm{attention\\_weights}V"
  ],
  architectureUses: [
    "Transformer self-attention blocks",
    "Encoder-decoder cross-attention",
    "Vision and multimodal attention modules"
  ],
  evaluationChecklist: [
    "Output shape correctness",
    "Mask suppression behavior",
    "Finite numerical stability"
  ],
  visibleTestCases: [
    {
      id: "case_1_balanced_tokens",
      name: "Case 1 - Balanced Tokens",
      inputSummary:
        "q, k, v shapes [2, 2] without a mask; verify basic attention weighting behavior.",
      expectedOutputSummary:
        "Output shape [2, 2] with finite values and smooth weighted mixing.",
      reasoning:
        "Confirms base attention math before introducing masking edge cases."
    },
    {
      id: "case_2_causal_masking",
      name: "Case 2 - Causal Masking",
      inputSummary:
        "q, k, v shapes [3, 2] with a causal mask suppressing future-token attention.",
      expectedOutputSummary:
        "Masked positions have no probability mass and context respects causal order.",
      reasoning:
        "Validates mask application before softmax normalization."
    },
    {
      id: "case_3_stability_magnitudes",
      name: "Case 3 - Stability Magnitudes",
      inputSummary:
        "q, k, v shapes [3, 2] with varied magnitudes to stress softmax stability.",
      expectedOutputSummary:
        "Output shape [3, 2], no NaN/Inf, and deterministic finite behavior.",
      reasoning:
        "Checks numerical sanity under magnitude variation without introducing extra batch dimensions."
    }
  ],
  paperLinks: [
    {
      title: "Attention Is All You Need (Vaswani et al., 2017)",
      url: "https://arxiv.org/abs/1706.03762",
      note: "Foundational paper introducing Transformer attention."
    }
  ],
  questionCatalog: DEFAULT_QUESTION_LIBRARY,
  starterCode:
    "import numpy as np\n\n\ndef scaled_dot_product_attention(q, k, v, mask=None):\n    \"\"\"Scaled dot-product attention (2D toy formulation).\n\n    Shapes:\n      q, k, v: [seq_len, d_k]\n      mask (optional): [seq_len, seq_len] additive bias applied before softmax\n\n    Returns:\n      context: [seq_len, d_k]\n    \"\"\"\n    # TODO: implement attention core\n    pass"
}

const anonymousProgressStore = createFileAnonymousProgressStore({
  filePath:
    process.env.ANON_PROGRESS_FILE ??
    join(process.cwd(), ".cache-local", "anonymous-progress.json")
})

function renderHtmlDocument(
  bodyMarkup: string,
  options: { includeClientScript?: boolean } = {}
): string {
  const versionQuery = `?v=${encodeURIComponent(staticAssetVersion)}`
  const clientScriptTag = options.includeClientScript
    ? `\n    <script type="module" src="/static/problem-workspace-client.js${versionQuery}"></script>`
    : ""

  return `<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DeepML-SR</title>
    <script>try{var t=localStorage.getItem("deepmlsr.theme.v1");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/static/problem-workspace.css${versionQuery}" data-theme="deepmlsr-workspace">${clientScriptTag}
  </head>
  <body>
    ${bodyMarkup}
  </body>
</html>`
}

export function createApiApp(): Express {
  const app = express()
  app.disable("x-powered-by")
  app.use(express.json({ limit: "32kb" }))
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader("x-content-type-options", "nosniff")
    response.setHeader("x-frame-options", "DENY")
    response.setHeader("referrer-policy", "no-referrer")
    response.setHeader("cross-origin-resource-policy", "same-origin")
    response.setHeader(
      "content-security-policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:;"
    )
    next()
  })

  app.use("/static", express.static(frontendStaticDir, {
    index: false,
    maxAge: 0,
    immutable: false
  }))

  app.get("/", (_request: Request, response: Response) => {
    const route = createEditorFirstLandingRoute(DEFAULT_WORKSPACE_PROBLEM)
    const markup = renderToStaticMarkup(
      createElement(ProblemWorkspaceScreen, { route })
    )

    response
      .status(200)
      .type("html")
      .send(renderHtmlDocument(markup, { includeClientScript: true }))
  })

  app.get("/health", (_request: Request, response: Response) => {
    response.status(200).json({ ok: true })
  })

  app.get("/auth/create-account", (_request: Request, response: Response) => {
    response.status(200).type("html").send(
      renderHtmlDocument(
        `<main><h1>Create Optional Account</h1><p>Account creation is optional and never blocks solving.</p></main>`
      )
    )
  })

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

  app.get("/api/progress/anonymous", async (_request: Request, response: Response) => {
    const snapshot = await anonymousProgressStore.loadProgress()
    response.status(200).json(snapshot)
  })

  app.post("/api/progress/anonymous", async (request: Request, response: Response) => {
    const rawBody = request.body as Partial<AnonymousProgressSnapshot>

    if (
      rawBody.version !== 1 ||
      !Array.isArray(rawBody.completedProblemIds) ||
      !Array.isArray(rawBody.attemptHistory)
    ) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message:
          "Anonymous progress payload must include version, completedProblemIds, and attemptHistory."
      })
      return
    }

    const normalizedSnapshot: AnonymousProgressSnapshot = {
      version: 1,
      updatedAt: new Date().toISOString(),
      completedProblemIds: rawBody.completedProblemIds,
      attemptHistory: rawBody.attemptHistory
    }

    await anonymousProgressStore.saveProgress(normalizedSnapshot)
    response.status(200).json(normalizedSnapshot)
  })

  app.post(
    "/api/progress/anonymous/reset",
    async (_request: Request, response: Response) => {
      const snapshot = createInitialAnonymousProgressSnapshot()
      await anonymousProgressStore.saveProgress(snapshot)
      response.status(200).json(snapshot)
    }
  )

  app.post("/api/progress/sync-merge", (request: Request, response: Response) => {
    const rawBody = request.body as {
      anonymousProgress?: Partial<AnonymousProgressSnapshot>
      accountProgress?: Partial<AnonymousProgressSnapshot>
    }

    if (
      rawBody.anonymousProgress?.version !== 1 ||
      rawBody.accountProgress?.version !== 1 ||
      !Array.isArray(rawBody.anonymousProgress.completedProblemIds) ||
      !Array.isArray(rawBody.anonymousProgress.attemptHistory) ||
      !Array.isArray(rawBody.accountProgress.completedProblemIds) ||
      !Array.isArray(rawBody.accountProgress.attemptHistory)
    ) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message:
          "Sync merge requires accountProgress and anonymousProgress snapshots with version 1."
      })
      return
    }

    const mergedSnapshot = mergeAnonymousProgressIntoAccount({
      anonymousProgress: rawBody.anonymousProgress as AnonymousProgressSnapshot,
      accountProgress: rawBody.accountProgress as AnonymousProgressSnapshot
    })

    response.status(200).json(mergedSnapshot)
  })

  app.post("/api/progress/view", (request: Request, response: Response) => {
    const rawBody = request.body as {
      categorySnapshots?: unknown
      recentFocusCategories?: unknown
    }

    if (
      !Array.isArray(rawBody.categorySnapshots) ||
      !Array.isArray(rawBody.recentFocusCategories)
    ) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message:
          "Progress view requires categorySnapshots and recentFocusCategories arrays."
      })
      return
    }

    response.status(200).json(
      buildMinimalProgressView({
        categorySnapshots: rawBody.categorySnapshots as Array<{
          category: string
          completedCount: number
          freshnessScore: number
          lastPracticedAt: string
        }>,
        recentFocusCategories: rawBody.recentFocusCategories as string[]
      })
    )
  })

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
    }

    if (
      !Array.isArray(rawBody.newProblemIds) ||
      !Array.isArray(rawBody.resurfacedCandidates)
    ) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message: "Scheduler rank requires newProblemIds and resurfacedCandidates arrays."
      })
      return
    }

    response.status(200).json(
      rankSessionCandidates({
        newProblemIds: rawBody.newProblemIds as string[],
        resurfacedCandidates: rawBody.resurfacedCandidates as Array<{
          problemId: string
          resurfacingPriority: number
        }>
      })
    )
  })

  app.post("/api/scheduler/plan", (request: Request, response: Response) => {
    const rawBody = request.body as {
      newProblemIds?: unknown
      resurfacedCandidates?: unknown
    }

    if (
      !Array.isArray(rawBody.newProblemIds) ||
      !Array.isArray(rawBody.resurfacedCandidates)
    ) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message: "Scheduler plan requires newProblemIds and resurfacedCandidates arrays."
      })
      return
    }

    response.status(200).json(
      planSessionAssignment({
        newProblemIds: rawBody.newProblemIds as string[],
        resurfacedCandidates: rawBody.resurfacedCandidates as Array<{
          problemId: string
          resurfacingPriority: number
        }>
      })
    )
  })

  app.get("/api/problems/seed", (_request: Request, response: Response) => {
    response.status(200).json(getSeedProblemPackV1())
  })

  app.post("/api/analytics/summaries", (request: Request, response: Response) => {
    const rawBody = request.body as {
      categoryMetrics?: unknown
    }

    if (!Array.isArray(rawBody.categoryMetrics)) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message: "Analytics summaries require a categoryMetrics array."
      })
      return
    }

    response.status(200).json(
      buildSupportiveAnalyticsSummaries({
        categoryMetrics: rawBody.categoryMetrics as Array<{
          category: string
          averageHintTierUsed: number
          averageTimeSpentMinutes: number
          resurfacingFrequencyPerWeek: number
        }>
      })
    )
  })

  app.use((_request: Request, response: Response) => {
    response.status(404).json({
      status: "failure",
      errorCode: "NOT_FOUND",
      message: "Requested route was not found."
    })
  })

  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      _next: NextFunction
    ) => {
      if (
        typeof error === "object" &&
        error !== null &&
        "type" in error &&
        (error as { type?: string }).type === "entity.too.large"
      ) {
        response.status(413).json({
          status: "failure",
          errorCode: "PAYLOAD_TOO_LARGE",
          message: "Request payload exceeds the allowed size limit."
        })
        return
      }

      response.status(500).json({
        status: "failure",
        errorCode: "INTERNAL_ERROR",
        message: "An unexpected server error occurred."
      })
    }
  )

  return app
}
