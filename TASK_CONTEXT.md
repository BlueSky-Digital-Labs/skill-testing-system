# Task Context: Preview / Practice Emulation (Backend + Frontend)

**Branch:** `sunset/task/feat-4731d8a8`  
**PR:** https://github.com/BlueSky-Digital-Labs/skill-testing-system/pull/24

## Scope

End-to-end preview/practice emulation for examiners and test authors: walk through a test with shuffle, validation, and mocked scoring without persisting attempts or grades.

### Backend (completed)

- Preview API under `/api/preview/tests/{test_id}/`
- Service layer in `delivery/services/preview.py`
- Examiner / system-admin authorization
- Deterministic shuffle via optional `seed`
- In-memory session state (Django cache, 1-hour TTL)
- Pytest coverage for API and service layers

### Frontend (this change)

- Preview runner page at `/tests/:id/preview`
- API client in `frontend/src/api/tests.ts`
- Preview components under `frontend/src/components/preview/`
- `PreviewLauncher` entry point on `TestDetailPage`
- Vitest coverage for API, components, and page

### Out of scope

- Persisting preview sessions or scores
- Dedicated `TEST_AUTHOR` role (mapped to `EXAMINER` + `SYSTEM_ADMIN`)
- Standalone `Test` model (tests identified by UUID + question `metadata.test_id`)

## Key Implementation Decisions

### Backend

1. **Extend existing `delivery` app** — preview routes in `preview_urls.py`.
2. **Session storage** — Django cache keyed by `delivery:preview:{user_id}:{test_id}`.
3. **Scoring** — Reuses `grading.services` objective scorers.

### Frontend

1. **Mirror candidate runner UX** — Reuses `runner.css` with preview-specific modifiers; dedicated preview components for header/footer behavior.
2. **Timer default** — Backend preview payload has no `remaining_seconds`; frontend defaults to 3600s and auto-finishes on expiry.
3. **Route guard** — `withExaminerGuard` on `/tests/:id/preview`.
4. **Answer validation** — Explicit "Validate answer" button calls `/answer/`; finish shows inline summary (no navigation to results).
5. **Keyboard navigation** — Arrow keys and `n`/`p` for next/previous when `question_per_page` is enabled.
6. **Error states** — 403/404 show friendly placeholder with back link; other failures show preview API unavailable message.

## Endpoint Contracts

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/preview/tests/{test_id}/start/` | Examiner/Admin | `{ seed?: number }` | Preview attempt payload with `preview: true` |
| POST | `/api/preview/tests/{test_id}/answer/` | Examiner/Admin | `{ question_id, answer }` | `{ accepted, server_ts, validation, partial_score }` |
| POST | `/api/preview/tests/{test_id}/finish/` | Examiner/Admin | — | `{ preview: true, total_auto_score, per_question }` |

## Files Changed

### Backend

| File | Why |
|------|-----|
| `backend/src/delivery/permissions.py` | `IsExaminerOrAuthor` permission class |
| `backend/src/delivery/services/preview.py` | Preview session, validation, and scoring logic |
| `backend/src/delivery/preview_views.py` | DRF views for start / answer / finish |
| `backend/src/delivery/preview_urls.py` | URL routing for `/api/preview/` |
| `backend/src/delivery/serializers.py` | Preview request serializers |
| `backend/src/core/urls.py` | Mount preview routes |
| `backend/src/delivery/tests/test_preview_*.py` | API and service tests |

### Frontend

| File | Why |
|------|-----|
| `frontend/src/api/tests.ts` | `startPreview`, `sendPreviewAnswer`, `finishPreview` |
| `frontend/src/api/tests.test.ts` | API client tests |
| `frontend/src/components/preview/*` | Header, question, navigator, footer, launcher, summary, hook |
| `frontend/src/pages/tests/[id]/preview.tsx` | Preview runner page |
| `frontend/src/pages/tests/__tests__/PreviewRunner.test.tsx` | Page integration tests |
| `frontend/src/pages/tests/TestDetailPage.tsx` | Preview launcher entry point |
| `frontend/src/App.tsx` | Route registration with examiner guard |

## Verification

```bash
# Backend
cd backend
SECRET_KEY=test-secret PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test \
  python3 -m pytest src/delivery/tests/ -v

# Frontend
cd frontend && npm test && npm run lint && npm run build
```

## Open Questions / Follow-ups

- Should coordinators also preview tests they manage?
- Add audit `log_action` entries for preview of unreleased tests?
- Introduce a first-class `Test` model to replace UUID + metadata tagging?
- Pass `remaining_seconds` from backend preview start payload for assignment-aligned timers?
