import { getReferencePythonSolution } from "./reference-python-solutions.js"
import {
  getRuntimeProblemFixture,
  type RuntimeProblemFixture
} from "./runtime-problem-fixtures.js"
import {
  type ProblemSpecV2,
  type VerificationApprovalType,
  type VerificationStatus,
  validateProblemSpecV2
} from "./problem-spec-v2.js"
import { lintHintLeakage } from "./hint-leakage-lint.js"
import {
  runStarterCodeAgainstToyInputs,
  runUserCodeAgainstFixture
} from "../runtime/runtime-execution.js"

export type VerificationDiagnosticSeverity = "blocker" | "warning"
export type VerificationDiagnosticStage =
  | "schema_validation"
  | "artifact_consistency"
  | "reference_runtime_regression"
  | "fidelity_verification"
  | "hint_leakage_verification"

export type CardVerificationDiagnostic = {
  severity: VerificationDiagnosticSeverity
  stage: VerificationDiagnosticStage
  code: string
  message: string
}

export type CardVerificationResult = {
  problemId: string
  status: VerificationStatus
  approvalType: VerificationApprovalType | null
  blockers: string[]
  warnings: string[]
  diagnostics: CardVerificationDiagnostic[]
  decisionMetadata: {
    pipelineVersion: string
    verifiedAtIso: string | null
  }
}

type VerificationStatusSnapshotEntry = {
  status: VerificationStatus
  approvalType: VerificationApprovalType | null
  blockers: string[]
}

export type CardVerificationOptions = {
  runtimeFixtureOverride?: RuntimeProblemFixture | null
  referenceSolutionOverride?: string | null
}

const PIPELINE_VERSION = "card_verification_pipeline_v1"

function normalizeTimestampIso(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z")
}

function parseShape(shapeText: string): [number, number] | null {
  const matched = shapeText.match(/^\[(\d+)\s*,\s*(\d+)\]$/)
  if (!matched) {
    return null
  }

  return [Number.parseInt(matched[1], 10), Number.parseInt(matched[2], 10)]
}

function pushDiagnostic(
  diagnostics: CardVerificationDiagnostic[],
  diagnostic: CardVerificationDiagnostic
): void {
  diagnostics.push(diagnostic)
}

function getHardRejectionCodes(): Set<string> {
  return new Set([
    "SCHEMA_INVALID",
    "MISSING_RUNTIME_FIXTURE",
    "OUTPUT_SHAPE_FIXTURE_MISMATCH",
    "FUNCTION_NAME_MISMATCH",
    "MISSING_REFERENCE_SOLUTION",
    "REFERENCE_RUNTIME_FAILURE",
    "REFERENCE_RUNTIME_CASE_FAILURE",
    "FIDELITY_REQUIRED_CHECKS_MISMATCH"
  ])
}

function applySchemaValidation(spec: ProblemSpecV2): CardVerificationDiagnostic[] {
  const diagnostics: CardVerificationDiagnostic[] = []
  const validation = validateProblemSpecV2(spec)

  validation.errors.forEach((message) => {
    pushDiagnostic(diagnostics, {
      severity: "blocker",
      stage: "schema_validation",
      code: "SCHEMA_INVALID",
      message
    })
  })
  validation.warnings.forEach((message) => {
    pushDiagnostic(diagnostics, {
      severity: "warning",
      stage: "schema_validation",
      code: "SCHEMA_WARNING",
      message
    })
  })

  return diagnostics
}

