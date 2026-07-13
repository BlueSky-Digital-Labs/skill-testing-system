# Task Context: JWT Auth & Password Reset (feat-97a2d06b)

## Scope

Implement JWT authentication endpoints and a password reset flow for the Django backend:

- Email-based JWT token obtain and refresh
- Password reset request and confirm endpoints
- `PasswordResetToken` model with expiry and single-use semantics
- Email settings driven by environment variables
- Tests and documentation for the new API surface

## Key Implementation Decisions

1. **Settings location**: The project uses `backend/src/core/settings/base.py` (not a flat `settings.py`). REST framework JWT auth, `SIMPLE_JWT` lifetimes (15-minute access / 7-day refresh), and email settings were added there using the existing `django-environ` pattern.

2. **Email authentication**: Added `authentication.backends.EmailBackend` so `authenticate(email=..., password=...)` works for the new `TokenObtainSerializer`.

3. **URL layout**: Core URLs now mount authentication at `api/` per the ticket. Legacy routes remain under `/api/auth/...` (register, login, jwt/*, users) alongside the new `/api/auth/token/`, `/api/auth/password/forgot/`, and `/api/auth/password/reset/` endpoints.

4. **Password reset expiry**: `PasswordResetToken.expires_at` uses a named callable (`default_password_reset_expires_at`) instead of an inline lambda so migrations remain serializable.

5. **Enumeration safety**: `PasswordResetRequestView` always returns HTTP 200 whether or not the email exists.

6. **Test settings**: Added `core/settings/test.py` with in-memory SQLite for running the suite without Docker/PostgreSQL.

## Files Changed

| File | Why |
|------|-----|
| `backend/requirements.txt` | Pin DRF 3.15.* and simplejwt 5.3.* |
| `backend/src/core/settings/base.py` | JWT lifetimes, email settings, `AUTHENTICATION_BACKENDS` |
| `backend/src/core/settings/test.py` | In-memory SQLite test configuration |
| `backend/src/core/urls.py` | Mount auth URLs at `api/` |
| `backend/src/authentication/models.py` | `PasswordResetToken` model |
| `backend/src/authentication/migrations/0002_passwordresettoken.py` | DB migration |
| `backend/src/authentication/backends.py` | Email-based auth backend |
| `backend/src/authentication/password_reset.py` | Token creation and email helper |
| `backend/src/authentication/serializers.py` | Token obtain and password reset serializers |
| `backend/src/authentication/views.py` | New auth and password reset views |
| `backend/src/authentication/urls.py` | Route registration |
| `backend/src/authentication/tests/test_auth.py` | View integration tests |
| `backend/env.example` | Document new env vars |
| `backend/README.md` | Endpoint and env var documentation |
| `README.md` | Monorepo-level auth endpoint summary |

## Verification

```bash
cd backend
PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test SECRET_KEY=test-secret \
  python3 manage.py test authentication
```

All 14 authentication tests pass (5 model + 9 view tests).

## Open Questions / Follow-ups

- Frontend `authService.ts` still points at legacy login/refresh paths; consider aligning with `/api/auth/token/` and `/api/auth/token/refresh/` in a follow-up.
- Production SMTP credentials are not configured in this ticket; only env var hooks and console backend defaults are provided.
