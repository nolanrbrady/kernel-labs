import { createRequire } from "node:module"

import {
  verifyProblemCard,
  type CardVerificationResult
} from "./card-verification-pipeline.js"
import type { ProblemSpecV2 } from "./problem-spec-v2.js"
import type { RuntimeProblemFixture } from "./runtime-problem-fixtures.js"

const require = createRequire(import.meta.url)
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{
  text?: string
}>

const DEFAULT_MAX_ITERATIONS = 3
const MAX_MAX_ITERATIONS = 6
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest"
const DEFAULT_TEMPERATURE = 0.2
const DEFAULT_MAX_OUTPUT_TOKENS = 4096
const MAX_SOURCE_CONTEXT_CHARS = 30000
const MAX_CONTENT_CHARS_PER_SOURCE = 12000

export type PaperPdfInput = {
  filename?: string
  dataBase64: string
}

export type PaperGenerationRequest = {
  paperLinks: string[]
  paperPdfs: PaperPdfInput[]
  targetDescription: string
  maxIterations: number
  model: string
  temperature: number
  maxOutputTokens: number
  promptPatch: {
    system: string
    user: string
  }
}

export type GeneratedProblemCandidate = {
  problemSpec: ProblemSpecV2
  runtimeFixture: RuntimeProblemFixture
  referenceSolution: string
  refinementNotes: string
}

export type PaperGenerationIteration = {
  iteration: number
  model: string
  promptFeedbackUsed: string[]
  rawModelText: string
  parseErrors: string[]
  verification: CardVerificationResult | null
  candidate: GeneratedProblemCandidate | null
}

export type PaperGenerationResult = {
  targetDescription: string
  sourceSummaries: Array<{
    sourceId: string
    sourceType: "link_text" | "link_html" | "link_pdf" | "inline_pdf"
    charsUsed: number
  }>
  iterations: PaperGenerationIteration[]
  best: {
    candidate: GeneratedProblemCandidate | null
    verification: CardVerificationResult | null
  }
}

type AnthropicMessageResponse = {
  content?: Array<{
    type?: string
    text?: string
  }>
}

function clamp(minimum: number, value: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

function shorten(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text
  }
  return `${text.slice(0, Math.max(0, maxChars - 3))}...`
}

function normalizeRequest(input: {
  paperLinks?: unknown
  paperPdfs?: unknown
  targetDescription?: unknown
  maxIterations?: unknown
  model?: unknown
  temperature?: unknown
  maxOutputTokens?: unknown
  promptPatch?: unknown
}): PaperGenerationRequest {
  const paperLinks = Array.isArray(input.paperLinks)
    ? input.paperLinks.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter((entry) => entry.length > 0)
    : []
  const paperPdfs = Array.isArray(input.paperPdfs)
    ? input.paperPdfs
        .filter((entry): entry is PaperPdfInput => {
          return (
            Boolean(entry) &&
            typeof entry === "object" &&
            typeof (entry as { dataBase64?: unknown }).dataBase64 === "string"
          )
        })
        .map((entry) => {
          return {
            filename: typeof entry.filename === "string" ? entry.filename.trim() : undefined,
            dataBase64: entry.dataBase64.trim()
          }
        })
        .filter((entry) => entry.dataBase64.length > 0)
    : []
  const targetDescription =
    typeof input.targetDescription === "string" ? input.targetDescription.trim() : ""
  const maxIterations = clamp(
    1,
    typeof input.maxIterations === "number" && Number.isFinite(input.maxIterations)
      ? Math.round(input.maxIterations)
      : DEFAULT_MAX_ITERATIONS,
    MAX_MAX_ITERATIONS
  )
  const model =
    typeof input.model === "string" && input.model.trim().length > 0
      ? input.model.trim()
      : DEFAULT_MODEL
  const temperature = clamp(
    0,
    typeof input.temperature === "number" && Number.isFinite(input.temperature)
      ? input.temperature
      : DEFAULT_TEMPERATURE,
    1
  )
  const maxOutputTokens = clamp(
    512,
    typeof input.maxOutputTokens === "number" && Number.isFinite(input.maxOutputTokens)
      ? Math.round(input.maxOutputTokens)
      : DEFAULT_MAX_OUTPUT_TOKENS,
    8192
  )
  const promptPatchRaw =
    input.promptPatch &&
    typeof input.promptPatch === "object" &&
    !Array.isArray(input.promptPatch)
      ? (input.promptPatch as { system?: unknown; user?: unknown })
      : {}
  const promptPatch = {
    system:
      typeof promptPatchRaw.system === "string"
        ? promptPatchRaw.system.trim()
        : "",
    user:
      typeof promptPatchRaw.user === "string"
        ? promptPatchRaw.user.trim()
        : ""
  }

  return {
    paperLinks,
    paperPdfs,
    targetDescription,
    maxIterations,
    model,
    temperature,
    maxOutputTokens,
    promptPatch
  }
}

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const parsed = await pdfParse(buffer)
  return (parsed.text ?? "").replace(/\s+/g, " ").trim()
}

