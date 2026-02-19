import {
  type ProblemSpecV2,
  type ProblemSpecV2ValidationResult,
  type VerificationCase,
  validateProblemSpecV2
} from "./problem-spec-v2.js"
import {
  getRuntimeProblemFixture,
  type RuntimeFixtureValue,
  type RuntimeProblemFixture
} from "./runtime-problem-fixtures.js"

type SeedProblemDraft = {
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
  prerequisites: string[]
  common_pitfalls: string[]
  estimated_time_minutes: number
  problem_version: number
  torch_version_target: string
  learning_context: string
}

const SEED_PROBLEM_DRAFTS: SeedProblemDraft[] = [
  {
    id: "mlp_affine_relu_step_v1",
    title: "Implement a Single MLP Affine + ReLU Step",
    category: "MLP",
    concept_description:
      "Implement the core forward pass of a 2-layer perceptron block: an affine projection followed by an elementwise nonlinearity. In modern architectures this is the inner computation of MLP/FFN sublayers (e.g. in Transformers), and getting the shape semantics right (matrix multiply order + bias broadcasting) is a prerequisite for more complex blocks.",
    goal:
      "Write `mlp_affine_relu(x, weight, bias)` that returns `relu(x @ weight + bias)` for toy 2D tensors, with bias broadcast across the batch dimension and a deterministic, finite 2D output.",
    starter_code:
      "def mlp_affine_relu(x, weight, bias):\n    \"\"\"One affine projection followed by ReLU.\n\n    Notes:\n      - `x` is a 2D toy tensor shaped [batch, in_dim].\n      - `weight` is shaped [in_dim, out_dim].\n      - `bias` is shaped [out_dim] and should broadcast across batch.\n      - Use only toy tensors (no datasets, no training loops).\n    \"\"\"\n    # TODO: implement\n    pass",
    inputs: {
      tensor_shapes: ["x: [2, 3]", "weight: [3, 2]", "bias: [2]"],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only (small fixed sizes)",
        "no dataset usage, no training loop",
        "bias must broadcast over batch",
        "ReLU is elementwise max(x, 0)"
      ]
    },
    expected_output: {
      shape: "[2, 2]",
      numerical_properties: [
        "all values finite",
        "non-negative after ReLU",
        "deterministic for fixed toy inputs",
        "matches affine projection then elementwise ReLU"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness ([batch, out_dim])",
        "bias broadcasting correctness",
        "ReLU non-negativity invariant",
        "numerical sanity (finite values)"
      ],
      rationale:
        "This is the smallest runnable unit that teaches the shape/broadcasting rules underlying MLP blocks. The evaluator focuses on forward semantics only (no gradients, no optimization)."
    },
    hints: {
      tier1:
        "Start by reasoning about shapes: the affine projection maps `[batch, in_dim]` into `[batch, out_dim]`, so the multiply must look like `x @ weight` (not `weight @ x`).",
      tier2:
        "Compute the pre-activation in two explicit steps: first `pre = x @ weight` to get shape `[batch, out_dim]`, then add `bias` as a 1D vector of length `out_dim` (it should broadcast across the batch dimension without reshaping or tiling).",
      tier3:
        "Near-code: `pre = x @ weight + bias` (bias broadcasts); then apply ReLU elementwise: `out = np.maximum(pre, 0.0)`. Return `out` as a 2D array and sanity-check: all entries are non-negative, the shape is `[batch, out_dim]`, and `out` equals `pre` wherever `pre` is positive."
    },
    resources: [
      {
        title: "PyTorch Linear Layer",
        url: "https://pytorch.org/docs/stable/generated/torch.nn.Linear.html"
      },
      {
        title: "CS231n: Neural Networks Part 1 (Affine + ReLU intuition)",
        url: "https://cs231n.github.io/neural-networks-1/"
      }
    ],
    prerequisites: [
      "Matrix multiplication shape rules for 2D tensors",
      "Broadcasting a 1D bias across a batch",
      "Elementwise nonlinearities (ReLU)"
    ],
    common_pitfalls: [
      "Using `weight @ x` (wrong order) leading to shape errors or transposed outputs",
      "Adding bias before the projection (changes semantics)",
      "Implementing ReLU as a boolean mask without converting back to float"
    ],
    estimated_time_minutes: 20,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: feed-forward sublayers and projection heads reduce to repeated affine + nonlinearity steps; this is the smallest unit to practice those shape semantics."
  },
  {
    id: "normalization_layernorm_forward_v1",
    title: "Implement LayerNorm Forward Pass",
    category: "Normalization",
    concept_description:
      "LayerNorm normalizes each example independently across its feature dimension (unlike BatchNorm which couples examples through batch statistics). In Transformers it stabilizes deep stacks by keeping per-token activations in a predictable range before/after residual blocks.",
    goal:
      "Write `layer_norm_forward(x, gamma, beta, eps)` that normalizes each row of a 2D toy tensor over the last dimension, then applies elementwise scale (`gamma`) and shift (`beta`) with correct broadcasting.",
    starter_code:
      "def layer_norm_forward(x, gamma, beta, eps=1e-5):\n    \"\"\"LayerNorm over the last dimension for a 2D toy tensor.\n\n    Expected semantics (per row):\n      mean = mean(x, axis=-1)\n      var = mean((x - mean)^2, axis=-1)\n      x_hat = (x - mean) / sqrt(var + eps)\n      y = x_hat * gamma + beta\n\n    `gamma` and `beta` are 1D of length hidden_dim and broadcast across rows.\n    \"\"\"\n    # TODO: implement\n    pass",
    inputs: {
      tensor_shapes: ["x: [2, 3]", "gamma: [3]", "beta: [3]"],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only",
        "single forward pass only (no running statistics)",
        "normalize per row over the last dimension",
        "use epsilon (`eps`) for numerical stability"
      ]
    },
    expected_output: {
      shape: "[2, 3]",
      numerical_properties: [
        "finite outputs",
        "per-row normalized activations (before affine) have ~0 mean and ~1 variance",
        "broadcasting of gamma/beta preserves row independence"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness",
        "per-row mean/variance normalization sanity",
        "gamma/beta broadcasting correctness",
        "numerical sanity (finite, stable with eps)"
      ],
      rationale:
        "LayerNorm is a frequent source of subtle bugs (axis choice, keepdims behavior, eps placement). This problem isolates the forward math and its invariants on a small deterministic input."
    },
    hints: {
      tier1:
        "Pick the normalization axis: for a 2D input `[batch, hidden]`, LayerNorm normalizes each row independently over `hidden` (the last dimension).",
      tier2:
        "Compute `mean` and `var` with `keepdims=True` so `x - mean` and division broadcast correctly. Use the variance (not std directly), and place `eps` inside the sqrt: `denom = sqrt(var + eps)` for stable normalization.",
      tier3:
        "Near-code: `mean = x.mean(-1, keepdims=True)`, `var = ((x-mean)**2).mean(-1, keepdims=True)`, `x_hat = (x-mean)/sqrt(var+eps)`, then `y = x_hat * gamma + beta`. Return `y` and sanity-check: before the affine step, each row of `x_hat` has ~0 mean and ~1 variance."
    },
    resources: [
      {
        title: "Layer Normalization Paper",
        url: "https://arxiv.org/abs/1607.06450"
      },
      {
        title: "PyTorch LayerNorm Docs",
        url: "https://pytorch.org/docs/stable/generated/torch.nn.LayerNorm.html"
      }
    ],
    prerequisites: [
      "Computing mean/variance along an axis",
      "Broadcasting with `keepdims=True` for stable shapes",
      "Basic numerical stability concepts (epsilon inside sqrt)"
    ],
    common_pitfalls: [
      "Normalizing over the wrong axis (e.g. across the batch instead of features)",
      "Forgetting `keepdims=True`, causing shape mismatch in broadcasting",
      "Placing `eps` outside the square root (changes stability behavior)"
    ],
    estimated_time_minutes: 25,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: LayerNorm sits inside almost every Transformer block; implementing it once makes later residual/attention exercises less error-prone."
  },
  {
    id: "rnn_hidden_state_update_v1",
    title: "Implement a Vanilla RNN Hidden-State Update",
    category: "RNNs",
    concept_description:
      "A vanilla RNN step combines an input projection and a recurrent projection, then applies a nonlinearity to produce the next hidden state. Even if you mainly use attention models, this is a canonical example of shape-consistent state updates and nonlinear dynamics.",
    goal:
      "Write `rnn_step(x_t, h_prev, w_xh, w_hh, b_h)` that returns `tanh(x_t @ w_xh + h_prev @ w_hh + b_h)` for a single time step on toy 2D tensors.",
    starter_code:
      "def rnn_step(x_t, h_prev, w_xh, w_hh, b_h):\n    \"\"\"Single-step vanilla RNN update (no sequence loop).\n\n    Shapes:\n      x_t: [batch, input_dim]\n      h_prev: [batch, hidden_dim]\n      w_xh: [input_dim, hidden_dim]\n      w_hh: [hidden_dim, hidden_dim]\n      b_h: [hidden_dim]\n\n    Returns:\n      h_next: [batch, hidden_dim]\n    \"\"\"\n    # TODO: implement\n    pass",
    inputs: {
      tensor_shapes: [
        "x_t: [2, 3]",
        "h_prev: [2, 4]",
        "w_xh: [3, 4]",
        "w_hh: [4, 4]",
        "b_h: [4]"
      ],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only",
        "single-step recurrence only (no dataset/sequence training loop)",
        "bias broadcasts across batch",
        "use tanh nonlinearity for bounded hidden state"
      ]
    },
    expected_output: {
      shape: "[2, 4]",
      numerical_properties: [
        "finite outputs",
        "bounded in [-1, 1] when tanh is used",
        "deterministic for fixed toy inputs"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness ([batch, hidden_dim])",
        "recurrent composition (input + hidden projections) sanity",
        "tanh bounded-range sanity",
        "numerical sanity (finite values)"
      ],
      rationale:
        "This tests the atomic recurrence update without introducing sequences, backpropagation, or training loops, while still enforcing the key shape and activation invariants."
    },
    hints: {
      tier1:
        "Think of the RNN step as combining two signals: one from the current input `x_t` and one from the previous hidden state `h_prev`, then applying a nonlinearity.",
      tier2:
        "Compute `x_proj = x_t @ w_xh` and `h_proj = h_prev @ w_hh` separately (both become `[batch, hidden_dim]`). Add them with the bias vector `b_h` (broadcast across batch) to form the pre-activation `pre`.",
      tier3:
        "Near-code: `pre = x_t @ w_xh + h_prev @ w_hh + b_h`; then `h_next = np.tanh(pre)`. Return `h_next` and sanity-check: it has shape `[batch, hidden_dim]`, bias broadcasts over batch, and all values are bounded in [-1, 1] due to tanh."
    },
    resources: [
      {
        title: "PyTorch RNN Docs",
        url: "https://pytorch.org/docs/stable/generated/torch.nn.RNN.html"
      },
      {
        title: "The Unreasonable Effectiveness of Recurrent Neural Networks (Karpathy)",
        url: "https://karpathy.github.io/2015/05/21/rnn-effectiveness/"
      }
    ],
    prerequisites: [
      "Matrix multiplication and broadcasting for 2D tensors",
      "Understanding a hidden state as a learned representation",
      "tanh nonlinearity and its bounded output range"
    ],
    common_pitfalls: [
      "Using the wrong weight shapes (transposing w_xh or w_hh accidentally)",
      "Forgetting the bias term or applying it with incorrect broadcasting",
      "Applying the nonlinearity before summing the input and hidden projections"
    ],
    estimated_time_minutes: 25,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: RNN updates are the simplest example of a state transition layer; understanding the shape + nonlinearity pattern helps with gated cells and residual state-space blocks."
  },
  {
    id: "attention_scaled_dot_product_core_v1",
    title: "Implement Scaled Dot-Product Attention Core",
    category: "Attention",
    concept_description:
      "Scaled dot-product attention maps a set of queries to a weighted combination of values, where weights come from query-key similarity passed through a softmax. This problem uses a single-batch, 2D toy formulation (`[seq_len, d_k]`) so you can focus on the core math without batch or head dimensions.",
    goal:
      "Write `scaled_dot_product_attention(q, k, v, mask=None)` for 2D toy tensors. Compute `scores = (q @ k.T) / sqrt(d_k)`, optionally add an additive mask bias matrix, apply a stable softmax over keys, and return `weights @ v`.",
    starter_code:
      "def scaled_dot_product_attention(q, k, v, mask=None):\n    # TODO: implement scaled dot-product attention core\n    pass",
    inputs: {
      tensor_shapes: [
        "q: [2, 2] (seq_len=2, d_k=2)",
        "k: [2, 2] (seq_len=2, d_k=2)",
        "v: [2, 2] (seq_len=2, d_v=2)",
        "mask: [2, 2] optional (additive bias; large negative to suppress)"
      ],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only",
        "single forward pass only (no training loop)",
        "mask is additive (bias) and applied before softmax",
        "use a numerically stable softmax"
      ]
    },
    expected_output: {
      shape: "[2, 2]",
      numerical_properties: [
        "finite outputs",
        "softmax weights sum to one per query position",
        "masked logits contribute ~0 probability mass"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness",
        "masking correctness",
        "numerical sanity",
        "attention-weight invariance checks"
      ],
      rationale:
        "Attention is sensitive to both masking and numeric stability. The evaluator checks shape, masking behavior, and stable softmax semantics on deterministic toy inputs."
    },
    hints: {
      tier1: "Compute attention logits from similarities: `q @ k.T`.",
      tier2:
        "Scale by `sqrt(d_k)` and (if present) add the mask bias before softmax.",
      tier3:
        "Compute softmax over the key dimension (last axis) and return `weights @ v`."
    },
    resources: [
      {
        title: "Attention Is All You Need",
        url: "https://arxiv.org/abs/1706.03762"
      },
      {
        title: "The Annotated Transformer (attention walkthrough)",
        url: "https://nlp.seas.harvard.edu/annotated-transformer/"
      }
    ],
    prerequisites: [
      "Matrix multiplication and transposes",
      "Softmax as a probability distribution over keys",
      "Numerical stability tricks (subtract max before exp)"
    ],
    common_pitfalls: [
      "Applying the mask after softmax (too late to suppress probability mass)",
      "Forgetting the `1/sqrt(d_k)` scaling (changes sharpness with dimension)",
      "Softmax over the wrong axis (must be over keys for each query)"
    ],
    estimated_time_minutes: 30,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: this is the core computation inside Transformer attention; mastering it makes multi-head attention and causal masking variations much easier."
  },
  {
    id: "conditioning_film_affine_shift_scale_v1",
    title: "Implement FiLM Affine Conditioning",
    category: "Conditioning & Modulation",
    concept_description:
      "FiLM (Feature-wise Linear Modulation) conditions a hidden representation by applying a learned per-feature scale and shift. It appears in multimodal fusion (text conditions vision features), conditional generation, and many adapter-style control mechanisms.",
    goal:
      "Write `film_affine(x, gamma, beta)` that returns `x * gamma + beta` for toy 2D tensors, preserving shape and determinism.",
    starter_code:
      "def film_affine(x, gamma, beta):\n    # x: [2, 4], gamma: [2, 4], beta: [2, 4]\n    # TODO: implement FiLM affine conditioning\n    pass",
    inputs: {
      tensor_shapes: ["x: [2, 4]", "gamma: [2, 4]", "beta: [2, 4]"],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only",
        "single forward transform",
        "gamma/beta are feature-wise (elementwise), not matrix projections"
      ]
    },
    expected_output: {
      shape: "[2, 4]",
      numerical_properties: [
        "finite outputs",
        "deterministic affine modulation for fixed inputs",
        "elementwise scale then elementwise shift"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness",
        "affine modulation semantics (x*gamma + beta)",
        "numerical sanity (finite values)"
      ],
      rationale:
        "FiLM is intentionally simple but easy to confuse with matrix projections. This problem enforces the exact elementwise semantics used in practice."
    },
    hints: {
      tier1:
        "This is feature-wise (elementwise) modulation: each feature in `x` is scaled and shifted by the corresponding entries in `gamma` and `beta`.",
      tier2:
        "Compute `scaled = x * gamma` first (elementwise), then apply the shift: `scaled + beta`. If you find yourself using `@`, you are doing a projection rather than FiLM.",
      tier3:
        "Near-code: `y = x * gamma + beta` with pure elementwise ops. Sanity-check: `gamma=1` and `beta=0` should return exactly `x`; `gamma=0` should return `beta`; and the output shape must match the input shape exactly."
    },
    resources: [
      {
        title: "FiLM: Visual Reasoning with Conditioning",
        url: "https://arxiv.org/abs/1709.07871"
      },
      {
        title: "A Gentle Introduction to Feature-wise Modulation",
        url: "https://distill.pub/2018/feature-wise-transformations/"
      }
    ],
    prerequisites: [
      "Elementwise multiplication and addition",
      "Interpreting conditioning parameters as per-feature modifiers",
      "Broadcasting rules for matching shapes"
    ],
    common_pitfalls: [
      "Using a matrix multiply instead of elementwise operations",
      "Swapping gamma and beta roles (scale vs shift)",
      "Mismatched shapes due to accidental reshaping"
    ],
    estimated_time_minutes: 20,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: FiLM-style modulation is a building block for conditioning; the same pattern recurs in style transfer, diffusion conditioning, and control adapters."
  },
  {
    id: "conditioning_gated_feature_modulation_v2",
    title: "Implement Gated Feature Conditioning",
    category: "Conditioning & Modulation",
    concept_description:
      "Gated conditioning uses a learned gate (often a sigmoid of logits) to modulate features between “off” and “on”. This shows up in gated residual networks, mixture-of-experts routing variants, and learned feature selection.",
    goal:
      "Write `gated_conditioning(x, gate_logits)` that computes `gate = sigmoid(gate_logits)` then returns `x * gate` for toy 2D tensors, preserving shape and keeping gates in [0, 1].",
    starter_code:
      "def gated_conditioning(x, gate_logits):\n    # x: [2, 4], gate_logits: [2, 4]\n    # TODO: implement gated conditioning via sigmoid(gate_logits)\n    pass",
    inputs: {
      tensor_shapes: ["x: [2, 4]", "gate_logits: [2, 4]"],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only",
        "single gating pass (no training loop)",
        "sigmoid gate must be applied elementwise",
        "numerical stability: avoid overflow for large logits"
      ]
    },
    expected_output: {
      shape: "[2, 4]",
      numerical_properties: [
        "finite outputs",
        "gates bounded between zero and one when sigmoid applied",
        "output magnitude is attenuated when gates are near zero"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness",
        "sigmoid gate bounds sanity (0 <= gate <= 1)",
        "numerical sanity (finite values)"
      ],
      rationale:
        "This extends FiLM-style modulation by introducing a bounded gate. The goal is to encode the exact gating semantics used in many conditioning mechanisms."
    },
    hints: {
      tier1:
        "A gate should be bounded between 0 and 1, so convert `gate_logits` into a gate tensor with a sigmoid before modulating `x`.",
      tier2:
        "Use the elementwise sigmoid `sigmoid(z) = 1 / (1 + exp(-z))`. The result must be in [0, 1] for every entry, and it should have the same shape as `x`.",
      tier3:
        "Near-code: `gate = 1/(1+exp(-gate_logits))` then return `x * gate`. Quick check: logits=0 should yield a gate of 0.5, so the output is exactly half of `x`."
    },
    resources: [
      {
        title: "Conditioning Mechanisms Survey",
        url: "https://arxiv.org/abs/2202.06709"
      },
      {
        title: "Sigmoid Function (for numerical intuition)",
        url: "https://en.wikipedia.org/wiki/Sigmoid_function"
      }
    ],
    prerequisites: [
      "Sigmoid function and its bounded output",
      "Elementwise multiplication for gating",
      "Numerical intuition for exp/overflow"
    ],
    common_pitfalls: [
      "Applying the gate logits directly without a sigmoid",
      "Using a softmax across features instead of an elementwise sigmoid",
      "Overflow in exp for large-magnitude logits (avoid naive implementations)"
    ],
    estimated_time_minutes: 24,
    problem_version: 2,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: gates are ubiquitous, from GRUs/LSTMs to gated residual blocks and routing; this isolates the exact gate semantics in a single runnable unit."
  },
  {
    id: "adaptation_lora_low_rank_projection_v1",
    title: "Implement LoRA Low-Rank Update Projection",
    category: "Adaptation & Efficiency",
    concept_description:
      "LoRA adds a low-rank update to a frozen weight matrix to adapt large models efficiently. The key idea is to represent the update as `ΔW = A @ B` where `A` and `B` have small rank, and to add `x @ ΔW` to the base projection `x @ W`.",
    goal:
      "Write `lora_projection(x, base_w, a, b, alpha)` that returns `x @ base_w + alpha * (x @ a @ b)` for toy 2D tensors, preserving shape and determinism.",
    starter_code:
      "def lora_projection(x, base_w, a, b, alpha):\n    # x: [2, 3], base_w: [3, 3], a: [3, 2], b: [2, 3]\n    # TODO: implement base projection + alpha * low-rank delta\n    pass",
    inputs: {
      tensor_shapes: [
        "x: [2, 3]",
        "base_w: [3, 3]",
        "a: [3, 2]",
        "b: [2, 3]"
      ],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only",
        "single forward merge (no optimizer / training loop)",
        "a and b form a low-rank update (rank = 2 in this toy spec)",
        "alpha scales only the low-rank delta"
      ]
    },
    expected_output: {
      shape: "[2, 3]",
      numerical_properties: [
        "finite outputs",
        "base projection plus low-rank delta",
        "delta term depends on both a and b (two-step projection)"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness",
        "low-rank delta composition (x@a@b) sanity",
        "additive merge with base projection",
        "numerical sanity (finite values)"
      ],
      rationale:
        "This captures the forward-path math of LoRA without any optimization. The evaluator ensures the low-rank path is composed correctly and merged additively."
    },
    hints: {
      tier1:
        "Separate the two paths: the frozen base projection `x @ base_w`, and the learnable low-rank delta path `x @ a @ b` that will be added on top.",
      tier2:
        "Compute the delta in two steps so shapes line up: `x @ a` gives `[batch, rank]` (here rank=2), then multiply by `b` to return to `[batch, out_dim]`. Keeping the intermediate explicit helps avoid accidental transposes.",
      tier3:
        "Near-code: `base = x @ base_w`; `delta = (x @ a) @ b`; `out = base + alpha * delta`. Return `out` and check: setting `alpha=0` should exactly match `base`, while nonzero alpha should change the output via the low-rank path."
    },
    resources: [
      {
        title: "LoRA: Low-Rank Adaptation",
        url: "https://arxiv.org/abs/2106.09685"
      },
      {
        title: "Parameter-Efficient Fine-Tuning Survey",
        url: "https://arxiv.org/abs/2303.15647"
      }
    ],
    prerequisites: [
      "Matrix multiplication with intermediate low-rank shapes",
      "Understanding `ΔW = A @ B` as a low-rank update",
      "Residual/additive composition of parallel paths"
    ],
    common_pitfalls: [
      "Collapsing the update into a single matmul with wrong shape ordering",
      "Scaling the base projection instead of only scaling the delta",
      "Confusing the adapter rank dimension (here it is 2)"
    ],
    estimated_time_minutes: 26,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: LoRA is a standard PEFT technique for LLMs; implementing the low-rank merge once makes adapter variants much easier to reason about."
  },
  {
    id: "adaptation_linear_adapter_blend_v2",
    title: "Implement Linear Adapter Blend",
    category: "Adaptation & Efficiency",
    concept_description:
      "A linear adapter is a lightweight module inserted into a frozen backbone. A common pattern is residual blending: compute an adapter transformation of hidden states and add it back to the original hidden states scaled by a small factor.",
    goal:
      "Write `linear_adapter_blend(x, adapter_w, blend_scale)` that returns `x + blend_scale * (x @ adapter_w)` for toy 2D tensors.",
    starter_code:
      "def linear_adapter_blend(x, adapter_w, blend_scale):\n    # x: [2, 4], adapter_w: [4, 4]\n    # TODO: implement residual adapter blend\n    pass",
    inputs: {
      tensor_shapes: ["x: [2, 4]", "adapter_w: [4, 4]"],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only",
        "single forward blend (no training loop)",
        "adapter path is linear (one matmul)",
        "blend_scale multiplies only the adapter path"
      ]
    },
    expected_output: {
      shape: "[2, 4]",
      numerical_properties: [
        "finite outputs",
        "residual blend between base and adapter paths",
        "reduces to x when blend_scale=0"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness",
        "residual blend invariant (blend_scale=0 yields x)",
        "numerical sanity (finite values)"
      ],
      rationale:
        "Adapters often rely on residual composition to preserve the base representation. This problem isolates the residual blend semantics on toy tensors."
    },
    hints: {
      tier1:
        "Think of this as a residual block: keep the original `x` and add a small adapter correction computed from `x`.",
      tier2:
        "Compute the adapter path with a single matmul `adapter_out = x @ adapter_w`, then scale it by the scalar `blend_scale` to control how much it perturbs the base representation.",
      tier3:
        "Near-code: `adapter_out = x @ adapter_w`; `out = x + blend_scale * adapter_out`; return `out`. Sanity-check: if `blend_scale = 0`, output is exactly `x`; if `adapter_w` is zero, output is `x`; otherwise the adapter contributes a scaled residual."
    },
    resources: [
      {
        title: "Adapter Layers for NLP",
        url: "https://arxiv.org/abs/1902.00751"
      },
      {
        title: "PyTorch Residual Connections (concept overview)",
        url: "https://pytorch.org/docs/stable/notes/modules.html"
      }
    ],
    prerequisites: [
      "Residual connections as `x + f(x)`",
      "Matrix multiplication for linear transformations",
      "Scalar scaling of a tensor"
    ],
    common_pitfalls: [
      "Scaling the full output instead of only scaling the adapter path",
      "Forgetting the residual addition (returning only the adapter output)",
      "Using elementwise multiplication in place of the adapter matmul"
    ],
    estimated_time_minutes: 24,
    problem_version: 2,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: residual adapter blends are a simple, widely-used PEFT pattern; correctness hinges on scaling and residual composition."
  },
  {
    id: "positional_sinusoidal_encoding_table_v1",
    title: "Implement Sinusoidal Positional Encoding Table",
    category: "Positional Encoding",
    concept_description:
      "Sinusoidal positional encodings inject position information using fixed sin/cos features at different frequencies. They are deterministic, require no learned parameters, and are a baseline for reasoning about positional information in Transformers.",
    goal:
      "Write `sinusoidal_positions(seq_len, d_model)` that returns a `[seq_len, d_model]` table using the standard Transformer sin/cos construction (sin for even indices, cos for odd indices).",
    starter_code:
      "def sinusoidal_positions(seq_len, d_model):\n    # return [seq_len, d_model]\n    # TODO: implement sinusoidal position table\n    pass",
    inputs: {
      tensor_shapes: ["seq_len: scalar", "d_model: scalar"],
      datatypes: ["float32"],
      constraints: [
        "toy dimensions only (small seq_len and d_model)",
        "single table generation (no dataset/training loop)",
        "use sine for even channels and cosine for odd channels"
      ]
    },
    expected_output: {
      shape: "[2, 4]",
      numerical_properties: [
        "finite outputs",
        "sin/cos periodic structure for position basis",
        "position 0 has sin(0)=0 and cos(0)=1 in the appropriate channels"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness ([seq_len, d_model])",
        "sin/cos channel assignment sanity",
        "periodic/frequency scaling sanity",
        "numerical sanity (finite values)"
      ],
      rationale:
        "This validates the canonical deterministic positional basis used in the original Transformer and ensures you implement the channel indexing and frequency scaling correctly."
    },
    hints: {
      tier1:
        "Positional encodings inject position information using deterministic waves: alternate sine and cosine channels so each position maps to a unique, smooth feature vector.",
      tier2:
        "Each sin/cos pair shares a frequency. Use the standard scaling `10000^(2i/d_model)` where `i` is the pair index (channel 0/1 share i=0, channel 2/3 share i=1, etc.). This creates high-frequency and low-frequency channels that let attention compare relative positions.",
      tier3:
        "Near-code: build `pos = arange(seq_len)[:,None]` and `i = arange(d_model)[None,:]`; compute `angles = pos / 10000^(2*floor(i/2)/d_model)`; then fill a table where even channels are `sin(angles)` and odd channels are `cos(angles)`. Sanity-check: at position 0, sin terms are 0 and cos terms are 1."
    },
    resources: [
      {
        title: "Attention Is All You Need Positional Encoding",
        url: "https://arxiv.org/abs/1706.03762"
      },
      {
        title: "The Annotated Transformer (positional encoding section)",
        url: "https://nlp.seas.harvard.edu/annotated-transformer/"
      }
    ],
    prerequisites: [
      "Sine/cosine functions and basic periodicity",
      "Indexing patterns for even/odd channels",
      "Exponentiation/frequency scaling with a base constant (10000)"
    ],
    common_pitfalls: [
      "Mixing up which channels use sin vs cos",
      "Using the channel index `i` instead of the pair index `2i` in the exponent",
      "Returning shape `[d_model, seq_len]` by transposing unintentionally"
    ],
    estimated_time_minutes: 22,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: sinusoidal encodings are the baseline deterministic positional signal; implementing them correctly helps when comparing learned/RoPE alternatives."
  },
  {
    id: "positional_rope_simplified_rotation_v2",
    title: "Implement Simplified RoPE Rotation",
    category: "Positional Encoding",
    concept_description:
      "RoPE (Rotary Position Embeddings) encodes position by rotating pairs of channels in query/key space using position-dependent angles. This toy version applies 2D rotations to adjacent channel pairs using provided sin/cos caches.",
    goal:
      "Write `rope_rotate(x, cos_cache, sin_cache)` that rotates channel pairs per row: for each pair `(x1, x2)` apply `[x1*cos - x2*sin, x1*sin + x2*cos]`, preserving the original 2D shape.",
    starter_code:
      "def rope_rotate(x, cos_cache, sin_cache):\n    # x: [2, 4]\n    # TODO: implement pairwise rotary rotation\n    pass",
    inputs: {
      tensor_shapes: ["x: [2, 4]", "cos_cache: [2, 2]", "sin_cache: [2, 2]"],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only",
        "channels are rotated in adjacent pairs",
        "cos_cache/sin_cache provide per-row angles per pair",
        "preserve the original shape and ordering"
      ]
    },
    expected_output: {
      shape: "[2, 4]",
      numerical_properties: [
        "finite outputs",
        "pairwise rotation preserves norms within each rotated pair (up to numeric tolerance)",
        "deterministic for fixed caches"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness",
        "pairwise rotation formula correctness",
        "pairwise norm-preservation sanity",
        "numerical sanity (finite values)"
      ],
      rationale:
        "RoPE is widely used in modern LLMs. This simplified exercise isolates the pairwise rotation math so later attention problems can build on it."
    },
    hints: {
      tier1: "Treat channels as adjacent pairs: (0,1) and (2,3) for a 4-dim vector.",
      tier2:
        "For each pair apply a 2D rotation using the provided cos/sin values for that row and pair index.",
      tier3:
        "Compute rotated pairs and then place them back into the original positions so output shape stays `[2, 4]`."
    },
    resources: [
      {
        title: "RoFormer: Rotary Position Embedding",
        url: "https://arxiv.org/abs/2104.09864"
      },
      {
        title: "RoPE Explained (rotation intuition)",
        url: "https://blog.eleuther.ai/rotary-embeddings/"
      }
    ],
    prerequisites: [
      "2D rotations and sin/cos parameterization",
      "Pairwise channel grouping (even/odd or adjacent pairs)",
      "Broadcasting sin/cos caches over channel pairs"
    ],
    common_pitfalls: [
      "Rotating the wrong channel pairs (must be adjacent pairs)",
      "Swapping sin and cos terms in the rotation formula",
      "Using a single global angle instead of per-row per-pair cache values"
    ],
    estimated_time_minutes: 28,
    problem_version: 2,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: RoPE is the default positional encoding in many modern LLMs; the core operation is a per-token pairwise rotation of q/k channels."
  },
  {
    id: "normalization_batchnorm_forward_train_v1",
    title: "Implement BatchNorm Forward Pass (Training Mode)",
    category: "Normalization",
    concept_description:
      "BatchNorm normalizes activations using statistics computed across the batch for each feature. Unlike LayerNorm (which normalizes each example independently across features), BatchNorm couples examples in a batch and changes behavior between training and inference due to running statistics. This toy problem focuses on the forward pass in training mode only: compute per-feature mean/variance across the batch, normalize, then apply scale (gamma) and shift (beta) with correct broadcasting.",
    goal:
      "Write `batch_norm_forward_train(x, gamma, beta, eps)` for a 2D toy tensor `x` shaped `[batch, features]`. Compute `mean` and `var` across the batch dimension for each feature (ddof=0), normalize `x_hat = (x - mean) / sqrt(var + eps)`, and return `y = x_hat * gamma + beta` with `gamma`/`beta` broadcast across the batch. Use only toy tensors (no datasets, no training loops) and return a finite 2D output.",
    starter_code:
      "def batch_norm_forward_train(x, gamma, beta, eps=1e-5):\n    \"\"\"BatchNorm forward pass (training mode) for a 2D toy tensor.\n\n    Shapes:\n      x: [batch, features]\n      gamma: [features]\n      beta: [features]\n\n    Semantics:\n      mean = mean(x, axis=0)\n      var = mean((x - mean)^2, axis=0)  # ddof=0\n      x_hat = (x - mean) / sqrt(var + eps)\n      y = x_hat * gamma + beta\n\n    Notes:\n      - Normalize across the batch dimension (axis=0).\n      - Use eps inside sqrt for stability.\n      - Return a 2D tensor with the same shape as x.\n    \"\"\"\n    # TODO: implement\n    pass",
    inputs: {
      tensor_shapes: ["x: [3, 4]", "gamma: [4]", "beta: [4]", "eps: scalar"],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only (small fixed sizes)",
        "no dataset usage, no training loop",
        "normalize per feature across the batch dimension (axis=0)",
        "use epsilon (`eps`) for numerical stability"
      ]
    },
    expected_output: {
      shape: "[3, 4]",
      numerical_properties: [
        "all values finite (no NaN/Inf)",
        "same shape as input x",
        "per-feature normalized activations (before affine) have ~0 mean and ~1 variance across the batch",
        "gamma/beta broadcasting applies feature-wise scale and shift"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness ([batch, features])",
        "per-feature normalization sanity across batch axis",
        "gamma/beta broadcasting correctness",
        "numerical sanity (finite, stable eps usage)"
      ],
      rationale:
        "BatchNorm bugs often come from normalizing over the wrong axis or misapplying broadcasting for gamma/beta. This isolates the training-mode forward computation on deterministic toy inputs so you can practice the exact semantics used inside CNN/MLP blocks without introducing running-stat bookkeeping or any training loop."
    },
    hints: {
      tier1:
        "BatchNorm is feature-wise across the batch: for `[batch, features]`, statistics are computed along axis=0 (over batch), not along the feature axis.",
      tier2:
        "Compute `mean` and `var` per feature with `keepdims=True` (or explicit reshaping) so subtraction and division broadcast correctly back to `[batch, features]`. Remember `eps` belongs inside the square root as `sqrt(var + eps)` for stability.",
      tier3:
        "Near-code: `mean = x.mean(axis=0, keepdims=True)`; `var = ((x - mean) ** 2).mean(axis=0, keepdims=True)`; `x_hat = (x - mean) / np.sqrt(var + eps)`; then apply the affine: `y = x_hat * gamma + beta` where `gamma`/`beta` are length `features` and broadcast across the batch."
    },
    resources: [
      {
        title: "Batch Normalization: Accelerating Deep Network Training",
        url: "https://arxiv.org/abs/1502.03167"
      },
      {
        title: "PyTorch BatchNorm1d Docs",
        url: "https://pytorch.org/docs/stable/generated/torch.nn.BatchNorm1d.html"
      }
    ],
    prerequisites: [
      "Mean/variance computation along a specific axis",
      "Broadcasting a 1D vector across a batch dimension",
      "Numerical stability via epsilon inside a square root"
    ],
    common_pitfalls: [
      "Normalizing over the wrong axis (axis=-1 would be LayerNorm-like, not BatchNorm)",
      "Forgetting to broadcast mean/var back to `[batch, features]` when subtracting/dividing",
      "Applying gamma/beta with the wrong shape (e.g. scaling per example instead of per feature)"
    ],
    estimated_time_minutes: 28,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: classic CNN/MLP pipelines and many legacy architectures rely on BatchNorm; being fluent in axis semantics helps you debug training/inference mismatches and shape bugs quickly."
  },
  {
    id: "normalization_rmsnorm_forward_v1",
    title: "Implement RMSNorm Forward Pass",
    category: "Normalization",
    concept_description:
      "RMSNorm is a LayerNorm-like normalization used in many modern LLMs. It normalizes by the root-mean-square of activations across the feature dimension, without subtracting the mean. This changes invariances and can be faster/simpler in practice. This toy problem focuses on the forward math: compute per-row RMS, divide, and apply a learned scale vector (gamma) with correct broadcasting and epsilon handling.",
    goal:
      "Write `rms_norm_forward(x, gamma, eps)` for a 2D toy tensor `x` shaped `[batch, hidden]`. Compute `rms = sqrt(mean(x^2, axis=-1) + eps)` per row, return `y = (x / rms) * gamma` where `gamma` is length `hidden` and broadcasts across the batch. Use only toy tensors and ensure outputs are finite and deterministic.",
    starter_code:
      "def rms_norm_forward(x, gamma, eps=1e-8):\n    \"\"\"RMSNorm over the last dimension for a 2D toy tensor.\n\n    Semantics (per row):\n      rms = sqrt(mean(x^2) + eps)\n      y = (x / rms) * gamma\n\n    `gamma` is 1D of length hidden_dim and broadcasts across batch.\n    \"\"\"\n    # TODO: implement\n    pass",
    inputs: {
      tensor_shapes: ["x: [2, 4]", "gamma: [4]", "eps: scalar"],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only (small fixed sizes)",
        "no dataset usage, no training loop",
        "normalize per row across the last dimension (hidden/features)",
        "use epsilon (`eps`) for numerical stability"
      ]
    },
    expected_output: {
      shape: "[2, 4]",
      numerical_properties: [
        "all values finite (no NaN/Inf)",
        "same shape as input x",
        "per-row RMS of the normalized activations is ~1 (before applying gamma)",
        "gamma broadcasting applies feature-wise scaling"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness ([batch, hidden])",
        "per-row RMS normalization sanity",
        "gamma broadcasting correctness",
        "numerical sanity (finite values, eps usage)"
      ],
      rationale:
        "RMSNorm is easy to implement but easy to get subtly wrong (axis choice, forgetting the square inside the mean, or misbroadcasting gamma). This problem isolates those semantics on deterministic toy tensors so later Transformer block exercises can assume you are fluent with RMS-based normalization."
    },
    hints: {
      tier1:
        "RMSNorm is per-row normalization across features: for `[batch, hidden]`, reduce along the last axis (axis=-1) and do not subtract the mean.",
      tier2:
        "Compute RMS from squared values (not absolute values): `rms = sqrt(mean(x**2) + eps)`. Use `keepdims=True` (or an explicit reshape) so `x / rms` broadcasts back to `[batch, hidden]`, then apply feature-wise scaling with `gamma` (a 1D vector of length hidden) which broadcasts across the batch.",
      tier3:
        "Near-code: `rms = np.sqrt(np.mean(x * x, axis=-1, keepdims=True) + eps)`; `x_hat = x / rms`; `y = x_hat * gamma`. Sanity-check 1: `y.shape == x.shape`. Sanity-check 2 (before gamma): `np.mean(x_hat**2, axis=-1)` should be close to 1 for each row, and adding eps prevents division-by-zero on all-zero rows."
    },
    resources: [
      {
        title: "Root Mean Square Layer Normalization",
        url: "https://arxiv.org/abs/1910.07467"
      },
      {
        title: "PyTorch RMSNorm (torch.nn.RMSNorm) Docs",
        url: "https://pytorch.org/docs/stable/generated/torch.nn.RMSNorm.html"
      }
    ],
    prerequisites: [
      "Mean reduction across an axis with keepdims/broadcasting",
      "Elementwise operations on 2D tensors",
      "Numerical stability with epsilon"
    ],
    common_pitfalls: [
      "Forgetting to square x before averaging (RMS requires mean of squares)",
      "Normalizing across the wrong axis (axis=0 would couple batch elements)",
      "Applying gamma with the wrong shape (must scale features, not rows)"
    ],
    estimated_time_minutes: 22,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: many LLMs replace LayerNorm with RMSNorm; the core operation is a per-token per-feature rescaling driven by RMS statistics."
  },
  {
    id: "mlp_gelu_tanh_approx_v1",
    title: "Implement GELU (Tanh Approx) Activation",
    category: "MLP",
    concept_description:
      "GELU (Gaussian Error Linear Unit) is a smooth activation used in many Transformer MLP blocks. Compared to ReLU, it is differentiable everywhere and behaves like an input-dependent gate: large positive values pass through nearly unchanged while large negative values are pushed toward zero smoothly. This problem uses the common tanh-based approximation so you can implement GELU without special functions, focusing on elementwise math and numerical stability on toy tensors.",
    goal:
      "Write `gelu_tanh(x)` that applies the tanh approximation to GELU elementwise on a 2D toy tensor `x`. Use `gelu(x) = 0.5 * x * (1 + tanh(sqrt(2/pi) * (x + 0.044715 * x^3)))` and return a 2D output with the same shape as `x`, with finite deterministic values.",
    starter_code:
      "def gelu_tanh(x):\n    \"\"\"GELU using the common tanh approximation (elementwise).\n\n    Use:\n      gelu(x) = 0.5 * x * (1 + tanh(sqrt(2/pi) * (x + 0.044715 * x^3)))\n\n    x is a 2D toy tensor shaped [batch, hidden].\n    \"\"\"\n    # TODO: implement\n    pass",
    inputs: {
      tensor_shapes: ["x: [2, 4]", "x: [3, 2]"],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only (small fixed sizes)",
        "no dataset usage, no training loop",
        "apply the function elementwise (no reductions)",
        "output must preserve input shape"
      ]
    },
    expected_output: {
      shape: "[2, 4]",
      numerical_properties: [
        "all values finite (no NaN/Inf)",
        "same shape as input x",
        "large positive inputs map to outputs close to x",
        "large negative inputs map to outputs close to 0 (smoothly)"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness (output matches input shape)",
        "elementwise tanh-approx formula correctness",
        "numerical sanity (finite values)",
        "determinism on fixed toy inputs"
      ],
      rationale:
        "GELU appears in essentially every standard Transformer MLP. Implementing it once builds comfort with the exact approximation used in many codebases and avoids common mistakes like missing the cubic term, misplacing constants, or accidentally applying a reduction instead of an elementwise transform."
    },
    hints: {
      tier1:
        "This is an elementwise activation: the output should have the same shape as x, with no sums or means over any axis.",
      tier2:
        "Implement the tanh approximation directly using constants `sqrt(2/pi)` and `0.044715`. Compute `x3 = x * x * x` and build the inner term `(x + 0.044715 * x3)` before multiplying by `sqrt(2/pi)` and applying `tanh`.",
      tier3:
        "Near-code: `c = np.sqrt(2.0 / np.pi)`; `inner = c * (x + 0.044715 * (x ** 3))`; `return 0.5 * x * (1.0 + np.tanh(inner))`. Sanity-check: for large positive x, tanh(inner) -> 1 so output -> x; for large negative x, tanh(inner) -> -1 so output -> 0."
    },
    resources: [
      {
        title: "Gaussian Error Linear Units (GELUs)",
        url: "https://arxiv.org/abs/1606.08415"
      },
      {
        title: "PyTorch GELU Docs",
        url: "https://pytorch.org/docs/stable/generated/torch.nn.GELU.html"
      }
    ],
    prerequisites: [
      "Elementwise nonlinearities and broadcasting basics",
      "Basic numerical functions (tanh, sqrt, power)",
      "Reasoning about shapes for 2D tensors"
    ],
    common_pitfalls: [
      "Dropping the cubic term `0.044715 * x^3` (changes the approximation noticeably)",
      "Forgetting the `0.5 * x` factor or the `(1 + tanh(...))` structure",
      "Applying GELU to a reduced scalar (mean/sum) instead of elementwise"
    ],
    estimated_time_minutes: 18,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: Transformer feed-forward blocks (MLPs/FFNs) routinely use GELU; being able to implement it helps you understand the exact gating behavior and reproduce reference implementations."
  },
  {
    id: "mlp_swiglu_block_v1",
    title: "Implement a SwiGLU MLP Block (SiLU Gate)",
    category: "MLP",
    concept_description:
      "Modern Transformer MLPs often use gated activations like GLU, GEGLU, or SwiGLU. SwiGLU computes two linear projections: an 'up' branch and a 'gate' branch. The gate branch is passed through SiLU (a smooth sigmoid-gated linear unit), then multiplied elementwise with the up branch. This problem is a small, runnable unit that forces correct matrix multiply ordering, bias broadcasting, and the exact SiLU definition used in many LLM implementations.",
    goal:
      "Write `swiglu_block(x, w_gate, b_gate, w_up, b_up)` for toy 2D tensors. Compute `gate_pre = x @ w_gate + b_gate`, `up = x @ w_up + b_up`, then `gate = silu(gate_pre)` where `silu(t) = t * sigmoid(t)`. Return `gate * up` elementwise with shape `[batch, hidden]`, using only toy tensors (no datasets, no training loops).",
    starter_code:
      "def swiglu_block(x, w_gate, b_gate, w_up, b_up):\n    \"\"\"SwiGLU block: silu(x @ w_gate + b_gate) * (x @ w_up + b_up).\n\n    Shapes:\n      x: [batch, in_dim]\n      w_gate: [in_dim, hidden]\n      b_gate: [hidden]\n      w_up: [in_dim, hidden]\n      b_up: [hidden]\n\n    Returns:\n      y: [batch, hidden]\n    \"\"\"\n    # TODO: implement\n    pass",
    inputs: {
      tensor_shapes: ["x: [2, 3]", "w_gate: [3, 4]", "b_gate: [4]", "w_up: [3, 4]", "b_up: [4]"],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only (small fixed sizes)",
        "no dataset usage, no training loop",
        "bias must broadcast across batch",
        "SiLU is defined as x * sigmoid(x) (not ReLU-like gating)"
      ]
    },
    expected_output: {
      shape: "[2, 4]",
      numerical_properties: [
        "all values finite (no NaN/Inf)",
        "output shape matches `[batch, hidden]`",
        "gate values are smooth and can be negative or positive (SiLU is not a hard clamp)",
        "deterministic for fixed toy inputs"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness ([batch, hidden])",
        "bias broadcasting correctness",
        "SiLU gating semantics correctness",
        "numerical sanity (finite outputs)"
      ],
      rationale:
        "Gated MLP blocks are a must-know primitive in modern LLMs. The most common implementation bugs are transposed matmuls, wrong bias broadcast, or using the wrong gate activation. This problem isolates the exact forward pass with deterministic toy tensors so you can build intuition before tackling full Transformer blocks."
    },
    hints: {
      tier1:
        "SwiGLU uses two linear projections from the same input: one branch is gated (with SiLU), then multiplied elementwise with the other branch.",
      tier2:
        "Compute `gate_pre = x @ w_gate + b_gate` and `up = x @ w_up + b_up` as separate `[batch, hidden]` matrices (bias is a 1D vector that broadcasts across batch). Implement `sigmoid(t) = 1 / (1 + exp(-t))`, then compute `silu(t) = t * sigmoid(t)` elementwise on `gate_pre`, and finally multiply elementwise: `y = silu(gate_pre) * up`.",
      tier3:
        "Near-code: `gate_pre = x @ w_gate + b_gate`; `up = x @ w_up + b_up`; `sig = 1.0 / (1.0 + np.exp(-gate_pre))`; `gate = gate_pre * sig`; `y = gate * up`. Sanity-check 1: `y.shape == up.shape == gate.shape == [batch, hidden]`. Sanity-check 2: if you set `w_gate` and `b_gate` to zeros, the gate becomes 0 and the output should be all zeros regardless of the up branch."
    },
    resources: [
      {
        title: "GLU Variants in Transformers (background via PaLM)",
        url: "https://arxiv.org/abs/2204.02311"
      },
      {
        title: "PyTorch SiLU Docs",
        url: "https://pytorch.org/docs/stable/generated/torch.nn.SiLU.html"
      }
    ],
    prerequisites: [
      "Matrix multiplication shape rules for 2D tensors",
      "Broadcasting a 1D bias across batch",
      "Sigmoid and elementwise multiplication"
    ],
    common_pitfalls: [
      "Using `sigmoid(gate_pre)` directly without multiplying by `gate_pre` (that is not SiLU)",
      "Forgetting to add bias or adding it with the wrong broadcasting behavior",
      "Multiplying the projections before applying SiLU (changes semantics)"
    ],
    estimated_time_minutes: 30,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: many LLM MLP blocks use gated activations (SwiGLU/GEGLU); implementing the forward pass correctly is a prerequisite for understanding model capacity and compute tradeoffs."
  },
  {
    id: "mlp_moe_top1_routed_relu_v1",
    title: "Implement a Tiny Top-1 MoE MLP (Token-Wise Routing)",
    category: "MLP",
    concept_description:
      "Mixture-of-Experts (MoE) layers increase model capacity by routing each token to one (or a few) expert sub-networks. A gating network chooses which expert processes each token, typically based on per-token logits. This toy problem implements the simplest imperative form: top-1 routing with two experts, where each token is sent to exactly one expert and the output is the selected expert's MLP result. The goal is to practice deterministic routing, correct per-token slicing, and the expert-forward math under a small 2D toy tensor contract.",
    goal:
      "Write `moe_mlp_top1(x, gate_logits, w0, b0, w1, b1)` for toy 2D tensors. For each token row i, pick expert 0 or 1 using `argmax(gate_logits[i])` (ties resolve to the lowest index, consistent with NumPy). Compute the selected expert's output as `relu(x[i] @ w_e + b_e)` and place it into the corresponding output row. Return a 2D tensor shaped `[tokens, hidden]` with finite deterministic values, using toy tensors only (no datasets, no training loops).",
    starter_code:
      "def moe_mlp_top1(x, gate_logits, w0, b0, w1, b1):\n    \"\"\"Tiny top-1 MoE MLP with two experts.\n\n    Shapes:\n      x: [tokens, in_dim]\n      gate_logits: [tokens, 2]  # logits for expert 0 vs expert 1\n      w0: [in_dim, hidden]\n      b0: [hidden]\n      w1: [in_dim, hidden]\n      b1: [hidden]\n\n    Routing:\n      expert_i = argmax(gate_logits[i])  # ties -> lowest index\n\n    Expert forward:\n      out_i = relu(x[i] @ w_expert_i + b_expert_i)\n\n    Return:\n      out: [tokens, hidden]\n    \"\"\"\n    # TODO: implement\n    pass",
    inputs: {
      tensor_shapes: [
        "x: [3, 2]",
        "gate_logits: [3, 2]",
        "w0: [2, 3]",
        "b0: [3]",
        "w1: [2, 3]",
        "b1: [3]"
      ],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only (small fixed sizes)",
        "no dataset usage, no training loop",
        "top-1 routing per token via argmax over two experts",
        "use ReLU for the expert MLP activation (elementwise max(x, 0))"
      ]
    },
    expected_output: {
      shape: "[3, 3]",
      numerical_properties: [
        "all values finite (no NaN/Inf)",
        "output shape is [tokens, hidden]",
        "each token output comes from exactly one expert (no blending)",
        "non-negative values after ReLU"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness ([tokens, hidden])",
        "routing correctness (token-wise top-1 expert selection)",
        "expert affine + ReLU correctness",
        "numerical sanity (finite outputs)"
      ],
      rationale:
        "MoE layers combine two common failure modes: subtle routing errors (wrong argmax axis, mixing experts, or tie-handling differences) and standard MLP shape/bias mistakes. This toy top-1 two-expert setup keeps everything deterministic and runnable while still exercising the essential MoE mechanics needed to understand larger sparse expert models."
    },
    hints: {
      tier1:
        "Treat each token row independently: first choose an expert index from `gate_logits[i]`, then run only that expert for token i.",
      tier2:
        "Compute each expert's affine output as `x @ w + b` (bias broadcasts) and apply ReLU. Then for each token i, select the row from expert 0 output or expert 1 output based on `argmax(gate_logits[i])`.",
      tier3:
        "Near-code: `expert0 = relu(x @ w0 + b0)` and `expert1 = relu(x @ w1 + b1)`. Compute `routes = np.argmax(gate_logits, axis=-1)` which yields length `tokens`. Build `out` row-by-row: if `routes[i] == 0` take `expert0[i]` else take `expert1[i]`. Sanity-check: routes only contains 0/1 and output is non-negative due to ReLU."
    },
    resources: [
      {
        title: "Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer",
        url: "https://arxiv.org/abs/1701.06538"
      },
      {
        title: "PyTorch Mixture-of-Experts Tutorial Notes (routing concepts)",
        url: "https://pytorch.org/docs/stable/index.html"
      }
    ],
    prerequisites: [
      "Argmax over the last axis and tie-handling intuition",
      "Matrix multiplication and bias broadcasting",
      "ReLU as an elementwise nonlinearity"
    ],
    common_pitfalls: [
      "Taking argmax over the wrong axis (e.g. across tokens instead of experts)",
      "Blending expert outputs instead of selecting exactly one (this problem is top-1, not soft routing)",
      "Applying ReLU before adding bias (changes semantics)"
    ],
    estimated_time_minutes: 30,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: sparse MoE layers (Switch, GShard-style) route tokens to experts; understanding top-1 routing and per-token expert execution is the first step before adding capacity constraints, load balancing, and top-k routing."
  },
  {
    id: "attention_causal_mask_additive_v1",
    title: "Generate an Additive Causal Attention Mask",
    category: "Attention",
    concept_description:
      "Causal self-attention enforces an autoregressive constraint: position i may not attend to positions j > i. A common implementation uses an additive mask (a bias matrix) added to attention logits before softmax, where masked entries are a large negative number so their probability mass becomes ~0. This problem isolates mask construction so later attention implementations can reuse a correct, deterministic causal mask.",
    goal:
      "Write `causal_mask(seq_len, masked_value)` that returns a 2D additive mask matrix of shape `[seq_len, seq_len]`. Entries on or below the diagonal must be 0, and entries strictly above the diagonal must be `masked_value` (a large negative number like -1e9). The mask must be deterministic, numeric, and suitable for `scores + mask` before a row-wise softmax.",
    starter_code:
      "def causal_mask(seq_len, masked_value=-1e9):\n    \"\"\"Return an additive causal mask of shape [seq_len, seq_len].\n\n    Rules:\n      - mask[i, j] = 0 if j <= i\n      - mask[i, j] = masked_value if j > i\n\n    This is used as: masked_scores = scores + mask\n    \"\"\"\n    # TODO: implement\n    pass",
    inputs: {
      tensor_shapes: ["seq_len: scalar", "masked_value: scalar"],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only (small fixed sizes)",
        "no dataset usage, no training loop",
        "mask is additive bias applied before softmax",
        "use a large negative masked_value (e.g. -1e9) to suppress probability mass"
      ]
    },
    expected_output: {
      shape: "[3, 3]",
      numerical_properties: [
        "all values finite (no NaN/Inf)",
        "diagonal and lower triangle are exactly 0",
        "strictly upper triangle equals masked_value",
        "deterministic for fixed seq_len and masked_value"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness ([seq_len, seq_len])",
        "upper-triangular masking correctness",
        "diagonal/lower-triangular allowance correctness",
        "numerical sanity (finite, large-negative mask values allowed)"
      ],
      rationale:
        "Causal masking is foundational for autoregressive models and is frequently a source of off-by-one errors (masking the diagonal, or using the wrong triangle). By implementing the additive mask explicitly on a toy size, you lock in the correct semantics that later attention tasks depend on."
    },
    hints: {
      tier1:
        "The causal constraint is `j <= i` allowed and `j > i` blocked; think of the matrix as rows i (queries) and columns j (keys).",
      tier2:
        "Use a nested loop or vectorized indexing to fill a `[seq_len, seq_len]` matrix. The easiest mental model: start with zeros, then set entries where column index is greater than row index to `masked_value`.",
      tier3:
        "Near-code: initialize `mask = np.zeros((seq_len, seq_len), dtype=float)`; then for each `i` set `mask[i, i+1:] = masked_value`. Sanity-check: for `seq_len=3`, row 0 masks columns 1 and 2; row 1 masks column 2; row 2 masks nothing."
    },
    resources: [
      {
        title: "Attention Is All You Need (masking background)",
        url: "https://arxiv.org/abs/1706.03762"
      },
      {
        title: "PyTorch scaled_dot_product_attention Docs (mask semantics)",
        url: "https://pytorch.org/docs/stable/generated/torch.nn.functional.scaled_dot_product_attention.html"
      }
    ],
    prerequisites: [
      "Indexing a 2D matrix by row/column indices",
      "Understanding additive masks applied before softmax",
      "Basic attention terminology (queries/keys)"
    ],
    common_pitfalls: [
      "Masking the diagonal (should be allowed; token can attend to itself)",
      "Using the wrong triangle (lower vs upper) due to swapped i/j meaning",
      "Returning a boolean mask instead of an additive numeric bias matrix"
    ],
    estimated_time_minutes: 16,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: GPT-style models rely on causal masks in every attention layer; constructing the correct additive mask is a basic building block for stable attention implementations."
  },
  {
    id: "attention_masked_softmax_v1",
    title: "Implement Stable Masked Softmax (Additive Mask)",
    category: "Attention",
    concept_description:
      "Masked softmax is the workhorse used to turn attention logits into a probability distribution while enforcing constraints (padding masks, causal masks, span masks). The key is numerical stability: subtract the row-wise maximum before exponentiating to avoid overflow, and apply additive masks before the softmax so masked entries receive ~0 probability mass. This problem isolates masked softmax on a 2D toy matrix so you can get the exact semantics right.",
    goal:
      "Write `masked_softmax(scores, mask=None)` for 2D toy tensors shaped `[rows, cols]`. If `mask` is provided, it is an additive bias matrix of the same shape and must be added to `scores` before softmax. Compute a numerically stable softmax over the last axis (per row) and return the probability matrix with the same shape, with finite values and rows that sum to 1 (within tolerance).",
    starter_code:
      "def masked_softmax(scores, mask=None):\n    \"\"\"Row-wise stable softmax with an optional additive mask.\n\n    - scores: [rows, cols]\n    - mask: [rows, cols] additive bias (large negative to suppress), or None\n\n    Return probabilities with the same shape.\n    \"\"\"\n    # TODO: implement\n    pass",
    inputs: {
      tensor_shapes: ["scores: [3, 3]", "mask: [3, 3] optional (or None)"],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only (small fixed sizes)",
        "no dataset usage, no training loop",
        "mask is additive and applied before softmax",
        "softmax must be numerically stable (subtract max before exp)"
      ]
    },
    expected_output: {
      shape: "[3, 3]",
      numerical_properties: [
        "all values finite (no NaN/Inf)",
        "each row sums to ~1 (probability distribution)",
        "masked positions receive ~0 probability mass when mask uses large negative bias",
        "deterministic for fixed toy inputs"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness ([rows, cols])",
        "row-wise normalization sanity (rows sum to one)",
        "masking correctness (masked logits suppressed)",
        "numerical sanity (stable exp normalization)"
      ],
      rationale:
        "Most attention correctness issues trace back to masked softmax: applying the mask after softmax, softmaxing over the wrong axis, or suffering overflow with large logits. This problem builds a stable, reusable masked softmax on tiny deterministic matrices so later attention problems focus on QK^T math rather than probability plumbing."
    },
    hints: {
      tier1:
        "Softmax is applied independently per row over the last axis; the output should have the same 2D shape as scores.",
      tier2:
        "If you have a mask, add it before softmax: `masked = scores + mask`. For numerical stability compute `shifted = masked - max(masked, axis=-1, keepdims=True)` before `exp`, then normalize by the row-wise sum of exponentials.",
      tier3:
        "Near-code: `logits = scores if mask is None else scores + mask`; `logits = logits - np.max(logits, axis=-1, keepdims=True)`; `exps = np.exp(logits)`; `probs = exps / np.sum(exps, axis=-1, keepdims=True)`; return `probs`. Sanity-check: each row sums to ~1 and masked entries are near 0 when mask uses -1e9."
    },
    resources: [
      {
        title: "Attention Is All You Need (softmax usage in attention)",
        url: "https://arxiv.org/abs/1706.03762"
      },
      {
        title: "PyTorch Softmax Docs",
        url: "https://pytorch.org/docs/stable/generated/torch.nn.Softmax.html"
      }
    ],
    prerequisites: [
      "Softmax as a row-wise probability distribution",
      "Numerical stability tricks (subtract max before exp)",
      "Understanding additive masking (bias) before softmax"
    ],
    common_pitfalls: [
      "Applying the mask after softmax (too late to suppress probability mass)",
      "Softmaxing over the wrong axis (must normalize across columns per row)",
      "Computing exp on large logits without subtracting the max (overflow/Inf)"
    ],
    estimated_time_minutes: 24,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: attention layers rely on stable masked softmax for both padding and causality; implementing it correctly is essential for reliable Transformer behavior."
  },
  {
    id: "attention_split_heads_flat_v1",
    title: "Implement Multi-Head Split (Flattened 2D View)",
    category: "Attention",
    concept_description:
      "Multi-head attention reshapes a `[seq_len, d_model]` representation into multiple heads so each head attends in a lower-dimensional subspace. In real implementations this produces a 3D tensor, but this toy problem uses a flattened 2D view so it stays runnable under the 2D output contract: you split `d_model` into `num_heads` chunks of size `head_dim` and expose them as extra rows. This is an imperative shape-manipulation skill for attention implementations and debugging.",
    goal:
      "Write `split_heads_flat(x, num_heads)` where `x` has shape `[seq_len, d_model]` and `d_model` is divisible by `num_heads`. Return a 2D matrix of shape `[seq_len * num_heads, head_dim]` using token-major, head-minor ordering: row `i * num_heads + h` must equal the slice `x[i, h*head_dim:(h+1)*head_dim]`. Use only toy tensors and return a deterministic 2D output.",
    starter_code:
      "def split_heads_flat(x, num_heads):\n    \"\"\"Flattened multi-head split.\n\n    Input:\n      x: [seq_len, d_model]\n      num_heads: int\n\n    Output:\n      out: [seq_len * num_heads, head_dim]\n\n    Ordering (token-major):\n      out[i * num_heads + h] = x[i, h*head_dim:(h+1)*head_dim]\n    \"\"\"\n    # TODO: implement\n    pass",
    inputs: {
      tensor_shapes: ["x: [2, 4]", "num_heads: scalar"],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only (small fixed sizes)",
        "no dataset usage, no training loop",
        "d_model must be divisible by num_heads",
        "follow the specified token-major row ordering exactly"
      ]
    },
    expected_output: {
      shape: "[4, 2]",
      numerical_properties: [
        "all values finite (no NaN/Inf)",
        "output contains the same values as x, only reshaped/reordered",
        "deterministic for fixed inputs",
        "row ordering matches the token-major specification"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness ([seq_len * num_heads, head_dim])",
        "head slicing correctness (correct contiguous feature chunks)",
        "row ordering correctness (token-major)",
        "numerical sanity (finite values)"
      ],
      rationale:
        "Most multi-head attention bugs are shape/order bugs: mixing head and token axes, slicing non-contiguous chunks, or using the wrong row ordering. This toy exercise makes the intended ordering explicit and deterministic so you can later map it to real 3D reshapes with confidence."
    },
    hints: {
      tier1:
        "You are not doing any math besides slicing and rearranging. The output should contain exactly the same numbers as x, just grouped into heads.",
      tier2:
        "Compute `head_dim = d_model // num_heads`. For each token row i, slice contiguous chunks of length head_dim from x: head 0 uses columns [0:head_dim], head 1 uses [head_dim:2*head_dim], etc. Append these slices as output rows in token-major order.",
      tier3:
        "Near-code: loop over `i in range(seq_len)` and `h in range(num_heads)`; slice `chunk = x[i, h*head_dim:(h+1)*head_dim]`; write it to `out[i*num_heads + h]`. Sanity-check with a small x where each column is unique so you can visually confirm the ordering."
    },
    resources: [
      {
        title: "Attention Is All You Need (multi-head attention overview)",
        url: "https://arxiv.org/abs/1706.03762"
      },
      {
        title: "The Annotated Transformer (multi-head shapes)",
        url: "https://nlp.seas.harvard.edu/annotated-transformer/"
      }
    ],
    prerequisites: [
      "2D tensor shape reasoning ([seq_len, d_model])",
      "Indexing and slicing contiguous feature chunks",
      "Understanding head_dim = d_model / num_heads"
    ],
    common_pitfalls: [
      "Swapping token-major and head-major order (rows end up permuted)",
      "Slicing with the wrong head_dim (integer division mistakes)",
      "Returning a 3D tensor instead of the specified flattened 2D view"
    ],
    estimated_time_minutes: 20,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: multi-head attention is everywhere in Transformers; debugging attention almost always involves being fluent in head splitting/merging semantics and axis ordering."
  },
  {
    id: "rnn_gru_step_v1",
    title: "Implement a GRU Single-Step Update",
    category: "RNNs",
    concept_description:
      "GRUs (Gated Recurrent Units) extend vanilla RNNs by adding gates that control information flow: an update gate mixes the previous hidden state with a candidate state, and a reset gate controls how much of the previous state contributes to the candidate. Even if you primarily work with attention models, GRUs are a canonical example of gated state updates, elementwise nonlinearities, and shape-consistent recurrent computations.",
    goal:
      "Write `gru_step(x_t, h_prev, w_xz, w_hz, b_z, w_xr, w_hr, b_r, w_xn, w_hn, b_n)` that returns the next hidden state `h_next` for a single time step on toy 2D tensors. Use: `z = sigmoid(x_t@w_xz + h_prev@w_hz + b_z)`, `r = sigmoid(x_t@w_xr + h_prev@w_hr + b_r)`, `n = tanh(x_t@w_xn + (r*h_prev)@w_hn + b_n)`, and `h_next = (1 - z)*n + z*h_prev`. Return a finite `[batch, hidden]` output with correct broadcasting.",
    starter_code:
      "def gru_step(x_t, h_prev, w_xz, w_hz, b_z, w_xr, w_hr, b_r, w_xn, w_hn, b_n):\n    \"\"\"Single-step GRU update (no sequence loop).\n\n    Shapes:\n      x_t: [batch, input_dim]\n      h_prev: [batch, hidden_dim]\n      w_x*: [input_dim, hidden_dim]\n      w_h*: [hidden_dim, hidden_dim]\n      b_*: [hidden_dim]\n\n    Returns:\n      h_next: [batch, hidden_dim]\n    \"\"\"\n    # TODO: implement\n    pass",
    inputs: {
      tensor_shapes: [
        "x_t: [2, 3]",
        "h_prev: [2, 4]",
        "w_xz: [3, 4]",
        "w_hz: [4, 4]",
        "b_z: [4]",
        "w_xr: [3, 4]",
        "w_hr: [4, 4]",
        "b_r: [4]",
        "w_xn: [3, 4]",
        "w_hn: [4, 4]",
        "b_n: [4]"
      ],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only (small fixed sizes)",
        "no dataset usage, no training loop",
        "single-step recurrence only (no sequence iteration required)",
        "use sigmoid for z/r and tanh for candidate n"
      ]
    },
    expected_output: {
      shape: "[2, 4]",
      numerical_properties: [
        "all values finite (no NaN/Inf)",
        "output shape is [batch, hidden_dim]",
        "gate values are in (0, 1) for finite inputs",
        "deterministic for fixed toy inputs"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness ([batch, hidden_dim])",
        "gate computation sanity (sigmoid outputs in (0,1))",
        "candidate and mixing formula correctness",
        "numerical sanity (finite, stable nonlinearities)"
      ],
      rationale:
        "GRU steps combine multiple affine projections, elementwise gates, and a final convex-like mixing of states. Implementation mistakes usually come from shape mismatches, forgetting elementwise multiplication for the reset gate, or mixing z with the wrong terms. This problem teaches the exact one-step forward semantics on deterministic toy tensors without introducing sequences or backpropagation."
    },
    hints: {
      tier1:
        "A GRU step computes two sigmoid gates (update z and reset r), then a tanh candidate n, then mixes n with h_prev using z.",
      tier2:
        "Compute the affine terms in explicit pieces so shapes are obvious: `xz = x_t @ w_xz`, `hz = h_prev @ w_hz` (both `[batch, hidden]`), then add bias `b_z` (broadcast across batch) before applying sigmoid to get z. Do the same for r using `w_xr`, `w_hr`, and `b_r`. For the candidate n, multiply `r * h_prev` elementwise before the recurrent projection with `w_hn`.",
      tier3:
        "Near-code: `z = sigmoid(x_t@w_xz + h_prev@w_hz + b_z)`; `r = sigmoid(x_t@w_xr + h_prev@w_hr + b_r)`; `n = tanh(x_t@w_xn + (r*h_prev)@w_hn + b_n)`; `h_next = (1.0 - z) * n + z * h_prev`. Sanity-check 1: z and r are in (0,1) for finite inputs. Sanity-check 2: when z is close to 1, `h_next` stays close to `h_prev`, and when z is close to 0, `h_next` stays close to the candidate n."
    },
    resources: [
      {
        title: "Learning Phrase Representations using RNN Encoder-Decoder (GRU introduction)",
        url: "https://arxiv.org/abs/1406.1078"
      },
      {
        title: "PyTorch GRU Docs",
        url: "https://pytorch.org/docs/stable/generated/torch.nn.GRU.html"
      }
    ],
    prerequisites: [
      "Matrix multiplication and broadcasting for 2D tensors",
      "Sigmoid and tanh nonlinearities",
      "Elementwise multiplication for gating"
    ],
    common_pitfalls: [
      "Using matrix multiplication instead of elementwise multiplication for `r * h_prev`",
      "Forgetting to add biases (or adding them with incorrect broadcasting)",
      "Mixing the update gate incorrectly (e.g. `z*n + (1-z)*h_prev` with swapped terms)"
    ],
    estimated_time_minutes: 30,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: GRUs are used in sequence modeling, time-series, and as gating inspiration for many modern architectures; a correct step implementation is a durable mental model for gated computation."
  },
  {
    id: "adaptation_lora_merge_weights_v1",
    title: "Merge LoRA Weights Into Base Weight (Inference Merge)",
    category: "Adaptation & Efficiency",
    concept_description:
      "LoRA fine-tuning learns a low-rank update to an existing weight matrix: `W_eff = W + alpha * (A @ B)`. During inference you often want to merge the low-rank update into the base weight for simplicity or deployment. This toy problem focuses on the pure weight-space merge: given `W`, `A`, `B`, and a scalar `alpha`, compute the merged 2D weight matrix with correct shapes and determinism.",
    goal:
      "Write `merge_lora_weights(base_w, a, b, alpha)` that returns `base_w + alpha * (a @ b)`. `base_w` is shaped `[in_dim, out_dim]`, `a` is `[in_dim, rank]`, and `b` is `[rank, out_dim]`. Use toy tensors only and return a finite 2D matrix of shape `[in_dim, out_dim]` that matches the merged weight used in LoRA inference.",
    starter_code:
      "def merge_lora_weights(base_w, a, b, alpha):\n    \"\"\"Merge LoRA low-rank update into a base weight.\n\n    Shapes:\n      base_w: [in_dim, out_dim]\n      a: [in_dim, rank]\n      b: [rank, out_dim]\n      alpha: scalar\n\n    Return:\n      merged_w: [in_dim, out_dim] = base_w + alpha * (a @ b)\n    \"\"\"\n    # TODO: implement\n    pass",
    inputs: {
      tensor_shapes: ["base_w: [3, 3]", "a: [3, 2]", "b: [2, 3]", "alpha: scalar"],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only (small fixed sizes)",
        "no dataset usage, no training loop",
        "return merged weight matrix (not the projected outputs)",
        "shapes must align as base_w + alpha*(a@b)"
      ]
    },
    expected_output: {
      shape: "[3, 3]",
      numerical_properties: [
        "all values finite (no NaN/Inf)",
        "output shape equals base_w shape",
        "alpha=0 returns exactly base_w",
        "deterministic for fixed toy inputs"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness ([in_dim, out_dim])",
        "low-rank product shape and multiply correctness",
        "alpha scaling correctness",
        "numerical sanity (finite output)"
      ],
      rationale:
        "Many LoRA discussions focus on the forward `x @ (W + alpha*A@B)` but deployment often needs a reliable weight merge. This problem teaches the exact merge computation, which is easy to implement but easy to get wrong if shapes or scaling are confused. A deterministic toy merge is also straightforward to regression-test."
    },
    hints: {
      tier1:
        "This is weight-space math: you are producing a merged weight matrix, not applying it to an input x.",
      tier2:
        "Compute the low-rank update first: `delta = a @ b` which has the same shape as base_w. Then scale it by alpha and add: `merged = base_w + alpha * delta`.",
      tier3:
        "Near-code: `delta = a @ b`; `merged = base_w + alpha * delta`; return `merged`. Sanity-check: if `alpha` is 0 the result must equal `base_w` exactly, and `delta` must be `[in_dim, out_dim]`."
    },
    resources: [
      {
        title: "LoRA: Low-Rank Adaptation of Large Language Models",
        url: "https://arxiv.org/abs/2106.09685"
      },
      {
        title: "PyTorch Linear Layer (weight shape reference)",
        url: "https://pytorch.org/docs/stable/generated/torch.nn.Linear.html"
      }
    ],
    prerequisites: [
      "Matrix multiplication shape rules",
      "Understanding low-rank factorization shapes (A@B)",
      "Scalar scaling and elementwise addition"
    ],
    common_pitfalls: [
      "Computing `b @ a` instead of `a @ b` (shape mismatch or wrong result)",
      "Applying alpha to base_w rather than the low-rank delta",
      "Returning a projected output instead of the merged weight matrix"
    ],
    estimated_time_minutes: 18,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: deploying LoRA fine-tunes often involves merging low-rank adapters into base weights; this merge is a simple but critical step for reproducible inference."
  },
  {
    id: "conditioning_adaln_modulation_v1",
    title: "Implement Adaptive LayerNorm Modulation (AdaLN)",
    category: "Conditioning & Modulation",
    concept_description:
      "Adaptive LayerNorm (AdaLN) is a conditioning mechanism where a normalized activation is modulated by per-example scale and shift parameters produced from a conditioning signal. It is common in conditional Transformers and diffusion models (e.g. AdaLN-Zero), and is closely related to FiLM but applied after a normalization step. This toy problem focuses on the forward computation: row-wise LayerNorm followed by `(1 + scale)` and `shift` modulation with correct broadcasting.",
    goal:
      "Write `adaln(x, scale, shift, eps)` for a 2D toy tensor `x` shaped `[batch, hidden]`, where `scale` and `shift` are also shaped `[batch, hidden]`. First compute a LayerNorm-style normalization per row: `x_hat = (x - mean) / sqrt(var + eps)` over the last dimension. Then return `y = x_hat * (1 + scale) + shift`. Use toy tensors only and return a finite 2D output with the same shape as x.",
    starter_code:
      "def adaln(x, scale, shift, eps=1e-5):\n    \"\"\"Adaptive LayerNorm modulation (AdaLN).\n\n    Shapes:\n      x: [batch, hidden]\n      scale: [batch, hidden]\n      shift: [batch, hidden]\n\n    Semantics (per row):\n      mean = mean(x)\n      var = mean((x - mean)^2)\n      x_hat = (x - mean) / sqrt(var + eps)\n      y = x_hat * (1 + scale) + shift\n    \"\"\"\n    # TODO: implement\n    pass",
    inputs: {
      tensor_shapes: ["x: [2, 4]", "scale: [2, 4]", "shift: [2, 4]", "eps: scalar"],
      datatypes: ["float32"],
      constraints: [
        "toy tensors only (small fixed sizes)",
        "no dataset usage, no training loop",
        "normalize per row across the last dimension (LayerNorm-style)",
        "apply modulation as x_hat * (1 + scale) + shift"
      ]
    },
    expected_output: {
      shape: "[2, 4]",
      numerical_properties: [
        "all values finite (no NaN/Inf)",
        "same shape as input x",
        "when scale=0 and shift=0, output equals LayerNorm(x) (without gamma/beta)",
        "deterministic for fixed toy inputs"
      ]
    },
    evaluation_logic: {
      checks: [
        "shape correctness ([batch, hidden])",
        "LayerNorm-style normalization sanity (per row)",
        "modulation formula correctness (1+scale, then shift)",
        "numerical sanity (finite values, stable eps)"
      ],
      rationale:
        "AdaLN-style conditioning is an imperative primitive in conditional sequence and diffusion models. The most common errors are normalizing over the wrong axis, forgetting the +1 in (1+scale), or misbroadcasting scale/shift. This small deterministic problem isolates the exact forward computation so later conditional blocks can assume correct normalization and modulation semantics."
    },
    hints: {
      tier1:
        "Think of AdaLN as: normalize x per row (LayerNorm-style), then do a FiLM-like modulation using per-example scale and shift.",
      tier2:
        "Compute `mean` and `var` along the last dimension with `keepdims=True` so `x - mean` broadcasts correctly. After computing `x_hat`, multiply by `(1 + scale)` (not just `scale`) and then add `shift` elementwise.",
      tier3:
        "Near-code: `mean = x.mean(-1, keepdims=True)`; `var = ((x-mean)**2).mean(-1, keepdims=True)`; `x_hat = (x-mean)/np.sqrt(var+eps)`; `y = x_hat * (1.0 + scale) + shift`. Sanity-check: if `scale` and `shift` are zeros, y should match plain LayerNorm output."
    },
    resources: [
      {
        title: "Layer Normalization Paper (normalization base)",
        url: "https://arxiv.org/abs/1607.06450"
      },
      {
        title: "DiT: Scalable Diffusion Models with Transformers (AdaLN-Zero context)",
        url: "https://arxiv.org/abs/2212.09748"
      }
    ],
    prerequisites: [
      "LayerNorm forward computation (mean/variance over features)",
      "Broadcasting and keepdims behavior",
      "Elementwise affine modulation (scale/shift)"
    ],
    common_pitfalls: [
      "Normalizing across the batch axis (BatchNorm-like) instead of per row",
      "Forgetting the +1 in `(1 + scale)` which changes the identity behavior",
      "Applying scale/shift as 1D vectors when the problem specifies per-example tensors"
    ],
    estimated_time_minutes: 28,
    problem_version: 1,
    torch_version_target: "2.0+",
    learning_context:
      "Where this shows up: conditional Transformers and diffusion models use AdaLN-style modulation to inject conditioning signals into normalized activations; implementing it correctly is key to reproducing reference architectures."
  }
]