function applyArtifactConsistencyChecks(
  spec: ProblemSpecV2,
  options?: CardVerificationOptions
): CardVerificationDiagnostic[] {
  const diagnostics: CardVerificationDiagnostic[] = []
  const fixture = options?.runtimeFixtureOverride ?? getRuntimeProblemFixture(spec.id)

  if (!fixture) {
    pushDiagnostic(diagnostics, {
      severity: "blocker",
      stage: "artifact_consistency",
      code: "MISSING_RUNTIME_FIXTURE",
      message:
        "Runtime fixture is missing for this card. Add fixture coverage before making it schedulable."
    })
    return diagnostics
  }

  const expectedShape = parseShape(spec.output_contract.shape)
  const fixtureShape: [number, number] = [
    fixture.expectedOutput.length,
    fixture.expectedOutput[0]?.length ?? 0
  ]

  if (!expectedShape || expectedShape[0] !== fixtureShape[0] || expectedShape[1] !== fixtureShape[1]) {
    pushDiagnostic(diagnostics, {
      severity: "blocker",
      stage: "artifact_consistency",
      code: "OUTPUT_SHAPE_FIXTURE_MISMATCH",
      message: `output_contract.shape does not match fixture expected output shape [${fixtureShape[0]}, ${fixtureShape[1]}].`
    })
  }

  if (fixture.functionName !== spec.evaluation_artifacts.reference_solution_function) {
    pushDiagnostic(diagnostics, {
      severity: "blocker",
      stage: "artifact_consistency",
      code: "FUNCTION_NAME_MISMATCH",
      message:
        "evaluation_artifacts.reference_solution_function must match runtime fixture functionName."
    })
  }

  return diagnostics
}

function applyReferenceRuntimeRegression(
  spec: ProblemSpecV2,
  options?: CardVerificationOptions
): CardVerificationDiagnostic[] {
  const diagnostics: CardVerificationDiagnostic[] = []
  const referenceSolution =
    options?.referenceSolutionOverride ?? getReferencePythonSolution(spec.id)
  if (!referenceSolution) {
    pushDiagnostic(diagnostics, {
      severity: "blocker",
      stage: "reference_runtime_regression",
      code: "MISSING_REFERENCE_SOLUTION",
      message:
        "Reference solution is missing for this card. Add a deterministic oracle implementation before scheduling."
    })
    return diagnostics
  }

  const runResult =
    options?.runtimeFixtureOverride
      ? runUserCodeAgainstFixture({
          problemId: spec.id,
          userCode: referenceSolution,
          fixture: options.runtimeFixtureOverride
        })
      : runStarterCodeAgainstToyInputs({
          problemId: spec.id,
          userCode: referenceSolution
        })

  if (runResult.status === "failure") {
    pushDiagnostic(diagnostics, {
      severity: "blocker",
      stage: "reference_runtime_regression",
      code: "REFERENCE_RUNTIME_FAILURE",
      message: `${runResult.errorCode}: ${runResult.message}`
    })
    return diagnostics
  }

  const failedCases = runResult.testCaseResults.filter((entry) => !entry.passed)
  if (failedCases.length > 0) {
    pushDiagnostic(diagnostics, {
      severity: "blocker",
      stage: "reference_runtime_regression",
      code: "REFERENCE_RUNTIME_CASE_FAILURE",
      message: `Reference solution failed runtime test cases: ${failedCases.map((entry) => entry.id).join(", ")}`
    })
  }

  return diagnostics
}

function applyFidelityChecks(spec: ProblemSpecV2): CardVerificationDiagnostic[] {
  const diagnostics: CardVerificationDiagnostic[] = []
  const verificationCorpus = [
    ...spec.pass_criteria.checks.map((check) => check.description),
    ...spec.output_contract.semantics,
    spec.goal,
    spec.learning_objective,
    spec.concept_description
  ]
    .join(" ")
    .toLowerCase()

  const missingSemanticChecks = spec.fidelity_target.required_semantic_checks.filter((requiredCheck) => {
    const normalized = requiredCheck.toLowerCase()
    const significantWords = normalized
      .split(/\s+/)
      .map((word) => word.replace(/[^a-z0-9_]+/g, ""))
      .filter((word) => {
        return (
          word.length >= 5 &&
          ![
            "match",
            "matches",
            "preserve",
            "preserves",
            "deterministic",
            "semantic",
            "semantics",
            "output",
            "oracle",
            "hidden"
          ].includes(word)
        )
      })

    if (significantWords.length === 0) {
      return !verificationCorpus.includes(normalized)
    }

    return !significantWords.some((word) => verificationCorpus.includes(word))
  })

  if (missingSemanticChecks.length > 0) {
    pushDiagnostic(diagnostics, {
      severity: "blocker",
      stage: "fidelity_verification",
      code: "FIDELITY_REQUIRED_CHECKS_MISMATCH",
      message:
        "At least one fidelity_target.required_semantic_checks entry is not represented by pass_criteria checks."
    })
  }

  if (!/torch|pytorch/i.test(spec.goal)) {
    pushDiagnostic(diagnostics, {
      severity: "warning",
      stage: "fidelity_verification",
      code: "FIDELITY_PYTORCH_ANCHOR_WEAK",
      message:
        "Goal text should explicitly reference PyTorch semantics so generated cards stay paper-implementation grounded."
    })
  }

  return diagnostics
}