async function ingestSourceLinks(links: string[]): Promise<{
  sourceSnippets: string[]
  sourceSummaries: PaperGenerationResult["sourceSummaries"]
}> {
  const sourceSnippets: string[] = []
  const sourceSummaries: PaperGenerationResult["sourceSummaries"] = []

  for (const link of links) {
    const response = await fetch(link)
    if (!response.ok) {
      throw new Error(`Unable to fetch paper link ${link}: ${response.status}`)
    }

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase()
    if (contentType.includes("pdf") || link.toLowerCase().endsWith(".pdf")) {
      const pdfBuffer = Buffer.from(await response.arrayBuffer())
      const extracted = await extractTextFromPdfBuffer(pdfBuffer)
      const clipped = shorten(extracted, MAX_CONTENT_CHARS_PER_SOURCE)
      sourceSnippets.push(`SOURCE ${link}\n${clipped}`)
      sourceSummaries.push({
        sourceId: link,
        sourceType: "link_pdf",
        charsUsed: clipped.length
      })
      continue
    }

    const rawText = await response.text()
    if (contentType.includes("html")) {
      const stripped = stripHtmlToText(rawText)
      const clipped = shorten(stripped, MAX_CONTENT_CHARS_PER_SOURCE)
      sourceSnippets.push(`SOURCE ${link}\n${clipped}`)
      sourceSummaries.push({
        sourceId: link,
        sourceType: "link_html",
        charsUsed: clipped.length
      })
      continue
    }

    const clipped = shorten(rawText, MAX_CONTENT_CHARS_PER_SOURCE)
    sourceSnippets.push(`SOURCE ${link}\n${clipped}`)
    sourceSummaries.push({
      sourceId: link,
      sourceType: "link_text",
      charsUsed: clipped.length
    })
  }

  return {
    sourceSnippets,
    sourceSummaries
  }
}

async function ingestInlinePdfs(pdfs: PaperPdfInput[]): Promise<{
  sourceSnippets: string[]
  sourceSummaries: PaperGenerationResult["sourceSummaries"]
}> {
  const sourceSnippets: string[] = []
  const sourceSummaries: PaperGenerationResult["sourceSummaries"] = []

  for (const [index, pdf] of pdfs.entries()) {
    const sourceId = pdf.filename?.length ? pdf.filename : `inline_pdf_${index + 1}`
    const buffer = Buffer.from(pdf.dataBase64, "base64")
    let extracted = ""

    try {
      extracted = await extractTextFromPdfBuffer(buffer)
    } catch {
      // Fallback: allow plain-text payloads in experimentation mode.
      extracted = buffer.toString("utf8")
    }

    const clipped = shorten(extracted.replace(/\s+/g, " ").trim(), MAX_CONTENT_CHARS_PER_SOURCE)
    sourceSnippets.push(`SOURCE ${sourceId}\n${clipped}`)
    sourceSummaries.push({
      sourceId,
      sourceType: "inline_pdf",
      charsUsed: clipped.length
    })
  }

  return {
    sourceSnippets,
    sourceSummaries
  }
}

function buildSystemPrompt(systemPromptPatch: string): string {
  return [
    "You are generating high-rigor ML coding cards for Master/PhD-level learners.",
    "Output ONLY strict JSON.",
    "The JSON must include keys: problem_spec, runtime_fixture, reference_solution, refinement_notes.",
    "problem_spec must satisfy ProblemSpecV2 constraints including fidelity_target and 15..30 minute estimate.",
    "Hints must be non-leaky: conceptual at tier1, structural at tier2, near-code but non-complete at tier3.",
    "Use toy tensors only, no training loops, no datasets.",
    systemPromptPatch
  ].join(" ")
}