const REVIEWED_AT_ISO = "2026-02-17T00:00:00Z"

function describeFixtureValue(value: RuntimeFixtureValue): string {
  if (value === null) {
    return "null"
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(4)
  }

  if (Array.isArray(value) && value.length > 0 && Array.isArray(value[0])) {
    const rowCount = value.length
    const colCount = (value[0] as number[]).length
    return `[${rowCount}, ${colCount}]`
  }

  if (Array.isArray(value)) {
    return `[${value.length}]`
  }

  return "unknown"
}

function ensureMinLength(text: string, minimum: number, extension: string): string {
  const trimmed = text.trim()
  if (trimmed.length >= minimum) {
    return trimmed
  }

  let expanded = trimmed.length > 0 ? trimmed : extension
  while (expanded.length < minimum) {
    expanded = `${expanded} ${extension}`.trim()
  }
  return expanded
}

function buildFunctionSignature(starterCode: string, functionName: string): string {
  const matched = starterCode.match(/def\s+[a-z_][a-z0-9_]*\s*\(([^)]*)\)\s*:/i)
  if (!matched) {
    return `def ${functionName}(x):`
  }

  const args = matched[1]?.trim()
  return `def ${functionName}(${args && args.length > 0 ? args : "x"}):`
}

function buildVisibleTestsFromFixture(fixture: RuntimeProblemFixture): VerificationCase[] {
  const visibleTests = fixture.testCases.map((testCase, index) => {
    const inputSummary = fixture.inputOrder.map((name) => {
      return `${name}: ${describeFixtureValue(testCase.inputs[name] ?? null)}`
    })

    const rows = testCase.expectedOutput.length
    const cols = testCase.expectedOutput[0]?.length ?? 0

    return {
      id: testCase.id,
      purpose: testCase.name || `Visible deterministic case ${index + 1}`,
      input_summary: inputSummary.join(", "),
      expected_behavior: `Output matches oracle semantics with shape [${rows}, ${cols}] and finite values.`
    }
  })

  if (visibleTests.length >= 2) {
    return visibleTests
  }

  const fallbackRows = fixture.expectedOutput.length
  const fallbackCols = fixture.expectedOutput[0]?.length ?? 0
  return [
    ...visibleTests,
    {
      id: `${fixture.problemId}_visible_shape_guard`,
      purpose: "Visible shape and determinism baseline",
      input_summary: fixture.inputOrder
        .map((name) => `${name}: ${describeFixtureValue(fixture.inputs[name] ?? null)}`)
        .join(", "),
      expected_behavior: `Output must remain deterministic, finite, and shaped [${fallbackRows}, ${fallbackCols}].`
    }
  ].slice(0, 2)
}

