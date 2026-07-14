# Task Context: Audit Logging Backend (feat-ccff06f0)

## Scope

Implement a hash-chained audit logging backend in the Django application under `backend/src/`:

- New `audit` Django app with `AuditLog` model
- Utilities for canonical payload hashing, chained logging, and verification
- Read-only Django Admin registration
- Staff-protected read APIs (`list_logs`, `verify`)
- Development-only `POST /api/audit/test-log` endpoint guarded by `settings.DEBUG`
- Decorators/helpers for integrating audit logging into views
- Tests and README documentation

## Key Implementation Decisions

1. **Hash chain**: Each `AuditLog` entry stores `prev_hash` (previous entry's `hash`, or empty string for genesis) and `hash` (SHA-256 of a canonical JSON payload). Payloads use sorted JSON keys for stable hashing.
2. **Timestamp handling**: `timestamp` uses `default=timezone.now` (not `auto_now_add`) so the value used for hashing matches the stored value.
3. **Concurrency**: `log_action` wraps chain updates in `transaction.atomic()` with `select_for_update()` on the latest entry.
4. **Permissions**: Read APIs require `IsAdminUser` (staff), consistent with branding admin APIs.
5. **Test endpoint**: `POST /api/audit/test-log` is always routed but returns 404 when `DEBUG=False`; view-level guard satisfies the DEBUG requirement.
6. **Integration helpers**:
   - `@audit_log_action` decorator for function-based views (logs after 2xx responses)
   - `AuditLogMixin.log_audit_action()` for class-based views
7. **Test settings**: Explicit `DEBUG = True` at end of `core/settings/test.py` because `from .base import *` can inherit a cached `DEBUG=False` from the parent settings package.

## Files Changed

| File | Why |
|------|-----|
| `backend/src/audit/` | New app: model, utils, admin, views, urls, migrations, tests |
| `backend/src/core/settings/base.py` | Register `audit.apps.AuditConfig`, OpenAPI tag |
| `backend/src/core/settings/test.py` | Force `DEBUG=True` for reliable test settings |
| `backend/src/core/views.py` | Development-only `test_audit_log` endpoint |
| `backend/src/core/urls.py` | Include audit URLs and test-log route |
| `backend/README.md` | Audit logging usage and API documentation |

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/audit/logs/` | GET | Staff JWT | List/filter/paginate audit logs |
| `/api/audit/verify/` | GET | Staff JWT | Verify hash chain integrity |
| `/api/audit/test-log` | POST | JWT | Log `DEV_TEST` action (DEBUG only) |

## Verification

```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test SECRET_KEY=test-secret \
  python3 manage.py test audit authentication branding grading
```

## Open Questions / Follow-ups

- Consider exposing audit log detail endpoint by entry ID.
- Add drf-spectacular request/response serializers for richer OpenAPI schemas.
- Integrate `@audit_log_action` into existing mutation endpoints (branding, grading) as follow-up work.
