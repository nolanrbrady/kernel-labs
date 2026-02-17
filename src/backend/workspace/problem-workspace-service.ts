import {
  type QuestionLibraryItem,
  type WorkspaceProblem
} from "../../frontend/problem-workspace-route.js"
import { getSeedProblemPack } from "../../problems/seed-problem-pack.js"
import { createProblemReviewQueueStore } from "../../problems/problem-review-queue.js"

export const DEFAULT_WORKSPACE_PROBLEM_ID = "attention_scaled_dot_product_v1"

const DEFAULT_INTERCHANGEABLE_THRESHOLD = 0.03
const INTERCHANGEABLE_WEIGHT_EPSILON = 1e-9
const SEED_PROBLEM_WEIGHT_STEP = 0.012
const SEED_PROBLEM_WEIGHT_BASE = 0.94
const DEFAULT_WORKSPACE_PROBLEM_WEIGHT = 0.955

export const SEED_PROBLEM_PACK = getSeedProblemPack()

const SEED_PROBLEM_BY_ID = new Map(
  SEED_PROBLEM_PACK.map((problem) => {
    return [problem.id, problem]
  })
)

const SEED_PROBLEM_VERSION_BY_ID = SEED_PROBLEM_PACK.reduce<Record<string, number>>(
  (accumulator, problem) => {
    accumulator[problem.id] = problem.problem_version
    return accumulator
  },
  {}
)

export const problemReviewQueueStore = createProblemReviewQueueStore({
  knownProblemIds: Array.from(
    new Set([DEFAULT_WORKSPACE_PROBLEM_ID, ...SEED_PROBLEM_PACK.map((problem) => problem.id)])
  ),
  problemVersionById: {
    [DEFAULT_WORKSPACE_PROBLEM_ID]: 1,
    ...SEED_PROBLEM_VERSION_BY_ID
  }
})

function parseInterchangeableThreshold(rawValue: string | undefined): number {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return DEFAULT_INTERCHANGEABLE_THRESHOLD
  }

  const parsedValue = Number(rawValue)
  if (Number.isFinite(parsedValue) === false || parsedValue < 0) {
    return DEFAULT_INTERCHANGEABLE_THRESHOLD
  }

  return parsedValue
}

const QUESTION_LIBRARY_INTERCHANGEABLE_THRESHOLD = parseInterchangeableThreshold(
  process.env.QUESTION_BANK_INTERCHANGEABLE_THRESHOLD
)

function buildInterchangeableQuestionLibrary(options: {
  questionCatalog: QuestionLibraryItem[]
  interchangeableThreshold: number
}): QuestionLibraryItem[] {
  const sortedCatalog = [...options.questionCatalog].sort((left, right) => {
    const leftWeight =
      typeof left.schedulerWeight === "number" && Number.isFinite(left.schedulerWeight)
        ? left.schedulerWeight
        : Number.NEGATIVE_INFINITY
    const rightWeight =
      typeof right.schedulerWeight === "number" && Number.isFinite(right.schedulerWeight)
        ? right.schedulerWeight
        : Number.NEGATIVE_INFINITY

    if (rightWeight !== leftWeight) {
      return rightWeight - leftWeight
    }

    return left.title.localeCompare(right.title)
  })
  const topWeight =
    typeof sortedCatalog[0]?.schedulerWeight === "number" &&
    Number.isFinite(sortedCatalog[0].schedulerWeight)
      ? sortedCatalog[0].schedulerWeight
      : Number.NEGATIVE_INFINITY

  return sortedCatalog.filter((question) => {
    if (
      typeof question.schedulerWeight !== "number" ||
      Number.isFinite(question.schedulerWeight) === false
    ) {
      return false
    }

    return (
      topWeight - question.schedulerWeight <=
      options.interchangeableThreshold + INTERCHANGEABLE_WEIGHT_EPSILON
    )
  })
}

function buildDefaultQuestionLibrary(): QuestionLibraryItem[] {
  return [
    {
      id: DEFAULT_WORKSPACE_PROBLEM_ID,
      title: "Implement Scaled Dot-Product Attention",
      problemType: "Attention",
      summary:
        "Compute query-key scores, apply mask handling, and return weighted values on toy tensors.",
      estimatedMinutes: 30,
      schedulerWeight: DEFAULT_WORKSPACE_PROBLEM_WEIGHT,
      problemPath: `/?problemId=${encodeURIComponent(DEFAULT_WORKSPACE_PROBLEM_ID)}`
    },
    ...SEED_PROBLEM_PACK.map((problem, index) => {
      return {
        id: problem.id,
        title: problem.title,
        problemType: problem.category,
        summary: problem.learning_context,
        estimatedMinutes: problem.estimated_time_minutes,
        schedulerWeight: Number(
          (SEED_PROBLEM_WEIGHT_BASE - index * SEED_PROBLEM_WEIGHT_STEP).toFixed(6)
        ),
        problemPath: `/?problemId=${encodeURIComponent(problem.id)}`
      }
    })
  ]
}