function buildHiddenTests(problemId: string, title: string): VerificationCase[] {
  const operationLabel = title.trim().toLowerCase() || "the target operation"

  return [
    {
      id: `${problemId}_hidden_scale_stability`,
      purpose: "Guard numerical stability under scaled toy values",
      input_summary: "Scaled magnitude toy tensors with unchanged shape contract",
      expected_behavior: "Outputs stay finite and preserve deterministic semantics."
    },
    {
      id: `${problemId}_hidden_axis_order`,
      purpose: "Catch transpose or axis-order bugs",
      input_summary: "Asymmetric dimensions where axis misuse changes semantics",
      expected_behavior: "Output respects declared axis semantics and oracle behavior."
    },
    {
      id: `${problemId}_hidden_sign_mix`,
      purpose: "Stress mixed positive/negative interactions",
      input_summary: "Inputs with mixed signs and varied feature magnitudes",
      expected_behavior: `Output remains correct for ${operationLabel} and within tolerance.`
    },
    {
      id: `${problemId}_hidden_repeated_rows`,
      purpose: "Detect unintended row coupling",
      input_summary: "Repeated-row toy tensors",
      expected_behavior: "Equivalent row inputs yield equivalent row outputs where contract requires."
    },
    {
      id: `${problemId}_hidden_edge_constants`,
      purpose: "Validate deterministic boundary behavior",
      input_summary: "Boundary constants near neutral/zero behavior",
      expected_behavior: "Boundary cases remain deterministic and semantically correct."
    }
  ]
}

