# Task Context: Candidate Groups (Backend)

**Branch:** `sunset/task/feat-bc0e5ae2`  
**PR:** _(to be added after creation)_

## Scope

Backend-only implementation of **Candidate Groups**: a coordinator/admin-managed grouping of candidate users for assignment targeting and cohort organization.

### In scope
- `CandidateGroup` model with ManyToMany membership to `User`
- REST API under `/api/core/groups/` (CRUD + member add/remove actions)
- `IsCoordinatorOrAdmin` permission gating
- Django admin registration
- Audit logging and structured application logging for group lifecycle events
- Pytest coverage for CRUD and membership management

### Out of scope
- Frontend UI for group management
- Wiring `Assignment.assignee_group_id` to `CandidateGroup` FK (assignments still store a bare UUID)

## Key Implementation Decisions

1. **Project layout**: The repo uses package modules (`core/models/`, `core/serializers/`, `core/permissions/`) rather than flat `models.py` / `serializers.py` files referenced in the ticket. Functionality is implemented in those packages; API routes live in `core/api_urls.py` because `core/urls.py` is the Django root URLconf.
2. **`IsCoordinatorOrAdmin`**: Centralized in `core/permissions/__init__.py` and re-exported from `assignment_permissions.py` for backward compatibility.
3. **Membership rules**: Only users with the active `CANDIDATE` role may be added. Non-candidates are reported in `invalid_users` without failing the whole request.
4. **Member resolution**: `add-members` / `remove-members` accept `user_ids` (integer PKs) and/or `emails` (case-insensitive). Responses always return HTTP 200 with detailed buckets: `added`/`removed`, `already_members`/`not_members`, `invalid_users`, and `not_found`.
5. **Serializers**: Summary serializer for list (includes `member_count`); detail serializer for retrieve/create/update responses (includes `members` and `created_by_id`).
6. **Logging**: Python `logging` plus hash-chained audit entries via `audit.utils.log_action` for create/update/delete and membership changes.
7. **Dependencies**: `djangorestframework==3.15.*` already present in `requirements.txt`; no change required.

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/core/groups/` | GET | Coordinator or system admin | List groups (paginated) |
| `/api/core/groups/` | POST | Coordinator or system admin | Create group |
| `/api/core/groups/{id}/` | GET | Coordinator or system admin | Retrieve group with members |
| `/api/core/groups/{id}/` | PATCH | Coordinator or system admin | Partial update |
| `/api/core/groups/{id}/` | DELETE | Coordinator or system admin | Delete group |
| `/api/core/groups/{id}/add-members/` | POST | Coordinator or system admin | Add members by `user_ids` and/or `emails` |
| `/api/core/groups/{id}/remove-members/` | POST | Coordinator or system admin | Remove members by `user_ids` and/or `emails` |

## Files Changed

| File | Why |
|------|-----|
| `backend/src/core/models/groups.py` | `CandidateGroup` model |
| `backend/src/core/models/__init__.py` | Export `CandidateGroup` |
| `backend/src/core/migrations/0002_candidate_groups.py` | Schema migration |
| `backend/src/core/serializers/groups.py` | Summary, detail, write, and member-action serializers |
| `backend/src/core/permissions/__init__.py` | `IsCoordinatorOrAdmin` permission |
| `backend/src/core/permissions/assignment_permissions.py` | Re-export `IsCoordinatorOrAdmin` |
| `backend/src/core/views/group_views.py` | ViewSet with CRUD and member actions |
| `backend/src/core/api_urls.py` | Router registration for `/api/core/` |
| `backend/src/core/urls.py` | Include `api/core/` routes |
| `backend/src/core/admin.py` | Admin registration |
| `backend/src/core/settings/base.py` | OpenAPI tag for candidate groups |
| `backend/src/core/tests/test_groups_api.py` | API tests |

## Verification

```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=src SECRET_KEY=test-secret-key DJANGO_SETTINGS_MODULE=core.settings.test \
  python3 -m pytest src/ -v

python3 -m flake8 src/core/models/groups.py src/core/serializers/groups.py \
  src/core/views/group_views.py src/core/api_urls.py src/core/admin.py \
  src/core/permissions/__init__.py src/core/permissions/assignment_permissions.py \
  src/core/tests/test_groups_api.py
```

## Open Questions / Follow-ups

- Should `Assignment.assignee_group_id` become a FK to `CandidateGroup` once assignment flows consume groups?
- Should coordinators be restricted to groups they created, or is org-wide visibility correct?
- Bulk import of members (CSV) and group duplication utilities.
