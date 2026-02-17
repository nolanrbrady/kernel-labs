# CI Publish Gate v2 (Draft)

## Goal
Prevent low-quality or weakly-verified cards from entering the schedulable question bank.

## Gate Stages

1. Schema + policy lint
- Validate card against `ProblemSpecV2`.
- Enforce PRD constraints (toy tensors, <=30 minutes, no banned mechanics).

2. Artifact completeness check
- Reference solution exists and loads.
- Visible/hidden/adversarial test bundles exist.
- Property and metamorphic checkers exist when declared.

3. Deterministic regression check
- Run reference solution against all test bundles.
- Fail on mismatch between declared expected behavior and computed oracle.

4. Anti-cheapness check
- Fail if pass criteria can succeed with shape-only or numerical-sanity-only logic.
- Fail if deterministic card lacks hidden exact oracle checks.

5. Mutation resistance check
- Run known-bad solution variants.
- Require gate to reject each variant for expected reason.

6. Review and scoring gate
- Require two approvals:
  - pedagogy reviewer
  - evaluator reviewer
- Require scorecard thresholds for `verified`.

## Hard Blockers (Publish = reject)
- Missing reference solution.
- Missing hidden tests.
- Missing adversarial tests.
- Deterministic card without hidden exact-match checks.
- Scorecard below threshold for `verified`.
- Any unresolved blocker note in verification metadata.

## Suggested CI Job Layout
- `problem_spec_lint`
- `problem_artifact_check`
- `problem_reference_regression`
- `problem_verifier_robustness`
- `problem_mutation_tests`
- `problem_publish_decision`

`problem_publish_decision` should fail closed: if any upstream signal is missing or inconclusive, do not publish.

## Release Policy
- Scheduler should select only cards with `verification.status == verified`.
- `needs_review` and `rejected` cards remain unschedulable by default.
- Promote status only through CI + reviewer approvals.

## Manual Review Checklist (Per Card)
- Learning objective is singular and concrete.
- Context explains why the mechanic matters in real models.
- Pass criteria directly test the stated objective.
- Hidden tests and adversarial tests catch listed failure patterns.
- Hints are progressive and non-spoiler.
