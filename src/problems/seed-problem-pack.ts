export type SeedProblemDefinition = {
  id: string
  title: string
  category:
    | "MLP"
    | "Normalization"
    | "RNNs"
    | "Attention"
    | "Conditioning & Modulation"
    | "Adaptation & Efficiency"
    | "Positional Encoding"
  concept_description: string
  goal: string
  starter_code: string
  inputs: {
    tensor_shapes: string[]
    datatypes: string[]
    constraints: string[]
  }
  expected_output: {
    shape: string
    numerical_properties: string[]
  }
  evaluation_logic: {
    checks: string[]
    rationale: string
  }
  hints: {
    tier1: string
    tier2: string
    tier3: string
  }
  resources: Array<{
    title: string
    url: string
  }>
  estimated_time_minutes: number
  problem_version: number
  torch_version_target: string
  learning_context: string
}

const SEED_PROBLEM_PACK_V1: SeedProblemDefinition[] = [
  {
    id: "mlp_affine_relu_step_v1",
    title: "Implement a Single MLP Affine + ReLU Step",
    category: "MLP",
    concept_description:
      "Compose one affine transform followed by ReLU with toy tensor inputs.",
    goal: "Return activated output with correct shape and finite values.",
    starter_code:
      "def mlp_affine_relu(x, weight, bias):\n    # x: [batch, in_dim]\n    # weight: [in_dim, out_dim]\n    # bias: [out_dim]\n    pass",
    inputs: {
      tensor_shapes: ["x: [2, 3]", "weight: [3, 2]", "bias: [2]"],
      datatypes: ["float32"],
      constraints: ["toy tensors only", "no dataset usage", "no training loop"]
    },
    expected_output: {
      shape: "[2, 2]",
      numerical_properties: [
        "all values finite",
        "non-negative after ReLU",
        "deterministic for fixed toy inputs"
      ]
    },
    evaluation_logic: {
      checks: ["shape correctness", "numerical sanity", "ReLU non-negativity"],
      rationale: "Validate core affine activation behavior without optimization loops."
    },
    hints: {
      tier1: "Start with matrix multiply, then add bias.",
      tier2: "Apply ReLU with elementwise max against zero.",
      tier3: "Use (x @ weight) + bias and clamp negatives to zero."
    },
    resources: [
      {
        title: "PyTorch Linear Layer",
        url: "https://pytorch.org/docs/stable/generated/torch.nn.Linear.html"
      }
    ],
    estimated_time_minutes: 20,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up in real systems: feed-forward blocks in transformers and MLP heads."
  },
  {
    id: "normalization_layernorm_forward_v1",
    title: "Implement LayerNorm Forward Pass",
    category: "Normalization",
    concept_description:
      "Normalize activations across hidden dimensions with epsilon stabilization.",
    goal: "Produce centered and scaled outputs for each token vector.",
    starter_code:
      "def layer_norm_forward(x, gamma, beta, eps=1e-5):\n    # normalize over last dimension\n    pass",
    inputs: {
      tensor_shapes: ["x: [2, 3]", "gamma: [3]", "beta: [3]"],
      datatypes: ["float32"],
      constraints: ["toy tensors only", "single forward pass", "no running stats"]
    },
    expected_output: {
      shape: "[2, 3]",
      numerical_properties: [
        "finite outputs",
        "approximately zero mean per row before affine scale/shift"
      ]
    },
    evaluation_logic: {
      checks: ["shape correctness", "row normalization invariance", "numerical sanity"],
      rationale: "Confirm normalization mechanics for stable activations."
    },
    hints: {
      tier1: "Compute mean and variance over the last dimension.",
      tier2: "Normalize with (x - mean) / sqrt(var + eps).",
      tier3: "After normalization, apply gamma and beta elementwise."
    },
    resources: [
      {
        title: "Layer Normalization Paper",
        url: "https://arxiv.org/abs/1607.06450"
      }
    ],
    estimated_time_minutes: 25,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up in real systems: transformer blocks rely on LayerNorm for stable deep training."
  },
  {
    id: "rnn_hidden_state_update_v1",
    title: "Implement a Vanilla RNN Hidden-State Update",
    category: "RNNs",
    concept_description:
      "Compute next hidden state from current input and previous hidden state.",
    goal: "Return next hidden state with correct recurrent shape behavior.",
    starter_code:
      "def rnn_step(x_t, h_prev, w_xh, w_hh, b_h):\n    # one recurrent update\n    pass",
    inputs: {
      tensor_shapes: [
        "x_t: [2, 3]",
        "h_prev: [2, 4]",
        "w_xh: [3, 4]",
        "w_hh: [4, 4]",
        "b_h: [4]"
      ],
      datatypes: ["float32"],
      constraints: ["toy tensors only", "single-step recurrence", "no sequence dataset"]
    },
    expected_output: {
      shape: "[2, 4]",
      numerical_properties: [
        "finite outputs",
        "bounded output if tanh activation used"
      ]
    },
    evaluation_logic: {
      checks: ["shape correctness", "recurrent composition invariant", "numerical sanity"],
      rationale: "Test atomic recurrent transition used across sequence models."
    },
    hints: {
      tier1: "Combine input and hidden projections before activation.",
      tier2: "Use x_t @ w_xh plus h_prev @ w_hh plus bias.",
      tier3: "Apply tanh to the combined pre-activation tensor."
    },
    resources: [
      {
        title: "PyTorch RNN Docs",
        url: "https://pytorch.org/docs/stable/generated/torch.nn.RNN.html"
      }
    ],
    estimated_time_minutes: 25,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up in real systems: recurrent controllers and sequence encoders."
  },
  {
    id: "attention_scaled_dot_product_core_v1",
    title: "Implement Scaled Dot-Product Attention Core",
    category: "Attention",
    concept_description:
      "Compute attention weights from query-key similarity and return weighted values.",
    goal: "Return attention output with proper masking and scaling semantics.",
    starter_code:
      "def scaled_dot_product_attention(q, k, v, mask=None):\n    # core attention logic\n    pass",
    inputs: {
      tensor_shapes: ["q: [2, 3]", "k: [2, 3]", "v: [2, 3]", "mask: [2, 2] optional"],
      datatypes: ["float32"],
      constraints: ["toy tensors only", "no training loop", "single forward attention"]
    },
    expected_output: {
      shape: "[2, 3]",
      numerical_properties: [
        "finite outputs",
        "softmax weights sum to one per query position"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness",
        "masking correctness",
        "numerical sanity",
        "attention-weight invariance checks"
      ],
      rationale: "Validate transformer-critical attention primitive with toy tensors."
    },
    hints: {
      tier1: "Compute attention logits with q @ k^T.",
      tier2: "Scale logits by sqrt(d_k) and apply mask before softmax.",
      tier3: "Use attention weights to compute weighted sum over v."
    },
    resources: [
      {
        title: "Attention Is All You Need",
        url: "https://arxiv.org/abs/1706.03762"
      }
    ],
    estimated_time_minutes: 30,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up in real systems: transformer encoders, decoders, and cross-attention modules."
  },
  {
    id: "conditioning_film_affine_shift_scale_v1",
    title: "Implement FiLM Affine Conditioning",
    category: "Conditioning & Modulation",
    concept_description:
      "Apply feature-wise scale and shift conditioning to a hidden tensor.",
    goal: "Produce conditioned activations with stable shape and finite values.",
    starter_code:
      "def film_affine(x, gamma, beta):\n    # x: [2, 4], gamma: [2, 4], beta: [2, 4]\n    pass",
    inputs: {
      tensor_shapes: ["x: [2, 4]", "gamma: [2, 4]", "beta: [2, 4]"],
      datatypes: ["float32"],
      constraints: ["toy tensors only", "single forward transform"]
    },
    expected_output: {
      shape: "[2, 4]",
      numerical_properties: [
        "finite outputs",
        "deterministic affine modulation for fixed inputs"
      ]
    },
    evaluation_logic: {
      checks: ["shape correctness", "affine modulation invariant", "numerical sanity"],
      rationale: "Verify atomic FiLM conditioning behavior."
    },
    hints: {
      tier1: "Condition with feature-wise scale and bias.",
      tier2: "Use x * gamma + beta.",
      tier3: "Apply elementwise multiplication before adding beta."
    },
    resources: [
      {
        title: "FiLM: Visual Reasoning with Conditioning",
        url: "https://arxiv.org/abs/1709.07871"
      }
    ],
    estimated_time_minutes: 20,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up in real systems: multimodal fusion and conditional generation blocks."
  },
  {
    id: "conditioning_gated_feature_modulation_v2",
    title: "Implement Gated Feature Conditioning",
    category: "Conditioning & Modulation",
    concept_description:
      "Gate hidden features with a learned sigmoid-style conditioning vector.",
    goal: "Return gated features preserving shape and finite output range.",
    starter_code:
      "def gated_conditioning(x, gate_logits):\n    # x: [2, 4], gate_logits: [2, 4]\n    pass",
    inputs: {
      tensor_shapes: ["x: [2, 4]", "gate_logits: [2, 4]"],
      datatypes: ["float32"],
      constraints: ["toy tensors only", "no training loop", "single gating pass"]
    },
    expected_output: {
      shape: "[2, 4]",
      numerical_properties: [
        "finite outputs",
        "gates bounded between zero and one when sigmoid applied"
      ]
    },
    evaluation_logic: {
      checks: ["shape correctness", "gating bounds sanity", "numerical sanity"],
      rationale: "Capture gated modulation variant beyond plain affine FiLM."
    },
    hints: {
      tier1: "Turn logits into gates before applying to x.",
      tier2: "Use sigmoid(gate_logits) for a bounded gate tensor.",
      tier3: "Multiply x elementwise by the gate tensor."
    },
    resources: [
      {
        title: "Conditioning Mechanisms Survey",
        url: "https://arxiv.org/abs/2202.06709"
      }
    ],
    estimated_time_minutes: 24,
    problem_version: 2,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up in real systems: control modules and adaptive routing layers."
  },
  {
    id: "adaptation_lora_low_rank_projection_v1",
    title: "Implement LoRA Low-Rank Update Projection",
    category: "Adaptation & Efficiency",
    concept_description:
      "Compose a low-rank adapter update and add it to a base projection output.",
    goal: "Return adapted projection output with deterministic toy behavior.",
    starter_code:
      "def lora_projection(x, base_w, a, b, alpha):\n    # x: [2, 3], base_w: [3, 3], a: [3, 2], b: [2, 3]\n    pass",
    inputs: {
      tensor_shapes: [
        "x: [2, 3]",
        "base_w: [3, 3]",
        "a: [3, 2]",
        "b: [2, 3]"
      ],
      datatypes: ["float32"],
      constraints: ["toy tensors only", "no optimizer", "single adapter merge"]
    },
    expected_output: {
      shape: "[2, 3]",
      numerical_properties: [
        "finite outputs",
        "base projection plus low-rank delta"
      ]
    },
    evaluation_logic: {
      checks: ["shape correctness", "low-rank composition invariant", "numerical sanity"],
      rationale: "Validate adapter efficiency primitive without training cycles."
    },
    hints: {
      tier1: "Compute base projection first.",
      tier2: "Build low-rank delta with x @ a @ b.",
      tier3: "Scale delta by alpha and add to base output."
    },
    resources: [
      {
        title: "LoRA: Low-Rank Adaptation",
        url: "https://arxiv.org/abs/2106.09685"
      }
    ],
    estimated_time_minutes: 26,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up in real systems: parameter-efficient fine-tuning for large models."
  },
  {
    id: "adaptation_linear_adapter_blend_v2",
    title: "Implement Linear Adapter Blend",
    category: "Adaptation & Efficiency",
    concept_description:
      "Blend base hidden states with adapter outputs via residual-style composition.",
    goal: "Produce blended output preserving hidden shape and finite values.",
    starter_code:
      "def linear_adapter_blend(x, adapter_w, blend_scale):\n    # x: [2, 4], adapter_w: [4, 4]\n    pass",
    inputs: {
      tensor_shapes: ["x: [2, 4]", "adapter_w: [4, 4]"],
      datatypes: ["float32"],
      constraints: ["toy tensors only", "single forward blend", "no training loop"]
    },
    expected_output: {
      shape: "[2, 4]",
      numerical_properties: [
        "finite outputs",
        "residual blend between base and adapter paths"
      ]
    },
    evaluation_logic: {
      checks: ["shape correctness", "residual blend invariant", "numerical sanity"],
      rationale: "Cover adapter-style efficiency pattern beyond LoRA."
    },
    hints: {
      tier1: "Compute adapter output from x.",
      tier2: "Scale adapter contribution with blend_scale.",
      tier3: "Return x + blend_scale * adapter_output."
    },
    resources: [
      {
        title: "Adapter Layers for NLP",
        url: "https://arxiv.org/abs/1902.00751"
      }
    ],
    estimated_time_minutes: 24,
    problem_version: 2,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up in real systems: efficient domain adaptation with frozen backbones."
  },
  {
    id: "positional_sinusoidal_encoding_table_v1",
    title: "Implement Sinusoidal Positional Encoding Table",
    category: "Positional Encoding",
    concept_description:
      "Generate deterministic sinusoidal encodings for token positions.",
    goal: "Return encoding table with correct shape and finite values.",
    starter_code:
      "def sinusoidal_positions(seq_len, d_model):\n    # return [seq_len, d_model]\n    pass",
    inputs: {
      tensor_shapes: ["seq_len: scalar", "d_model: scalar"],
      datatypes: ["float32"],
      constraints: ["toy dimensions only", "no external dataset", "single table generation"]
    },
    expected_output: {
      shape: "[2, 4]",
      numerical_properties: [
        "finite outputs",
        "sin/cos periodic structure for position basis"
      ]
    },
    evaluation_logic: {
      checks: ["shape correctness", "periodic structure sanity", "numerical sanity"],
      rationale: "Validate deterministic positional basis creation."
    },
    hints: {
      tier1: "Use sine for even channels and cosine for odd channels.",
      tier2: "Scale frequencies by powers of 10000.",
      tier3: "Construct position and channel indices then apply sin/cos."
    },
    resources: [
      {
        title: "Attention Is All You Need Positional Encoding",
        url: "https://arxiv.org/abs/1706.03762"
      }
    ],
    estimated_time_minutes: 22,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up in real systems: transformer token position injection."
  },
  {
    id: "positional_rope_simplified_rotation_v2",
    title: "Implement Simplified RoPE Rotation",
    category: "Positional Encoding",
    concept_description:
      "Apply rotary position embedding style rotation to paired channels.",
    goal: "Return rotated query/key representation with preserved shape.",
    starter_code:
      "def rope_rotate(x, cos_cache, sin_cache):\n    # x: [2, 4]\n    pass",
    inputs: {
      tensor_shapes: ["x: [2, 4]", "cos_cache: [2, 2]", "sin_cache: [2, 2]"],
      datatypes: ["float32"],
      constraints: ["toy tensors only", "simplified pairwise channel rotation"]
    },
    expected_output: {
      shape: "[2, 4]",
      numerical_properties: [
        "finite outputs",
        "pairwise rotation preserves approximate vector norms"
      ]
    },
    evaluation_logic: {
      checks: ["shape correctness", "rotation-pair invariant", "numerical sanity"],
      rationale: "Add modern positional encoding variant with versioned contract."
    },
    hints: {
      tier1: "Split channels into two-value pairs for rotation.",
      tier2: "Apply [x1*cos - x2*sin, x1*sin + x2*cos] per pair.",
      tier3: "Re-stack rotated pairs to original shape."
    },
    resources: [
      {
        title: "RoFormer: Rotary Position Embedding",
        url: "https://arxiv.org/abs/2104.09864"
      }
    ],
    estimated_time_minutes: 28,
    problem_version: 2,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up in real systems: long-context transformer attention kernels."
  }
]

export function getSeedProblemPackV1(): SeedProblemDefinition[] {
  return SEED_PROBLEM_PACK_V1.map((problem) => ({ ...problem }))
}

export function validateSeedProblemDefinition(problem: SeedProblemDefinition): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!problem.id) {
    errors.push("Missing id.")
  }

  if (!problem.title) {
    errors.push("Missing title.")
  }

  if (!problem.category) {
    errors.push("Missing category.")
  }

  if (!problem.starter_code) {
    errors.push("Missing starter_code.")
  }

  if (problem.estimated_time_minutes > 30) {
    errors.push("estimated_time_minutes exceeds 30.")
  }

  if (!problem.problem_version) {
    errors.push("Missing problem_version.")
  }

  if (!problem.torch_version_target) {
    errors.push("Missing torch_version_target.")
  }

  if (!problem.learning_context) {
    errors.push("Missing learning_context.")
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
