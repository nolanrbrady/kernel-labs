# DeepML-SR MVP TODOs (Prioritized, PRD-Aligned, TDD-First)

Status key:
- `[ ]` unclaimed
- `[~]` in progress
- `[x]` done

## Execution Rules (Required For Ralph Loop)

1. Always claim the top unclaimed `P0` task first.
2. For logic-heavy work, write a failing test before implementation.
3. UI-only polish can use manual verification, but behavior changes still require tests.
4. A task can be marked done only when all required acceptance checks and tests pass.
5. Every completed task must include a short handoff note with:
   - what changed,
   - what tests were added,
   - known risks or follow-ups.
6. Stack lock for MVP implementation:
   - Frontend code must use React + TypeScript.
   - Backend API code must use Express + TypeScript.
   - Core daily-loop E2E must be validated with Playwright.

## Ralph Loop Contract (Automation-Safe)

1. Task picking order:
   - Always take the top-most `P0` task with `- [ ]`.
   - If no open `P0` tasks remain, take the top-most open task in file order.
2. State transitions:
   - Start work: `- [ ]` -> `- [~]` on the same task line.
   - Complete work: `- [~]` -> `- [x]` only after verify commands pass.
   - If blocked: keep task as `- [~]`, set `blocked_by=<TASK_ID or short_reason>`, add blocker note in handoff log, and release back to `- [ ]` when handing off.
3. Parser-safe task line format:
   - Do not change the leading structure: `- [ ] Pn-nn |`.
   - Do not rename task IDs after creation.
   - Keep metadata pipe-delimited on the same line.
4. Required per-task metadata fields:
   - `blocked_by=` (default `none`)
   - `verify=` (command list to run before done)
5. Default verification policy:
   - If a task does not define custom verification, use `make test;make lint`.
6. Completion evidence:
   - Append a handoff entry under `## Ralph Loop Handoff Log` with task ID, files changed, tests added/updated, verify commands run, and risk/follow-up notes.

## Definition Of Done (Per Task)

- Acceptance criteria in the task are complete.
- Required tests are added or updated.
- No banned mechanics were introduced (no streaks/backlog/debt/penalties).
- Daily loop constraints remain valid (one primary problem, 30-minute cap, submit always allowed).
- React and Express behavior changes are implemented in TypeScript.
- Core daily-loop E2E coverage uses Playwright.
- Relevant checks pass locally (project command equivalents):
  - `make test`
  - `make lint`

Task line template:
`- [ ] P0-XX | Title | Short description. | blocked_by=none | verify=make test;make lint`

## P0 - Must Ship For MVP

### P0-A Foundation And Reliability Gates

- [x] P0-01 | Test Harness + CI Gates | Establish baseline test/lint/typecheck pipeline for local-first MVP work. | blocked_by=none | verify=make test;make lint
  PRD refs: 4, 5, 18, 19
  Acceptance:
  - Project has stable commands for test and lint in local workflow.
  - CI (or local equivalent gate script) blocks completion on failing checks.
  Required tests:
  - Smoke test for test runner bootstrapping.
  - Smoke test for app shell bootstrapping.

- [x] P0-02 | Deterministic Fixtures | Add toy tensor fixtures and stable seeds for evaluator and scheduler tests. | blocked_by=none | verify=make test;make lint
  PRD refs: 6, 8, 9
  Acceptance:
  - Shared deterministic fixtures are used across unit tests.
  - No dataset or training loop dependencies exist.
  Required tests:
  - Fixture stability test (same inputs -> same outputs).

- [x] P0-03 | Non-Negotiable Regression Guard | Add locked tests for banned mechanics and core daily-loop rules. | blocked_by=none | verify=make test;make lint
  PRD refs: 4, 5, 16
  Acceptance:
  - Tests explicitly assert no streak, no backlog, no missed-day penalty behavior.
  - Tests assert one primary problem per session and submit-always-allowed.
  Required tests:
  - Regression suite covering each banned mechanic and daily-loop invariant.

### P0-B Core Session Experience (Editor First)

- [x] P0-04 | Editor-First Landing Route | Build `/` to show an immediately solvable problem workspace with no auth gate. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 18
  Acceptance:
  - First screen displays starter code and run/submit actions immediately.
  - User can attempt a problem without creating an account.
  - Landing route implementation is in React + TypeScript.
  Required tests:
  - Route-level test for editor-first render with anonymous user.

- [x] P0-05 | Runtime Execution Loop | Implement run action for starter code against toy inputs. | blocked_by=none | verify=make test;make lint
  PRD refs: 6, 8, 18
  Acceptance:
  - User can execute code and view deterministic run output.
  - Runtime failures are surfaced as supportive, actionable messages.
  Required tests:
  - Runtime success path test.
  - Runtime failure path test.

- [x] P0-06 | Evaluator Engine | Implement pass/partial/fail evaluation with shape/invariant/sanity checks. | blocked_by=none | verify=make test;make lint
  PRD refs: 6, 8
  Acceptance:
  - Evaluator returns structured result with correctness and explanation.
  - Exact value matching is used only where trivial and justified.
  Required tests:
  - Unit tests for shape checks.
  - Unit tests for invariance checks.
  - Unit tests for numerical sanity checks.

- [x] P0-07 | Hint Tier Flow | Add tiered hints (conceptual, structural, near-code) per problem. | blocked_by=none | verify=make test;make lint
  PRD refs: 6
  Acceptance:
  - Hints are accessible in order and tracked for scheduler input.
  Required tests:
  - Hint ordering and usage tracking tests.

- [x] P0-08 | Submission + Session End | Implement submit flow and explicit done state for the current session. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 18
  Acceptance:
  - Submit works for both correct and incorrect results.
  - Session transitions to an explicit end state after evaluation.
  Required tests:
  - Submission state transition tests.
  - Incorrect submission acceptance test (non-punitive behavior).

