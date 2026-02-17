# AI Question Generation Guardrails (Draft)

## Objective
Allow AI-generated cards while guaranteeing consistent pedagogical and evaluator quality.

## Authoring Pipeline
1. Generate candidate card
- Use a versioned prompt template.
- Output must target `ProblemSpecV2` fields.
- Capture provenance: model, prompt ID, temperature, generation timestamp.

2. Auto-lint
- Run schema validation and policy checks.
- Reject immediately on missing mandatory fields or banned mechanics.

3. Auto-build verification pack
- Generate reference solution draft.
- Generate visible + hidden + adversarial tests.
- Generate property/metamorphic checker stubs.

4. Auto-evaluate generated pack
- Run reference regression and mutation resistance checks.
- Reject if known-bad variants can pass.

5. Human review (mandatory)
- Pedagogy review: objective clarity, context depth, hint quality.
- Evaluator review: correctness rigor, edge-case coverage, anti-cheatness.

6. Status transition
- `draft` -> `needs_review` when auto checks pass.
- `needs_review` -> `verified` only after both human approvals.
- Any critical issue -> `rejected` with required remediation notes.

## Prompting Guardrails
Prompt templates should force AI to provide:
- Single clear learning objective.
- Why-this-matters context tied to concrete architectures.
- Explicit I/O contract and constraints.
- At least 3 known failure patterns.
- Verifier checks spanning exact/tolerance + property/metamorphic.

## Quality Consistency Controls
- Keep generation temperature low for deterministic structure (`<= 0.3`).
- Version prompts and compare quality by prompt version.
- Maintain a benchmark set of high-quality cards; score new AI cards against it.
- Run weekly calibration on false-pass/false-fail outcomes.

## Failure Handling
When a generated card fails:
- Store failure reason codes.
- Route to remediation queue (`spec_fix`, `test_fix`, `oracle_fix`, `pedagogy_fix`).
- Do not allow manual bypass to `verified`.

## Minimum Bar For AI-Generated Cards
- All hard blockers cleared.
- Scorecard average >= 4.2.
- Grader rigor >= 4.
- Spec clarity >= 4.
- Two reviewer approvals present in metadata.
