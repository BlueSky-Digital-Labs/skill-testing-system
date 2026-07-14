# Task Context: Notifications + Monitoring Dashboard

**Branch:** `sunset/task/feat-fa423016`  
**PR:** https://github.com/BlueSky-Digital-Labs/skill-testing-system/pull/27

## Scope

End-to-end notifications and monitoring: backend email delivery APIs plus a React monitoring dashboard for coordinators/system admins.

### In scope

**Backend (`backend/src/notifications/`, `backend/src/delivery/`)**
- `EmailTemplate` / `EmailMessageLog` models, admin, templated `send_email` (console + SES)
- Signed invitation URLs, resend-invite throttling, reminder sending, monitoring status API
- Pytest coverage for services and API endpoints

**Frontend (`frontend/src/pages/monitoring/`, `frontend/src/components/monitoring/`, `frontend/src/api/monitoring.ts`)**
- Monitoring dashboard at `/monitoring` and `/monitoring/:testId`
- Status summary, group breakdown table, reminder actions, auto-refresh
- API client mapping frontend DTOs to backend payloads/responses
- Vitest/RTL tests for API client, components, and page behavior

### Out of scope

- Celery/async email queue
- Replacing legacy auth invitation emails in `authentication/invitations.py`
- Examiner access to monitoring UI (backend allows examiners; frontend restricts to coordinator/system admin per ticket)

## Key Implementation Decisions

### Backend

1. **Separate `notifications` app** — Templates, logs, and send logic isolated from attempt lifecycle code.
2. **Email providers** — `EMAIL_PROVIDER=console` uses Django email backend; `EMAIL_PROVIDER=SES` uses boto3 + AWS credentials.
3. **Throttling** — `RESEND_INVITE_THROTTLE_SECONDS` prevents duplicate invite sends; throttled attempts logged with status `throttled`.
4. **Signed invite URLs** — Django signing with `INVITATION_URL_EXPIRE_SECONDS` (default 7 days).
5. **Monitoring routes** — Mounted at `/api/monitoring/tests/{test_id}/status/`, `/api/tests/{test_id}/reminders/`, `/api/assignments/{assignment_id}/resend-invite/`.

### Frontend

1. **API mapping** — Frontend `sendReminders` maps `only_non_starters` / `only_non_completers` to backend `include_*` flags; response `{ recipients, sent }` derived from backend counts.
2. **Resend invite client** — Maps backend assignment response to `{ message_log_id, status }` using `assignment_id` and aggregate send outcome.
3. **Access control** — Page requires coordinator or system admin (`useCoordinatorAccess` / `useSystemAdminAccess`).
4. **Routing** — `/monitoring` shows test picker; `/monitoring/:testId` loads status. Last test ID stored in `sessionStorage`.
5. **Auto-refresh** — Optional 15s/30s/60s polling via `setInterval`.
6. **UI composition** — `StatusSummary`, `GroupBreakdownTable`, and `ActionsBar` under `components/monitoring/`.

## Endpoint Contracts

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/monitoring/tests/{test_id}/status/` | Coordinator/Examiner/Admin | Assignment/attempt counts + group breakdown |
| POST | `/api/tests/{test_id}/reminders/` | Coordinator/Admin | Filters: `group_id`, `include_not_started`, `include_in_progress`, `include_overdue` |
| POST | `/api/assignments/{assignment_id}/resend-invite/` | Coordinator/Admin | Throttles recent sends via message log |

## Frontend Routes

| Path | Page |
|------|------|
| `/monitoring` | Test ID picker |
| `/monitoring/:testId` | Monitoring dashboard |

## Files Changed

### Backend

| File | Why |
|------|-----|
| `backend/src/notifications/*` | Notifications app (models, services, templates, tests, migration) |
| `backend/src/delivery/status.py` | Status query utilities |
| `backend/src/delivery/notification_views.py` | Resend invite, reminders, monitoring views |
| `backend/src/delivery/notification_urls.py` | Route registration |
| `backend/src/delivery/serializers.py` | Notification/monitoring serializers |
| `backend/src/delivery/tests/test_notification_api.py` | API tests |
| `backend/src/delivery/tests/test_status.py` | Status query tests |
| `backend/src/core/settings/base.py` | App registration, email settings, OpenAPI tags |
| `backend/src/core/urls.py` | Mount notification routes |
| `backend/env.example` | Document email settings |

### Frontend

| File | Why |
|------|-----|
| `frontend/src/api/monitoring.ts` | Monitoring API client with backend payload mapping |
| `frontend/src/api/monitoring.types.ts` | TypeScript DTOs |
| `frontend/src/api/monitoring.test.ts` | API client unit tests |
| `frontend/src/pages/monitoring/*` | Dashboard page, styles, tests |
| `frontend/src/components/monitoring/*` | Status summary, group table, actions bar, tests |
| `frontend/src/App.tsx` | Monitoring routes |
| `frontend/src/components/organisms/Sidebar/Sidebar.tsx` | Monitoring nav entry |
| `frontend/src/content/index.ts` | Sidebar label |

## Verification

```bash
# Backend
cd backend
SECRET_KEY=test-secret PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test \
  python3 -m pytest src/notifications/tests/ src/delivery/tests/test_notification_api.py \
  src/delivery/tests/test_status.py -v
python3 -m flake8 src/notifications/ src/delivery/status.py \
  src/delivery/notification_views.py src/delivery/notification_urls.py

# Frontend
cd frontend
npm test
npm run lint
npm run build
```

## Open Questions / Follow-ups

- Wire `results_release` template into the results release workflow.
- Add examiner access to monitoring UI if product wants parity with backend permissions.
- Move batch email sending to Celery for large reminder batches.
- Integrate organization branding HTML from `branding.OrganizationSettings` into email templates.
- Add per-assignment resend invite action in the group breakdown table when assignment IDs are exposed by the status API.
