# Product Requirements Document (PRD)

## Product Name (Working)
**DeepML-SR**  
*A no-guilt, daily deep learning practice system with adaptive spaced repetition*

---

## 1. Overview

DeepML-SR is a coding-practice platform inspired by Deep-ML and LeetCode, but designed specifically for **long-term retention of deep learning architectural primitives**.

The system combines:
- fully runnable, LeetCode-style coding problems,
- adaptive spaced repetition at the **problem level**, and
- a **strictly time-boxed daily workflow** (30 minutes, one session, done).

The product is explicitly designed to avoid guilt-driven mechanics such as streaks, backlogs, or penalties for missed days.

---

## 2. Problem Statement

Current deep learning learning tools fall into two camps:
1. Passive consumption (courses, videos, blog posts)
2. One-shot coding challenges with no retention mechanism

Neither supports **long-horizon fluency** with core architectural components such as attention, recurrence, conditioning, adapters, or normalization layers.

DeepML-SR addresses this gap by turning architectural primitives into **atomic, runnable coding problems** that are periodically resurfaced based on performance and time decay.

---

## 3. Target User

### Primary Users
- Graduate students
- ML researchers
- ML engineers
- Advanced practitioners who already understand core concepts

### Non-Target Users
- Absolute beginners
- Interview-only DSA prep users

---

## 4. Core Design Principles (Non-Negotiable)

1. **One-and-done daily workflow**
2. **No guilt, no backlog**
3. **Time-boxed sessions (30 minutes max)**
4. **Failure is informative, not punitive**
5. **Retention over performance**

If any feature violates these principles, it should not be implemented.

### MVP Delivery Mandate
- Build this as an MVP with the **least possible complexity** while preserving full core functionality.
- Prefer direct implementations over abstraction-heavy designs.
- Every feature must justify its presence in the 30-minute daily loop.
- If a feature can be deferred without breaking the core loop, defer it.

---

## 5. Core User Loop (Critical)

1. User lands directly in a runnable problem workspace (editor first, no gate)
2. User can optionally create an account to save progress and improve spaced repetition personalization
3. System serves **exactly one primary problem**
4. User works for **up to 30 minutes**
5. User submits (correct or incorrect)
6. System evaluates and schedules resurfacing
7. Session ends

### Explicit Constraints
- No streaks
- No accumulating backlog
- Missed days do not increase workload
- Submission is always allowed
- Account creation is optional and must never block first problem attempt

---

## 6. Problem Definition (Atomic Unit)

Each problem represents a **single deep learning component**.

### Required Fields

Each problem must include:

- `id`
- `title`
- `category` (e.g. Attention, RNNs, Conditioning)
- `concept_description`
- `goal`
- `starter_code`
- `inputs`
  - tensor shapes
  - datatypes
  - constraints
- `expected_output`
  - shapes
  - numerical properties (not just exact values)
- `evaluation_logic`
  - shape checks
  - invariants
  - numerical sanity checks
- `hints`
  - Tier 1: conceptual nudge
  - Tier 2: structural guidance
  - Tier 3: near-code guidance
- `resources`
  - papers
  - blog posts
  - official documentation
- `estimated_time_minutes` (≤ 30)
- `problem_version`
- `torch_version_target`

### Explicit Rule
Problems must be runnable end-to-end using **toy tensors only**.  
No datasets. No training loops. No long convergence.

---

## 7. Problem Categories (Initial Curriculum)

### Core Blocks
- MLP
- LayerNorm
- RMSNorm
- Residual connections

### Sequence Models
- Vanilla RNN
- LSTM
- GRU

### Attention
- Scaled dot-product attention
- Multi-head attention
- Causal masking
- Cross-attention

### Conditioning & Modulation
- FiLM
- Feature-wise affine transforms
- Gated conditioning

### Adaptation & Efficiency
- LoRA
- Linear adapters
- Parameter freezing patterns

### Positional Encoding
- Sinusoidal
- Learned
- RoPE (simplified)

Each category should contain **multiple variants** with increasing difficulty.

---

## 8. Evaluation Philosophy

Problems are evaluated using:
- shape correctness
- masking correctness
- invariance properties
- gradient flow checks
- numerical sanity checks

Exact value matching should be avoided unless trivial.

---

## 9. Spaced Repetition System (Problem-Level)

### Inputs to Scheduler
- correctness (pass / partial / fail)
- time spent
- hint tier usage
- number of prior successful completions
- time since last exposure

### Outputs
- next resurfacing interval
- resurfacing priority

### Behavioral Constraints
- At most **one resurfaced problem per session**
- New problems always take priority
- Missed days do not accumulate debt

This is a **soft spaced repetition system**, not flashcard-style SRS.

---

## 10. Time-Aware Skill Feedback (New)

### Purpose
Provide feedback on **skill freshness** without guilt, streaks, or penalties.