function buildUserPrompt(options: {
  targetDescription: string
  sourceContext: string
  feedback: string[]
  iteration: number
  userPromptPatch: string
}): string {
  const feedbackSection =
    options.feedback.length > 0
      ? `Previous validation failures to fix:\n- ${options.feedback.join("\n- ")}\n`
      : "No prior validation failures yet.\n"

  return [
    `Iteration ${options.iteration}.`,
    `Target component: ${options.targetDescription}`,
    "",
    feedbackSection,
    "Paper excerpts:",
    options.sourceContext,
    "",
    "Return JSON object:",
    "{",
    '  "problem_spec": { ...ProblemSpecV2... },',
    '  "runtime_fixture": {',
    '    "problemId": "<same as problem_spec.id>",',
    '    "deterministicSeed": 20260217,',
    '    "functionName": "<matches problem_spec.evaluation_artifacts.reference_solution_function>",',
    '    "inputOrder": ["arg1","arg2"],',
    '    "inputs": { ...toy tensor inputs... },',
    '    "expectedOutput": [[...]],',
    '    "testCases": [',
    '      { "id":"case_1", "name":"Case 1", "inputs": {...}, "expectedOutput":[[...]] }',
    "    ]",
    "  },",
    '  "reference_solution": "python function string",',
    '  "refinement_notes": "what changed this iteration"',
    "}",
    "",
    "Hard requirements: deterministic toy tensors; runnable python reference_solution; problem_spec + runtime_fixture must align exactly.",
    options.userPromptPatch
  ].join("\n")
}

function extractTextContent(response: AnthropicMessageResponse): string {
  const content = Array.isArray(response.content) ? response.content : []
  return content
    .filter((entry) => entry.type === "text" && typeof entry.text === "string")
    .map((entry) => entry.text?.trim() ?? "")
    .filter((entry) => entry.length > 0)
    .join("\n")
}

function extractJsonPayload(rawText: string): unknown {
  const trimmed = rawText.trim()
  if (trimmed.length === 0) {
    throw new Error("Anthropic response text is empty.")
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i)
    if (fencedMatch && fencedMatch[1]) {
      return JSON.parse(fencedMatch[1].trim())
    }

    const firstBrace = trimmed.indexOf("{")
    const lastBrace = trimmed.lastIndexOf("}")
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1))
    }

    throw new Error("Could not parse JSON from Anthropic response.")
  }
}

function isRuntimeFixture(value: unknown): value is RuntimeProblemFixture {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  const candidate = value as RuntimeProblemFixture
  return (
    typeof candidate.problemId === "string" &&
    typeof candidate.deterministicSeed === "number" &&
    typeof candidate.functionName === "string" &&
    Array.isArray(candidate.inputOrder) &&
    candidate.inputOrder.every((entry) => typeof entry === "string") &&
    Boolean(candidate.inputs) &&
    typeof candidate.inputs === "object" &&
    Array.isArray(candidate.expectedOutput) &&
    Array.isArray(candidate.testCases)
  )
}

function normalizeGeneratedCandidatePayload(payload: unknown): GeneratedProblemCandidate {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Generated payload is not an object.")
  }

  const candidate = payload as {
    problem_spec?: unknown
    runtime_fixture?: unknown
    reference_solution?: unknown
    refinement_notes?: unknown
  }
  if (!candidate.problem_spec || typeof candidate.problem_spec !== "object" || Array.isArray(candidate.problem_spec)) {
    throw new Error("Generated payload is missing problem_spec object.")
  }
  if (!isRuntimeFixture(candidate.runtime_fixture)) {
    throw new Error("Generated payload is missing valid runtime_fixture object.")
  }
  if (typeof candidate.reference_solution !== "string" || candidate.reference_solution.trim().length === 0) {
    throw new Error("Generated payload is missing reference_solution string.")
  }

  const problemSpec = candidate.problem_spec as ProblemSpecV2
  const runtimeFixture = candidate.runtime_fixture
  if (runtimeFixture.problemId !== problemSpec.id) {
    runtimeFixture.problemId = problemSpec.id
  }

  return {
    problemSpec,
    runtimeFixture,
    referenceSolution: candidate.reference_solution,
    refinementNotes:
      typeof candidate.refinement_notes === "string" ? candidate.refinement_notes : ""
  }
}

