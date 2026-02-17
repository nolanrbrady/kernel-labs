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
  prerequisites: string[]
  common_pitfalls: string[]
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

  if (!Array.isArray(problem.prerequisites) || problem.prerequisites.length === 0) {
    errors.push("Missing prerequisites.")
  }

  if (!Array.isArray(problem.common_pitfalls) || problem.common_pitfalls.length === 0) {
    errors.push("Missing common_pitfalls.")
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
