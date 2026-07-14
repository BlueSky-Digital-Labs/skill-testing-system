# Task Context: Candidate Onboarding (Self-Registration & Invitations)

**Branch:** `sunset/task/feat-aea99f83`

## Scope

Backend support for candidate onboarding via:

- Public self-registration (`POST /api/auth/self-register/`) when `ALLOW_SELF_REGISTRATION` is enabled
- Email invitations issued by system administrators or coordinators (`POST /api/auth/invitations/issue/`)
- Invitation acceptance with user creation/update and JWT issuance (`POST /api/auth/invitations/accept/`)

## Key Implementation Decisions

1. **`Invitation` model**: Mirrors `PasswordResetToken` patterns with `expires_at`, `accepted_at`, and a partial unique constraint on `email` where `accepted_at` is null (one pending invite per email).
2. **Self-registration**: Auto-assigns the `CANDIDATE` role on successful registration; gated by `ALLOW_SELF_REGISTRATION` (default `false`).
3. **Invitation issuance**: Uses existing `IsCoordinatorOrAdmin` permission. Coordinators may only invite `CANDIDATE` roles; system admins may invite any active role.
4. **Re-issue behavior**: Creating a new invitation for an email invalidates prior pending invitations by setting their `accepted_at` timestamp (same pattern as password-reset token invalidation).
5. **Invitation acceptance**: Creates a new user or updates an existing account (password, name, reactivation), assigns the invited role, marks the invitation consumed, and returns JWT tokens.
6. **Email links**: Invitation emails use `{FRONTEND_URL}/accept-invitation?token=<token>` (password reset continues to use `/reset-password?token=`).

## Files Changed

| File | Why |
|------|-----|
| `backend/src/authentication/models.py` | Added `Invitation` model and expiry helper |
| `backend/src/authentication/migrations/0005_invitation.py` | Database migration for invitations |
| `backend/src/authentication/invitations.py` | Token creation and invitation email delivery |
| `backend/src/authentication/serializers.py` | `SelfRegistrationSerializer`, `InvitationIssueSerializer`, `InvitationAcceptSerializer` |
| `backend/src/authentication/views.py` | `SelfRegistrationView`, `InvitationIssueView`, `InvitationAcceptView` |
| `backend/src/authentication/urls.py` | Registered onboarding URL paths |
| `backend/src/core/settings/base.py` | Added `ALLOW_SELF_REGISTRATION` setting |
| `backend/src/core/settings/test.py` | Enabled self-registration for tests |
| `backend/src/authentication/tests/test_onboarding.py` | Full onboarding test coverage |
| `README.md` | Documented endpoints, env vars, and email behavior |

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/self-register/` | POST | Public | Register as candidate (requires `ALLOW_SELF_REGISTRATION=true`) |
| `/api/auth/invitations/issue/` | POST | Coordinator or system admin | Create and email an invitation |
| `/api/auth/invitations/accept/` | POST | Public | Accept invitation, create/update user, return JWT |

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `ALLOW_SELF_REGISTRATION` | `false` | Toggle public candidate self-registration |
| `FRONTEND_URL` | — | Base URL for invitation and password-reset links |
| `EMAIL_BACKEND` | console | Email delivery backend |
| `DEFAULT_FROM_EMAIL` | `no-reply@example.test` | Sender address for invitation emails |

## Verification

```bash
cd backend
# With Docker:
make test

# Or locally:
cd src && DJANGO_SETTINGS_MODULE=core.settings.test python manage.py test authentication.tests.test_onboarding
```

## Open Questions / Follow-ups

- Frontend pages for `/accept-invitation` and self-registration UI.
- Async invitation email delivery via Celery (password reset is currently synchronous).
- HTML invitation emails using branding app templates.
