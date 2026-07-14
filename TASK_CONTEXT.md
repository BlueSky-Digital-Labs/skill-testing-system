# Task Context: Audit Logging (feat-ccff06f0)

## Scope

### Backend (completed)
- Hash-chained `audit` Django app with `AuditLog` model, logging utilities, read-only admin, and staff APIs at `/api/audit/`
- Development-only `POST /api/audit/test-log` endpoint (DEBUG guard)

### Frontend (this iteration)
- Admin Audit Log Viewer at `/admin/audit`
- API client (`getAuditLogs`, `verifyAuditChain`) and `AuditLogRow` types
- Filter bar with debounced inputs, reset, page-based pagination
- Expandable table rows for metadata/hash with copy-to-clipboard
- Chain verification feedback
- Session persistence for filters and pagination
- Vitest + RTL tests for API client, components, and page

## Key Implementation Decisions

### Backend
1. **Hash chain**: SHA-256 over sorted JSON canonical payloads; `prev_hash` links entries.
2. **Timestamp**: Explicit `timestamp` field (not `auto_now_add`) so stored value matches hash input.
3. **Permissions**: Staff-only (`IsAdminUser`) for list/verify APIs.
4. **Test endpoint**: View returns 404 when `DEBUG=False`; route always registered for testability.

### Frontend
1. **API client**: `frontend/src/api/audit.ts` follows `grading.ts` / `branding.ts` patterns (`authorizedFetch`, `ApiError`).
2. **Auth**: `/admin/audit` wrapped in existing `AdminRoute` (staff probe via branding API).
3. **Filters**: 300ms debounce on text/datetime inputs; page resets to 1 on filter change.
4. **Pagination**: Page-based (`page`, `page_size`) matching backend API.
5. **Persistence**: Filter + page state stored in `sessionStorage` (`audit-log-viewer-state`).
6. **UX**: Expandable rows show `JsonPreview` + `CopyToClipboard`; verify button shows success/error banner.
7. **Testing**: Added RTL `cleanup()` to global test setup to prevent DOM leakage between tests.

## Files Changed

### Backend
| File | Why |
|------|-----|
| `backend/src/audit/` | Model, utils, admin, views, urls, migrations, tests |
| `backend/src/core/views.py` | DEBUG-guarded test-log endpoint |
| `backend/src/core/urls.py` | Audit routes |
| `backend/src/core/settings/base.py` | App registration, OpenAPI tag |
| `backend/src/core/settings/test.py` | Explicit `DEBUG=True` for tests |
| `backend/README.md` | Audit logging docs |

### Frontend
| File | Why |
|------|-----|
| `frontend/src/api/audit.ts` | `getAuditLogs`, `verifyAuditChain` |
| `frontend/src/api/audit.types.ts` | `AuditLogRow` and related types |
| `frontend/src/api/audit.test.ts` | API client tests |
| `frontend/src/pages/admin/audit/` | AuditPage, Filters, JsonPreview, CopyToClipboard, tests |
| `frontend/src/App.tsx` | `/admin/audit` route |
| `frontend/src/components/organisms/Sidebar/Sidebar.tsx` | Audit Log nav item |
| `frontend/src/content/index.ts` | Sidebar label |
| `frontend/src/test/setup.ts` | RTL cleanup after each test |

## API Endpoints

| Endpoint | Method | Auth | Used By |
|----------|--------|------|---------|
| `/api/audit/logs/` | GET | Staff JWT | AuditPage (list/filter/paginate) |
| `/api/audit/verify/` | GET | Staff JWT | AuditPage (verify chain button) |
| `/api/audit/test-log` | POST | JWT | Backend dev testing only |

## Verification

### Backend
```bash
cd backend
PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test SECRET_KEY=test-secret \
  python3 manage.py test audit authentication branding grading
```

### Frontend
```bash
cd frontend
npm install
npm test
npm run lint
npm run build
```

## Open Questions / Follow-ups

- Integrate `@audit_log_action` into existing mutation endpoints (branding, grading).
- Add dedicated audit log detail endpoint by entry ID.
- Consider server-side cursor pagination if log volume grows large.
- Add i18n for hardcoded Audit Log / Grading sidebar labels.
