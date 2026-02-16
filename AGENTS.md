# AGENTS.md

## Purpose
This file defines the engineering standards for all human and agent contributors in this repository.
`PRD.md` is the product source of truth. `TODO.md` is the execution queue.

## Core Product Guardrails (From PRD)
- Preserve the one-and-done daily loop.
- Keep sessions capped at 30 minutes.
- No guilt mechanics: no streaks, backlog debt, or missed-day penalties.
- Problems must be atomic, runnable, and toy-tensor based (no datasets, no long training loops).
- Maintain MVP-first simplicity: full core functionality with minimal complexity.

## Non-Negotiable Engineering Standards

### 1) Testing Is Mandatory
- Every behavior change must have tests.
- Write tests first for logic-heavy changes (scheduler, evaluator, session orchestration).
- New or changed code is not complete until all relevant tests pass.
- Keep tests deterministic (fixed seeds/fixtures, stable toy tensors).
- Add regression tests for every bug fix.

Required coverage areas:
- Evaluator correctness (shape/invariant/numerical checks)
- Scheduler behavior and resurfacing rules
- Daily-loop constraints and session timing
- Regression checks for banned mechanics

### 2) Software Design Best Practices
- Keep modules small and cohesive.
- Enforce single-responsibility per component/module.
- Prefer explicit, simple designs over abstraction-heavy designs.
- Keep interfaces stable and narrowly scoped.
- Avoid hidden coupling and implicit side effects.

### 3) Naming And Readability
- Use clear, domain-accurate names aligned with PRD vocabulary.
- Avoid ambiguous abbreviations and one-letter names (except tight local loops).
- Make code intention obvious from structure and naming.

### 4) Documentation And Comments
- Document public modules, key flows, and non-obvious design decisions.
- Add comments only when they clarify intent, invariants, or tricky behavior.
- Do not add noise comments describing trivial lines.
- Keep docs current when behavior or interfaces change.

### 5) Architecture Decision Discipline
- Make architecture choices deliberately, with explicit tradeoffs.
- Default decision rule: simplest approach that satisfies PRD constraints and testability.
- If complexity is introduced, justify it in the task handoff note.
- Favor vertical slices that are testable end-to-end.

## Completion Criteria (Definition of Done)
A task may be marked done only when:
- Acceptance criteria in `TODO.md` are satisfied.
- Required tests are added/updated and passing.
- Existing suite still passes.
- PRD constraints remain intact.
- Handoff note is provided with:
  - files changed
  - tests added/updated
  - risk/follow-up notes

## Pull Request / Change Checklist
- PRD sections touched are identified.
- Behavior change is clearly summarized.
- Test evidence is included.
- Risks and rollback considerations are noted.
- No banned mechanics or scope creep introduced.

## Preferred Workflow
1. Read the relevant `PRD.md` sections.
2. Pick the top unclaimed `P0` task in `TODO.md`.
3. Write or update tests (test-first for logic-heavy changes).
4. Implement the smallest vertical slice.
5. Run test/lint checks.
6. Update docs/contracts if needed.
7. Leave a concise handoff note and mark task status.
