# Task Context: Attempt Review Disclosure (Backend + Frontend)

**Branch:** `sunset/task/feat-00916970`  
**PR:** https://github.com/BlueSky-Digital-Labs/skill-testing-system/pull/14

## Scope

End-to-end **attempt review disclosure** for candidates after test completion (Task #14).

### Backend (completed)
- `DisclosureMode` policy enum (`SCORE_ONLY`, `SCORE_AND_FEEDBACK`, `WITHHOLD_UNTIL_RELEASE`)
- `evaluate_disclosure` and `filter_attempt_payload` helpers
- `GET /api/attempts/{id}/review/` DRF view with owner/staff permissions
- Serializer adapter assembling attempt review payloads from grading data
- Unit and API integration tests

### Frontend (this ticket)
- `AttemptCompletionPage` at `/attempts/:attemptId/complete`
- `getAttemptReview` API client mapping backend `disclosure_mode` → `disclosure`
- `ScoreSummary` and `QuestionReviewList` presentation components
- Disclosure-aware UI for withheld, score-only, and score-and-feedback modes
- Vitest coverage for all three disclosure modes and incomplete-attempt errors

### Out of scope
- Dedicated `Attempt` Django model (serializer includes TODO for future import)
- Test runner submission → completion navigation (TODO left in `Completion.tsx`)
- Audit logging on review access

## Key Implementation Decisions

### Backend
1. **Attempt record source**: `ReleaseControl` is the authoritative record for attempt ownership, release state, and disclosure level until a dedicated Attempt model exists.
2. **Disclosure mapping**: `ReleaseControl.disclosure` maps to review modes — `summary` → `SCORE_ONLY`, `detailed` → `SCORE_AND_FEEDBACK`; unreleased attempts always return `WITHHOLD_UNTIL_RELEASE`.
3. **Payload assembly**: `serialize_attempt_for_review` builds payloads from `CombinedResult`, `ObjectiveScore`, and `FreeTextQueueItem`/`ManualGrade` data.
4. **Permissions**: `IsAttemptOwnerOrStaff` allows attempt owners plus Django staff and coordinator/system-admin roles.
5. **Filtering**: `filter_attempt_payload` strips `summary`/`items` when withheld and removes per-item `feedback` in `SCORE_ONLY` mode.

### Frontend
1. **API normalization**: `getAttemptReview` exposes a `disclosure` field, mapping the backend's `disclosure_mode` response key.
2. **Route guard**: `ProtectedRoute` wraps the completion page (authenticated candidates only).
3. **WITHHOLD_UNTIL_RELEASE**: Shows "Results will be available once released"; hides score summary and question list.
4. **SCORE_ONLY**: Renders `ScoreSummary` and `QuestionReviewList` without correctness or feedback columns.
5. **SCORE_AND_FEEDBACK**: Renders full question table with correctness badges and grader feedback.
6. **Incomplete attempts**: HTTP 400/409 responses show a "Not available yet" panel (test runner redirect deferred).

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/attempts/<attempt_id>/review/` | GET | Owner or staff | Filtered attempt review payload |

## Frontend Routes

| Route | Component | Guard |
|-------|-----------|-------|
| `/attempts/:attemptId/complete` | `AttemptCompletionPage` | `ProtectedRoute` (authenticated) |

## Files Changed

### Backend
| File | Why |
|------|-----|
| `backend/src/results/view_policies/**` | Disclosure mode logic and payload filtering |
| `backend/src/results/serializers/attempt_review.py` | Attempt review payload serializer |
| `backend/src/results/tests/test_view_policies.py` | Unit tests for disclosure policies |
| `backend/src/core/permissions/attempt_permissions.py` | `IsAttemptOwnerOrStaff` permission |
| `backend/src/core/views/attempt_review.py` | DRF review endpoint |
| `backend/src/core/tests/test_attempt_review_api.py` | API integration tests |
| `backend/src/core/urls.py` | Route registration |

### Frontend
| File | Why |
|------|-----|
| `frontend/src/pages/attempts/api.ts` | `getAttemptReview` client and types |
| `frontend/src/pages/attempts/Completion.tsx` | Main completion page with disclosure logic |
| `frontend/src/pages/attempts/components/ScoreSummary.tsx` | Score and pass/fail display |
| `frontend/src/pages/attempts/components/QuestionReviewList.tsx` | Mode-aware question table |
| `frontend/src/pages/attempts/attempts.css` | Page styles |
| `frontend/src/pages/attempts/index.ts` | Barrel export |
| `frontend/src/pages/attempts/__tests__/Completion.test.tsx` | Component tests for all modes |
| `frontend/src/pages/attempts/__tests__/api.test.ts` | API client normalization test |
| `frontend/src/App.tsx` | Route registration |

## Verification

```bash
# Backend
cd backend
pip install -r requirements.txt
PYTHONPATH=src SECRET_KEY=test-secret-key DJANGO_SETTINGS_MODULE=core.settings.test \
  python3 -m pytest src/ -v

# Frontend
cd frontend
npm ci
npm test
npm run lint
npm run build
```

Results: **187** backend tests passed; **124** frontend tests passed; build succeeds.

## Open Questions / Follow-ups

- Introduce a first-class `Attempt` model and replace `ReleaseControl`-based record lookup
- Wire test runner submission to navigate to `/attempts/:attemptId/complete`
- Decide whether staff should bypass disclosure filtering on unreleased attempts (currently they receive withheld payloads)
- Add audit logging when candidates view attempt reviews