function buildAdversarialTests(problemId: string, title: string): VerificationCase[] {
  const operationLabel = title.trim().toLowerCase() || "the requested operation"

  return [
    {
      id: `${problemId}_adversarial_shape_only`,
      purpose: "Reject shape-only solutions",
      input_summary: "Inputs where shape-correct but semantically wrong outputs are easy",
      expected_behavior: `Fails implementations that ignore ${operationLabel} semantics.`
    },
    {
      id: `${problemId}_adversarial_op_order`,
      purpose: "Reject incorrect operation ordering",
      input_summary: "Inputs sensitive to ordering of intermediate operations",
      expected_behavior: "Fails implementations with wrong composition order."
    }
  ]
}

function buildKnownFailurePatterns(problem: SeedProblemDraft): string[] {
  const defaults = [
    "shape-only implementation without semantic correctness",
    "wrong operation ordering in intermediate calculations",
    "numerical instability leading to NaN or Inf outputs"
  ]

  const uniquePatterns = Array.from(
    new Set([...problem.common_pitfalls, ...defaults])
  ).filter((entry) => entry.trim().length > 0)

  return uniquePatterns.slice(0, 8)
}

function buildFidelityTarget(problem: SeedProblemDraft): ProblemSpecV2["fidelity_target"] {
  const primaryResource = problem.resources[0] ?? {
    title: "Attention Is All You Need",
    url: "https://arxiv.org/abs/1706.03762"
  }

  const normalizedCategory = problem.category.toLowerCase()
  const requiresMaskingOrSoftmax = /mask|softmax|normaliz/i.test(
    `${problem.title} ${problem.goal} ${problem.concept_description}`
  )
  const semanticChecks = Array.from(
    new Set([
      "Matches deterministic oracle output on hidden toy tensor cases",
      "Preserves declared output-contract numerical semantics",
      normalizedCategory.includes("attention") && requiresMaskingOrSoftmax
        ? "Applies masking/softmax normalization semantics before value mixing"
        : normalizedCategory.includes("attention")
          ? "Maintains attention-axis semantics and tensor partition behavior under deterministic perturbations"
          : "Maintains axis and broadcasting semantics across deterministic perturbations"
    ])
  )

  return {
    paper_title: primaryResource.title,
    paper_url: primaryResource.url,
    target_component: `${problem.title} forward-path primitive`,
    paper_section:
      "Implementation target anchored to the cited paper component definition and notation.",
    required_semantic_checks: semanticChecks,
    forbidden_shortcuts: [
      "Shape-only output stubs that ignore operation semantics",
      "Bypassing deterministic oracle behavior with hard-coded constants"
    ]
  }
}

