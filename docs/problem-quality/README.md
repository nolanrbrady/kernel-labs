# Problem Quality Framework (Draft)

- `problem-spec-v2.md`: stricter authoring contract for high-depth, high-rigor questions.
- `grader-architecture-v2.md`: verification strategy and verdict logic.
- `ci-publish-gate-v2.md`: fail-closed CI gate and hard blockers.
- `ai-question-generation-guardrails.md`: AI authoring + review workflow with provenance and mandatory human approvals.

Implementation draft for schema validation:
- `src/problems/problem-spec-v2.ts`
- `tests/problem-spec-v2.validation.test.ts`