- [x] P0-09 | 30-Minute Cap Enforcement | Enforce maximum session time with graceful end behavior. | blocked_by=none | verify=make test;make lint
  PRD refs: 4, 5
  Acceptance:
  - Session cannot exceed 30 minutes.
  - Cap messaging remains supportive and non-punitive.
  Required tests:
  - Timer cap boundary test at 30 minutes.

### P0-C Progress, Auth, And Scheduler

- [x] P0-10 | Anonymous Progress Persistence | Save local progress for anonymous sessions. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 18
  Acceptance:
  - Anonymous users retain completion/history locally across restarts.
  Required tests:
  - Local persistence read/write tests.

- [x] P0-11 | Optional Account CTA + Auth Flow | Add clear lightweight account creation path that never blocks solving. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 18
  Acceptance:
  - Account CTA is visible from the editor workspace.
  - Anonymous flow remains fully functional.
  - Auth API path is implemented in Express + TypeScript without blocking anonymous solve flow.
  Required tests:
  - Auth CTA visibility test.
  - Anonymous solve flow unaffected test.

- [x] P0-12 | Progress Sync Merge | Sync anonymous progress to account when user signs in. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 9
  Acceptance:
  - Anonymous and account progress merge without data loss.
  Required tests:
  - Merge behavior tests for overlap and non-overlap records.

- [x] P0-13 | Spaced Repetition Scheduler Core | Implement interval and priority from correctness, time, hints, and recency. | blocked_by=none | verify=make test;make lint
  PRD refs: 9
  Acceptance:
  - Scheduler outputs next interval and resurfacing priority deterministically.
  - New problems remain prioritized; resurfacing debt does not accumulate.
  Required tests:
  - Scheduler decision table tests for pass/partial/fail.
  - Time decay tests.
  - Priority ordering tests (new vs resurfaced).

- [x] P0-14 | One-Resurfaced-Per-Session Rule | Enforce max one resurfaced problem in a single session. | blocked_by=none | verify=make test;make lint
  PRD refs: 9
  Acceptance:
  - Session planner never assigns more than one resurfaced item.
  Required tests:
  - Session planning tests for resurfaced item cap.

- [x] P0-15 | Minimal Progress View | Show category freshness and completed counts without guilt mechanics. | blocked_by=none | verify=make test;make lint
  PRD refs: 10, 11
  Acceptance:
  - Progress view shows descriptive freshness labels (not punitive metrics).
  - No streak, missed-day, rank, or negative comparison UI.
  Required tests:
  - Progress visibility tests for required and forbidden fields.

### P0-D Content, UX Polish, And MVP Operations

- [x] P0-16 | Seed Problem Pack v1 | Add initial atomic problems across MLP, normalization, RNN, and attention. | blocked_by=none | verify=make test;make lint
  PRD refs: 6, 7, 13, 14
  Acceptance:
  - Each problem includes required schema fields and learning context.
  - All seeded problems run end-to-end with toy tensors.
  Required tests:
  - Problem schema validation tests.
  - Evaluator contract tests across seeded problems.

- [x] P0-17 | Aesthetic Polish Without Bloat | Apply cohesive visual system, responsive layout, and low-complexity UI. | blocked_by=none | verify=make test;make lint
  PRD refs: 18
  Acceptance:
  - Workspace is readable and intentional on desktop and mobile.
  - No unnecessary screens, widgets, or heavy dependencies.
  Required tests:
  - Manual visual QA checklist pass for desktop/mobile.
  - Optional snapshot tests for key screens if already used in stack.

- [x] P0-18 | Golden Path E2E | Add end-to-end test for the core daily loop from landing to scheduled resurfacing. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 9, 18
  Acceptance:
  - E2E covers: editor-first landing -> attempt -> run -> submit -> schedule update -> session end.
  - E2E is implemented and executed with Playwright.
  Required tests:
  - Single Playwright golden-path integration test.

- [x] P0-19 | Local-First Runbook + Deploy Readiness | Document local operation and minimal server deployment path. | blocked_by=none | verify=make test;make lint
  PRD refs: 18
  Acceptance:
  - Local setup and run instructions are complete and validated.
  - Deployment path is documented but not over-engineered for v1.
  - Runbook documents React+TypeScript frontend, Express+TypeScript backend, and Playwright E2E workflow.
  Required tests:
  - Runbook verification by clean local environment (manual checklist acceptable).

## P1 - After MVP Stabilizes

- [x] P1-01 | Supportive Analytics Summaries | Add private trend summaries (hints/time/resurfacing pressure) with non-punitive language. | blocked_by=none | verify=make test;make lint
  PRD refs: 12
- [x] P1-02 | Expanded Curriculum | Add more conditioning/adaptation/positional encoding variants with versioned evaluator coverage. | blocked_by=none | verify=make test;make lint
  PRD refs: 7, 14
- [x] P1-03 | Server Hardening | Add production deployment hardening only after MVP loop is validated locally. | blocked_by=none | verify=make test;make lint
  PRD refs: 15, 18
- [x] P1-04 | Interchangeable Card Selection Threshold | Let users choose among near-equal scheduler candidates when spaced-repetition weights fall within a configurable threshold. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 9, 18
  Acceptance:
  - Scheduler returns a deterministic interchangeable-candidate set when card weights are within threshold of the top card.
  - Session planner keeps one-problem-per-session while allowing explicit user choice among interchangeable candidates.
  - If user does not choose, planner falls back deterministically to the top-ranked card.
  Required tests:
  - Scheduler unit tests for threshold grouping boundaries and deterministic ordering.
  - Session-planner integration tests for user-choice and fallback selection paths.

