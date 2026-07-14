# Task Context: Reporting (Backend + Frontend)

**Branch:** `sunset/task/feat-47a54e8a`  
**PR:** https://github.com/BlueSky-Digital-Labs/skill-testing-system/pull/26

## Scope

Deliver end-to-end reporting: Django analytics APIs with CSV/PDF export, plus a React Reports UI that consumes those endpoints.

### In scope

**Backend**
- Reporting app under `backend/src/reporting/`
- Query layer, DRF endpoints, export helpers, permissions, S3 storage utilities
- Pytest coverage

**Frontend**
- Reports pages under `frontend/src/pages/reports/`
- Shared filters, table, chart, and export components
- API client in `frontend/src/api/reports.ts`
- Routes under `/reports/*` and sidebar navigation
- Vitest/RTL tests for API client and key UI flows

### Out of scope

- Scheduled report generation
- Dedicated `Test` model (tests remain UUID `test_id` values)
- Progress report UI page (backend endpoint exists; frontend focuses on four report pages per ticket)

## Key Implementation Decisions

### Backend

1. **New `reporting` app** — Keeps analytics separate from delivery/grading/results.
2. **Permissions** — Individual: attempt owner or staff/coordinator/examiner/admin. Analytics: coordinator/examiner/admin. Progress: coordinator/admin.
3. **S3 storage** — `core/storage.py`; `REPORTS_BUCKET` falls back to `CERTIFICATES_BUCKET`.
4. **PDF exports** — ReportLab 3.6.13 with tabular layout.
5. **Routes** — `reporting.urls` at `api/reports/`; export view at `api/exports/`.

### Frontend

1. **Page shell** — `ReportsLayout` wraps `DashboardLayout`, sub-navigation, and role-aware analytics tabs.
2. **Filter persistence** — `sessionStorage` keyed per report type (`reports-filters:*`).
3. **API client** — `authorizedFetch` + typed helpers mirroring backend paths and export payload shapes.
4. **Exports** — `ExportButtons` posts to `/api/exports/` and opens the presigned `download_url`.
5. **Routing** — Centralized in `frontend/src/routes.tsx`; sidebar link at `/reports` for all authenticated users.
6. **Charts** — Lightweight CSS bar chart component (no extra chart library).

## Endpoint Contracts

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/reports/individual/{attempt_id}/` | Owner or staff roles | Attempt + scores + topic breakdown |
| GET | `/api/reports/test-summary/{test_id}/` | Coordinator/Examiner/Admin | Attempt counts, averages, pass rate |
| GET | `/api/reports/question-performance/{test_id}/` | Coordinator/Examiner/Admin | Per-question-version correctness |
| GET | `/api/reports/group-comparison/{test_id}/` | Coordinator/Examiner/Admin | Per-group completion and scores |
| GET | `/api/reports/progress/` | Coordinator/Admin | Query params: `group_id`, optional `topic`, `from_dt`, `to_dt` |
| POST | `/api/exports/` | Report-type dependent | Body: `report_type`, `format`, `parameters` |

## Frontend Routes

| Path | Page |
|------|------|
| `/reports` | Redirect to `/reports/individual` |
| `/reports/individual` | Individual attempt report |
| `/reports/test` | Test summary report |
| `/reports/question` | Question performance report |
| `/reports/group` | Group comparison report |

## Files Changed

### Backend

| File | Why |
|------|-----|
| `backend/src/reporting/*` | Reporting app, queries, views, exports, tests |
| `backend/src/core/storage.py` | S3 upload and presigned URL utilities |
| `backend/src/authentication/report_permissions.py` | Role-based report permissions |
| `backend/src/core/settings/base.py` | App registration, S3 settings, OpenAPI tag |
| `backend/src/core/urls.py` | Mount reporting and export routes |
| `backend/requirements.txt` | Add `reportlab==3.6.13` |

### Frontend

| File | Why |
|------|-----|
| `frontend/src/api/reports.ts` | Reporting API client and export helpers |
| `frontend/src/api/reports.types.ts` | TypeScript interfaces for report payloads |
| `frontend/src/api/reports.test.ts` | API client unit tests |
| `frontend/src/pages/reports/*` | Pages, shared layout, components, styles, tests |
| `frontend/src/routes.tsx` | Centralized report route definitions |
| `frontend/src/App.tsx` | Include report routes |
| `frontend/src/components/organisms/Sidebar/Sidebar.tsx` | Reports navigation entry |
| `frontend/src/content/index.ts` | Sidebar/report copy strings |

## Verification

```bash
# Backend
cd backend
SECRET_KEY=test-secret PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test \
  python3 -m pytest src/reporting/tests/ -v
python3 -m flake8 src/reporting/ src/authentication/report_permissions.py src/core/storage.py

# Frontend
cd frontend
npm test
npm run lint
npm run build
```

## Open Questions / Follow-ups

- Add a dedicated Progress report page wired to `GET /api/reports/progress/`.
- Should candidates export individual reports with organization branding?
- Add audit log entries for sensitive aggregate report access?
- Introduce a first-class `Test` model to simplify `test_id` lookups in UI pickers?
