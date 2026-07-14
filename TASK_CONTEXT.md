# Task Context: Question Bank Backend Service

**Branch:** `sunset/task/feat-fa5cce9f`

## Scope

Implement a Django REST API for managing a **question bank** with support for multiple question types (MCQ, multi-select, true/false, fill-in-the-blank, free text), nested options/answer keys, image uploads, filtering, and role-based write permissions.

### In scope
- New `question_bank` Django app under `backend/src/`
- Models: `Question`, `Option`, `BlankAnswerKey` with `QuestionType` and `Difficulty` enums
- Type-aware serializer validation and model `clean()` checks
- `IsExaminerOrAdmin` permission for create/update/delete/image upload
- `QuestionViewSet` CRUD at `/api/question-bank/questions/`
- Custom `upload-image` action for question images
- Django admin registration with filters
- Initial migration and pytest coverage

### Out of scope
- Frontend question bank UI
- Integration with grading auto-scoring (grading app still uses external question IDs)
- Question versioning or publishing workflow

## Key Implementation Decisions

1. **Permissions**: Authenticated users may list/retrieve questions; only `EXAMINER` or `SYSTEM_ADMIN` roles may create, update, delete, or upload images (`IsExaminerOrAdmin`).
2. **Validation split**: Serializer validates nested payloads on create/update; `Question.clean()` re-validates persisted structure after nested rows are replaced.
3. **Nested writes**: Create/update replace all `options` and `blank_answer_keys` atomically via serializer helpers (delete-and-recreate pattern).
4. **Filtering**: Query params `subject`, `topic`, `difficulty`, and `type` on list endpoint (manual queryset filtering, no django-filter dependency).
5. **Media**: Reused existing `MEDIA_URL` / `MEDIA_ROOT` settings; dev static serving already enabled in `core/urls.py` when `DEBUG=True`.
6. **IDs**: UUID primary keys for all question bank entities.

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/question-bank/questions/` | GET | Authenticated | List questions (filterable) |
| `/api/question-bank/questions/` | POST | Examiner or system admin | Create question |
| `/api/question-bank/questions/{id}/` | GET | Authenticated | Retrieve question |
| `/api/question-bank/questions/{id}/` | PATCH | Examiner or system admin | Partial update |
| `/api/question-bank/questions/{id}/` | DELETE | Examiner or system admin | Delete question |
| `/api/question-bank/questions/{id}/upload-image/` | POST | Examiner or system admin | Upload question image |

## Type Validation Rules

| Type | Options | Blank Answer Keys |
|------|---------|-------------------|
| `MCQ` | ≥2 options, exactly 1 correct | none |
| `MULTI_SELECT` | ≥2 options, ≥1 correct | none |
| `TRUE_FALSE` | exactly 2 options, 1 correct | none |
| `FILL_IN_BLANK` | none | ≥1 accepted answer |
| `FREE_TEXT` | none | none |

## Files Changed

| File | Why |
|------|-----|
| `backend/src/question_bank/__init__.py` | Package init |
| `backend/src/question_bank/apps.py` | `QuestionBankConfig` app config |
| `backend/src/question_bank/models.py` | Core models, enums, constraints |
| `backend/src/question_bank/migrations/0001_initial.py` | Initial schema migration |
| `backend/src/question_bank/serializers.py` | Nested serializers + type validation |
| `backend/src/question_bank/permissions.py` | `IsExaminerOrAdmin` |
| `backend/src/question_bank/views.py` | `QuestionViewSet` + image upload |
| `backend/src/question_bank/urls.py` | Router for `/questions/` |
| `backend/src/question_bank/admin.py` | Admin registration + filters |
| `backend/src/question_bank/tests/test_question_api.py` | API tests (CRUD, validation, filtering, permissions, upload) |
| `backend/src/core/settings/base.py` | Register app + OpenAPI tag |
| `backend/src/core/urls.py` | Include question bank URLs |

## Verification

```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=src SECRET_KEY=test-secret-key DJANGO_SETTINGS_MODULE=core.settings.test \
  python3 -m pytest src/ -v
```

Result: **150 passed** (18 new question bank tests).

## Open Questions / Follow-ups

- Link question bank IDs to grading/scoring flows instead of opaque string `question_id`
- Question versioning and draft/published states
- Bulk import/export (CSV/QTI)
- Server-side text search on question body
