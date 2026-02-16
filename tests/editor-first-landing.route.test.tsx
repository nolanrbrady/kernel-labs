import assert from "node:assert/strict"
import test from "node:test"

import { renderToStaticMarkup } from "react-dom/server"

import {
  ProblemWorkspaceScreen,
  createEditorFirstLandingRoute
} from "../src/frontend/problem-workspace-route.js"

test("editor-first landing route is anonymous and mounted at root path", () => {
  const route = createEditorFirstLandingRoute({
    id: "attention_scaled_dot_product_v1",
    title: "Implement Scaled Dot-Product Attention",
    starterCode: "def scaled_dot_product_attention(q, k, v):\n    pass"
  })

  assert.equal(route.path, "/")
  assert.equal(route.requiresAuth, false)
  assert.equal(route.screen, "problem-workspace")
  assert.deepEqual(route.primaryActions, ["run", "submit"])
  assert.equal(route.accountCallToActionPath, "/auth/create-account")
  assert.equal(route.accountCallToActionOptional, true)
})

test("editor-first screen renders starter code with run/submit and account CTA", () => {
  const route = createEditorFirstLandingRoute({
    id: "normalization_layernorm_v1",
    title: "Implement LayerNorm Forward Pass",
    category: "Normalization",
    goal: "Normalize each row and keep outputs finite.",
    conceptDescription:
      "LayerNorm centers and scales hidden activations per token across feature dimensions.",
    inputSpecification:
      "x shape [batch, seq_len, hidden], gamma/beta shape [hidden], epsilon > 0.",
    expectedOutputSpecification:
      "Output shape matches x with per-token normalized features and stable finite values.",
    formulaNotes: [
      "\\mu = \\frac{1}{H}\\sum_{i=1}^{H}x_i",
      "\\sigma^2 = \\frac{1}{H}\\sum_{i=1}^{H}(x_i-\\mu)^2"
    ],
    architectureUses: [
      "Transformer pre-norm and post-norm residual stacks",
      "Stabilizing deep sequence models"
    ],
    evaluationChecklist: [
      "Shape and dtype consistency",
      "Finite output verification"
    ],
    visibleTestCases: [
      {
        name: "Case A - Zero Mean",
        inputSummary: "x=[[[1,2],[3,4]]], gamma=[1,1], beta=[0,0]",
        expectedOutputSummary: "Per-token mean near 0 with stable finite values."
      },
      {
        name: "Case B - Shifted Inputs",
        inputSummary: "x shifted by +10, same gamma/beta.",
        expectedOutputSummary: "Normalization removes shift; output remains finite."
      }
    ],
    paperLinks: [
      {
        title: "Layer Normalization (Ba et al., 2016)",
        url: "https://arxiv.org/abs/1607.06450",
        note: "Original LayerNorm formulation."
      }
    ],
    questionCatalog: [
      {
        id: "normalization_layernorm_v1",
        title: "Implement LayerNorm Forward Pass",
        problemType: "Normalization",
        summary: "Normalize hidden vectors across feature dimensions.",
        estimatedMinutes: 25
      },
      {
        id: "attention_scaled_dot_product_v1",
        title: "Implement Scaled Dot-Product Attention",
        problemType: "Attention",
        summary: "Compute masked attention on toy tensors.",
        estimatedMinutes: 30
      }
    ],
    starterCode: "def layer_norm(x, gamma, beta, eps=1e-5):\n    pass"
  })

  const markup = renderToStaticMarkup(<ProblemWorkspaceScreen route={route} />)

  assert.equal(markup.includes("Create an account to save progress"), true)
  assert.equal(markup.includes("Starter Code"), true)
  assert.equal(markup.includes("Run"), true)
  assert.equal(markup.includes("Submit"), true)
  assert.equal(markup.includes("def layer_norm"), true)
  assert.equal(markup.includes("/auth/create-account"), true)
  assert.equal(markup.includes("Hints"), true)
  assert.equal(markup.includes("Feedback stays supportive"), true)
  assert.equal(markup.includes("workspace-shell"), true)
  assert.equal(markup.includes("code-editor-shell"), true)
  assert.equal(markup.includes("starter-code-editor"), true)
  assert.equal(markup.includes("starter-code-highlight"), true)
  assert.equal(markup.includes("code-editor-highlight"), true)
  assert.equal(markup.includes("run-status"), true)
  assert.equal(markup.includes("session-status"), true)
  assert.equal(markup.includes("hint-tier-1-button"), true)
  assert.equal(markup.includes("hint-tier-2-button"), true)
  assert.equal(markup.includes("hint-tier-3-button"), true)
  assert.equal(markup.includes("Hint status: reveal tiers in order"), true)
  assert.equal(markup.includes("schedule-status"), true)
  assert.equal(markup.includes("problem-context"), true)
  assert.equal(markup.includes("Concept Background"), true)
  assert.equal(markup.includes("Formulas"), true)
  assert.equal(markup.includes("Where It Appears In Architectures"), true)
  assert.equal(markup.includes("Input Shape And Constraints"), true)
  assert.equal(markup.includes("Expected Outputs And Evaluation"), true)
  assert.equal(markup.includes("<math"), true)
  assert.equal(markup.includes('encoding="application/x-tex"'), true)
  assert.equal(markup.includes("$$\\mu"), false)
  assert.equal(markup.includes("LayerNorm centers and scales hidden activations"), true)
  assert.equal(markup.includes("Transformer pre-norm and post-norm residual stacks"), true)
  assert.equal(markup.includes("Visible Test Cases"), true)
  assert.equal(markup.includes("Case A - Zero Mean"), true)
  assert.equal(markup.includes("Case B - Shifted Inputs"), true)
  assert.equal(markup.includes("Input:"), true)
  assert.equal(markup.includes("Expected:"), true)
  assert.equal(markup.includes("visible-test-cases-panel"), true)
  assert.equal(markup.includes("test-case-tabs"), true)
  assert.equal(markup.includes("test-case-tab-case_a_zero_mean"), true)
  assert.equal(markup.includes("test-case-tab-case_b_shifted_inputs"), true)
  assert.equal(markup.includes("test-case-status-case_a_zero_mean"), true)
  assert.equal(markup.includes("test-case-panel-case_a_zero_mean"), true)
  assert.equal(markup.includes("Primary Papers"), true)
  assert.equal(markup.includes("Layer Normalization (Ba et al., 2016)"), true)
  assert.equal(markup.includes("https://arxiv.org/abs/1607.06450"), true)
  assert.equal(markup.includes("debug-shell-output"), true)
  assert.equal(markup.includes("Debug Console"), true)
  assert.equal(markup.includes("Run as many times as needed before submit"), true)
  assert.equal(
    markup.indexOf("debug-shell-output") < markup.indexOf("run-status"),
    true
  )
  assert.equal(
    markup.indexOf("debug-shell-output") < markup.indexOf("visible-test-cases-panel"),
    true
  )
  assert.equal(
    markup.indexOf("visible-test-cases-panel") < markup.indexOf("run-status"),
    true
  )
  assert.equal(markup.includes("start-problem-button"), true)
  assert.equal(markup.includes("session-timer-status"), true)
  assert.equal(markup.includes("timer-cap-message"), true)
  assert.equal(markup.includes("Session timer: not started (30:00 limit)."), true)
  assert.equal(
    markup.includes("Timer starts when you click Start Problem or type your first character."),
    true
  )
  assert.equal(markup.includes("workspace-tab-problem"), true)
  assert.equal(markup.includes("workspace-tab-library"), true)
  assert.equal(markup.includes("Question Bank"), true)
  assert.equal(markup.includes("workspace-problem-tab-panel"), true)
  assert.equal(markup.includes("workspace-library-tab-panel"), true)
  assert.equal(markup.includes("workspace-library-tab-panel\" hidden"), true)
  assert.equal(markup.includes("Question Library"), true)
  assert.equal(markup.includes("question-search-input"), true)
  assert.equal(markup.includes("question-type-filter"), true)
  assert.equal(markup.includes("Suggest a Topic"), true)
  assert.equal(markup.includes("suggest-topic-modal"), true)
  assert.equal(markup.includes("suggest-topic-form"), true)
  assert.equal(markup.includes("suggest-topic-title"), true)
  assert.equal(markup.includes("suggest-topic-problem-type"), true)
  assert.equal(markup.includes("suggest-topic-learning-objective"), true)
  assert.equal(markup.includes("suggest-topic-input-spec"), true)
  assert.equal(markup.includes("suggest-topic-output-spec"), true)
  assert.equal(markup.includes("suggest-topic-starter-signature"), true)
  assert.equal(markup.includes("Submit Topic"), true)
  assert.equal(markup.includes("suggest-topic-status"), true)
  assert.equal(markup.includes("Showing 2 of 2 questions."), true)
  assert.equal(markup.includes("[Normalization] normalization_layernorm_v1 - 25m"), true)
  assert.equal(markup.includes("[Attention] attention_scaled_dot_product_v1 - 30m"), true)
})
