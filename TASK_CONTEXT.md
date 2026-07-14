# Task Context: Author-only Preview / Practice Emulation (Backend)

**Branch:** `sunset/task/feat-4731d8a8`  
**PR:** _(to be created)_

## Scope

Add non-persistent preview/practice endpoints so examiners and test authors can walk through a test (shuffle, answer validation, mocked scoring) without creating `Attempt` records or persisting scores.

### In scope

- Preview API under `/api/preview/tests/{test_id}/`
- Service layer in `delivery/services/preview.py`
- Examiner / system-admin authorization
- Deterministic shuffle via optional `seed`
- In-memory session state (Django cache, 1-hour TTL)
- Structured logging for preview start / answer / finish
- Pytest coverage for API and service layers

### Out of scope

- Frontend preview UI
- Persisting preview sessions or scores
- Dedicated `TEST_AUTHOR` role (mapped to `EXAMINER` + `SYSTEM_ADMIN`)
- Standalone `Test` model (tests identified by UUID + question `metadata.test_id`)

## Key Implementation Decisions

1. **Extend existing `delivery` app** — The app was already registered in `INSTALLED_APPS`; preview routes live in `preview_urls.py` to keep attempt delivery separate.
2. **Session storage** — Django cache keyed by `delivery:preview:{user_id}:{test_id}`; one active preview per user/test pair; cleared on finish.
3. **Permissions** — `IsExaminerOrAuthor` (`EXAMINER`, `SYSTEM_ADMIN`) via `delivery/permissions.py`.
4. **Test configuration** — Shuffle flags read from the most recent `Assignment` for the `test_id`, defaulting to shuffle both when none exists.
5. **Question resolution** — Strict lookup by `metadata.test_id`; 404 when no tagged questions (no fallback to all questions).
6. **Scoring** — Reuses `grading.services` objective scorers; `FREE_TEXT` returns zero auto-score with `requires_manual_grading: true`.
7. **Answer shapes** — Accepts both raw values and structured objects (e.g. `'A'` or `{'selected_option': 'A'}`).

## Endpoint Contracts

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/preview/tests/{test_id}/start/` | Examiner/Admin | `{ seed?: number }` | Preview attempt payload with `preview: true` |
| POST | `/api/preview/tests/{test_id}/answer/` | Examiner/Admin | `{ question_id, answer }` | `{ accepted, server_ts, validation, partial_score }` |
| POST | `/api/preview/tests/{test_id}/finish/` | Examiner/Admin | — | `{ preview: true, total_auto_score, per_question }` |

### Error codes

- `404` — test has no questions
- `403` — caller lacks examiner/admin role
- `400` — invalid input, missing session, or validation failure

## Files Changed

| File | Why |
|------|-----|
| `backend/src/delivery/permissions.py` | `IsExaminerOrAuthor` permission class |
| `backend/src/delivery/services/preview.py` | Preview session, validation, and scoring logic |
| `backend/src/delivery/preview_views.py` | DRF views for start / answer / finish |
| `backend/src/delivery/preview_urls.py` | URL routing for `/api/preview/` |
| `backend/src/delivery/serializers.py` | `PreviewStartSerializer`, `PreviewAnswerSerializer` |
| `backend/src/core/urls.py` | Mount `delivery.preview_urls` at `api/preview/` |
| `backend/src/core/settings/base.py` | OpenAPI `Preview` tag |
| `backend/src/delivery/tests/test_preview_api.py` | API integration tests |
| `backend/src/delivery/tests/test_preview_service.py` | Service unit tests |

## Verification

```bash
cd backend
SECRET_KEY=test-secret PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test \
  python3 -m pytest src/delivery/tests/ -v

python3 -m flake8 src/delivery/permissions.py src/delivery/preview_views.py \
  src/delivery/preview_urls.py src/delivery/serializers.py \
  src/delivery/services/preview.py src/delivery/tests/test_preview_api.py \
  src/delivery/tests/test_preview_service.py
```

## Open Questions / Follow-ups

- Should coordinators also preview tests they manage?
- Add audit `log_action` entries for preview of unreleased tests?
- Introduce a first-class `Test` model to replace UUID + metadata tagging?