- [ ] P1-05 | Robust Card Verification Pipeline | Build a strict verification workflow that validates question quality and reference-solution correctness before cards are eligible for scheduling. | blocked_by=none | verify=make test;make lint
  PRD refs: 6, 8, 13, 18
  Acceptance:
  - Problem authoring/ingest runs schema lint, fixture validity checks, and reference-solution runtime regression checks.
  - Verification status is tracked per card (`verified`, `needs_review`, `rejected`) with actionable diagnostics.
  - Scheduler excludes non-verified cards by default.
  Required tests:
  - Unit tests for verification-rule evaluation and status transitions.
  - Regression tests that fail cards with mismatched prompt/solution expectations.
  - Scheduler/planner tests confirming non-verified cards are not selected.

- [x] P1-06 | User Flag-For-Review Mechanism | Add a flag action so users can mark a question for review when content appears incorrect or unclear. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 6, 18
  Acceptance:
  - Workspace exposes a `Flag` control for the active question.
  - Flag submission captures reason, card ID, user/session context, and timestamp in a review queue.
  - Flagged cards are visibly marked and routed into verification triage workflows.
  Required tests:
  - Client-script integration test for flag interaction and supportive confirmation state.
  - API integration tests for review-queue write/read behavior and duplicate-flag handling.
  - Verification/scheduler tests confirming triage behavior for flagged cards.

## P2 - Post-P1 Product Iteration

- [x] P2-01 | Interactive Workspace Controls | Wire on-page run and submit actions to API endpoints with supportive feedback and explicit done state. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 18
  Acceptance:
  - `Run` action from the workspace calls runtime + evaluator endpoints and displays deterministic feedback.
  - `Submit` action from the workspace calls session submit endpoint and displays explicit done state.
  - Anonymous flow remains non-blocking and non-punitive in UI copy.
  Required tests:
  - Deterministic workspace client-script integration test covering run -> submit state transition from `/`.

- [x] P2-02 | Browser-Local Anonymous Progress | Persist anonymous session progress in browser local storage and hydrate supportive session context on load. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 18
  Acceptance:
  - Workspace client script reads anonymous progress from `localStorage` without blocking load.
  - Successful submit writes attempt history and completion metadata to `localStorage`.
  - UI copy remains supportive and never introduces guilt mechanics.
  Required tests:
  - Deterministic client-script integration test for localStorage read/write behavior.

- [x] P2-03 | Anonymous Progress Best-Effort Sync | After submit, sync anonymous local progress to server endpoint without blocking session completion UX. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 18
  Acceptance:
  - Submit flow posts anonymous progress snapshot to `/api/progress/anonymous` after local save.
  - Sync failures do not block or regress supportive done-state messaging.
  - Anonymous flow remains non-blocking for users who do not sign in.
  Required tests:
  - Deterministic client-script integration test for submit -> local save -> server sync behavior.

- [x] P2-04 | Progressive Hint Controls In Workspace | Add tiered hint reveal controls in the editor workspace with ordered progression and supportive copy. | blocked_by=none | verify=make test;make lint
  PRD refs: 6, 18
  Acceptance:
  - Workspace exposes explicit controls to reveal hint tiers in order (conceptual -> structural -> near-code).
  - Hint reveal state is visible in-session and does not clutter the editor-first flow.
  - Copy remains non-punitive and keeps submission always available.
  Required tests:
  - Route/component test for hint controls.
  - Deterministic client-script interaction test for ordered tier reveal.

- [x] P2-05 | Scheduler Decision Wiring In Submit Flow | After successful submit, call scheduler decision endpoint and surface supportive resurfacing timing feedback. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 9, 18
  Acceptance:
  - Workspace submit flow calls `/api/scheduler/decision` using correctness, time spent, hint usage, and local history-derived context.
  - UI surfaces deterministic scheduling feedback (next interval + priority) without blocking done-state messaging.
  - Scheduler failures remain non-blocking and supportive.
  Required tests:
  - Route/component test for scheduling status surface.
  - Deterministic client-script integration test for submit -> scheduler decision behavior.

- [x] P2-06 | Editor Ergonomics + Rich Problem Context | Add realistic editor tab indentation and comprehensive expandable problem context sections. | blocked_by=none | verify=make test;make lint
  PRD refs: 6, 13, 18
  Acceptance:
  - Code editor supports in-place indentation when pressing `Tab`.
  - Problem workspace includes expandable sections for formulas, architecture usage, input constraints, and expected outputs.
  - Context copy is comprehensive while keeping run/submit flow focused and non-punitive.
  Required tests:
  - Route/component test for expandable context surfaces.
  - Deterministic client-script integration test for `Tab` indentation behavior.

- [x] P2-07 | Visible Problem Test Cases | Add several visible test cases per problem and render them clearly in the workspace. | blocked_by=none | verify=make test;make lint
  PRD refs: 6, 18
  Acceptance:
  - Each workspace problem supports multiple visible test cases.
  - Workspace UI renders test case input and expected output summaries for learners.
  - Test case surfaces remain lightweight and do not block run/submit flow.
  Required tests:
  - Route/component test for visible test case rendering.
  - Start entrypoint integration test verifying test case content appears at `/`.

- [x] P2-08 | Primary Paper Links Per Problem | Add visible links to the foundational paper(s) for each problem as part of the learning context. | blocked_by=none | verify=make test;make lint
  PRD refs: 6, 13, 18
  Acceptance:
  - Workspace problem model supports one or more paper links.
  - Workspace UI shows a clear paper-links section per problem.
  - Links are visible without blocking run/submit flow.
  Required tests:
  - Route/component test for paper link rendering.
  - Start entrypoint integration test verifying default paper link appears at `/`.

