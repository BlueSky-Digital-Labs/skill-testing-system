# Task Context: Backend Notifications Subsystem

**Branch:** `sunset/task/feat-fa423016`  
**PR:** _(pending)_

## Scope

Implement backend email notifications and delivery monitoring APIs for exam assignments.

### In scope

**Notifications app (`backend/src/notifications/`)**
- `EmailTemplate` and `EmailMessageLog` models with Django admin registration
- `send_email` service supporting console/Django backend and SES via boto3
- Signed invitation URL utilities with configurable expiration
- Default HTML/TXT templates for `invite`, `reminder`, and `results_release`
- Unit tests for templating, logging, SES/console paths, and throttling helpers

**Delivery extensions (`backend/src/delivery/`)**
- Status query utilities for per-test and per-group summaries
- DRF endpoints for resend invite, reminders, and monitoring status
- Resend invite throttling via `EmailMessageLog` timestamps
- API tests with role-based permissions and mocked delivery flows

**Settings / wiring**
- Register `notifications` app and email provider settings
- Mount notification routes under `/api/`
- Initial migration for notification models

### Out of scope

- Frontend notification UI
- Celery/async email queue (emails send synchronously in request handlers)
- Replacing legacy auth invitation emails in `authentication/invitations.py`

## Key Implementation Decisions

1. **Separate `notifications` app** — Keeps email templates, delivery logs, and send logic isolated from attempt lifecycle code.
2. **Template resolution** — DB `EmailTemplate` rows override file templates under `notifications/templates/email/`; placeholders use `{{ name }}` syntax.
3. **Email providers** — `EMAIL_PROVIDER=console` (default) uses Django's email backend; `EMAIL_PROVIDER=SES` sends via boto3 and existing AWS credentials.
4. **Throttling** — `RESEND_INVITE_THROTTLE_SECONDS` (default 3600) prevents duplicate invite sends per assignment/recipient; throttled attempts are logged with status `throttled`.
5. **Signed invite URLs** — `notifications.utils.generate_signed_invitation_url` uses Django signing with `INVITATION_URL_EXPIRE_SECONDS` (default 7 days).
6. **Permissions** — Resend invite and reminders require coordinator/admin; monitoring status allows coordinator/examiner/admin.
7. **Status queries** — `delivery/status.py` aggregates assignment and attempt counts with TODO comments for future Assignment/User FK integration.

## Endpoint Contracts

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/assignments/{assignment_id}/resend-invite/` | Coordinator/Admin | Sends invite emails; throttles recent sends |
| POST | `/api/tests/{test_id}/reminders/` | Coordinator/Admin | Body filters: `group_id`, `include_not_started`, `include_in_progress`, `include_overdue` |
| GET | `/api/monitoring/tests/{test_id}/status/` | Coordinator/Examiner/Admin | Assignment/attempt counts and group breakdown |

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `EMAIL_PROVIDER` | `console` | `console` or `SES` |
| `RESEND_INVITE_THROTTLE_SECONDS` | `3600` | Minimum seconds between invite resends |
| `INVITATION_URL_EXPIRE_SECONDS` | `604800` | Signed invitation URL TTL |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | — | Used when `EMAIL_PROVIDER=SES` |

## Files Changed

| File | Why |
|------|-----|
| `backend/src/notifications/*` | New notifications app (models, admin, services, utils, templates, tests, migration) |
| `backend/src/delivery/status.py` | Per-test/per-group status query utilities |
| `backend/src/delivery/notification_views.py` | Resend invite, reminders, monitoring API views |
| `backend/src/delivery/notification_urls.py` | Route registration for notification/monitoring endpoints |
| `backend/src/delivery/serializers.py` | Request/response serializers for new endpoints |
| `backend/src/delivery/tests/test_notification_api.py` | API tests for notifications and monitoring |
| `backend/src/delivery/tests/test_status.py` | Unit tests for status query helpers |
| `backend/src/core/settings/base.py` | App registration, email provider settings, OpenAPI tags |
| `backend/src/core/settings/test.py` | Test overrides for notification settings |
| `backend/src/core/urls.py` | Mount notification routes |
| `backend/env.example` | Document new email settings |

## Verification

```bash
cd backend
SECRET_KEY=test-secret PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test \
  python3 -m pytest src/notifications/tests/ src/delivery/tests/test_notification_api.py \
  src/delivery/tests/test_status.py -v
python3 -m flake8 src/notifications/ src/delivery/status.py \
  src/delivery/notification_views.py src/delivery/notification_urls.py
SECRET_KEY=test-secret PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test \
  python3 manage.py migrate --skip-checks
```

## Open Questions / Follow-ups

- Wire `results_release` template into the results release workflow when that notification trigger is defined.
- Replace UUID-based `assignee_user_id` lookups with direct User FK on `Assignment`.
- Move email sending to Celery tasks for large batch reminders.
- Integrate organization branding HTML from `branding.OrganizationSettings` into email templates.
