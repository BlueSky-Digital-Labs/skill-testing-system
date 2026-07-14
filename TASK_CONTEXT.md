# Task Context: Attempt Review Disclosure API

**Branch:** `sunset/task/feat-00916970`  
**PR:** _(pending)_

## Scope

Backend **attempt review** endpoint with disclosure policies that control what score and feedback data candidates see after completing an attempt.

### In scope
- `DisclosureMode` policy enum (`SCORE_ONLY`, `SCORE_AND_FEEDBACK`, `WITHHOLD_UNTIL_RELEASE`)
- `evaluate_disclosure` and `filter_attempt_payload` helpers
- `GET /api/attempts/{id}/review/` DRF view with owner/staff permissions
- Serializer adapter assembling attempt review payloads from grading data
- Unit tests for disclosure modes and API integration tests

### Out of scope
- Dedicated `Attempt` Django model (serializer includes TODO for future import)
- Frontend consumer for the review endpoint
- Audit logging on review access

## Key Implementation Decisions

1. **Attempt record source**: `ReleaseControl` is the authoritative record for attempt ownership, release state, and disclosure level until a dedicated Attempt model exists.
2. **Disclosure mapping**: `ReleaseControl.disclosure` maps to review modes — `summary` → `SCORE_ONLY`, `detailed` → `SCORE_AND_FEEDBACK`; unreleased attempts always return `WITHHOLD_UNTIL_RELEASE`.
3. **Payload assembly**: `serialize_attempt_for_review` builds payloads from `CombinedResult`, `ObjectiveScore`, and `FreeTextQueueItem`/`ManualGrade` data.
4. **Permissions**: `IsAttemptOwnerOrStaff` allows attempt owners plus Django staff and coordinator/system-admin roles.
5. **Filtering**: `filter_attempt_payload` strips `summary`/`items` when withheld and removes per-item `feedback` in `SCORE_ONLY` mode.

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/attempts/<attempt_id>/review/` | GET | Owner or staff | Filtered attempt review payload |

## Files Changed

| File | Why |
|------|-----|
| `backend/src/results/view_policies/__init__.py` | Package exports |
| `backend/src/results/view_policies/policies.py` | Disclosure mode logic and payload filtering |
| `backend/src/results/serializers/__init__.py` | Package exports |
| `backend/src/results/serializers/attempt_review.py` | Attempt review payload serializer |
| `backend/src/results/tests/test_view_policies.py` | Unit tests for disclosure policies |
| `backend/src/core/permissions/attempt_permissions.py` | `IsAttemptOwnerOrStaff` permission |
| `backend/src/core/views/attempt_review.py` | DRF review endpoint |
| `backend/src/core/tests/test_attempt_review_api.py` | API integration tests |
| `backend/src/core/urls.py` | Route registration |

## Verification

```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=src SECRET_KEY=test-secret-key DJANGO_SETTINGS_MODULE=core.settings.test \
  python3 -m pytest src/ -v

python3 -m flake8 \
  src/results/view_policies/ \
  src/results/serializers/ \
  src/results/tests/test_view_policies.py \
  src/core/views/attempt_review.py \
  src/core/permissions/attempt_permissions.py \
  src/core/tests/test_attempt_review_api.py
```

Results: **187** backend tests passed; flake8 clean on changed files.

## Open Questions / Follow-ups

- Introduce a first-class `Attempt` model and replace `ReleaseControl`-based record lookup
- Decide whether staff should bypass disclosure filtering on unreleased attempts (currently they receive withheld payloads)
- Add audit logging when candidates view attempt reviews
- Expose review endpoint in frontend candidate results flow