- [x] P2-09 | LaTeX-Style Formula Presentation | Render formulas in clear LaTeX-style display blocks for readability. | blocked_by=none | verify=make test;make lint
  PRD refs: 6, 18
  Acceptance:
  - Formula section renders as LaTeX-style display content instead of plain prose bullets.
  - Workspace styling makes formulas visually distinct and readable.
  - Formula presentation remains lightweight and does not block run/submit flow.
  Required tests:
  - Route/component test for LaTeX-style formula rendering.
  - Start entrypoint integration test verifying LaTeX-style formula content at `/`.

- [x] P2-10 | Shell-Style Debug Output Panel | Add a clear shell-like run output panel so users can iterate/debug with repeated runs before submit. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 18
  Acceptance:
  - Workspace shows a shell-like debug output area with clear run logs.
  - Repeated `Run` attempts append unambiguous output entries for runtime and evaluator feedback.
  - UI explicitly communicates users can run as many times as needed before submit.
  Required tests:
  - Route/component test for debug shell surface.
  - Deterministic client-script integration test for repeated run log behavior.

- [x] P2-11 | Session Start + 30-Min Auto-Submit | Start a visible 30-minute timer on explicit start and auto-submit at cap with clear messaging. | blocked_by=none | verify=make test;make lint
  PRD refs: 4, 5, 18
  Acceptance:
  - Workspace exposes clear session start/timer status and starts timing on start action.
  - Timer is visible near problem context and enforces a 30-minute cap.
  - If not already submitted at cap, session auto-submits and shows explicit supportive message.
  Required tests:
  - Route/component test for timer/start surfaces.
  - Deterministic client-script integration test for cap-triggered auto-submit behavior.

- [x] P2-12 | Timer Trigger Refinement | Start session timer on first typed character in editor or explicit start button press. | blocked_by=none | verify=make test;make lint
  PRD refs: 4, 5, 18
  Acceptance:
  - Timer does not start on editor focus alone.
  - Timer starts on first typed character in the editor.
  - Timer also starts when `Start Problem` is pressed.
  Required tests:
  - Deterministic client-script test for first-character timer start.
  - Route/integration assertions for updated timer-start copy.

- [x] P2-13 | Debug Console Priority Layout | Position the debug console above the submission status panel so it is the primary run/output surface. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 18
  Acceptance:
  - Debug console appears before status/submission lines in the editor panel.
  - Debug surface remains clear and prominent for repeated run/submit feedback.
  - Existing submit status messaging remains visible and non-punitive.
  Required tests:
  - Route/integration assertion for debug-console-first ordering.

- [x] P2-14 | Searchable Question Library + Suggest Topic CTA | Add a workspace question-library surface with fuzzy search, type filtering, and a "Suggest a Topic" button. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 6, 13, 18
  Acceptance:
  - Workspace exposes a clear "Question Library" place showing available questions.
  - Library supports fuzzy text search and problem-type filtering.
  - Same surface includes a "Suggest a Topic" action with supportive copy.
  Required tests:
  - Route/start integration assertions for library controls and seeded question visibility.
  - Deterministic client-script integration test for fuzzy/type filtering and suggest-topic action.

- [x] P2-15 | Syntax Highlighted Editor Surface | Add syntax highlighting in the code editor while preserving existing tab indentation and run/submit behavior. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 6, 18
  Acceptance:
  - Editor displays highlighted Python-like tokens instead of plain monochrome text.
  - Highlighting updates as the user types and remains aligned with textarea content.
  - Existing run/submit/debug/timer interactions remain unchanged.
  Required tests:
  - Route/start integration assertions for syntax-highlight editor elements.
  - Deterministic client-script integration test for runtime highlight refresh on code edits.

- [x] P2-16 | Workspace Tabs For Problem vs Question Bank | Move question bank into its own tab to reduce sidebar clutter while keeping search/filter/suggest interactions. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 18
  Acceptance:
  - Problem panel shows tab controls with default focus on core problem context.
  - Question bank appears under a separate "Question Bank" tab.
  - Existing question search/filter/suggest behavior remains functional.
  Required tests:
  - Route/start integration assertions for tab controls and default tab visibility.
  - Deterministic client-script integration test for tab switching behavior.

- [x] P2-17 | Compact Right Panel Spacing | Tighten code-editor/terminal panel spacing and prevent stretched empty vertical space. | blocked_by=none | verify=make test;make lint
  PRD refs: 18
  Acceptance:
  - Right panel no longer stretches with large empty gaps when left column is taller.
  - Editor/code/run/status spacing is visually tighter and more compact.
  - Existing editor/runtime interactions remain unchanged.
  Required tests:
  - Existing integration and E2E suite remains green (layout-only change).

- [x] P2-18 | Real Runtime Execution + Correctness Scoring | Execute submitted Python code on deterministic toy inputs and score against problem-specific reference outputs. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 6, 8, 18
  Acceptance:
  - Run API executes user function code instead of returning static placeholder output.
  - Evaluator scores candidate output against the correct reference output for the active problem.
  - Submit path reflects evaluator-derived correctness from real execution output.
  Required tests:
  - Runtime unit + endpoint tests verify output changes with code changes.
  - Evaluator unit + endpoint tests verify pass/fail against problem reference output.

- [x] P2-19 | Runtime Stdout Visibility On Failures | Surface captured Python stdout for failed runs so print-based debugging remains visible. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 18
  Acceptance:
  - Runtime failure payloads include captured stdout when available.
  - Debug console displays stdout for both successful and failed runs.
  - Existing run/submit flow remains stable.
  Required tests:
  - Runtime unit + endpoint tests for stdout propagation on failures.
  - Client-script integration assertion for stdout display in failed run logs.

