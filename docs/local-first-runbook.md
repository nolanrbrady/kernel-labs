# DeepML-SR Local-First Runbook

## Scope
This runbook defines how to operate the MVP locally and the minimal path to server deployment readiness.

## Stack
- Frontend: React + TypeScript (server-rendered workspace shell)
- Backend API: Express + TypeScript
- Tests: Node test runner + Playwright golden-path E2E
- Storage:
  - Anonymous/local progress: file-backed local store (`.cache-local/anonymous-progress.json`)
  - Account/server progress: API surface prepared for account merge flows

## Prerequisites
- Node.js 20+
- npm 10+

## Local Setup
1. Install dependencies:
   - `npm install`
2. Run the application:
   - `npm start`
3. Open the app:
   - `http://localhost:3000`

## Local Verification
1. Run lint + typecheck:
   - `make lint`
2. Run all tests (unit + Playwright E2E):
   - `make test`
3. Optional quality gate wrapper:
   - `make quality-gate`

## Runtime Environment Variables
- `PORT`: server port (default `3000`)
- `ANON_PROGRESS_FILE`: override anonymous progress file location

## Core Endpoints
- `GET /`: editor-first workspace
- `GET /health`: health check
- `POST /api/runtime/run`: execute starter code against toy inputs
- `POST /api/evaluator/evaluate`: evaluator result (pass/partial/fail)
- `POST /api/session/submit`: submission transition to done state
- `POST /api/session/timer`: 30-minute cap enforcement
- `GET/POST /api/progress/anonymous`: anonymous progress read/write
- `POST /api/progress/sync-merge`: anonymous-to-account progress merge
- `POST /api/scheduler/decision`: interval + priority calculation
- `POST /api/scheduler/plan`: one-resurfaced-per-session planning
- `POST /api/problems/flag`: user flag intake for problem-quality triage
- `POST /api/problems/suggest-topic`: validates suggest-topic drafts against ProblemSpecV2
- `GET /api/problems/review-queue`: review queue snapshot + verification statuses

## Minimal Deployment Path
1. Build and run as a single Node process (same as local startup command):
   - `node --import tsx src/backend/start.ts`
2. Configure environment:
   - set `PORT`
   - set writable `ANON_PROGRESS_FILE` path
3. Expose `GET /health` for platform health checks.
4. Place behind a basic reverse proxy/load balancer if needed.

This path intentionally avoids extra infrastructure (queues, multi-service orchestration, heavy cloud coupling) until post-MVP validation.

## Deployment Readiness Checklist
- [x] Single command startup (`npm start`)
- [x] Health endpoint (`/health`)
- [x] Deterministic test suite and Playwright golden path
- [x] Local-first storage path documented
- [x] Minimal deploy command documented
