export const REFERENCE_PYTHON_SOLUTIONS: Record<string, string> = {
  mlp_affine_relu_step_v1: `
def mlp_affine_relu(x, weight, bias):
    import numpy as np
    pre = x @ weight + bias
    return np.maximum(pre, 0.0)
`,
  normalization_layernorm_forward_v1: `
def layer_norm_forward(x, gamma, beta, eps=1e-5):
    import numpy as np
    mean = np.mean(x, axis=-1, keepdims=True)
    var = np.mean((x - mean) ** 2, axis=-1, keepdims=True)
    x_hat = (x - mean) / np.sqrt(var + eps)
    return x_hat * gamma + beta
`,
  rnn_hidden_state_update_v1: `
def rnn_step(x_t, h_prev, w_xh, w_hh, b_h):
    import numpy as np
    pre = x_t @ w_xh + h_prev @ w_hh + b_h
    return np.tanh(pre)
`,
  attention_scaled_dot_product_v1: `
def scaled_dot_product_attention(q, k, v, mask=None):
    import numpy as np
    scores = (q @ k.T) / np.sqrt(k.shape[-1])
    if mask is not None:
        scores = scores + mask
    scores = scores - np.max(scores, axis=-1, keepdims=True)
    weights = np.exp(scores)
    weights = weights / np.sum(weights, axis=-1, keepdims=True)
    return weights @ v
`,
  attention_scaled_dot_product_core_v1: `
def scaled_dot_product_attention(q, k, v, mask=None):
    import numpy as np
    scores = (q @ k.T) / np.sqrt(k.shape[-1])
    if mask is not None:
        scores = scores + mask
    scores = scores - np.max(scores, axis=-1, keepdims=True)
    weights = np.exp(scores)
    weights = weights / np.sum(weights, axis=-1, keepdims=True)
    return weights @ v
`,
  conditioning_film_affine_shift_scale_v1: `
def film_affine(x, gamma, beta):
    return x * gamma + beta
`,
  conditioning_gated_feature_modulation_v2: `
def gated_conditioning(x, gate_logits):
    import numpy as np
    gate = 1.0 / (1.0 + np.exp(-gate_logits))
    return x * gate
`,
  adaptation_lora_low_rank_projection_v1: `
def lora_projection(x, base_w, a, b, alpha):
    base = x @ base_w
    delta = (x @ a) @ b
    return base + alpha * delta
`,
  adaptation_linear_adapter_blend_v2: `
def linear_adapter_blend(x, adapter_w, blend_scale):
    adapter_out = x @ adapter_w
    return x + blend_scale * adapter_out
`,
  positional_sinusoidal_encoding_table_v1: `
def sinusoidal_positions(seq_len, d_model):
    import numpy as np
    positions = np.arange(seq_len, dtype=float)[:, None]
    channels = np.arange(d_model, dtype=float)[None, :]
    pair = np.floor(channels / 2.0)
    angle_rates = np.power(10000.0, (2.0 * pair) / float(d_model))
    angles = positions / angle_rates
    table = np.zeros((seq_len, d_model), dtype=float)
    table[:, 0::2] = np.sin(angles[:, 0::2])
    table[:, 1::2] = np.cos(angles[:, 1::2])
    return table
`,
  positional_rope_simplified_rotation_v2: `
def rope_rotate(x, cos_cache, sin_cache):
    import numpy as np
    x_even = x[:, 0::2]
    x_odd = x[:, 1::2]
    out_even = x_even * cos_cache - x_odd * sin_cache
    out_odd = x_even * sin_cache + x_odd * cos_cache
    out = np.empty_like(x, dtype=float)
    out[:, 0::2] = out_even
    out[:, 1::2] = out_odd
    return out
`,
  normalization_batchnorm_forward_train_v1: `
def batch_norm_forward_train(x, gamma, beta, eps=1e-5):
    import numpy as np
    mean = np.mean(x, axis=0, keepdims=True)
    var = np.mean((x - mean) ** 2, axis=0, keepdims=True)
    x_hat = (x - mean) / np.sqrt(var + eps)
    return x_hat * gamma + beta
`,
  normalization_rmsnorm_forward_v1: `
def rms_norm_forward(x, gamma, eps=1e-8):
    import numpy as np
    rms = np.sqrt(np.mean(x * x, axis=-1, keepdims=True) + eps)
    return (x / rms) * gamma
`,
  mlp_gelu_tanh_approx_v1: `
def gelu_tanh(x):
    import numpy as np
    c = np.sqrt(2.0 / np.pi)
    return 0.5 * x * (1.0 + np.tanh(c * (x + 0.044715 * (x ** 3))))
`,
  mlp_swiglu_block_v1: `
def swiglu_block(x, w_gate, b_gate, w_up, b_up):
    import numpy as np
    gate_pre = x @ w_gate + b_gate
    up = x @ w_up + b_up
    gate = gate_pre * (1.0 / (1.0 + np.exp(-gate_pre)))
    return gate * up
`,
  mlp_moe_top1_routed_relu_v1: `
def moe_mlp_top1(x, gate_logits, w0, b0, w1, b1):
    import numpy as np
    expert0 = np.maximum(x @ w0 + b0, 0.0)
    expert1 = np.maximum(x @ w1 + b1, 0.0)
    routes = np.argmax(gate_logits, axis=-1)
    out = np.empty_like(expert0, dtype=float)
    for i in range(out.shape[0]):
        out[i] = expert0[i] if int(routes[i]) == 0 else expert1[i]
    return out
`,
  attention_causal_mask_additive_v1: `
def causal_mask(seq_len, masked_value=-1e9):
    import numpy as np
    mask = np.zeros((int(seq_len), int(seq_len)), dtype=float)
    if int(seq_len) > 1:
        rows, cols = np.triu_indices(int(seq_len), k=1)
        mask[rows, cols] = float(masked_value)
    return mask
`,
  attention_masked_softmax_v1: `
def masked_softmax(scores, mask=None):
    import numpy as np
    logits = scores if mask is None else (scores + mask)
    logits = logits - np.max(logits, axis=-1, keepdims=True)
    exps = np.exp(logits)
    return exps / np.sum(exps, axis=-1, keepdims=True)
`,
  attention_split_heads_flat_v1: `
def split_heads_flat(x, num_heads):
    import numpy as np
    x = np.asarray(x, dtype=float)
    seq_len, d_model = x.shape
    num_heads = int(num_heads)
    head_dim = d_model // num_heads
    rows = []
    for i in range(seq_len):
        for h in range(num_heads):
            start = h * head_dim
            rows.append(x[i, start:start+head_dim])
    return np.stack(rows, axis=0)
`,
  rnn_gru_step_v1: `
def gru_step(x_t, h_prev, w_xz, w_hz, b_z, w_xr, w_hr, b_r, w_xn, w_hn, b_n):
    import numpy as np
    sigmoid = lambda t: 1.0 / (1.0 + np.exp(-t))
    z = sigmoid(x_t @ w_xz + h_prev @ w_hz + b_z)
    r = sigmoid(x_t @ w_xr + h_prev @ w_hr + b_r)
    n = np.tanh(x_t @ w_xn + (r * h_prev) @ w_hn + b_n)
    return (1.0 - z) * n + z * h_prev
`,
  adaptation_lora_merge_weights_v1: `
def merge_lora_weights(base_w, a, b, alpha):
    return base_w + float(alpha) * (a @ b)
`,
  conditioning_adaln_modulation_v1: `
def adaln(x, scale, shift, eps=1e-5):
    import numpy as np
    mean = np.mean(x, axis=-1, keepdims=True)
    var = np.mean((x - mean) ** 2, axis=-1, keepdims=True)
    x_hat = (x - mean) / np.sqrt(var + eps)
    return x_hat * (1.0 + scale) + shift
`
}

export function getReferencePythonSolution(problemId: string): string | null {
  const solution = REFERENCE_PYTHON_SOLUTIONS[problemId]
  return typeof solution === "string" ? solution : null
}