- [x] P2-20 | Preloaded Python Package Aliases | Ensure common data/ML packages are preloaded and available in user solution execution context. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 6, 18
  Acceptance:
  - Runtime preloads `numpy`, `torch`, and `pandas` aliases where available (`np`, `torch`, `pd`).
  - Starter code explicitly includes baseline imports for common package usage.
  - Runtime/execution diagnostics surface preloaded package availability.
  Required tests:
  - Runtime unit + endpoint tests confirm package alias availability metadata.
  - Start entrypoint integration assertion confirms starter-code imports render on `/`.

- [x] P2-21 | Test Cases Panel Under Debug Console | Move visible test cases below debug console with per-case tabs that turn green when run output passes deterministic checks. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 6, 18
  Acceptance:
  - Visible test cases render under the debug console in the right editor panel.
  - Each test case has a dedicated tab, with active tab detail content shown inline.
  - Runtime returns per-case pass/fail data and tab styling updates to green for passing cases after Run.
  Required tests:
  - Route/start integration assertions for new test-case panel placement and tab markup.
  - Runtime unit + endpoint tests for deterministic per-case pass/fail payload.
  - Client-script integration assertion that passing cases mark tabs as pass.

- [x] P2-22 | Suggest Topic Modal + Structured Problem Intake | Replace the simple suggest-topic action with a modal form that captures high-quality coding-problem specification fields. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 6, 18
  Acceptance:
  - Clicking "Suggest a Topic" opens a modal instead of only updating inline copy.
  - Modal contains required fields for problem definition quality (topic, type, difficulty, objective, context, IO spec, constraints, starter signature, visible tests).
  - Submitting the modal validates required fields and records a supportive queued-message in workspace status/debug output.
  Required tests:
  - Route/start integration assertions for modal structure and key input fields.
  - Client-script integration assertion covering modal open, field capture, validation-ready submission flow, and status/debug updates.

- [x] P2-23 | Question Bank Quality + Lint Gate | Enrich seeded problem specs, add a strict problem-bank lint, and add reference-solution regression tests so new questions remain correct and consistent over time. | blocked_by=none | verify=make test;make lint
  PRD refs: 6, 8, 18
  Acceptance:
  - Seeded problem definitions include richer concept/goal/inputs/eval/hints plus prerequisites/pitfalls.
  - Every seeded problem has a runtime fixture and a reference Python solution.
  - Lint fails if a new problem violates authoring standards or lacks runtime/solution coverage.
  Required tests:
  - Problem-bank lint test.
  - Reference-solution runtime regression test.

- [ ] P2-24 | Animated Submission Success Moment | Add a lightweight celebratory success animation + copy treatment after submit to make completion feel rewarding without introducing guilt mechanics. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 18
  Acceptance:
  - Successful submit shows a distinct animated success state (micro-interaction + visual emphasis) in the workspace.
  - Animation is brief, non-blocking, and respects reduced-motion preferences.
  - Incorrect submit remains supportive and never punitive.
  Required tests:
  - Route/start integration assertions for success-state animation markup/classes.
  - Deterministic client-script integration test verifying success-state timing/visibility and reduced-motion fallback behavior.

- [ ] P2-25 | Prominent Next Presentation Countdown | Make "days until next presentation" the primary spaced-repetition feedback signal in submit/done surfaces. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 9, 18
  Acceptance:
  - Submit/done UI elevates the next presentation date/countdown as the primary scheduler message.
  - Countdown wording is clear, supportive, and avoids backlog/debt framing.
  - Existing scheduler decision details remain available but visually secondary.
  Required tests:
  - Route/start integration assertions for countdown placement and prominence.
  - Deterministic client-script integration test for scheduler-response rendering of countdown text.

- [ ] P2-26 | Runtime Interpreter Verification + Config | Verify and expose which Python interpreter executes user code, with explicit runtime diagnostics and env-based override support. | blocked_by=none | verify=make test;make lint
  PRD refs: 5, 6, 8, 18
  Acceptance:
  - Runtime resolves interpreter from a configurable env var (defaulting safely when unset) instead of hardcoded binary assumptions.
  - Run diagnostics include interpreter path/version and preloaded package availability in a stable, testable payload.
  - Startup/runtime failure clearly reports actionable guidance when interpreter is missing or incompatible.
  Required tests:
  - Runtime unit tests for interpreter resolution precedence and fallback behavior.
  - Runtime endpoint integration test asserting interpreter diagnostics fields and failure messaging.
  - Client-script integration assertion for displaying interpreter diagnostics in debug output.

## Ralph Loop Handoff Log

Use this template for every completed task:

`- YYYY-MM-DDTHH:MM:SSZ | TASK_ID | files=<comma-separated paths> | tests=<added/updated/none> | verify=<commands actually run> | risks=<short note>`

