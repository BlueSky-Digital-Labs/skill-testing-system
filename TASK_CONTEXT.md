# Task Context: Question Bank (Backend + Frontend)

**Branch:** `sunset/task/feat-fa5cce9f`  
**PR:** https://github.com/BlueSky-Digital-Labs/skill-testing-system/pull/12

## Scope

End-to-end **Question Bank** for examiners/system admins to author and manage assessment questions with type-specific validation and optional image uploads.

### Backend (completed)
- `question_bank` Django app with `Question`, `Option`, `BlankAnswerKey` models
- REST API at `/api/question-bank/questions/` with filtering and image upload
- `IsExaminerOrAdmin` write permissions; authenticated read access
- Django admin, initial migration, pytest coverage (18 tests)

### Frontend (this ticket)
- API client (`frontend/src/api/questionBank.ts`)
- Types (`frontend/src/types/questionBank.ts`)
- Examiner-guarded routes: `/questions`, `/questions/new`, `/questions/:id/edit`
- `QuestionsList` with server-side filters + client-side search
- `QuestionEditor` with nested type-specific editors, image preview/upload, unsaved-change protection
- Sidebar navigation for examiner/system-admin users
- Vitest coverage for API client, utils, and pages

### Out of scope
- Wiring question bank IDs into grading auto-scoring flows
- Question versioning / publish workflow
- Bulk import/export

## Key Implementation Decisions

### Backend
1. **Permissions**: Authenticated list/retrieve; `EXAMINER` or `SYSTEM_ADMIN` for writes/image upload.
2. **Validation**: Serializer + model `clean()` after nested replace-on-write.
3. **Filtering**: Query params `subject`, `topic`, `difficulty`, `type`.

### Frontend
1. **Access control**: `withExaminerGuard` + `useExaminerAccess` probe via `checkExaminerAccess()` (POST validation probe) and `checkSystemAdminAccess()`.
2. **API mapping**: Client uses camelCase helpers; payloads serialized to snake_case for Django (`blank_answer_keys`, `is_correct`).
3. **Image flow**: Create/update question first, then `uploadQuestionImage` when a file is selected.
4. **Filters**: Server filters applied on submit; text search filters current page client-side (matches groups list pattern).
5. **Unsaved changes**: `useBlocker` + `beforeunload` in editor; mocked in tests.
6. **Validation**: Shared `utils/questionBank.ts` mirrors backend type rules; Save disabled until valid.

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/question-bank/questions/` | GET | Authenticated | List questions (filterable) |
| `/api/question-bank/questions/` | POST | Examiner or system admin | Create question |
| `/api/question-bank/questions/{id}/` | GET | Authenticated | Retrieve question |
| `/api/question-bank/questions/{id}/` | PATCH | Examiner or system admin | Partial update |
| `/api/question-bank/questions/{id}/` | DELETE | Examiner or system admin | Delete question |
| `/api/question-bank/questions/{id}/upload-image/` | POST | Examiner or system admin | Upload image |

## Frontend Routes

| Route | Component | Guard |
|-------|-----------|-------|
| `/questions` | `QuestionsList` | `withExaminerGuard` |
| `/questions/new` | `QuestionEditor` | `withExaminerGuard` |
| `/questions/:id/edit` | `QuestionEditor` | `withExaminerGuard` |

## Files Changed

### Backend
| File | Why |
|------|-----|
| `backend/src/question_bank/**` | Models, API, admin, tests |
| `backend/src/core/settings/base.py` | App registration |
| `backend/src/core/urls.py` | URL include |

### Frontend
| File | Why |
|------|-----|
| `frontend/src/types/questionBank.ts` | Domain types and labels |
| `frontend/src/api/questionBank.ts` | Question bank API client |
| `frontend/src/api/questionBank.test.ts` | API client tests |
| `frontend/src/utils/questionBank.ts` | Form validation/helpers |
| `frontend/src/utils/questionBank.test.ts` | Utility tests |
| `frontend/src/hooks/useExaminerAccess.ts` | Examiner access hook |
| `frontend/src/auth/guards.tsx` | `withExaminerGuard` |
| `frontend/src/pages/questions/QuestionsList.tsx` | List/filter/delete UI |
| `frontend/src/pages/questions/QuestionEditor.tsx` | Authoring form + nested editors |
| `frontend/src/pages/questions/questions.css` | Feature styles |
| `frontend/src/pages/questions/*.test.tsx` | Page tests |
| `frontend/src/App.tsx` | Route registration |
| `frontend/src/components/organisms/Sidebar/Sidebar.tsx` | Nav link |

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

Results: **150** backend tests passed; **108** frontend tests passed; build succeeds.

## Open Questions / Follow-ups

- Link question bank UUIDs to grading/scoring instead of opaque string IDs
- Question versioning and draft/published states
- Server-side text search and cross-page filtering
- Bulk import/export (CSV/QTI)