async function callAnthropic(options: {
  apiKey: string
  model: string
  temperature: number
  maxOutputTokens: number
  systemPrompt: string
  userPrompt: string
}): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": options.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: options.model,
      max_tokens: options.maxOutputTokens,
      temperature: options.temperature,
      system: options.systemPrompt,
      messages: [
        {
          role: "user",
          content: options.userPrompt
        }
      ]
    })
  })

  const responseText = await response.text()
  if (!response.ok) {
    throw new Error(
      `Anthropic request failed (${response.status}): ${shorten(responseText, 500)}`
    )
  }

  const parsed = JSON.parse(responseText) as AnthropicMessageResponse
  return extractTextContent(parsed)
}

function verificationRank(result: CardVerificationResult): number {
  const statusScore =
    result.status === "verified" ? 2 : result.status === "needs_review" ? 1 : 0
  return statusScore * 1000 - result.blockers.length * 10 - result.warnings.length
}

export async function runPaperProblemGeneration(
  rawInput: {
    paperLinks?: unknown
    paperPdfs?: unknown
    targetDescription?: unknown
    maxIterations?: unknown
    model?: unknown
    temperature?: unknown
    maxOutputTokens?: unknown
    promptPatch?: unknown
  }
): Promise<PaperGenerationResult> {
  const request = normalizeRequest(rawInput)
  if (!request.targetDescription.length) {
    throw new Error("targetDescription is required.")
  }
  if (request.paperLinks.length === 0 && request.paperPdfs.length === 0) {
    throw new Error("Provide at least one paper link or inline PDF.")
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required to run paper generation.")
  }

  const linkIngestion = await ingestSourceLinks(request.paperLinks)
  const pdfIngestion = await ingestInlinePdfs(request.paperPdfs)
  const sourceSnippets = [...linkIngestion.sourceSnippets, ...pdfIngestion.sourceSnippets]
  const sourceSummaries = [...linkIngestion.sourceSummaries, ...pdfIngestion.sourceSummaries]

  const sourceContext = shorten(sourceSnippets.join("\n\n"), MAX_SOURCE_CONTEXT_CHARS)
  const iterations: PaperGenerationIteration[] = []
  let bestCandidate: GeneratedProblemCandidate | null = null
  let bestVerification: CardVerificationResult | null = null
  let feedback: string[] = []

  for (let iterationIndex = 0; iterationIndex < request.maxIterations; iterationIndex += 1) {
    const iteration = iterationIndex + 1
    const userPrompt = buildUserPrompt({
      targetDescription: request.targetDescription,
      sourceContext,
      feedback,
      iteration,
      userPromptPatch: request.promptPatch.user
    })
    const rawModelText = await callAnthropic({
      apiKey,
      model: request.model,
      temperature: request.temperature,
      maxOutputTokens: request.maxOutputTokens,
      systemPrompt: buildSystemPrompt(request.promptPatch.system),
      userPrompt
    })

    const parseErrors: string[] = []
    let candidate: GeneratedProblemCandidate | null = null
    let verification: CardVerificationResult | null = null

    try {
      const parsedPayload = extractJsonPayload(rawModelText)
      candidate = normalizeGeneratedCandidatePayload(parsedPayload)
      verification = verifyProblemCard(candidate.problemSpec, {
        runtimeFixtureOverride: candidate.runtimeFixture,
        referenceSolutionOverride: candidate.referenceSolution
      })
    } catch (error) {
      parseErrors.push(error instanceof Error ? error.message : "Unknown parse failure.")
    }

    const iterationRecord: PaperGenerationIteration = {
      iteration,
      model: request.model,
      promptFeedbackUsed: [...feedback],
      rawModelText: shorten(rawModelText, 4000),
      parseErrors,
      verification,
      candidate
    }
    iterations.push(iterationRecord)

    if (verification && candidate) {
      if (!bestVerification || verificationRank(verification) > verificationRank(bestVerification)) {
        bestVerification = verification
        bestCandidate = candidate
      }

      feedback = [
        ...verification.blockers,
        ...verification.warnings
      ].slice(0, 10)
      if (verification.status === "verified") {
        break
      }
      continue
    }

    feedback = parseErrors.length
      ? parseErrors
      : ["Model output could not be parsed into the expected JSON payload."]
  }

  return {
    targetDescription: request.targetDescription,
    sourceSummaries,
    iterations,
    best: {
      candidate: bestCandidate,
      verification: bestVerification
    }
  }
}
