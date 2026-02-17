import { getRuntimeProblemFixture } from "../problems/runtime-problem-fixtures.js"
import { createEvaluatorToyFixture } from "../testing/deterministic-fixtures.js"

type Matrix = number[][]

type ShapeCheck = {
  passed: boolean
  expectedShape: [number, number]
  receivedShape: [number, number] | null
}

type InvarianceCheck = {
  passed: boolean
  tolerance: number
  details: string
}

type NumericalSanityCheck = {
  passed: boolean
  maxAbsValue: number | null
}

type ExactValueCheck = {
  passed: boolean
  tolerance: number
  appliedBecause: string
}

export type EvaluationCorrectness = "pass" | "partial" | "fail"

export type EvaluatorResult = {
  problemId: string
  correctness: EvaluationCorrectness
  explanation: string
  checks: {
    shape: ShapeCheck
    invariance: InvarianceCheck
    numericalSanity: NumericalSanityCheck
    exactValue: ExactValueCheck
  }
}

export type EvaluateOutputRequest = {
  problemId: string
  candidateOutput: unknown
}

function isMatrix(candidateOutput: unknown): candidateOutput is Matrix {
  if (!Array.isArray(candidateOutput)) {
    return false
  }

  return candidateOutput.every((row) => {
    if (!Array.isArray(row)) {
      return false
    }

    return row.every((value) => typeof value === "number")
  })
}

function getShape(matrix: Matrix): [number, number] | null {
  if (matrix.length === 0) {
    return [0, 0]
  }

  const firstRowLength = matrix[0]?.length ?? 0
  const hasConsistentRowLength = matrix.every((row) => row.length === firstRowLength)

  if (!hasConsistentRowLength) {
    return null
  }

  return [matrix.length, firstRowLength]
}

function getMaxAbsValue(matrix: Matrix): number | null {
  const flatValues = matrix.flat()

  if (flatValues.length === 0) {
    return null
  }

  return flatValues.reduce((maxAbs, value) => {
    return Math.max(maxAbs, Math.abs(value))
  }, 0)
}

function rowCenter(matrix: Matrix): Matrix {
  return matrix.map((row) => {
    const rowMean =
      row.length === 0
        ? 0
        : row.reduce((total, value) => total + value, 0) / row.length

    return row.map((value) => value - rowMean)
  })
}

function areMatricesClose(
  first: Matrix,
  second: Matrix,
  tolerance: number
): boolean {
  return first.every((row, rowIndex) => {
    return row.every((value, columnIndex) => {
      const expectedValue = second[rowIndex]?.[columnIndex] ?? Number.NaN
      return Math.abs(value - expectedValue) <= tolerance
    })
  })
}

export function evaluateOutputAgainstFixture(
  request: EvaluateOutputRequest
): EvaluatorResult {
  const runtimeFixture = getRuntimeProblemFixture(request.problemId)
  const fallbackFixture = createEvaluatorToyFixture()
  const expectedOutput = runtimeFixture
    ? runtimeFixture.expectedOutput
    : fallbackFixture.expectedOutput
  const expectedShape: [number, number] = runtimeFixture
    ? [expectedOutput.length, expectedOutput[0]?.length ?? 0]
    : fallbackFixture.metadata.outputShape
  const rawCandidateOutput = request.candidateOutput
  const isCandidateMatrix = isMatrix(rawCandidateOutput)
  const candidateOutput = isCandidateMatrix ? rawCandidateOutput : []
  const receivedShape = isCandidateMatrix ? getShape(candidateOutput) : null

  const shapePassed =
    receivedShape !== null &&
    receivedShape[0] === expectedShape[0] &&
    receivedShape[1] === expectedShape[1]

  const numericalSanityPassed =
    isCandidateMatrix &&
    shapePassed &&
    candidateOutput.flat().every((value) => Number.isFinite(value)) &&
    (getMaxAbsValue(candidateOutput) ?? 0) <= 10000

  const isAttentionProblem =
    request.problemId.startsWith("attention_") ||
    request.problemId.includes("_attention_")
  const invarianceTolerance = 0.0001
  const invariancePassed = isAttentionProblem
    ? isCandidateMatrix &&
      shapePassed &&
      areMatricesClose(
        rowCenter(candidateOutput),
        rowCenter(expectedOutput),
        invarianceTolerance
      )
    : Boolean(isCandidateMatrix && shapePassed && numericalSanityPassed)

  const exactValueTolerance = 0.000001
  const exactValuePassed =
    isCandidateMatrix &&
    shapePassed &&
    areMatricesClose(candidateOutput, expectedOutput, exactValueTolerance)

  let correctness: EvaluationCorrectness = "fail"
  let explanation = "Evaluation failed due to shape or numerical constraints."

  if (shapePassed && numericalSanityPassed && invariancePassed && exactValuePassed) {
    correctness = "pass"
    explanation =
      "Output passed shape, invariance, and numerical checks with deterministic toy values."
  } else if (shapePassed && numericalSanityPassed && invariancePassed) {
    correctness = "partial"
    explanation =
      "Core structure looks correct, but values are offset from expected deterministic output."
  }

  return {
    problemId: request.problemId,
    correctness,
    explanation,
    checks: {
      shape: {
        passed: shapePassed,
        expectedShape,
        receivedShape
      },
      invariance: {
        passed: invariancePassed,
        tolerance: invarianceTolerance,
        details: isAttentionProblem
          ? "Row-centered output must match expected row-centered output."
          : "Invariance checks are not applied for this deterministic toy fixture; use exact-value tolerance instead."
      },
      numericalSanity: {
        passed: numericalSanityPassed,
        maxAbsValue: isCandidateMatrix ? getMaxAbsValue(candidateOutput) : null
      },
      exactValue: {
        passed: exactValuePassed,
        tolerance: exactValueTolerance,
        appliedBecause:
          "Exact comparison is applied to deterministic toy fixtures (within tolerance) to ensure solution correctness."
      }
    }
  }
}
