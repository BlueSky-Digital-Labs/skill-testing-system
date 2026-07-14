# Task Context: CSV/XLSX Question Import (Backend)

**Branch:** `sunset/task/feat-287d700b`

## Scope

Backend support for bulk importing questions from CSV/XLSX spreadsheets into the Django question bank.

### Implemented
- Downloadable import templates (CSV default, XLSX via `file_format=xlsx`)
- Two-step import API: parse/validate, then commit
- Spreadsheet parser for CSV and XLSX (`openpyxl`)
- Row validator aligned with existing question-type rules
- Transactional bulk upsert (create new rows; update when `id` matches an existing question)
- `import_questions` management command with dry-run and `--commit`
- Pytest coverage for parser, validator, upsert, API, and command flows

### Out of scope
- Examiner-only authorization (gated with authenticated access until role feature [3] lands)
- Frontend import UI
- Image import via spreadsheet

## Key Implementation Decisions

1. **Template columns**: Flat spreadsheet columns with JSON-encoded `metadata`, `options`, and `blank_answer_keys` fields to support all question types in one row shape.
2. **Upsert key**: Optional `id` (UUID). Blank `id` creates a new question; populated `id` updates an existing question after validation confirms the record exists.
3. **Two-step API**: `POST /parse` returns `valid_rows` and per-row `errors`; `POST /commit` accepts the validated `rows` payload and re-validates before upserting inside a transaction.
4. **Auth**: Endpoints use DRF `IsAuthenticated` plus Django `login_required` to satisfy the temporary “logged-in only” gate for JWT and session clients.
5. **Query parameter naming**: Template download uses `file_format` (with legacy `format` fallback) because DRF treats `?format=` as content negotiation.
6. **Views package**: Existing `QuestionViewSet` moved to `question_bank/views/questions.py` so `import_api.py` can live alongside it without module shadowing.

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/question-import/template` | GET | Authenticated | Download CSV/XLSX template (`?file_format=xlsx`) |
| `/api/question-import/parse` | POST | Authenticated | Upload spreadsheet; returns validation summary |
| `/api/question-import/commit` | POST | Authenticated | Commit validated `rows` JSON payload |

## Management Command

```bash
python manage.py import_questions path/to/questions.csv
python manage.py import_questions path/to/questions.xlsx --commit --author-email examiner@example.com
```

## Files Changed

| File | Why |
|------|-----|
| `backend/requirements.txt` | Added `openpyxl` for XLSX parsing/template generation |
| `backend/src/question_bank/importers/*` | Template, parser, validator, and upsert modules |
| `backend/src/question_bank/views/questions.py` | Relocated existing question CRUD viewset |
| `backend/src/question_bank/views/import_api.py` | Import template/parse/commit endpoints |
| `backend/src/question_bank/views/__init__.py` | Package exports for view modules |
| `backend/src/question_bank/management/commands/import_questions.py` | Admin CLI import flow |
| `backend/src/core/urls.py` | Registered import API routes |
| `backend/src/question_bank/tests/test_importer.py` | Importer unit and API tests |

## Verification

```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=src SECRET_KEY=test-secret-key DJANGO_SETTINGS_MODULE=core.settings.test \
  python3 -m pytest src/ -v
```

Result: **209** backend tests passed (including **22** new importer tests).

## Open Questions / Follow-ups

- Restrict import endpoints to Examiner/System Admin once role feature [3] is available
- Support importing question images (URL column or post-import upload workflow)
- Add import audit logging and duplicate-detection beyond UUID upsert
