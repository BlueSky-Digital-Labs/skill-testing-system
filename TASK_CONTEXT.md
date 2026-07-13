# Task Context: Backend Grading (feat-24624271)

## Scope

### Phase 1 — Objective auto-scoring (completed)
- Deterministic scoring services for MCQ, true/false, FIB, and multi-select
- Staff-protected auto-scoring endpoints persisting `ObjectiveScore` records
- Optional `ScoringPolicy` for partial credit and negative marking

### Phase 2 — Manual grading and combined aggregation (this iteration, FR-24 / FR-25)
- Free-text manual grading queue (`FreeTextQueueItem`, `ManualGrade`)
- Combined attempt results (`CombinedResult`) aggregating objective + manual scores
- Test pass/fail configuration proxy (`TestConfigSnapshot`)
- Staff-protected queue, grading, aggregation, and result retrieval APIs
- Blind marking support masking `candidate_display` in responses

## Key Implementation Decisions

1. **App location**: `backend/src/grading/` registered as `grading.apps.GradingConfig` in `core/settings/base.py`.
2. **URL routing**: All grading endpoints mounted at `/api/grading/` via `core/urls.py`.
3. **Objective scoring**: Pure functions in `services.py`; views persist `ObjectiveScore` after scoring.
4. **Manual grading**: `FreeTextQueueItem` tracks queue state (`queued` / `graded`); `ManualGrade` is a one-to-one grade record linked to the queue item.
5. **Aggregation**: `compile_attempt_scores(attempt_id)` in `aggregates.py` sums `ObjectiveScore` and `ManualGrade` data, groups by topic, and evaluates pass/fail from `TestConfigSnapshot`.
6. **Test config**: `TestConfigSnapshot` in `config.py` stores `passing_score` with `pass_type` of `absolute` or `percent`.
7. **Blind marking**: When `blind_marking=True`, API serializers return `candidate_display: null` (identity stored but not exposed).
8. **Authentication**: `@require_staff_or_examiner` authenticates JWT (SimpleJWT) then requires `is_staff=True`.
9. **Topic grouping**: Objective scores use `detail.topic` when present, otherwise `"objective"`; manual grades use `FreeTextQueueItem.topic`.

## Files Changed

| File | Why |
|------|-----|
| `backend/src/grading/models.py` | Added `FreeTextQueueItem`, `ManualGrade`, `CombinedResult` |
| `backend/src/grading/config.py` | Added `TestConfigSnapshot` pass/fail configuration model |
| `backend/src/grading/aggregates.py` | `compile_attempt_scores` aggregation logic |
| `backend/src/grading/schemas.py` | Forms for queue, manual grade, and aggregate endpoints |
| `backend/src/grading/views.py` | Queue, grade, aggregate, and result views |
| `backend/src/grading/urls.py` | Wired new endpoints |
| `backend/src/grading/admin.py` | Admin registration for new models |
| `backend/src/grading/migrations/0002_*.py` | Schema migration for new models |
| `backend/src/grading/tests/test_manual_queue.py` | End-to-end manual grading flow tests |
| `backend/src/grading/tests/test_aggregate.py` | Aggregation and pass/fail tests |
| `backend/README.md` | Documented manual grading and aggregation endpoints |

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/grading/mcq/` | POST | JWT (staff) | Score multiple-choice question |
| `/api/grading/true-false/` | POST | JWT (staff) | Score true/false question |
| `/api/grading/fib/` | POST | JWT (staff) | Score fill-in-the-blank question |
| `/api/grading/multi-select/` | POST | JWT (staff) | Score multi-select question |
| `/api/grading/queue/enqueue-free-text/` | POST | JWT (staff) | Enqueue free-text response |
| `/api/grading/queue/list/` | GET | JWT (staff) | List queue items (filterable) |
| `/api/grading/grade/` | POST | JWT (staff) | Submit manual grade |
| `/api/grading/aggregate/attempt/` | POST | JWT (staff) | Aggregate and persist combined result |
| `/api/grading/result/<attempt_id>/` | GET | JWT (staff) | Retrieve combined result |

## Verification

```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test SECRET_KEY=test-secret \
  python3 manage.py test grading authentication branding
```

All 57 backend tests pass (34 grading + 23 authentication/branding).

## Open Questions / Follow-ups

- Add dedicated examiner role/permission beyond `is_staff`.
- CRUD API for `TestConfigSnapshot` and `ScoringPolicy` management.
- Register grading views with drf-spectacular for Swagger documentation.
- Add `test_id` field to `ObjectiveScore` to avoid inference for objective-only attempts.
- Batch enqueue and batch aggregate endpoints.

## Assumptions / Limitations

- `attempt_id`, `test_id`, and `question_id` are opaque string identifiers (not FKs to other apps yet).
- `test_id` for aggregation is inferred from queue items / existing `CombinedResult`, or supplied in aggregate request body.
- Pass/fail requires a matching `TestConfigSnapshot`; attempts without config evaluate as not passed.
- Manual grade cannot exceed queue item `max_points`; each queue item can only be graded once.
