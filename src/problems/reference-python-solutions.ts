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
`
}

export function getReferencePythonSolution(problemId: string): string | null {
  const solution = REFERENCE_PYTHON_SOLUTIONS[problemId]
  return typeof solution === "string" ? solution : null
}

