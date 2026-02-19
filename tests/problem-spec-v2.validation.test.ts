import assert from "node:assert/strict"
import test from "node:test"

import { validateProblemSpecV2, type ProblemSpecV2 } from "../src/problems/problem-spec-v2.js"

function createValidSpec(): ProblemSpecV2 {
  return {
    id: "attention_masked_weights_v1",
    problem_version: 1,
    title: "Implement Masked Attention Weights With Stable Softmax",
    category: "Attention",
    learning_objective:
      "Implement masked scaled dot-product attention weights correctly, including mask semantics, stable softmax normalization, and deterministic output alignment with a reference solver.",
    concept_description:
      "Masked attention is core to autoregressive and selective-context models because it converts pairwise token similarity into normalized routing weights. Small mistakes in mask semantics, softmax axis, or scaling can yield numerically plausible but semantically broken outputs. This card isolates those mechanics so learners internalize the exact computation pathway and common failure modes before moving into multi-head and batched variants.",
    learning_context:
      "You will use this exact pattern in decoder self-attention, cross-attention masking, and sparse-context transformers. Knowing why additive masks must be applied before softmax and why row normalization must hold lets you debug production attention stacks quickly, especially when sequence length or precision changes reveal hidden instability.",
    goal:
      "Write `masked_attention_weights(q, k, mask)` that computes scaled scores `(q @ k.T) / sqrt(d_k)`, applies an additive mask where masked entries receive a strong negative bias, and returns row-wise stable softmax weights. The output must remain finite, shape-correct, and equivalent to the reference implementation on deterministic toy tensors while matching PyTorch attention semantics.",
    starter_code:
      "def masked_attention_weights(q, k, mask):\n    \"\"\"Return masked attention weights for toy tensors.\"\"\"\n    # TODO: implement\n    pass",
    function_signature: "def masked_attention_weights(q, k, mask):",
    inputs: {
      tensor_shapes: ["q: [3, 4]", "k: [3, 4]", "mask: [3, 3]"],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only; fixed deterministic inputs",
        "no datasets and no training loop",
        "mask is additive and applied before softmax"
      ]
    },
    output_contract: {
      shape: "[3, 3]",
      semantics: [
        "rows represent query positions and columns represent key positions",
        "each row is a probability distribution after softmax"
      ],
      numerical_properties: [
        "all values finite",
        "rows sum to 1 within tolerance",
        "masked positions have near-zero probability"
      ]
    },
    fidelity_target: {
      paper_title: "Attention Is All You Need",
      paper_url: "https://arxiv.org/abs/1706.03762",
      target_component: "Scaled dot-product attention core weight computation",
      paper_section: "Section 3.2.1 attention function definition",
      required_semantic_checks: [
        "Mask is applied before softmax normalization",
        "Row-wise probability normalization is preserved for each query"
      ],
      forbidden_shortcuts: [
        "Hard-coded output values copied from visible tests",
        "Shape-only matrix return that ignores masking and normalization semantics"
      ]
    },
    pass_criteria: {
      determinism: "deterministic",
      checks: [
        {
          id: "shape_guard",
          mode: "shape_guard",
          scope: "both",
          oracle: "reference_solution",
          description: "Candidate output shape matches [3, 3]."
        },
        {
          id: "hidden_exact_oracle",
          mode: "exact_match",
          scope: "hidden",
          oracle: "reference_solution",
          description: "Candidate output exactly matches hidden deterministic expected matrices."
        },
        {
          id: "row_normalization",
          mode: "property_based",
          scope: "both",
          oracle: "property_checker",
          description: "Each row sums to one and contains non-negative probabilities."
        },
        {
          id: "mask_metamorphic",
          mode: "metamorphic",
          scope: "hidden",
          oracle: "metamorphic_relation",
          description: "Strengthening mask penalties must not increase masked-position probability."
        },
        {
          id: "numeric_tolerance_guard",
          mode: "numeric_tolerance",
          scope: "both",
          oracle: "reference_solution",
          description: "Float comparisons remain stable under expected numeric tolerance.",
          tolerance: {
            abs: 1e-6,
            rel: 1e-5
          }
        }
      ],
      rationale:
        "This mix of checks blocks brittle solutions that only satisfy shape constraints while still allowing robust numeric validation. Hidden exact-match tests catch deterministic mismatches, property checks ensure probability semantics remain valid, and metamorphic checks verify that mask behavior remains correct under controlled perturbations. Together they provide high confidence that the implementation is mechanistically correct."
    },
    evaluation_artifacts: {
      reference_solution_path: "src/problems/reference-python-solutions.ts",
      reference_solution_function: "masked_attention_weights",
      visible_tests: [
        {
          id: "visible_base",
          purpose: "baseline deterministic path",
          input_summary: "balanced q/k with causal-style mask",
          expected_behavior: "row-stochastic matrix with masked entries near zero"
        },
        {
          id: "visible_unmasked",
          purpose: "sanity without mask pressure",
          input_summary: "same q/k with zero mask",
          expected_behavior: "valid row-stochastic matrix with no forced near-zero entries"
        }
      ],
      hidden_tests: [
        {
          id: "hidden_scale",
          purpose: "validate scaling and axis correctness",
          input_summary: "larger magnitude q/k values",
          expected_behavior: "stable softmax and correct ranking"
        },
        {
          id: "hidden_mask_focus",
          purpose: "ensure masked columns stay suppressed",
          input_summary: "strong additive mask penalties",
          expected_behavior: "masked probabilities remain near zero"
        },
        {
          id: "hidden_edge_zero",
          purpose: "edge behavior with repeated rows",
          input_summary: "duplicate query rows",
          expected_behavior: "duplicate outputs for duplicate rows"
        },
        {
          id: "hidden_sharp",
          purpose: "detect missing scaling",
          input_summary: "large dot products",
          expected_behavior: "finite outputs without overflow"
        },
        {
          id: "hidden_symmetry",
          purpose: "catch axis transpose mistakes",
          input_summary: "structured symmetric keys",
          expected_behavior: "distribution aligns with row-wise query semantics"
        }
      ],
      adversarial_tests: [
        {
          id: "adv_transpose_bug",
          purpose: "catches q.T @ k mistake",
          input_summary: "non-square effective pattern",
          expected_behavior: "fails exact and property checks if transpose bug exists"
        },
        {
          id: "adv_post_softmax_mask",
          purpose: "catches applying mask after softmax",
          input_summary: "mask with mixed penalties",
          expected_behavior: "fails normalization invariants when order is wrong"
        }
      ],
      known_failure_patterns: [
        "applying mask after softmax",
        "using wrong softmax axis",
        "omitting scale by sqrt(d_k)"
      ]
    },
    hints: {
      tier1:
        "Track dimensions carefully: attention scores should compare each query row to each key row before any normalization.",
      tier2:
        "Compute scores, apply additive mask, then run a numerically stable row-wise softmax. If your mask is applied after softmax, probability mass will be incorrect.",
      tier3:
        "Near-code: scores = (q @ k.T) / sqrt(d_k); masked = scores + mask; shifted = masked - masked.max(axis=-1, keepdims=True); weights = exp(shifted) / exp(shifted).sum(axis=-1, keepdims=True)."
    },
    resources: [
      {
        title: "Attention Is All You Need",
        url: "https://arxiv.org/abs/1706.03762"
      },
      {
        title: "PyTorch scaled_dot_product_attention",
        url: "https://pytorch.org/docs/stable/generated/torch.nn.functional.scaled_dot_product_attention.html"
      }
    ],
    prerequisites: [
      "2D matrix multiplication shape rules",
      "softmax stability via max-shift",
      "mask semantics in attention"
    ],
    common_pitfalls: [
      "masking after softmax",
      "using wrong normalization axis",
      "forgetting scale by sqrt(d_k)"
    ],
    estimated_time_minutes: 25,
    authoring: {
      source: "ai_generated",
      model_name: "gpt-5",
      generation_prompt_id: "prompt_attention_v3",
      generation_temperature: 0.2,
      human_reviewer: "reviewer_jane",
      reviewed_at_iso: "2026-02-17T12:00:00Z"
    },
    quality_scorecard: {
      pedagogy_depth: 5,
      spec_clarity: 5,
      grader_rigor: 5,
      edge_case_coverage: 4,
      ambiguity_risk_control: 4
    },
    verification: {
      status: "verified",
      blockers: [],
      decision_metadata: {
        approval_type: "auto_provisional",
        verified_at_iso: "2026-02-17T12:00:00Z",
        pipeline_version: "card_verification_pipeline_v1"
      },
      notes:
        "Reviewed with deterministic oracle outputs and adversarial checks for common attention implementation errors."
    }
  }
}

