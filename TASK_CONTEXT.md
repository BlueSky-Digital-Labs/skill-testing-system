# Task Context: Admin User & Role Management UI

## Scope

Implement a React/Vite admin UI for managing users and roles:

- API client at `frontend/src/api/admin.ts` for `/api/admin/users/` and `/api/admin/roles/`
- `/admin/users` — searchable, paginated user list with create/edit modal and activation toggle
- `/admin/roles` — role list with create/edit modal; `SYSTEM_ADMIN` cannot be deactivated in the UI
- `RoleMultiSelect` component for assigning roles by key
- `SystemAdminRoute` guard and sidebar links visible only to `SYSTEM_ADMIN` users
- Vitest/RTL tests for API client, component, and pages
- `frontend/README.md` admin access instructions

## Key Implementation Decisions

1. **Access control**: Users/roles endpoints require `SYSTEM_ADMIN` (not staff/branding). Added `SystemAdminRoute` and `useSystemAdminAccess` that probe `GET /api/admin/roles/`; branding/grading/audit keep existing `AdminRoute` / `useAdminAccess`.
2. **Role sync on user save**: Backend assigns roles via `assign-role` / `remove-role` actions, not the main user serializer. `createUser` / `updateUser` orchestrate those calls after `POST`/`PATCH`.
3. **Search param mapping**: `listUsers(q)` maps `q` to backend `email` query filter.
4. **401 handling**: `admin.ts` clears tokens and redirects to `/login` on `401`, consistent with session expiry behavior elsewhere.
5. **Field errors**: Validation responses attach `fieldErrors` on thrown `ApiError` for inline form messages.

## Files Changed

| File | Why |
|------|-----|
| `frontend/src/api/admin.ts` | Admin API types and functions |
| `frontend/src/api/admin.test.ts` | API client unit tests |
| `frontend/src/components/RoleMultiSelect.tsx` | Multi-role checkbox selector |
| `frontend/src/components/RoleMultiSelect.css` | Role selector styles |
| `frontend/src/components/RoleMultiSelect.test.tsx` | Component tests |
| `frontend/src/components/organisms/SystemAdminRoute/*` | Route guard for system admins |
| `frontend/src/hooks/useSystemAdminAccess.ts` | Sidebar/route access hook |
| `frontend/src/hooks/index.ts` | Export new hook |
| `frontend/src/pages/admin/UsersPage.tsx` | User management page |
| `frontend/src/pages/admin/UsersPage.test.tsx` | Users page tests |
| `frontend/src/pages/admin/RolesPage.tsx` | Role management page |
| `frontend/src/pages/admin/RolesPage.test.tsx` | Roles page tests |
| `frontend/src/pages/admin/admin.css` | Shared admin page styles |
| `frontend/src/pages/admin/index.ts` | Page exports |
| `frontend/src/App.tsx` | Registered `/admin/users` and `/admin/roles` |
| `frontend/src/components/organisms/Sidebar/Sidebar.tsx` | Conditional Users/Roles nav |
| `frontend/README.md` | Admin access documentation |

## API Integration

| Function | Endpoint | Notes |
|----------|----------|-------|
| `listUsers(q, page)` | `GET /api/admin/users/?email=&page=` | Paginated (20/page) |
| `createUser(payload)` | `POST /api/admin/users/` + assign-role | Roles synced after create |
| `updateUser(id, patch)` | `PATCH /api/admin/users/:id/` + role actions | Optional `roles` array |
| `listRoles()` | `GET /api/admin/roles/` | Also used for access probe |
| `createRole(payload)` | `POST /api/admin/roles/` | |
| `updateRole(id, patch)` | `PATCH /api/admin/roles/:id/` | |

## Verification

```bash
cd frontend
npm ci
npm test
npm run lint
npm run build
```

Sign in as a `SYSTEM_ADMIN` user and open `/admin/users` or `/admin/roles`.

## Open Questions / Follow-ups

- Add password reset invite flow when creating users without a password.
- Paginate roles list if custom roles grow beyond one page.
- Consolidate `AdminRoute` and `SystemAdminRoute` behind a single configurable guard.
