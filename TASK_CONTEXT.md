# Task Context: CSV/XLSX Question Import (Backend + Frontend)

**Branch:** `sunset/task/feat-287d700b`  
**PR:** https://github.com/BlueSky-Digital-Labs/skill-testing-system/pull/15

## Scope

Bulk import questions from CSV/XLSX spreadsheets into the Django question bank, with an examiner-facing import UI.

### Backend (completed)
- Downloadable import templates (CSV default, XLSX via `file_format=xlsx`)
- Two-step import API: parse/validate, then commit
- Spreadsheet parser for CSV and XLSX (`openpyxl`)
- Row validator aligned with existing question-type rules
- Transactional bulk upsert (create new rows; update when `id` matches an existing question)
- `import_questions` management command with dry-run and `--commit`
- Pytest coverage for parser, validator, upsert, API, and command flows

### Frontend (completed)
- `ImportPage` at `/questions/import` with template download, upload, preview, and commit sections
- API client helpers in `frontend/src/api/questionImport.ts`
- Preview table with pagination (25 rows/page, capped at 200 rows total)
- UI states: idle, parsing, parsed_with_errors, parsed_ready, committing, committed
- Error-only preview filter, dismissible network alerts, accessible labels/headings
- Vitest coverage for API client and `ImportPage` flows
- “Import questions” entry point on the question bank list page

### Out of scope
- Examiner-only authorization on import API (backend temporarily allows any authenticated user)
- Image import via spreadsheet
- Import audit logging

## Key Implementation Decisions

### Backend
1. **Template columns**: Flat spreadsheet columns with JSON-encoded `metadata`, `options`, and `blank_answer_keys`.
2. **Upsert key**: Optional `id` (UUID). Blank `id` creates; populated `id` updates after existence check.
3. **Two-step API**: `POST /parse` returns `valid_rows` and per-row `errors`; `POST /commit` re-validates and upserts in a transaction.
4. **Query parameter naming**: Template download uses `file_format` (legacy `format` also supported) because DRF reserves `?format=` for content negotiation.

### Frontend
1. **Route guard**: `/questions/import` uses `withExaminerGuard`, matching other question-bank pages.
2. **Template download**: `downloadTemplate` + `triggerTemplateDownload` use `fetch` → `Blob` → `URL.createObjectURL`.
3. **Commit mapping**: Backend `created` is exposed to the UI as `inserted` in `commitRows`.
4. **Preview cap**: Only the first 200 parsed rows render in the preview table to keep the page responsive.
5. **Commit gating**: Commit button stays disabled until `error_count === 0` and at least one valid row exists.

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/question-import/template` | GET | Authenticated | Download CSV/XLSX template (`?file_format=xlsx`) |
| `/api/question-import/parse` | POST | Authenticated | Upload spreadsheet; returns validation summary |
| `/api/question-import/commit` | POST | Authenticated | Commit validated `rows` JSON payload |

## Frontend Routes

| Route | Component | Guard |
|-------|-----------|-------|
| `/questions/import` | `ImportPage` | `withExaminerGuard` |

## Files Changed

### Backend
| File | Why |
|------|-----|
| `backend/requirements.txt` | Added `openpyxl` |
| `backend/src/question_bank/importers/*` | Template, parser, validator, upsert |
| `backend/src/question_bank/views/import_api.py` | Import endpoints |
| `backend/src/question_bank/management/commands/import_questions.py` | CLI import |
| `backend/src/core/urls.py` | Route registration |
| `backend/src/question_bank/tests/test_importer.py` | Backend importer tests |

### Frontend
| File | Why |
|------|-----|
| `frontend/src/api/questionImport.ts` | Import API client |
| `frontend/src/api/questionImport.test.ts` | API client tests |
| `frontend/src/pages/questions/import/ImportPage.tsx` | Import UI |
| `frontend/src/pages/questions/import/ImportPage.test.tsx` | Component tests |
| `frontend/src/pages/questions/import/import.css` | Import page styles |
| `frontend/src/App.tsx` | Route registration |
| `frontend/src/pages/questions/QuestionsList.tsx` | Link to import page |
| `frontend/src/pages/questions/index.ts` | Export `ImportPage` |

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

Results: **209** backend tests passed; **132** frontend tests passed; build succeeds.

## Open Questions / Follow-ups

- Restrict import endpoints to Examiner/System Admin once role feature [3] is available
- Support importing question images (URL column or post-import upload workflow)
- Add import audit logging and duplicate-detection beyond UUID upsert
- Surface row-level commit failures inline if backend begins returning partial commit errors
