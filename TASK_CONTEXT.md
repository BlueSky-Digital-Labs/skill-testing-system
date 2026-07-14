# Task Context: Reporting Application (Backend)

**Branch:** `sunset/task/feat-47a54e8a`  
**PR:** _(to be created)_

## Scope

Add a dedicated `reporting` Django app with analytics query functions, DRF API endpoints, CSV/PDF export via S3, and role-based access control.

### In scope

- Reporting app under `backend/src/reporting/`
- Query layer for individual, test summary, question performance, group comparison, and progress reports
- DRF endpoints under `/api/reports/` plus `POST /api/exports/`
- CSV (stdlib) and PDF (ReportLab) export helpers with S3 upload and presigned download URLs
- Shared S3 utilities in `backend/src/core/storage.py`
- Permission classes in `backend/src/authentication/report_permissions.py`
- Pytest coverage for queries, API, and exports

### Out of scope

- Frontend reporting dashboards
- Scheduled report generation
- Dedicated `Test` model (tests remain UUID `test_id` values)

## Key Implementation Decisions

1. **New `reporting` app** — Registered in `INSTALLED_APPS`; keeps analytics separate from delivery/grading/results.
2. **Query functions** — Pure ORM aggregation in `queries.py`, reusing `Attempt`, `CombinedResult`, `ObjectiveScore`, `Assignment`, and `CandidateGroup`.
3. **Permissions** — Individual reports: attempt owner or staff/coordinator/examiner/admin. Analytics reports: coordinator/examiner/admin. Progress: coordinator/admin only. Export permissions mirror report type.
4. **S3 storage** — `core/storage.py` provides generic upload/presign helpers; `REPORTS_BUCKET` falls back to `CERTIFICATES_BUCKET`.
5. **PDF exports** — ReportLab 3.6.13 per ticket requirements; tabular layout from flattened report rows.
6. **URL mounting** — `reporting.urls` included at `api/reports/` (Django `PYTHONPATH=src` convention); export view mounted separately at `api/exports/`.

## Endpoint Contracts

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/reports/individual/{attempt_id}/` | Owner or staff roles | Attempt + scores + topic breakdown |
| GET | `/api/reports/test-summary/{test_id}/` | Coordinator/Examiner/Admin | Attempt counts, averages, pass rate |
| GET | `/api/reports/question-performance/{test_id}/` | Coordinator/Examiner/Admin | Per-question-version correctness |
| GET | `/api/reports/group-comparison/{test_id}/` | Coordinator/Examiner/Admin | Per-group completion and scores |
| GET | `/api/reports/progress/` | Coordinator/Admin | Query params: `group_id`, optional `topic`, `from_dt`, `to_dt` |
| POST | `/api/exports/` | Report-type dependent | Body: `report_type`, `format` (`csv`/`pdf`), `parameters` |

## Files Changed

| File | Why |
|------|-----|
| `backend/src/reporting/apps.py` | App config |
| `backend/src/reporting/queries.py` | ORM query/aggregation functions |
| `backend/src/reporting/serializers.py` | DRF response/request serializers |
| `backend/src/reporting/views.py` | API views for reports and exports |
| `backend/src/reporting/exports.py` | CSV/PDF generation helpers |
| `backend/src/reporting/urls.py` | Report route definitions |
| `backend/src/reporting/tests/*` | Unit, API, and export tests |
| `backend/src/core/storage.py` | S3 upload and presigned URL utilities |
| `backend/src/authentication/report_permissions.py` | Role-based report permissions |
| `backend/src/core/settings/base.py` | App registration, S3 settings, OpenAPI tag |
| `backend/src/core/urls.py` | Mount reporting and export routes |
| `backend/requirements.txt` | Add `reportlab==3.6.13` |

## Verification

```bash
cd backend
pip install -r requirements.txt  # reportlab may need libfreetype-dev, python3-dev to build

SECRET_KEY=test-secret PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test \
  python3 -m pytest src/reporting/tests/ -v

python3 -m flake8 src/reporting/ src/authentication/report_permissions.py src/core/storage.py
```

## Open Questions / Follow-ups

- Should candidates export their own individual reports in PDF format with branding?
- Add audit log entries for sensitive aggregate report access?
- Introduce a first-class `Test` model to simplify `test_id` joins?
