# Task Context: Candidate Test Runner (Frontend)

**Branch:** `sunset/task/feat-f69d79e6`  
**PR:** https://github.com/BlueSky-Digital-Labs/skill-testing-system/pull/21

## Scope

Implement the frontend candidate test runner with server-synchronized timer, debounced autosave with retry, resume support, and integrity-aware navigation. Consumes the delivery attempt APIs (`start`, `save`, `resume`, `submit`).

### In scope

- Attempt API client (`frontend/src/api/attempts.ts`)
- Runner pages: `/attempts/:attemptId` and `/tests/:id/start`
- Runner components (`RunnerHeader`, `RunnerQuestion`, `RunnerNavigator`, `RunnerFooter`)
- Hooks for timer sync, autosave, and attempt orchestration
- Vitest/RTL tests for API client, timer, question rendering, and runner page flows

### Out of scope / deferred

- Candidate assignment discovery UI (start page requires `?assignmentId=` query param)
- Embedding question stems in attempt API payload (runner fetches question details via question-bank `getQuestion`)
- Full-screen kiosk / proctoring integrations

## Key Implementation Decisions

1. **API client at `src/api/attempts.ts`** — Uses `authorizedFetch` + `parseResponse` consistent with newer frontend modules. `startAttempt` accepts `assignmentId` because the backend start endpoint keys off assignment, not test id.
2. **Question content hydration** — Attempt payloads provide order + saved answers only; runner loads question text/options via `getQuestion` and applies server `option_id_orders` while stripping `is_correct` from rendered options.
3. **Server-authoritative timer** — Local countdown initialized from `remaining_time_seconds`, decremented every second, and re-synced every 45s via `resumeAttempt`. Expiry only fires when server remaining time is also zero to avoid race on initial load.
4. **Autosave** — 1.5s debounce, exponential backoff (3 retries), localStorage draft cache purged on successful save. `question_version` taken from saved attempt state or question `latest_version_number`.
5. **Integrity defaults** — `question_per_page: true`, `disable_review: false` until assignment/test metadata exposes these flags from the backend.
6. **Start handoff** — `/tests/:id/start?assignmentId=...` validates test/assignment match, calls start API, redirects to `/attempts/:attemptId`.

## Files Changed

| File | Why |
|------|-----|
| `frontend/src/api/attempts.ts` | Delivery attempt API client + types |
| `frontend/src/api/attempts.test.ts` | API client unit tests |
| `frontend/src/pages/attempts/[attemptId].tsx` | In-progress attempt runner page |
| `frontend/src/pages/tests/[id]/start.tsx` | Start handoff page |
| `frontend/src/components/runner/*` | Runner UI components, hooks, styles |
| `frontend/src/App.tsx` | Register runner and start routes |
| `frontend/src/pages/attempts/__tests__/AttemptRunner.test.tsx` | Runner integration tests |

## Routes

| Path | Purpose |
|------|---------|
| `/tests/:id/start?assignmentId=` | Start attempt and redirect |
| `/attempts/:attemptId` | Resume/run attempt |
| `/attempts/:attemptId/complete` | Existing completion page (post-submit) |

## Verification

```bash
cd frontend && npm test && npm run lint && npm run build
```

## Open Questions / Follow-ups

- Add candidate-facing assignment list so start links do not require manual `assignmentId`
- Surface integrity flags (`question_per_page`, `disable_review`) from backend assignment/test config
- Add candidate-safe bulk question fetch to avoid N+1 `getQuestion` calls on large tests
