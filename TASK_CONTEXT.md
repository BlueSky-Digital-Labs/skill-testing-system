# Task Context: Candidate Groups (Backend + Frontend)

**Branch:** `sunset/task/feat-bc0e5ae2`  
**PR:** https://github.com/BlueSky-Digital-Labs/skill-testing-system/pull/11

## Scope

End-to-end **Candidate Groups** for organizing candidates into coordinator-managed cohorts.

### Backend (completed)
- `CandidateGroup` model with ManyToMany membership to `User`
- REST API under `/api/core/groups/` (CRUD + member add/remove actions)
- `IsCoordinatorOrAdmin` permission gating
- Django admin registration, audit logging, pytest coverage

### Frontend (this ticket)
- Coordinator-facing groups management UI at `/coordinator/groups` and `/coordinator/groups/:id`
- API client (`frontend/src/api/groups.ts`) integrated with shared `client.ts` (JWT via `apiFetch`)
- Reusable `GroupPicker` async-select for downstream assignment UI
- Role guard via `withCoordinatorGuard` (probes `GET /api/core/groups/`)

### Out of scope
- Wiring `Assignment.assignee_group_id` to `CandidateGroup` FK in assignment UI (GroupPicker is ready for integration)
- Server-side group search (list search filters client-side on the current page)

## Key Implementation Decisions

### Backend
1. **Project layout**: Models/serializers live in package modules; API routes in `core/api_urls.py` included at `/api/core/`.
2. **Membership rules**: Only active `CANDIDATE` users can be added; others appear in `invalid_users`.
3. **Member actions**: Accept `user_ids` and/or `emails`; always HTTP 200 with detailed result buckets.

### Frontend
1. **Access control**: `withCoordinatorGuard` + `useCoordinatorAccess` verify coordinator/system-admin access by calling `checkCoordinatorAccess()` (groups list endpoint). Unauthenticated users redirect to `/login`; denied users to `/dashboard?access=denied`.
2. **Data fetching**: Local component state (consistent with existing admin pages); no React Query dependency added.
3. **API mapping**: Client functions accept camelCase (`userIds`) and map to backend snake_case (`user_ids`).
4. **Member emails**: `parseAndDedupeEmails` + `filterValidEmails` utilities handle multiline/comma/semicolon input.
5. **Member list pagination**: Client-side pagination over `group.members` returned by detail endpoint (backend returns full member list).
6. **Group list search**: Client-side filter on the current API page (backend has no search param).
7. **Delete/remove confirmations**: `window.confirm` before destructive actions.
8. **UX**: Loading/empty/error states, toast notifications via existing `ToastProvider`.

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/core/groups/` | GET | Coordinator or system admin | List groups (paginated) |
| `/api/core/groups/` | POST | Coordinator or system admin | Create group |
| `/api/core/groups/{id}/` | GET | Coordinator or system admin | Retrieve group with members |
| `/api/core/groups/{id}/` | PATCH | Coordinator or system admin | Partial update |
| `/api/core/groups/{id}/` | DELETE | Coordinator or system admin | Delete group |
| `/api/core/groups/{id}/add-members/` | POST | Coordinator or system admin | Add members |
| `/api/core/groups/{id}/remove-members/` | POST | Coordinator or system admin | Remove members |

## Frontend Routes

| Route | Component | Guard |
|-------|-----------|-------|
| `/coordinator/groups` | `GroupsList` | `withCoordinatorGuard` |
| `/coordinator/groups/:id` | `GroupDetail` | `withCoordinatorGuard` |

## Files Changed

### Backend
| File | Why |
|------|-----|
| `backend/src/core/models/groups.py` | `CandidateGroup` model |
| `backend/src/core/migrations/0002_candidate_groups.py` | Migration |
| `backend/src/core/serializers/groups.py` | Serializers |
| `backend/src/core/views/group_views.py` | ViewSet |
| `backend/src/core/api_urls.py` | Router |
| `backend/src/core/tests/test_groups_api.py` | API tests |

### Frontend
| File | Why |
|------|-----|
| `frontend/src/types/groups.ts` | `Group`, `GroupDetail`, `MembershipResult` types |
| `frontend/src/api/groups.ts` | Groups API client |
| `frontend/src/api/groups.test.ts` | API client tests |
| `frontend/src/utils/groupEmails.ts` | Email parse/dedupe utilities |
| `frontend/src/utils/groupEmails.test.ts` | Utility tests |
| `frontend/src/auth/guards.tsx` | `withCoordinatorGuard` HOC |
| `frontend/src/hooks/useCoordinatorAccess.ts` | Coordinator access hook |
| `frontend/src/pages/coordinator/GroupsList.tsx` | Groups table + CRUD |
| `frontend/src/pages/coordinator/GroupDetail.tsx` | Group detail + member management |
| `frontend/src/pages/coordinator/EditGroupModal.tsx` | Create/edit modal |
| `frontend/src/pages/coordinator/groups.css` | Coordinator groups styles |
| `frontend/src/components/pickers/GroupPicker.tsx` | Async searchable group picker |
| `frontend/src/App.tsx` | Route registration |
| `frontend/src/components/organisms/Sidebar/Sidebar.tsx` | Nav link for coordinators |

## Verification

```bash
# Backend
cd backend
pip install -r requirements.txt
PYTHONPATH=src SECRET_KEY=test-secret-key DJANGO_SETTINGS_MODULE=core.settings.test \
  python3 -m pytest src/ -v

# Frontend
cd frontend
npm ci
npm test
npm run lint
npm run build
```

## Open Questions / Follow-ups

- Integrate `GroupPicker` into test assignment flow (`TestAssignPage`)
- Server-side group name search and member pagination if groups grow large
- FK from `Assignment.assignee_group_id` to `CandidateGroup`
- Coordinator UI for issuing invitations (separate ticket)
