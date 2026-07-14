# Task Context: Results Release Gates & Candidate Visibility (Backend)

**Branch:** `sunset/task/feat-1b924124`  
**PR:** _(pending)_

## Scope

Backend support for **results release gates** and **candidate visibility enforcement** (FR-14, FR-26). Staff/examiners control when attempt results are released to candidates and at what disclosure level; candidates only see their own released results.

### In scope
- New `results` Django app with `ReleaseControl` model
- Service helpers: `mark_release`, `get_candidate_view`, `get_release_status`
- REST endpoints under `/api/results/`
- Integration with `grading.models.CombinedResult` (aggregate scores) and `grading.models.ObjectiveScore` (item correctness)
- Pytest coverage for release workflow and candidate visibility rules

### Out of scope
- Frontend results UI
- Automatic release on grading completion
- Audit log entries for release actions

## Key Implementation Decisions

1. **App style**: Follows the `grading` app pattern — plain Django `View` + `JsonResponse`, JWT auth decorators, Django `Form` validation in `schemas.py`.
2. **Permissions**:
   - `POST /api/results/release/` and `GET /api/results/status/<attempt_id>/` require staff (`require_staff_or_examiner`, matching grading).
   - `GET /api/results/candidate/<attempt_id>/` requires authentication; candidates may only view their own attempts; staff see full unreleased data.
3. **Disclosure levels** (`DisclosureLevel`):
   - `none` — withheld (default when unreleased)
   - `summary` — `CombinedResult` aggregates (pass/fail, totals, by-topic)
   - `detailed` — summary plus per-item `ObjectiveScore` correctness
4. **Release lifecycle**: `mark_release` creates a `ReleaseControl` on first release if `CombinedResult` exists and `candidate_user_id` is provided; revoking release resets `disclosure` to `none` and clears `released_at`.
5. **Candidate visibility**: Unreleased attempts return `status: withheld` with no score payload; staff always receive `visibility: full` including unreleased attempts.

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/results/release/` | POST | Staff | Set release state (`attempt_id`, `released`, optional `disclosure`, `candidate_user_id`, `test_id`) |
| `/api/results/status/<attempt_id>/` | GET | Staff | Return `ReleaseControl` record |
| `/api/results/candidate/<attempt_id>/` | GET | Authenticated | Candidate-scoped results per disclosure rules; staff see full view |

## Files Changed

| File | Why |
|------|-----|
| `backend/src/results/__init__.py` | App package |
| `backend/src/results/apps.py` | `ResultsConfig` |
| `backend/src/results/models.py` | `ReleaseControl`, `DisclosureLevel` |
| `backend/src/results/migrations/0001_initial.py` | Initial schema |
| `backend/src/results/auth.py` | JWT auth decorators |
| `backend/src/results/schemas.py` | `ReleaseForm` validation |
| `backend/src/results/services.py` | `mark_release`, `get_candidate_view`, grading integration |
| `backend/src/results/views.py` | HTTP endpoints |
| `backend/src/results/urls.py` | Route definitions |
| `backend/src/results/tests/test_release.py` | Release service + API tests |
| `backend/src/results/tests/test_candidate_visibility.py` | Visibility rules + candidate API tests |
| `backend/src/core/settings/base.py` | Register `results` app; OpenAPI tag |
| `backend/src/core/urls.py` | Include `/api/results/` routes |

## Verification

```bash
cd backend
pip install -r requirements.txt
pip install flake8 black  # dev lint tools
PYTHONPATH=src SECRET_KEY=test-secret-key DJANGO_SETTINGS_MODULE=core.settings.test \
  python3 -m pytest src/ -v
flake8 src/results/
black --check src/results/
```

Results: **173** backend tests passed (23 new in `results`); flake8/black clean on `src/results/`.

## Open Questions / Follow-ups

- Emit audit log events when results are released or revoked
- Tie `candidate_user_id` to assignment/attempt ownership automatically
- Support coordinator role in addition to staff for release actions
- Frontend API client and examiner UI for release management
