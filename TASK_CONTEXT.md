# Task Context: Backend Assignments and Availability Enforcement (sunset/task/feat-f7d06aea)

## Scope

Implement exam assignment scheduling and availability enforcement in the Django/DRF backend:

- `Assignment` model with migrations under `core`
- Availability helpers (`is_within_window`, `is_overdue`, `attempts_remaining`, `assignment_state`)
- Assignment serializers with computed `state` and create-time validation
- `IsCoordinatorOrAdmin` permission (COORDINATOR or SYSTEM_ADMIN)
- Assignment API at `/api/assignments/` with list filtering by dashboard `state`
- Pytest coverage for create, list filters, temporal validation, and archive

## Key Implementation Decisions

1. **Core as a Django app**: Registered `core.apps.CoreConfig` so assignment models and migrations live in `backend/src/core/` as specified. Existing shared permissions and audit helper views were moved into package modules (`core/permissions/`, `core/views/`) to avoid import shadowing.
2. **External UUID references**: `test_id`, `assignee_user_id`, `assignee_group_id`, and `created_by_user_id` are `UUIDField`s without FKs. `test_id` has a TODO for a future `Test` model. `created_by_user_id` is derived from the authenticated user's integer PK via `uuid.UUID(int=user_pk)` on create.
3. **Dashboard state**: List queries annotate `state` (`upcoming`, `open`, `overdue`, `closed`, `archived`) using `Case`/`When` so `?state=` filters work at the database layer. Retrieve/create responses compute state via the same helper when no annotation is present.
4. **Unique constraints**: DB-level uniqueness on `(test_id, assignee_user_id)` and `(test_id, assignee_group_id)`. DRF's auto-generated unique validators are disabled on `AssignmentCreateSerializer` because they incorrectly require both assignee fields when only one is set.
5. **Permissions**: Coordinators and system administrators may manage assignments. Candidates and other roles receive 403.
6. **Archive**: Custom `POST /api/assignments/{id}/archive/` sets `status=archived` (soft archive, not delete).

## Files Changed

| File | Why |
|------|-----|
| `backend/src/core/apps.py` | Register `core` as a Django app |
| `backend/src/core/models/assignments.py` | `Assignment` model and `AssignmentStatus` |
| `backend/src/core/models/__init__.py` | Model exports |
| `backend/src/core/migrations/0001_initial.py` | Schema migration for assignments |
| `backend/src/core/services/availability.py` | Window, overdue, attempts, and state helpers |
| `backend/src/core/serializers/assignments.py` | Read/create serializers with validation |
| `backend/src/core/permissions/__init__.py` | Moved shared `IsSystemAdmin` / `HasAnyRole` |
| `backend/src/core/permissions/assignment_permissions.py` | `IsCoordinatorOrAdmin` |
| `backend/src/core/views/assignments.py` | `AssignmentViewSet` with state annotations |
| `backend/src/core/views/__init__.py` | Moved `test_audit_log` from deleted `views.py` |
| `backend/src/core/urls.py` | Registered assignments router at `/api/assignments/` |
| `backend/src/core/settings/base.py` | Added `core` app and OpenAPI tag |
| `backend/src/core/tests/test_assignments_api.py` | API and availability tests |
| `backend/src/core/permissions.py` | Removed (replaced by package) |
| `backend/src/core/views.py` | Removed (replaced by package) |

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/assignments/` | GET | COORDINATOR, SYSTEM_ADMIN | List assignments (filter: `test_id`, `assignee_user_id`, `assignee_group_id`, `status`, `state`) |
| `/api/assignments/` | POST | COORDINATOR, SYSTEM_ADMIN | Create assignment |
| `/api/assignments/{id}/` | GET | COORDINATOR, SYSTEM_ADMIN | Retrieve assignment |
| `/api/assignments/{id}/` | PATCH | COORDINATOR, SYSTEM_ADMIN | Partial update |
| `/api/assignments/{id}/archive/` | POST | COORDINATOR, SYSTEM_ADMIN | Archive assignment |

## Assumptions

- Assignee and test UUIDs are validated only for format, not existence in other services yet.
- Nullable unique constraints allow multiple rows with `NULL` assignee fields at the DB level; serializer enforces at least one assignee on create.
- Temporal order: `opens_at <= due_at <= closes_at` when those fields are provided.

## Verification

```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test SECRET_KEY=test-secret pytest
PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test SECRET_KEY=test-secret python manage.py makemigrations core
flake8 src/core/models src/core/services src/core/serializers src/core/permissions src/core/views/assignments.py src/core/tests/test_assignments_api.py
```

## Open Questions / Follow-ups

- Replace `test_id` UUID with a `ForeignKey` when the Test model lands.
- Map `created_by_user_id` / `assignee_user_id` to `authentication.User` once user IDs are UUID-based or a mapping table exists.
- Partial unique indexes (PostgreSQL) to prevent duplicate NULL assignee rows if that becomes a concern.
- Candidate-facing assignment discovery and attempt submission APIs.
