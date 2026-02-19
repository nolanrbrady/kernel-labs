import type { ProblemSpecV2 } from "./problem-spec-v2.js"

export type HintLeakageIssue = {
  severity: "blocker" | "warning"
  tier: 1 | 2 | 3
  code: string
  message: string
}

export type HintLeakageLintResult = {
  ok: boolean
  issues: HintLeakageIssue[]
}

function normalizedWordTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, " ")
    .split(/\s+/)
    .filter((entry) => entry.length > 1)
}

function computeTokenOverlapRatio(hint: string, referenceSolution: string): number {
  const hintTokens = new Set(normalizedWordTokens(hint))
  const referenceTokens = new Set(normalizedWordTokens(referenceSolution))

  if (referenceTokens.size === 0) {
    return 0
  }

  let overlap = 0
  referenceTokens.forEach((token) => {
    if (hintTokens.has(token)) {
      overlap += 1
    }
  })

  return overlap / referenceTokens.size
}

function countVerbatimReferenceLineHits(hint: string, referenceSolution: string): number {
  const normalizedHint = hint
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
  const referenceLines = referenceSolution
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 24)

  return referenceLines.reduce((count, line) => {
    const normalizedLine = line.toLowerCase().replace(/\s+/g, " ")
    return normalizedHint.includes(normalizedLine) ? count + 1 : count
  }, 0)
}

function hasCodeAssignment(text: string): boolean {
  return /\b[a-z_][a-z0-9_]*\s*=\s*[^\n]+/i.test(text)
}

function hasFunctionDefinition(text: string): boolean {
  return /\bdef\s+[a-z_][a-z0-9_]*\s*\(/i.test(text)
}

function hasReturnStatement(text: string): boolean {
  return /\breturn\b/i.test(text)
}

function hasExecutableCodeIndicators(text: string): boolean {
  return (
    hasFunctionDefinition(text) ||
    hasReturnStatement(text) ||
    /\bnp\.|\btorch\.|```|pass\b/i.test(text)
  )
}

export function lintHintLeakage(options: {
  problem: ProblemSpecV2
  referenceSolution: string
}): HintLeakageLintResult {
  const { problem, referenceSolution } = options
  const issues: HintLeakageIssue[] = []

  const tiers: Array<{ tier: 1 | 2 | 3; text: string }> = [
    { tier: 1, text: problem.hints.tier1 },
    { tier: 2, text: problem.hints.tier2 },
    { tier: 3, text: problem.hints.tier3 }
  ]

  tiers.forEach((entry) => {
    const overlapRatio = computeTokenOverlapRatio(entry.text, referenceSolution)
    const verbatimLineHits = countVerbatimReferenceLineHits(entry.text, referenceSolution)

    if (entry.tier === 1) {
      if (hasExecutableCodeIndicators(entry.text)) {
        issues.push({
          severity: "blocker",
          tier: 1,
          code: "TIER1_CODE_LEAK",
          message:
            "Tier1 hint must remain conceptual and cannot include executable code, assignments, or return-path snippets."
        })
      }
      if (overlapRatio >= 0.5 || verbatimLineHits > 0) {
        issues.push({
          severity: "blocker",
          tier: 1,
          code: "TIER1_REFERENCE_OVERLAP",
          message:
            "Tier1 hint overlaps too heavily with the reference solution and risks giving away implementation details."
        })
      }
      return
    }

    if (entry.tier === 2) {
      if (hasFunctionDefinition(entry.text)) {
        issues.push({
          severity: "blocker",
          tier: 2,
          code: "TIER2_DIRECT_ANSWER",
          message:
            "Tier2 hint can describe structure but cannot include function definitions or runnable code scaffolding."
        })
      }
      if (overlapRatio >= 0.65 || verbatimLineHits > 1) {
        issues.push({
          severity: "blocker",
          tier: 2,
          code: "TIER2_REFERENCE_OVERLAP",
          message:
            "Tier2 hint is too close to the reference implementation and should be rewritten to preserve challenge."
        })
      }
      return
    }

    if (hasFunctionDefinition(entry.text) || /```/.test(entry.text)) {
      issues.push({
        severity: "blocker",
        tier: 3,
        code: "TIER3_FULL_SOLUTION_LEAK",
        message:
          "Tier3 can be near-code, but it cannot contain full runnable solution structure or complete return-chain code."
      })
    }
    if (overlapRatio >= 0.85 || verbatimLineHits > 2) {
      issues.push({
        severity: "blocker",
        tier: 3,
        code: "TIER3_EXCESSIVE_OVERLAP",
        message:
          "Tier3 hint copies too much from the reference solution and should keep only directional implementation guidance."
      })
    }
  })

  return {
    ok: issues.every((issue) => issue.severity !== "blocker"),
    issues
  }
}
