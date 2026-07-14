# Task Context: Grading Workspace (feat-24624271)

## Scope

### Backend (completed)
- Objective auto-scoring engine (`ObjectiveScore`, `ScoringPolicy`, scoring services/APIs)
- Manual grading queue (`FreeTextQueueItem`, `ManualGrade`)
- Combined attempt aggregation (`CombinedResult`, `TestConfigSnapshot`, `compile_attempt_scores`)
- Staff-protected grading APIs at `/api/grading/`

### Frontend (this iteration)
- Grading workspace UI at `/grading` and `/grading/:queueItemId`
- API client for queue list, manual grade submission, aggregation, and combined results
- Components: `QueueTable`, `GradeForm`, `ResultSummary`
- Blind marking display (`Anonymous` when `blind_marking=true`)
- Staff-only routes via existing `AdminRoute`
- Vitest + React Testing Library coverage for components and grading flow

## Key Implementation Decisions

### Backend
1. **Aggregation**: `compile_attempt_scores(attempt_id)` merges objective and manual scores by topic; pass/fail from `TestConfigSnapshot`.
2. **Blind marking**: Backend omits `candidate_display` when `blind_marking=True`; frontend also maps to `Anonymous`.
3. **Auth**: JWT + `is_staff` via `@require_staff_or_examiner`.

### Frontend
1. **API client**: `frontend/src/api/grading.ts` uses `authorizedFetch` from `http.ts` (re-exported via `client.ts`).
2. **Pagination**: `listQueue` supports `next_cursor` from API; falls back to client-side cursor pagination when backend returns full result sets.
3. **Detail navigation**: Queue item passed via router `state`; falls back to `findQueueItem` lookup.
4. **Grading flow**: Submit grade → `aggregateAttempt` → refresh `ResultSummary` with combined result.
5. **Error handling**: Surfaces 400/409-style conflicts for double grading attempts.
6. **Routing**: `/grading` and `/grading/:queueItemId` wrapped in `AdminRoute`; sidebar link for staff users.

## Files Changed

### Backend
| File | Why |
|------|-----|
| `backend/src/grading/` | Models, services, aggregates, views, tests, migrations |

### Frontend
| File | Why |
|------|-----|
| `frontend/src/api/client.ts` | Re-export authorized fetch + API base helper |
| `frontend/src/api/grading.ts` | Grading API client and display helpers |
| `frontend/src/api/grading.test.ts` | API client tests |
| `frontend/src/components/grading/` | QueueTable, GradeForm, ResultSummary + styles/tests |
| `frontend/src/pages/grading/` | GradingList, GradingDetail pages + integration test |
| `frontend/src/App.tsx` | Grading routes |
| `frontend/src/components/organisms/Sidebar/Sidebar.tsx` | Grading nav link for admins |
| `frontend/package.json` | Added React Testing Library dev dependencies |

## API Endpoints Used

| Endpoint | Method | Used By |
|----------|--------|---------|
| `/api/grading/queue/list` | GET | GradingList |
| `/api/grading/grade` | POST | GradingDetail |
| `/api/grading/aggregate/attempt` | POST | GradingDetail |
| `/api/grading/result/<attempt_id>/` | GET | GradingDetail |

## Verification

### Backend
```bash
cd backend
PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test SECRET_KEY=test-secret \
  python3 manage.py test grading authentication branding
```

### Frontend
```bash
cd frontend
npm install
npm run test
npm run lint
npm run build
```

## Open Questions / Follow-ups

- Backend queue list does not yet return server-side `next_cursor`; frontend paginates client-side until API adds cursor support.
- Add dedicated GET endpoint for single queue item instead of list lookup fallback.
- Expose grader-facing queue item detail without candidate metadata when blind marking is enabled server-side only.
- Add drf-spectacular / OpenAPI docs for grading endpoints.

## Assumptions / Limitations

- Staff access is verified via existing `AdminRoute` (branding API probe).
- Combined result may not exist until after first aggregation; detail page handles 404 gracefully.
- Grading sidebar label is hardcoded (not yet in content/i18n system).
