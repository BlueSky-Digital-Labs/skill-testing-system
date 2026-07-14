# Task Context: Candidate Onboarding (Backend + Frontend)

**Branch:** `sunset/task/feat-aea99f83`  
**PR:** https://github.com/BlueSky-Digital-Labs/skill-testing-system/pull/10

## Scope

End-to-end candidate onboarding:

### Backend
- Public self-registration (`POST /api/auth/self-register/`) when `ALLOW_SELF_REGISTRATION` is enabled
- Email invitations issued by system administrators or coordinators (`POST /api/auth/invitations/issue/`)
- Invitation acceptance with user creation/update and JWT issuance (`POST /api/auth/invitations/accept/`)

### Frontend
- Candidate self-registration page at `/register`
- Invitation acceptance page at `/accept-invite` (alias `/accept-invitation` for backend email links)
- Shared API client, form inputs, toast notifications, and Vitest coverage

## Key Implementation Decisions

### Backend
1. **`Invitation` model**: Partial unique constraint on pending invites per email.
2. **Self-registration**: Auto-assigns `CANDIDATE`; gated by `ALLOW_SELF_REGISTRATION` (default `false`).
3. **Invitation issuance**: `IsCoordinatorOrAdmin`; coordinators limited to `CANDIDATE` role.
4. **Re-issue behavior**: New invite invalidates prior pending invites for the same email.
5. **Email links**: `{FRONTEND_URL}/accept-invitation?token=<token>`.

### Frontend
1. **API layer**: Centralized fetch wrapper in `frontend/src/api/client.ts` (`apiFetch`, `postJson`, `ApiError` with `fieldErrors`). `auth.ts` now delegates to `client.ts`.
2. **Token validation**: No dedicated backend validate endpoint; `validateInviteToken` probes `POST /auth/invitations/accept/` with a weak password and treats password validation errors as a valid token.
3. **Routes**: `/register` → `SelfRegister` (replaces legacy `RegisterPage` route). `/accept-invite` and `/accept-invitation` both map to `AcceptInvite`.
4. **Session handoff**: On success, pages call `setTokens`, `dispatch(setSession)`, and navigate to `/dashboard` (same as `SignIn.tsx`).
5. **UX**: Reusable `TextInput` / `PasswordInput`, `ToastProvider` for success/error feedback, `aria-live` regions and disabled submit while loading.
6. **Self-registration disabled**: Backend returns 403; frontend surfaces the API error message via inline alert and toast.

## Files Changed

### Backend
| File | Why |
|------|-----|
| `backend/src/authentication/models.py` | `Invitation` model |
| `backend/src/authentication/migrations/0005_invitation.py` | Migration |
| `backend/src/authentication/invitations.py` | Token creation and email delivery |
| `backend/src/authentication/serializers.py` | Onboarding serializers |
| `backend/src/authentication/views.py` | Onboarding views |
| `backend/src/authentication/urls.py` | URL paths |
| `backend/src/core/settings/base.py` | `ALLOW_SELF_REGISTRATION` |
| `backend/src/core/settings/test.py` | Test overrides |
| `backend/src/authentication/tests/test_onboarding.py` | Backend tests |

### Frontend
| File | Why |
|------|-----|
| `frontend/src/api/client.ts` | Fetch wrapper with JSON/error/token handling |
| `frontend/src/api/candidates.ts` | `selfRegister`, `validateInviteToken`, `acceptInvite` |
| `frontend/src/api/auth.ts` | Refactored to use shared client |
| `frontend/src/components/Form/TextInput.tsx` | Reusable text input |
| `frontend/src/components/Form/PasswordInput.tsx` | Reusable password input with toggle |
| `frontend/src/components/Toast.tsx` | Toast notification provider/hook |
| `frontend/src/pages/candidates/SelfRegister.tsx` | Self-registration page |
| `frontend/src/pages/candidates/AcceptInvite.tsx` | Invitation acceptance page |
| `frontend/src/App.tsx` | New routes |
| `frontend/src/main.tsx` | `ToastProvider` wrapper |
| `frontend/.env.development` | Local `VITE_API_BASE_URL` |
| `frontend/src/api/client.test.ts` | Client error handling tests |
| `frontend/src/api/candidates.test.ts` | Candidates API tests |
| `frontend/src/pages/candidates/SelfRegister.test.tsx` | Page tests |
| `frontend/src/pages/candidates/AcceptInvite.test.tsx` | Page tests |

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/self-register/` | POST | Public | Register as candidate |
| `/api/auth/invitations/issue/` | POST | Coordinator or system admin | Issue invitation email |
| `/api/auth/invitations/accept/` | POST | Public | Accept invitation, return JWT |

## Frontend Routes

| Route | Component | Notes |
|-------|-----------|-------|
| `/register` | `SelfRegister` | Candidate self-registration |
| `/accept-invite` | `AcceptInvite` | `?token=` query param |
| `/accept-invitation` | `AcceptInvite` | Alias for backend email links |

## Environment Variables

| Variable | Scope | Default | Purpose |
|----------|-------|---------|---------|
| `ALLOW_SELF_REGISTRATION` | Backend | `false` | Toggle public self-registration |
| `FRONTEND_URL` | Backend | — | Invitation/reset email links |
| `VITE_API_BASE_URL` | Frontend | — (`http://localhost:8000` in `.env.development`) | API base URL |

## Verification

```bash
# Backend
cd backend
PYTHONPATH=src SECRET_KEY=test-secret-key DJANGO_SETTINGS_MODULE=core.settings.test \
  python3 manage.py test authentication branding audit grading core

# Frontend
cd frontend
npm ci
npm test
npm run lint
npm run build
```

## Open Questions / Follow-ups

- Coordinator UI for issuing invitations (backend endpoint exists; no frontend page yet).
- Dedicated backend `GET /auth/invitations/validate/` to avoid probe-based token validation.
- HTML invitation emails using branding templates.
- Deprecate legacy `RegisterPage` component if no longer needed elsewhere.
