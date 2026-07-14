# Task Context: Backend Role and User Management (sunset/task/9-24e719fa)

## Scope

Implement administrative user and role management in the Django/DRF backend:

- `Role` and `UserRole` models with migrations and default role seed data
- Admin CRUD APIs at `/api/admin/roles/` and `/api/admin/users/`
- `IsSystemAdmin` and `HasAnyRole` permission classes
- Role assignment/removal endpoints and business-rule enforcement
- Pytest coverage for roles, assignments, deactivation, and permissions

## Key Implementation Decisions

1. **Role-based access**: System administration is gated by the `SYSTEM_ADMIN` role (not Django `is_staff` alone). `user_has_role()` checks active user + active role assignment.
2. **URL layout**: Admin APIs live under `/api/admin/` (via `authentication.urls`) to avoid clashing with Django's `/admin/` site. Existing read-only user listing remains at `/api/auth/users/` as `AuthUserViewSet`.
3. **User profile fields**: Added optional `first_name` and `last_name` on `User` so `UserSerializer` can expose full admin user records.
4. **Business rules**:
   - `SYSTEM_ADMIN` role cannot be deactivated or deleted
   - Cannot deactivate/delete the last active system administrator
   - Cannot assign inactive roles
   - User delete is implemented as soft deactivation (`is_active=False`)
5. **Seed data**: Migration `0004_seed_default_roles` idempotently seeds `SYSTEM_ADMIN`, `EXAMINER`, `COORDINATOR`, and `CANDIDATE`.
6. **Testing**: Added `pytest.ini` and `test_roles.py`; full suite runs with `pytest` from `backend/`.

## Files Changed

| File | Why |
|------|-----|
| `backend/src/authentication/models.py` | `Role`, `UserRole`, `RoleKey`; `first_name`/`last_name` on `User` |
| `backend/src/authentication/migrations/0003_*.py` | Schema migration |
| `backend/src/authentication/migrations/0004_seed_default_roles.py` | Default role seed data |
| `backend/src/authentication/serializers.py` | `RoleSerializer`, `UserSerializer`, `UserRoleAssignSerializer` |
| `backend/src/authentication/views.py` | `RoleViewSet`, admin `UserViewSet`; renamed existing to `AuthUserViewSet` |
| `backend/src/authentication/urls.py` | Admin router for roles/users |
| `backend/src/authentication/utils.py` | `user_has_role`, `get_active_system_admin_count` |
| `backend/src/authentication/admin.py` | Django admin for `Role` / `UserRole` |
| `backend/src/authentication/tests/test_roles.py` | Role/user management tests |
| `backend/src/core/permissions.py` | `IsSystemAdmin`, `HasAnyRole` |
| `backend/src/core/settings/base.py` | OpenAPI tags for admin endpoints |
| `backend/pytest.ini` | Pytest configuration |
| `backend/.flake8` | Lint config (excludes migrations) |

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/roles/` | GET, POST | SYSTEM_ADMIN | List/create roles |
| `/api/admin/roles/{id}/` | GET, PUT, PATCH, DELETE | SYSTEM_ADMIN | Role detail/update/delete |
| `/api/admin/users/` | GET, POST | SYSTEM_ADMIN | List/create users |
| `/api/admin/users/{id}/` | GET, PUT, PATCH, DELETE | SYSTEM_ADMIN | User detail/update/soft-delete |
| `/api/admin/users/{id}/assign-role/` | POST | SYSTEM_ADMIN | Assign role by `role_key` |
| `/api/admin/users/{id}/remove-role/` | POST | SYSTEM_ADMIN | Remove role by `role_key` |

## Assumptions

- Admin API prefix is `/api/admin/` because `authentication.urls` is mounted at `/api/`.
- `is_staff` / `is_superuser` remain for Django admin and legacy endpoints; new admin APIs use role-based `SYSTEM_ADMIN`.
- Initial system administrators must be bootstrapped via Django admin, shell, or management command by assigning the `SYSTEM_ADMIN` role.

## Verification

```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test SECRET_KEY=test-secret pytest
flake8 src/authentication src/core/permissions.py
```

## Open Questions / Follow-ups

- Bootstrap command to promote the demo/seed user to `SYSTEM_ADMIN` on deploy.
- Extend role checks to grading/branding endpoints that currently use `IsAdminUser`.
- Audit logging for role assignment and user deactivation events.
