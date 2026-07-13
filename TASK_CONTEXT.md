# Task Context: JWT Auth & Password Reset (feat-97a2d06b)

## Scope

### Backend (completed)
- Email-based JWT token obtain and refresh
- Password reset request and confirm endpoints
- `PasswordResetToken` model with expiry and single-use semantics
- Email settings driven by environment variables

### Frontend (this iteration)
- Fetch-based auth API client (`signIn`, `refreshToken`, `forgotPassword`, `resetPassword`)
- Sign-in, forgot password, and reset password pages
- Routing at `/auth/sign-in`, `/auth/forgot`, `/auth/reset`
- Token storage helpers and optional 401 refresh retry helper
- Vitest smoke tests for the API client

## Key Implementation Decisions

### Backend
1. **Settings location**: `backend/src/core/settings/base.py` with `django-environ`.
2. **Email authentication**: `authentication.backends.EmailBackend` for `authenticate(email=..., password=...)`.
3. **URL layout**: Auth mounted at `api/`; endpoints live under `/api/auth/...`.
4. **Enumeration safety**: Forgot-password endpoint always returns HTTP 200.

### Frontend
1. **API client location**: New `frontend/src/api/` module using `fetch` per ticket spec (legacy axios service kept for register/login pages).
2. **API base URL**: `getApiBase()` resolves to `${VITE_API_BASE_URL}/api` or `/api` when unset (Vite proxy / same-origin deploy).
3. **Token storage**: `authStorage.ts` stores `access_token` and `refresh_token`, and mirrors access token to legacy `token` key for existing interceptors.
4. **Redux integration**: `setSession` reducer updates auth state after successful sign-in without replacing legacy login flow.
5. **UX/accessibility**: Accessible labels on all fields, keyboard-navigable controls, `aria-live` regions for errors and success messages.
6. **Tests**: Added Vitest because the frontend previously had no test runner; smoke tests mock `fetch` for request/response handling.

## Files Changed

### Backend
| File | Why |
|------|-----|
| `backend/requirements.txt` | Pin DRF 3.15.* and simplejwt 5.3.* |
| `backend/src/core/settings/base.py` | JWT lifetimes, email settings, auth backends |
| `backend/src/authentication/*` | Model, serializers, views, URLs, tests |
| `backend/README.md` | Endpoint documentation |

### Frontend
| File | Why |
|------|-----|
| `frontend/src/api/auth.ts` | Fetch-based auth API functions |
| `frontend/src/api/authStorage.ts` | localStorage token helpers |
| `frontend/src/api/http.ts` | Optional 401 refresh retry |
| `frontend/src/api/auth.test.ts` | Vitest smoke tests |
| `frontend/src/pages/auth/SignIn.tsx` | Sign-in page |
| `frontend/src/pages/auth/ForgotPassword.tsx` | Forgot password page |
| `frontend/src/pages/auth/ResetPassword.tsx` | Reset password page |
| `frontend/src/App.tsx` | New auth routes |
| `frontend/src/store/slices/authSlice.ts` | `setSession` + authStorage integration |
| `frontend/vitest.config.ts` | Test runner config |
| `frontend/package.json` | `test` script, vitest/jsdom deps |
| `frontend/README.md` | Env vars, routes, manual verification |

## Verification

### Backend
```bash
cd backend
PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test SECRET_KEY=test-secret \
  python3 manage.py test authentication
```

### Frontend
```bash
cd frontend
npm run test
npm run lint
npm run build
```

## Open Questions / Follow-ups

- Legacy `/login` and `authService.ts` still use older endpoints; consider deprecating once all flows use `/auth/sign-in`.
- `http.ts` is available but not yet wired into the axios `apiService` interceptor.