function buildProblemSpec(problem: SeedProblemDraft): ProblemSpecV2 {
  const fixture = getRuntimeProblemFixture(problem.id)
  if (!fixture) {
    throw new Error(`Missing runtime fixture for ${problem.id}.`)
  }

  const outputRows = fixture.expectedOutput.length
  const outputCols = fixture.expectedOutput[0]?.length ?? 0
  const outputShape = `[${outputRows}, ${outputCols}]`
  const functionSignature = buildFunctionSignature(
    problem.starter_code,
    fixture.functionName
  )

  const learningObjective = ensureMinLength(
    `Implement ${problem.title.toLowerCase()} as a deterministic toy-tensor primitive, matching exact output semantics, axis behavior, and numerical stability expectations across visible and hidden verification cases.`,
    80,
    "State the exact competency, include deterministic correctness expectations, and define how shape and semantics must align."
  )
  const conceptDescription = ensureMinLength(
    problem.concept_description,
    220,
    "Clarify mechanism details, why this primitive matters in real model blocks, and what implementation failures commonly break correctness."
  )
  const learningContext = ensureMinLength(
    problem.learning_context,
    180,
    "Connect this operation to real architectures and explain why precise forward semantics are foundational before scaling to larger model components."
  )
  const goal = ensureMinLength(
    `${problem.goal} Implement the function with PyTorch-compatible tensor semantics (solution may use NumPy in this toy runtime as long as semantics match torch behavior).`,
    140,
    "Require deterministic oracle-level correctness on toy tensors, enforce finite outputs, and prevent shape-only shortcuts by checking deeper semantic behavior."
  )

  const tier1 = ensureMinLength(
    problem.hints.tier1,
    60,
    "Begin by validating the full input/output contract, including axis semantics and deterministic expectations."
  )
  const tier2 = ensureMinLength(
    problem.hints.tier2,
    80,
    "Break the implementation into explicit intermediate computations and verify each intermediate against intended semantics."
  )
  const tier3 = ensureMinLength(
    problem.hints.tier3,
    110,
    "Implement deterministic staged logic, compare against oracle-aligned expectations, and validate edge behavior before treating the solution as complete."
  )

  const visibleTests = buildVisibleTestsFromFixture(fixture)

  return {
    id: problem.id,
    problem_version: problem.problem_version,
    title: problem.title,
    category: problem.category,
    learning_objective: learningObjective,
    concept_description: conceptDescription,
    learning_context: learningContext,
    goal,
    starter_code: problem.starter_code,
    function_signature: functionSignature,
    inputs: {
      tensor_shapes: problem.inputs.tensor_shapes,
      datatypes: problem.inputs.datatypes,
      constraints: problem.inputs.constraints
    },
    output_contract: {
      shape: outputShape,
      semantics: [
        goal,
        `Return outputs that satisfy ${problem.title.toLowerCase()} semantics rather than shape-only checks.`
      ],
      numerical_properties: Array.from(
        new Set([...problem.expected_output.numerical_properties, "all values finite"])
      )
    },
    fidelity_target: buildFidelityTarget(problem),
    pass_criteria: {
      determinism: "deterministic",
      checks: [
        {
          id: `${problem.id}_shape_guard`,
          mode: "shape_guard",
          scope: "both",
          oracle: "reference_solution",
          description: "Candidate output matches the declared shape across visible and hidden cases."
        },
        {
          id: `${problem.id}_hidden_exact_oracle`,
          mode: "exact_match",
          scope: "hidden",
          oracle: "reference_solution",
          description: "Hidden deterministic outputs must match oracle outputs exactly within strict tolerance."
        },
        {
          id: `${problem.id}_numeric_tolerance`,
          mode: "numeric_tolerance",
          scope: "both",
          oracle: "reference_solution",
          description: "Numeric differences against oracle remain within absolute/relative tolerance.",
          tolerance: {
            abs: 1e-6,
            rel: 1e-5
          }
        },
        {
          id: `${problem.id}_semantic_property`,
          mode: "property_based",
          scope: "both",
          oracle: "property_checker",
          description: "Semantic invariants for this primitive hold across deterministic perturbations."
        },
        {
          id: `${problem.id}_metamorphic_relations`,
          mode: "metamorphic",
          scope: "hidden",
          oracle: "metamorphic_relation",
          description: "Controlled input transformations preserve expected behavioral relations."
        }
      ],
      rationale:
        "The grading matrix combines shape checks with hidden exact-match oracle comparisons, strict numeric tolerance bounds, and higher-order semantic validation via property and metamorphic checks. This prevents weak implementations from passing through superficial shape compliance alone. Hidden deterministic verification and adversarial inputs force alignment with true operation semantics, while tolerance controls protect against floating-point noise without masking logical errors."
    },
    evaluation_artifacts: {
      reference_solution_path: "src/problems/reference-python-solutions.ts",
      reference_solution_function: fixture.functionName,
      visible_tests: visibleTests,
      hidden_tests: buildHiddenTests(problem.id, problem.title),
      adversarial_tests: buildAdversarialTests(problem.id, problem.title),
      known_failure_patterns: buildKnownFailurePatterns(problem)
    },
    hints: {
      tier1,
      tier2,
      tier3
    },
    resources: problem.resources,
    prerequisites: problem.prerequisites,
    common_pitfalls: problem.common_pitfalls,
    estimated_time_minutes: problem.estimated_time_minutes,
    authoring: {
      source: "human",
      human_reviewer: "seed_problem_pack_migration",
      reviewed_at_iso: REVIEWED_AT_ISO
    },
    quality_scorecard: {
      pedagogy_depth: 4,
      spec_clarity: 4,
      grader_rigor: 5,
      edge_case_coverage: 4,
      ambiguity_risk_control: 5
    },
    verification: {
      status: "verified",
      blockers: [],
      decision_metadata: {
        approval_type: "auto_provisional",
        verified_at_iso: REVIEWED_AT_ISO,
        pipeline_version: "card_verification_pipeline_v1"
      },
      notes:
        "Migrated to ProblemSpecV2 with deterministic oracle checks, hidden/adversarial coverage, and strict pass criteria."
    }
  }
}

const SEED_PROBLEM_PACK: ProblemSpecV2[] = SEED_PROBLEM_DRAFTS.map((problem) => {
  return buildProblemSpec(problem)
})

function cloneProblem(problem: ProblemSpecV2): ProblemSpecV2 {
  return JSON.parse(JSON.stringify(problem)) as ProblemSpecV2
}

export function getSeedProblemPack(): ProblemSpecV2[] {
  return SEED_PROBLEM_PACK.map((problem) => cloneProblem(problem))
}

export function validateSeedProblemSpec(
  problem: ProblemSpecV2
): ProblemSpecV2ValidationResult {
  return validateProblemSpecV2(problem)
}