test("problem spec v2 validation accepts a high-rigor verified card", () => {
  const result = validateProblemSpecV2(createValidSpec())
  assert.equal(result.ok, true, result.errors.join("\n"))
  assert.deepEqual(result.warnings, [])
})

test("problem spec v2 validation rejects shape-only and under-specified AI cards", () => {
  const spec = createValidSpec()
  spec.id = "attention_bad_v1"
  spec.pass_criteria.checks = [
    {
      id: "shape_only",
      mode: "shape_guard",
      scope: "both",
      oracle: "reference_solution",
      description: "shape only"
    }
  ]
  spec.evaluation_artifacts.hidden_tests = []
  spec.authoring.model_name = ""
  spec.authoring.generation_prompt_id = ""
  spec.quality_scorecard.grader_rigor = 2

  const result = validateProblemSpecV2(spec)
  assert.equal(result.ok, false)
  assert.equal(
    result.errors.some((entry) => {
      return entry.includes("cannot be shape-heavy")
    }),
    true
  )
  assert.equal(
    result.errors.some((entry) => {
      return entry.includes("AI-authored cards must include authoring.model_name")
    }),
    true
  )
  assert.equal(
    result.errors.some((entry) => {
      return entry.includes("include at least 5 hidden tests")
    }),
    true
  )
})
