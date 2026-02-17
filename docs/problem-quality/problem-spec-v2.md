# Problem Spec v2 (Draft)

## Purpose
This schema raises question quality by making each problem a testable contract with explicit pedagogical depth and robust verification evidence.

## Required Contract
A `ProblemSpecV2` entry must include:

- Core identity:
  - `id` (`snake_case_vN`), `problem_version`, `title`, `category`
- Learning depth:
  - `learning_objective` (single, explicit competency)
  - `concept_description` (mechanism + motivation + failure modes)
  - `learning_context` (where this appears in real architectures)
  - `goal` (concrete behavior + constraints)
- Execution contract:
  - `starter_code`, `function_signature`
  - `inputs` (tensor shapes, dtypes, toy constraints)
  - `output_contract` (shape + semantics + numerical properties)
- Pass contract:
  - `pass_criteria.determinism`
  - `pass_criteria.checks[]` with modes:
    - `shape_guard`
    - `exact_match`
    - `numeric_tolerance`
    - `property_based`
    - `metamorphic`
  - `pass_criteria.rationale`
- Verification evidence:
  - `evaluation_artifacts.reference_solution_path`
  - `evaluation_artifacts.reference_solution_function`
  - `visible_tests[]` (min 2)
  - `hidden_tests[]` (min 5)
  - `adversarial_tests[]` (min 2)
  - `known_failure_patterns[]` (min 3)
- Learning support:
  - `hints.tier1`, `hints.tier2`, `hints.tier3`
  - `resources[]`, `prerequisites[]`, `common_pitfalls[]`
- Timebox + policy:
  - `estimated_time_minutes` in `[10, 30]`
  - No banned guilt mechanics (`streak`, `backlog`, `penalty`, `debt`, missed-day punishments)
- AI provenance + human review:
  - `authoring.source` (`human`, `ai_assisted`, `ai_generated`)
  - AI-origin cards must include: `model_name`, `generation_prompt_id`, `generation_temperature`
  - All cards require `human_reviewer` + `reviewed_at_iso`
- Quality gate metadata:
  - `quality_scorecard` (0-5 on 5 dimensions)
  - `verification.status` (`draft`, `needs_review`, `verified`, `rejected`)
  - `verification.blockers[]`, `verification.notes`

## Hard Validation Rules
For a card to be valid under v2:

- Checks cannot be shape-only:
  - at least 4 checks total
  - at least 3 non-shape checks
- Must include both:
  - one `exact_match` or `numeric_tolerance` check
  - one `property_based` or `metamorphic` check
- Deterministic cards must include hidden `exact_match` verification.
- `verified` cards must have:
  - scorecard average `>= 4.2`
  - `grader_rigor >= 4`
  - `spec_clarity >= 4`
  - no blockers

## Implementation
Draft validator and types are in:
- `src/problems/problem-spec-v2.ts`
- `tests/problem-spec-v2.validation.test.ts`

This is intentionally non-breaking and not yet enforced for all current seed cards.
