# Grader Architecture v2 (Draft)

## Objective
Increase correctness confidence by shifting from cheap structural checks to oracle-backed, multi-signal verification.

## Design Principles
- Deterministic inputs should default to oracle output matching.
- Shape checks are guardrails, never sufficient for pass.
- Complex tasks require independent evidence channels (oracle + properties + metamorphic checks).
- Every check must map to a specific failure pattern.

## Verification Modes

1. `exact_match`
- Use for deterministic toy inputs with canonical expected output.
- Compare candidate output to reference output (tight tolerance where needed).
- Required for deterministic hidden tests.

2. `numeric_tolerance`
- Use when floating point drift is expected.
- Compare against reference solution using `abs/rel` tolerances.
- Pair with at least one semantic property check.

3. `property_based`
- Validate invariants independent of exact values.
- Examples: row-stochastic weights, bounded activation ranges, masking constraints, monotonicity.

4. `metamorphic`
- Validate relation-preserving behavior under controlled input transformations.
- Examples: adding stronger mask penalties cannot increase masked probability, permutation equivariance, translation invariance for normalized intermediates.

5. `shape_guard`
- Fast rejection for malformed outputs.
- Never counted as sufficient correctness evidence.

## Execution Flow
1. Parse + run candidate code in sandboxed runtime.
2. Evaluate visible test set for learner feedback.
3. Evaluate hidden test set for scoring.
4. Evaluate adversarial/metamorphic suite for robustness.
5. Aggregate check outcomes into final verdict (`pass`, `partial`, `fail`) with reason codes.

## Verdict Policy
- `pass`
  - all blocker checks pass
  - no critical invariant violations
- `partial`
  - shape/basic numerical sanity passes
  - at least one semantic check fails
- `fail`
  - runtime error, malformed output, or blocker check failure

## Required Evidence Per Problem
- Reference solution implementation
- Hidden deterministic oracle cases
- Property checker functions
- Metamorphic/adversarial suite
- Known bad-solution patterns and which checks catch them

## Telemetry For Calibration
Track per-card and per-check:
- false-pass rate
- false-fail rate
- top failure reasons
- hint-tier usage before pass
- runtime variance on hidden cases

Use this telemetry for weekly threshold calibration and flaky-check removal.

## Immediate Integration Path
- Keep existing evaluator endpoints.
- Add a per-problem verifier config that selects checks by mode.
- Gradually migrate cards to v2 check matrix while preserving current MVP flow.
