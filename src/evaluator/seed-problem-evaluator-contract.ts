import {
  getSeedProblemPack
} from "../problems/seed-problem-pack.js"
import type { ProblemSpecV2 } from "../problems/problem-spec-v2.js"

export type SeedProblemEvaluationResult = {
  problemId: string
  correctness: "pass" | "fail"
  explanation: string
  checks: {
    shape: {
      passed: boolean
      expectedShape: [number, number]
    }
    numericalSanity: {
      passed: boolean
    }
  }
}

function parseShape(shapeText: string): [number, number] {
  const matched = shapeText.match(/\[(\d+)\s*,\s*(\d+)\]/)

  if (!matched) {
    throw new Error(`Invalid shape format: ${shapeText}`)
  }

  return [Number.parseInt(matched[1], 10), Number.parseInt(matched[2], 10)]
}

function findProblem(problemId: string): ProblemSpecV2 {
  const problem = getSeedProblemPack().find((candidate) => {
    return candidate.id === problemId
  })

  if (!problem) {
    throw new Error(`Unknown seed problem: ${problemId}`)
  }

  return problem
}

export function evaluateSeedProblemContract(options: {
  problemId: string
  candidateOutput: number[][]
}): SeedProblemEvaluationResult {
  const problem = findProblem(options.problemId)
  const expectedShape = parseShape(problem.output_contract.shape)
  const rowsMatch = options.candidateOutput.length === expectedShape[0]
  const columnsMatch = options.candidateOutput.every((row) => {
    return row.length === expectedShape[1]
  })
  const shapePassed = rowsMatch && columnsMatch
  const numericalSanityPassed = options.candidateOutput
    .flat()
    .every((value) => Number.isFinite(value))
  const correctness = shapePassed && numericalSanityPassed ? "pass" : "fail"

  return {
    problemId: options.problemId,
    correctness,
    explanation:
      correctness === "pass"
        ? "Seed problem output satisfies evaluator contract checks."
        : "Seed problem output failed shape or numerical sanity checks.",
    checks: {
      shape: {
        passed: shapePassed,
        expectedShape
      },
      numericalSanity: {
        passed: numericalSanityPassed
      }
    }
  }
}