### Category-Level Skill Scores
Each category (e.g. Attention, RNNs) maintains a **continuous score** based on:
- proportion of problems completed correctly
- recency of last successful completion
- decay over time without practice

#### Key Properties
- Scores naturally decay if not practiced
- Even perfect performance will cool slightly over time
- Scores recover quickly with renewed practice
- Scores are descriptive, not evaluative

### Example Labels (Not Numeric by Default)
- Cold
- Cooling
- Warm
- Solid
- Sharp

No raw percentages are shown unless explicitly requested.

---

## 11. Progress Visibility (Non-Punitive)

The system should surface:
- number of problems completed per category
- approximate freshness per category
- recent areas of focus

The system must **not** surface:
- streaks
- “days missed”
- negative comparisons
- global rankings

---

## 12. Session Analytics (Private, Supportive)

Internally track:
- average hint tier used per category
- average time spent
- failure-to-success transitions
- resurfacing frequency

Surface only **actionable summaries**, e.g.:
> “Attention blocks are resurfacing more often than other categories.”

---

## 13. Learning Context

Each problem should include a short section:
> “Where this shows up in real systems”

This reinforces relevance and intrinsic motivation.

---

## 14. Versioning & Maintenance

All problems must be versioned:
- `problem_version`
- `torch_version_target`

Resurfacing must respect problem versions to avoid outdated patterns.

---

## 15. Future-Proofing (Not v1 Requirements)

- Cloud deployment hardening (after local-first MVP validation)
- Instructor / authoring mode
- Custom curricula
- Lab or classroom deployments
- Private problem sets for research groups

---

## 16. Explicit Non-Goals

The product must not include:
- leaderboards
- XP systems
- streaks
- social pressure mechanics
- interview framing

---

## 17. Summary

DeepML-SR is a **retention-first coding platform** for deep learning systems.

It prioritizes:
- architectural fluency
- time-bounded practice
- adaptive resurfacing
- psychological sustainability

The system succeeds if users can show up for 30 minutes, do meaningful work, submit without fear, and leave feeling done.

---

## 18. MVP UX & Delivery Constraints

### MVP UX Requirements
- The initial screen must immediately present a problem in the code editor.
- A clear but lightweight account CTA must be visible for users who want to save progress.
- Visual design should be aesthetically appealing while remaining low-bloat and fast.
- Keep interaction surfaces minimal: problem, hints, run, submit, and supportive feedback.

### MVP Delivery Strategy
- Run locally first for rapid iteration and validation.
- Keep infrastructure simple until core loop quality is proven.
- Add server deployment only when local MVP behavior is stable and validated.

### MVP Technical Requirements (Implementation Constraints)
- Frontend must be built with **React + TypeScript**.
- Backend API must be built with **Express + TypeScript**.
- Problem execution/evaluation runtime must support the `torch_version_target` contract and toy-tensor-only execution.
- Persistence must use a two-tier model:
  - Tier 1 (anonymous/local): browser-local storage for progress continuity across restarts.
  - Tier 2 (account/server): server-backed persistence for signed-in users.
  - On sign-in, local anonymous progress must merge into account progress without data loss.
- End-to-end coverage for the core daily loop must use **Playwright** so agents can reliably validate landing -> run -> submit -> schedule -> done.

### MVP UI Direction
- UI inspiration reference: [Image #1 (Example UI)](./Example-UI.png)
- Visual direction should be **sleek and less cluttered** than the reference while preserving editor-first clarity.
- Prioritize clear hierarchy, low-noise surfaces, and fast interaction over dense controls.
- Avoid visual bloat and keep the workspace focused on: problem, hints, run, submit, supportive feedback.

---

## 19. MVP Build TODOs (Prioritized by App Section)

Use this order for implementation from empty app to MVP:

1. `P0` Session Entry + Problem Workspace (editor-first landing, no auth gate)
2. `P0` Problem Runtime + Evaluator (runnable toy tensor checks and deterministic feedback)
3. `P0` Daily Loop Orchestrator (single primary problem, 30-minute cap, hard stop)
4. `P0` Optional Auth + Progress Persistence (anonymous first, account sync optional)
5. `P0` Spaced Repetition Scheduler (correctness/time/hints/recency driven resurfacing)
6. `P0` Minimal Progress View (category freshness, no guilt mechanics)
7. `P0` Aesthetic Polish Without Bloat (clear visual hierarchy, responsive, fast)
8. `P0` Local Run + Deployment Readiness (local dev default, simple path to server deploy)

Detailed task granularity and acceptance checkboxes are tracked in `TODO.md`.

---

## 20. Agent Execution Loop (Ralph Wiggims Style)

Agents should execute one tiny vertical slice at a time using this loop:

1. Pick the top unclaimed `P0` item from `TODO.md`
2. Implement the smallest end-to-end slice
3. Run tests/lint for the touched scope
4. Mark the TODO status and leave a short handoff note
5. Repeat until all `P0` items are complete

Automation helper script: `scripts/ralph_wiggims_loop.sh`