function applyHintLeakageChecks(
  spec: ProblemSpecV2,
  options?: CardVerificationOptions
): CardVerificationDiagnostic[] {
  const diagnostics: CardVerificationDiagnostic[] = []
  const referenceSolution =
    options?.referenceSolutionOverride ?? getReferencePythonSolution(spec.id)

  if (!referenceSolution) {
    pushDiagnostic(diagnostics, {
      severity: "warning",
      stage: "hint_leakage_verification",
      code: "HINT_LEAKAGE_SKIPPED",
      message: "Hint leakage verification skipped because no reference solution is registered."
    })
    return diagnostics
  }

  const leakage = lintHintLeakage({
    problem: spec,
    referenceSolution
  })
  leakage.issues.forEach((issue) => {
    pushDiagnostic(diagnostics, {
      severity: issue.severity,
      stage: "hint_leakage_verification",
      code: issue.code,
      message: issue.message
    })
  })

  return diagnostics
}

function decideStatus(
  diagnostics: CardVerificationDiagnostic[]
): VerificationStatus {
  const blockers = diagnostics.filter((diagnostic) => diagnostic.severity === "blocker")
  if (blockers.length === 0) {
    return "verified"
  }

  const hardRejectionCodes = getHardRejectionCodes()
  const hasHardBlocker = blockers.some((diagnostic) => hardRejectionCodes.has(diagnostic.code))
  return hasHardBlocker ? "rejected" : "needs_review"
}

export function verifyProblemCard(
  spec: ProblemSpecV2,
  options?: CardVerificationOptions
): CardVerificationResult {
  const diagnostics: CardVerificationDiagnostic[] = [
    ...applySchemaValidation(spec),
    ...applyArtifactConsistencyChecks(spec, options),
    ...applyReferenceRuntimeRegression(spec, options),
    ...applyFidelityChecks(spec),
    ...applyHintLeakageChecks(spec, options)
  ]

  const status = decideStatus(diagnostics)
  const approvalType: VerificationApprovalType | null =
    status === "verified"
      ? spec.verification.decision_metadata?.approval_type ?? "auto_provisional"
      : null
  const blockers = diagnostics
    .filter((diagnostic) => diagnostic.severity === "blocker")
    .map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`)
  const warnings = diagnostics
    .filter((diagnostic) => diagnostic.severity === "warning")
    .map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`)

  return {
    problemId: spec.id,
    status,
    approvalType,
    blockers,
    warnings,
    diagnostics,
    decisionMetadata: {
      pipelineVersion: PIPELINE_VERSION,
      verifiedAtIso: status === "verified" ? normalizeTimestampIso(new Date()) : null
    }
  }
}

export function buildVerificationStatusSnapshot(
  problemSpecs: ProblemSpecV2[]
): Record<string, VerificationStatusSnapshotEntry> {
  return problemSpecs.reduce<Record<string, VerificationStatusSnapshotEntry>>(
    (snapshot, spec) => {
      const result = verifyProblemCard(spec)
      snapshot[spec.id] = {
        status: result.status,
        approvalType: result.approvalType,
        blockers: result.blockers
      }
      return snapshot
    },
    {}
  )
}
