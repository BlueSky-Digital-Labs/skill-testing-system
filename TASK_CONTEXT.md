# Task Context: Backend Test Assembly APIs

**Branch:** `sunset/task/feat-26133733`  
**PR:** _(pending)_

## Scope

Implement a new Django `tests` app for test assembly: models, REST APIs, publish/archive workflows, selection rules, admin registration, and integration with question version snapshots.

### In scope (completed)
- `tests` app with models: `Test`, `TestSection`, `TestQuestionLink`, `SelectionRule`, `TestShuffleSeed`
- Lifecycle states: Draft, Published, Archived
- API endpoints under `/api/tests/` (create, retrieve, patch, publish, archive)
- Publish flow snapshots questions via `question_bank.services.versioning.snapshot_questions_by_id`
- Selection rule evaluation at publish time
- Django admin with read-only enforcement for published/archived tests
- `is_in_published_test` signal guard wired to published test links
- Pytest coverage in `tests/tests/test_publish.py` and `tests/tests/test_rules.py`

### Out of scope / deferred
- Frontend `TestDetailPage` API integration
- `Assignment.test_id` ForeignKey migration to `Test`
- List/filter endpoints for tests
- Per-attempt shuffle seed generation

## Key Implementation Decisions

1. **Function-based DRF views** in `tests/views.py` per ticket spec; nested section/question payloads on create/patch.
2. **`settings` JSONField** on `Test` stores shuffle and scoring options; `django.conf.settings` imported as `django_settings` to avoid name shadowing.
3. **Rule resolution at publish**: `SelectionRule` rows stay editable in draft; publish creates `TestQuestionLink` rows with `source=rule` and pins `QuestionVersion`.
4. **Cross-app versioning helper**: added `snapshot_questions_by_id()` in `question_bank/services/versioning.py` for publish flows.
5. **Admin lock mixin**: `ReadOnlyWhenPublishedMixin` blocks add/change/delete when lifecycle is not draft.
6. **Permissions**: examiner or system admin for mutations; authenticated read for test detail.

## Files Changed

| File | Why |
|------|-----|
| `backend/src/tests/` (new app) | Models, views, urls, admin, services, migrations, tests |
| `backend/src/core/settings/base.py` | Register `tests` app; OpenAPI tag |
| `backend/src/core/urls.py` | Mount `/api/tests/` |
| `backend/src/question_bank/services/versioning.py` | `snapshot_questions_by_id` helper |
| `backend/src/question_bank/signals.py` | Real `is_in_published_test` implementation |

## Verification

```bash
cd backend
pip install -r requirements.txt
SECRET_KEY=test-secret DJANGO_SETTINGS_MODULE=core.settings.test PYTHONPATH=src python3 -m pytest src/ -v
/home/ubuntu/.local/bin/flake8 src/tests src/question_bank/services/versioning.py src/question_bank/signals.py
```

Results: **228** backend tests passed (12 new).

## Open Questions / Follow-ups

- Add test list endpoint and filters for examiner dashboards
- Migrate `Assignment.test_id` to FK `Test`
- Auto-generate per-attempt shuffle seeds when attempts are created
- Expose pinned version metadata on question bank serializer for authoring UI
