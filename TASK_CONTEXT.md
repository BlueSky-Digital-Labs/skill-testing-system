# Task Context: Backend Auto-Scoring Engine (feat-24624271)

## Scope

Implement a Django `grading` app that provides deterministic, side-effect-free scoring services and staff-protected HTTP endpoints for objective question types:

- Multiple choice (MCQ)
- True/false
- Fill in the blank (FIB)
- Multi-select

Persist each scoring result as an `ObjectiveScore` and support optional `ScoringPolicy` rules for partial credit and negative marking.

## Key Implementation Decisions

1. **App location**: `backend/src/grading/` registered as `grading.apps.GradingConfig` in `core/settings/base.py` (project uses modular settings, not `backend/src/settings.py`).
2. **URL routing**: Endpoints mounted at `/api/grading/` via `core/urls.py`.
3. **Scoring services**: Pure functions in `services.py` with no database access; views persist results after scoring.
4. **Validation**: Django `forms.Form` classes in `schemas.py` for request payload validation.
5. **Authentication**: `@require_staff_or_examiner` decorator authenticates JWT (SimpleJWT) then requires `is_staff=True`.
6. **Views**: Django class-based views (`View`) with JSON request/response; CSRF exempt for API usage.
7. **FIB normalization**: Trim, casefold, and collapse internal whitespace before comparison.
8. **Multi-select partial credit**: When `partial_credit=True` and `per_option_value > 0`, award per correctly selected option; subtract for incorrect selections when `negative_marking=True`; clamp to `[0, max_points]` or `[-max_points, max_points]`.

## Files Changed

| File | Why |
|------|-----|
| `backend/src/grading/` | New app: models, services, schemas, auth, views, urls, admin, tests, migrations |
| `backend/src/core/settings/base.py` | Register `GradingConfig`; add OpenAPI tag |
| `backend/src/core/urls.py` | Include `grading.urls` at `/api/grading/` |
| `backend/README.md` | Document grading endpoints and example payloads |

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/grading/mcq/` | POST | JWT (staff) | Score multiple-choice question |
| `/api/grading/true-false/` | POST | JWT (staff) | Score true/false question |
| `/api/grading/fib/` | POST | JWT (staff) | Score fill-in-the-blank question |
| `/api/grading/multi-select/` | POST | JWT (staff) | Score multi-select question |

## Verification

```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test SECRET_KEY=test-secret \
  python3 manage.py test grading authentication branding
```

## Open Questions / Follow-ups

- Add dedicated examiner role/permission beyond `is_staff` if product requires finer-grained access.
- Expose scoring policies via CRUD API for admin configuration.
- Register grading views with drf-spectacular for Swagger documentation.
- Batch scoring endpoint for scoring an entire attempt in one request.

## Assumptions / Limitations

- `attempt_id` and `question_id` are opaque string identifiers (not FKs to other apps yet).
- Invalid or missing `scoring_policy_id` is treated as no policy (default scoring rules).
- Grading endpoints are write-only; no list/retrieve API for historical scores in this iteration.