const FULL_QUESTION_LIBRARY = buildDefaultQuestionLibrary()

function buildQuestionLibraryForWorkspace(activeProblemId: string | null): QuestionLibraryItem[] {
  const schedulableCatalog = FULL_QUESTION_LIBRARY.filter((question) => {
    return (
      problemReviewQueueStore.isProblemSchedulable(question.id) ||
      (typeof activeProblemId === "string" && question.id === activeProblemId)
    )
  })
  const baseCatalog =
    schedulableCatalog.length > 0
      ? schedulableCatalog
      : FULL_QUESTION_LIBRARY.filter((question) => question.id === DEFAULT_WORKSPACE_PROBLEM_ID)

  const interchangeableCatalog = buildInterchangeableQuestionLibrary({
    questionCatalog: baseCatalog,
    interchangeableThreshold: QUESTION_LIBRARY_INTERCHANGEABLE_THRESHOLD
  })

  return interchangeableCatalog.length > 0 ? interchangeableCatalog : baseCatalog
}

function buildSeedWorkspaceProblem(
  problemId: string,
  questionCatalog: QuestionLibraryItem[]
): WorkspaceProblem | null {
  const seedProblem = SEED_PROBLEM_BY_ID.get(problemId)
  if (!seedProblem) {
    return null
  }

  return {
    id: seedProblem.id,
    problemVersion: seedProblem.problem_version,
    title: seedProblem.title,
    category: seedProblem.category,
    goal: seedProblem.goal,
    conceptDescription: seedProblem.concept_description,
    inputSpecification: [
      ...seedProblem.inputs.tensor_shapes,
      ...seedProblem.inputs.constraints
    ].join(" | "),
    expectedOutputSpecification: [
      `Expected shape: ${seedProblem.output_contract.shape}`,
      ...seedProblem.output_contract.numerical_properties
    ].join(" | "),
    formulaNotes: [
      "\\text{Implement the core forward pass for this primitive.}",
      "\\text{Respect the provided tensor shapes and constraints.}",
      "\\text{Return finite deterministic outputs for toy tensors.}"
    ],
    architectureUses: [seedProblem.learning_context],
    evaluationChecklist: seedProblem.pass_criteria.checks.map((check) => check.description),
    visibleTestCases: seedProblem.evaluation_artifacts.visible_tests.slice(0, 2).map(
      (testCase, index) => {
        return {
          id: testCase.id,
          name: `Case ${index + 1} - ${testCase.purpose}`,
          inputSummary: testCase.input_summary,
          expectedOutputSummary: testCase.expected_behavior
        }
      }
    ),
    paperLinks: seedProblem.resources.map((resource) => {
      return {
        title: resource.title,
        url: resource.url
      }
    }),
    hints: seedProblem.hints,
    questionCatalog,
    interchangeableThreshold: QUESTION_LIBRARY_INTERCHANGEABLE_THRESHOLD,
    starterCode: seedProblem.starter_code
  }
}

const DEFAULT_WORKSPACE_PROBLEM: WorkspaceProblem = {
  id: DEFAULT_WORKSPACE_PROBLEM_ID,
  problemVersion: 1,
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
  starterCode: `import numpy as np


def scaled_dot_product_attention(q, k, v, mask=None):
    """Scaled dot-product attention (2D toy formulation).

    Shapes:
      q, k, v: [seq_len, d_k]
      mask (optional): [seq_len, seq_len] additive bias applied before softmax

    Returns:
      context: [seq_len, d_k]
    """
    # TODO: implement attention core
    pass`
}

function buildDefaultWorkspaceProblem(
  questionCatalog: QuestionLibraryItem[]
): WorkspaceProblem {
  return {
    ...DEFAULT_WORKSPACE_PROBLEM,
    questionCatalog,
    interchangeableThreshold: QUESTION_LIBRARY_INTERCHANGEABLE_THRESHOLD
  }
}

export function resolveWorkspaceProblem(problemId: string | null): WorkspaceProblem {
  const questionCatalog = buildQuestionLibraryForWorkspace(problemId)

  if (!problemId || problemId === DEFAULT_WORKSPACE_PROBLEM_ID) {
    return buildDefaultWorkspaceProblem(questionCatalog)
  }

  const mappedSeedProblem = buildSeedWorkspaceProblem(problemId, questionCatalog)
  return mappedSeedProblem ?? buildDefaultWorkspaceProblem(questionCatalog)
}