- 2026-02-16T05:54:21Z | P0-02 | files=src/testing/deterministic-fixtures.js,tests/deterministic-fixtures.stability.test.js,tests/evaluator.fixtures.test.js,tests/scheduler.fixtures.test.js,TODO.md | tests=added | verify=make test;make lint | risks=fixtures currently use plain JS nested arrays as toy tensors and should be aligned if tensor runtime types are introduced
- 2026-02-16T06:01:00Z | P0-1 | files=TODO.md | tests=none | verify=echo ok | risks=assigned task line not present in current TODO task list, so completion was recorded in handoff log only
- 2026-02-16T17:59:31Z | P0-03 | files=src/session/daily-loop-policy.js,tests/non-negotiable-regression-guard.test.js,TODO.md | tests=added | verify=make test;make lint | risks=regression guard covers policy invariants but UI-level enforcement still pending in later P0 tasks
- 2026-02-16T18:01:28Z | P0-04 | files=package.json,tsconfig.json,src/frontend/problem-workspace-route.tsx,src/backend/api-app.ts,tests/editor-first-landing.route.test.tsx,TODO.md | tests=added | verify=make test;make lint | risks=landing route is validated at route/component contract level; browser runtime wiring and styling remain for later slices
- 2026-02-16T18:06:22Z | P0-05 | files=src/runtime/runtime-execution.ts,src/backend/api-app.ts,src/testing/deterministic-fixtures.d.ts,tests/runtime-execution-loop.test.ts,tests/runtime-run.endpoint.integration.test.ts,TODO.md | tests=added | verify=make test;make lint | risks=runtime currently uses deterministic toy execution contract and supportive failure heuristics instead of full Python sandbox execution
- 2026-02-16T18:08:22Z | P0-06 | files=src/evaluator/evaluator-engine.ts,src/backend/api-app.ts,tests/evaluator-engine.test.ts,tests/evaluator-endpoint.integration.test.ts,TODO.md | tests=added | verify=make test;make lint | risks=evaluator invariance logic currently uses row-centering heuristic that may need per-problem customization as curriculum expands
- 2026-02-16T18:09:22Z | P0-07 | files=src/hints/hint-tier-flow.ts,tests/hint-tier-flow.test.ts,TODO.md | tests=added | verify=make test;make lint | risks=hint state tracking is currently in-memory and must be persisted when session persistence is implemented
- 2026-02-16T18:11:06Z | P0-08 | files=src/session/submission-session.ts,src/backend/api-app.ts,tests/session-submission-flow.test.ts,tests/session-submit.endpoint.integration.test.ts,TODO.md | tests=added | verify=make test;make lint | risks=session submit endpoint currently reconstructs in-memory session state per request until persistence is implemented
- 2026-02-16T18:12:10Z | P0-09 | files=src/session/session-timer.ts,src/backend/api-app.ts,tests/session-timer-cap.test.ts,tests/session-timer.endpoint.integration.test.ts,TODO.md | tests=added | verify=make test;make lint | risks=timer cap currently relies on client/server provided timestamps and does not yet persist session clock drift metadata
- 2026-02-16T18:13:21Z | P0-10 | files=src/progress/anonymous-progress-store.ts,src/backend/api-app.ts,tests/anonymous-progress-persistence.test.ts,TODO.md | tests=added | verify=make test;make lint | risks=anonymous persistence currently uses file-backed local store and needs browser-storage adapter for full frontend runtime
- 2026-02-16T18:14:45Z | P0-11 | files=src/auth/optional-auth.ts,src/frontend/problem-workspace-route.tsx,src/backend/api-app.ts,tests/editor-first-landing.route.test.tsx,tests/optional-auth-flow.integration.test.ts,TODO.md | tests=added/updated | verify=make test;make lint | risks=optional account state is currently in-memory and will need durable account persistence for multi-session continuity
- 2026-02-16T18:15:53Z | P0-12 | files=src/progress/progress-sync-merge.ts,src/backend/api-app.ts,tests/progress-sync-merge.test.ts,TODO.md | tests=added | verify=make test;make lint | risks=merge de-duplication key is attempt-field based and may require stable server-side attempt IDs in production
- 2026-02-16T18:17:12Z | P0-13 | files=src/scheduler/spaced-repetition-scheduler.ts,src/backend/api-app.ts,tests/spaced-repetition-scheduler-core.test.ts,TODO.md | tests=added | verify=make test;make lint | risks=scheduler coefficients are deterministic and tunable but currently global rather than category-specific
- 2026-02-16T18:18:14Z | P0-14 | files=src/scheduler/spaced-repetition-scheduler.ts,src/backend/api-app.ts,tests/one-resurfaced-per-session-rule.test.ts,TODO.md | tests=added | verify=make test;make lint | risks=session assignment currently returns a single-problem plan and will need expansion for future multi-item session experiments
- 2026-02-16T18:19:20Z | P0-15 | files=src/progress/minimal-progress-view.ts,src/backend/api-app.ts,tests/minimal-progress-view.test.ts,TODO.md | tests=added | verify=make test;make lint | risks=progress view is currently API-driven and requires frontend rendering integration for full UX validation
- 2026-02-16T18:21:00Z | P0-16 | files=src/problems/seed-problem-pack.ts,src/evaluator/seed-problem-evaluator-contract.ts,src/backend/api-app.ts,tests/seed-problem-pack.schema.test.ts,tests/seed-problem-pack.evaluator-contract.test.ts,TODO.md | tests=added | verify=make test;make lint | risks=seed problem evaluator contract currently validates structural output contracts and will need per-problem semantic invariants as evaluator depth increases
- 2026-02-16T18:23:57Z | P0-17 | files=src/frontend/problem-workspace-route.tsx,src/backend/api-app.ts,tests/editor-first-landing.route.test.tsx,tests/start.entrypoint.integration.test.ts,docs/p0-17-visual-qa-checklist.md,TODO.md | tests=added/updated | verify=make test;make lint | risks=visual QA checklist is aligned to current static shell and should be re-run after interactive frontend wiring changes
- 2026-02-16T18:27:52Z | P0-18 | files=package.json,tsconfig.json,playwright.config.ts,e2e/golden-path.e2e.spec.ts,TODO.md | tests=added/updated | verify=make test;make lint | risks=golden-path E2E currently validates end-to-end HTTP flow and should be expanded with browser interaction assertions as frontend interactivity deepens
- 2026-02-16T18:28:38Z | P0-19 | files=docs/local-first-runbook.md,tests/local-first-runbook.test.ts,TODO.md | tests=added | verify=make test;make lint | risks=runbook reflects current single-process deployment path and should be revised once production hardening starts
- 2026-02-16T18:30:30Z | P1-01 | files=src/analytics/supportive-analytics-summaries.ts,src/backend/api-app.ts,tests/supportive-analytics-summaries.test.ts,tests/supportive-analytics.endpoint.integration.test.ts,TODO.md | tests=added | verify=make test;make lint | risks=supportive analytics thresholds are currently static and should be tuned with real session distributions
- 2026-02-16T18:32:43Z | P1-02 | files=src/problems/seed-problem-pack.ts,tests/expanded-curriculum-variants.test.ts,TODO.md | tests=added | verify=make test;make lint | risks=expanded curriculum evaluator coverage currently validates structural output contracts and should evolve to category-specific invariants
- 2026-02-16T18:34:00Z | P1-03 | files=src/backend/api-app.ts,tests/server-hardening.integration.test.ts,TODO.md | tests=added | verify=make test;make lint | risks=hardening is baseline middleware-level protection and should be complemented by infrastructure-level controls in production
- 2026-02-16T18:42:08Z | P2-01 | files=src/backend/api-app.ts,tests/server-hardening.integration.test.ts,tests/start.entrypoint.integration.test.ts,tests/workspace-client-script.integration.test.ts,TODO.md | tests=added/updated | verify=make test;make lint | risks=workspace interaction coverage uses deterministic client-script integration; add full browser click-path E2E when browser-launch constraints are resolved
- 2026-02-16T18:43:56Z | P2-02 | files=src/frontend/problem-workspace-route.tsx,tests/workspace-client-script.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=anonymous progress persistence currently stays browser-local and should sync best-effort to account/server tier when sign-in and API wiring are expanded
- 2026-02-16T18:45:28Z | P2-03 | files=src/frontend/problem-workspace-route.tsx,tests/workspace-client-script.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=anonymous sync currently best-effort fire-and-forget after done-state messaging and does not yet show sync health to user, by design for no-block UX
- 2026-02-16T18:48:55Z | P2-04 | files=src/frontend/problem-workspace-route.tsx,tests/editor-first-landing.route.test.tsx,tests/start.entrypoint.integration.test.ts,tests/workspace-client-script.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=hint reveal ordering is client-side only and should be mirrored in persisted hint-usage telemetry for cross-device continuity
- 2026-02-16T18:53:02Z | P2-05 | files=src/frontend/problem-workspace-route.tsx,tests/editor-first-landing.route.test.tsx,tests/start.entrypoint.integration.test.ts,tests/workspace-client-script.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=scheduler decision context currently uses local inferred prior-success and recency metrics and should be reconciled with durable server-side history for signed-in users
- 2026-02-16T19:49:21Z | P2-06 | files=src/frontend/problem-workspace-route.tsx,src/backend/api-app.ts,tests/editor-first-landing.route.test.tsx,tests/start.entrypoint.integration.test.ts,tests/workspace-client-script.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=tab indentation is currently lightweight single-step indent; future upgrades can add multi-line indent/outdent and syntax-aware editing without changing current solve flow
- 2026-02-16T19:51:33Z | P2-07 | files=src/frontend/problem-workspace-route.tsx,src/backend/api-app.ts,tests/editor-first-landing.route.test.tsx,tests/start.entrypoint.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=visible test cases currently show summaries rather than executable per-case assertions; future work can connect these cards to runnable case-by-case output inspection
- 2026-02-16T19:53:04Z | P2-08 | files=src/frontend/problem-workspace-route.tsx,src/backend/api-app.ts,tests/editor-first-landing.route.test.tsx,tests/start.entrypoint.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=paper links are currently manually curated metadata per problem and should be validated during content authoring to avoid stale references
- 2026-02-16T19:58:22Z | P2-09 | files=src/frontend/problem-workspace-route.tsx,src/backend/api-app.ts,tests/editor-first-landing.route.test.tsx,tests/start.entrypoint.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=formulas are currently displayed in LaTeX-style text blocks rather than fully parsed math rendering; future enhancement can add full TeX renderer if needed
- 2026-02-16T20:01:41Z | P2-10 | files=src/frontend/problem-workspace-route.tsx,tests/editor-first-landing.route.test.tsx,tests/start.entrypoint.integration.test.ts,tests/workspace-client-script.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=debug shell currently logs structured text output and can be extended later with per-test-case run traces and richer formatting
- 2026-02-16T20:06:57Z | P2-11 | files=src/frontend/problem-workspace-route.tsx,tests/editor-first-landing.route.test.tsx,tests/start.entrypoint.integration.test.ts,tests/workspace-client-script.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=30-minute cap enforcement is client-driven and should be reinforced with server-side session timer authority for signed-in multi-device scenarios
- 2026-02-16T21:19:19Z | P2-12 | files=src/frontend/problem-workspace-route.tsx,tests/editor-first-landing.route.test.tsx,tests/start.entrypoint.integration.test.ts,tests/workspace-client-script.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=timer trigger depends on keydown semantics and may require input-method edge-case handling for non-Latin IME composition flows
- 2026-02-16T21:22:32Z | P2-13 | files=src/frontend/problem-workspace-route.tsx,tests/editor-first-landing.route.test.tsx,tests/start.entrypoint.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=debug shell priority is enforced via DOM ordering and may need additional responsive-layout checks if panel structure changes in future UI redesigns
- 2026-02-16T21:30:42Z | P2-14 | files=src/frontend/problem-workspace-route.tsx,src/backend/api-app.ts,tests/editor-first-landing.route.test.tsx,tests/start.entrypoint.integration.test.ts,tests/workspace-client-script.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=library fuzzy scoring uses lightweight subsequence matching and may need weighted ranking refinement as catalog size grows
- 2026-02-16T21:35:22Z | P2-15 | files=src/frontend/problem-workspace-route.tsx,tests/editor-first-landing.route.test.tsx,tests/start.entrypoint.integration.test.ts,tests/workspace-client-script.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=highlighter currently uses lightweight regex tokenization and may require language-grammar upgrades for multi-language support or deeper Python syntax coverage
- 2026-02-16T21:54:33Z | P2-16 | files=src/frontend/problem-workspace-route.tsx,tests/editor-first-landing.route.test.tsx,tests/start.entrypoint.integration.test.ts,tests/workspace-client-script.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=tab state is currently client-only and will need route-level persistence if deep-linking to specific tabs is required later
- 2026-02-16T21:55:57Z | P2-17 | files=src/frontend/problem-workspace-route.tsx,TODO.md | tests=none | verify=make test;make lint | risks=compact spacing values are tuned for current shell and may need minor calibration after future typography or panel-content changes
- 2026-02-16T22:01:07Z | P2-18 | files=src/problems/runtime-problem-fixtures.ts,src/runtime/runtime-execution.ts,src/evaluator/evaluator-engine.ts,src/frontend/problem-workspace-route.tsx,tests/runtime-execution-loop.test.ts,tests/runtime-run.endpoint.integration.test.ts,tests/evaluator-engine.test.ts,tests/evaluator-endpoint.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=python execution currently uses local process sandboxing with timeout/maxBuffer controls and may need stronger isolation for multi-tenant production deployment
- 2026-02-16T22:14:12Z | P2-19 | files=src/runtime/runtime-execution.ts,src/frontend/problem-workspace-route.tsx,tests/runtime-execution-loop.test.ts,tests/runtime-run.endpoint.integration.test.ts,tests/workspace-client-script.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=stdout capture is string-based and may truncate or need stream handling if future problems emit very large logs
- 2026-02-16T23:09:36Z | P2-20 | files=src/runtime/runtime-execution.ts,src/backend/api-app.ts,src/frontend/problem-workspace-route.tsx,tests/runtime-execution-loop.test.ts,tests/runtime-run.endpoint.integration.test.ts,tests/start.entrypoint.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=lazy-loading heavy packages avoids baseline latency but first torch/pandas use still incurs module import overhead in that run
- 2026-02-16T23:18:33Z | P2-21 | files=src/problems/runtime-problem-fixtures.ts,src/runtime/runtime-execution.ts,src/frontend/problem-workspace-route.tsx,src/backend/api-app.ts,tests/runtime-execution-loop.test.ts,tests/runtime-run.endpoint.integration.test.ts,tests/editor-first-landing.route.test.tsx,tests/start.entrypoint.integration.test.ts,tests/workspace-client-script.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=per-case deterministic checks rerun user code across multiple fixtures and may increase run latency for print-heavy or expensive solutions
- 2026-02-16T23:23:04Z | P2-22 | files=src/frontend/problem-workspace-route.tsx,tests/workspace-client-script.integration.test.ts,tests/editor-first-landing.route.test.tsx,tests/start.entrypoint.integration.test.ts,TODO.md | tests=updated | verify=make test;make lint | risks=topic suggestions are currently captured client-side for workflow feedback and will require a backend persistence endpoint when productized
- 2026-02-16T23:59:02Z | P2-23 | files=src/problems/seed-problem-pack.ts,src/problems/runtime-problem-fixtures.ts,src/problems/problem-bank-lint.ts,src/problems/reference-python-solutions.ts,src/runtime/runtime-execution.ts,src/evaluator/evaluator-engine.ts,src/backend/api-app.ts,src/frontend/problem-workspace-route.tsx,scripts/lint.mjs,scripts/problem-bank-lint.ts,tests/problem-bank-lint.test.ts,tests/reference-solutions.runtime-regression.test.ts,tests/start.entrypoint.integration.test.ts,TODO.md | tests=added/updated | verify=make test;make lint | risks=problem-bank correctness now relies on runtime fixtures + reference solutions; future expansion to true batched/headed tensors will require a richer tensor-evaluator contract beyond 2D matrices
- 2026-02-17T04:18:17Z | P1-04 | files=src/scheduler/spaced-repetition-scheduler.ts,src/backend/api-app.ts,tests/spaced-repetition-scheduler-core.test.ts,tests/scheduler-plan.endpoint.integration.test.ts,TODO.md | tests=added/updated | verify=make test;make lint | risks=interchangeable candidate selection currently applies only to resurfaced cards (new-card prioritization remains strict) and may need UX wiring where users make the selection
- 2026-02-17T05:38:10Z | P1-06 | files=src/problems/problem-review-queue.ts,src/backend/api-app.ts,src/frontend/problem-workspace-route.tsx,src/frontend/problem-workspace.css,src/frontend/client-ts/workspace-client/shared/types.ts,src/frontend/client-ts/workspace-client/api/session-controllers.ts,src/frontend/client-ts/workspace-client/controllers/flag-controller.ts,src/frontend/client-ts/workspace-client/controllers/index.ts,src/frontend/client-ts/workspace-client/index.ts,tests/problem-review-queue.test.ts,tests/problem-flag.endpoint.integration.test.ts,tests/frontend/workspace/client-controllers.test.ts,tests/frontend/workspace/client-script.integration.test.ts,tests/editor-first-landing.route.test.tsx,tests/backend/start.entrypoint.integration.test.ts,docs/local-first-runbook.md,TODO.md | tests=added/updated | verify=make test;make lint | risks=review-queue and verification status transitions are currently in-memory process state and should be persisted before multi-instance deployment
