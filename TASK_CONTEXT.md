# Task Context: Results Release Gates & Candidate Visibility (FR-14, FR-26)

**Branch:** `sunset/task/feat-1b924124`  
**PR:** https://github.com/BlueSky-Digital-Labs/skill-testing-system/pull/13

## Scope

End-to-end **results release gates** and **candidate visibility enforcement** (FR-14, FR-26). Staff control when attempt results are released and at what disclosure level; candidates only see their own released results.

### Backend (completed)
- `results` Django app with `ReleaseControl` model
- Service helpers: `mark_release`, `get_candidate_view`, `get_release_status`
- REST API at `/api/results/` integrated with `CombinedResult` and `ObjectiveScore`
- 23 pytest tests for release workflow and visibility rules

### Frontend (this ticket)
- API client (`frontend/src/api/results.ts`)
- Staff page `ReleaseControl` at `/admin/results/release/:attemptId`
- Candidate page `CandidateResult` at `/results/:attemptId`
- `useAuth` extended with `isStaff` / `isStaffChecking` (via existing admin access probe)
- Vitest coverage: API client, submission flow, snapshot tests for disclosure states

### Out of scope
- Audit log entries on release/revoke
- Automatic `candidate_user_id` binding from assignments
- Coordinator role for release actions

## Key Implementation Decisions

### Backend
1. **Permissions**: Staff (`is_staff`) for release/status endpoints; authenticated users for candidate view with server-side ownership checks.
2. **Disclosure levels**: `none`, `summary` (aggregates), `detailed` (aggregates + item correctness).
3. **Release lifecycle**: `mark_release` creates `ReleaseControl` on first release when `candidate_user_id` is provided and `CombinedResult` exists.

### Frontend
1. **Staff guard**: `AdminRoute` (branding probe) for `/admin/results/release/:attemptId`, matching grading pages.
2. **Candidate guard**: `ProtectedRoute` with authentication; backend enforces attempt ownership.
3. **ReleaseControl form**: Radio disclosure options, release toggle, hidden `test_id` / `candidate_user_id` passed through on submit.
4. **CandidateResult rendering**: `withheld` → message only; `summary` → totals/by-topic; `detailed` → adds question correctness table.
5. **isStaff in useAuth**: Reuses `useAdminAccess` (getBranding probe) for route guards and future UI conditionals.

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/results/release/` | POST | Staff | Set release state and disclosure |
| `/api/results/status/<attempt_id>/` | GET | Staff | Return `ReleaseControl` record |
| `/api/results/candidate/<attempt_id>/` | GET | Authenticated | Candidate-scoped result view |

## Frontend Routes

| Route | Component | Guard |
|-------|-----------|-------|
| `/admin/results/release/:attemptId` | `ReleaseControl` | `AdminRoute` (staff) |
| `/results/:attemptId` | `CandidateResult` | `ProtectedRoute` (authenticated) |

## Files Changed

### Backend
| File | Why |
|------|-----|
| `backend/src/results/**` | Models, services, views, tests, migration |
| `backend/src/core/settings/base.py` | App registration |
| `backend/src/core/urls.py` | URL include |

### Frontend
| File | Why |
|------|-----|
| `frontend/src/api/results.ts` | Results API client |
| `frontend/src/api/results.test.ts` | API client tests |
| `frontend/src/pages/results/ReleaseControl.tsx` | Staff release/disclosure form |
| `frontend/src/pages/results/CandidateResult.tsx` | Candidate result view |
| `frontend/src/pages/results/results.css` | Page styles |
| `frontend/src/pages/results/index.ts` | Barrel exports |
| `frontend/src/pages/results/*.test.tsx` | Component + snapshot tests |
| `frontend/src/hooks/useAuth.ts` | Added `isStaff` / `isStaffChecking` |
| `frontend/src/App.tsx` | Route registration |

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

Results: **173** backend tests passed; **117** frontend tests passed; build succeeds.

## Open Questions / Follow-ups

- Emit audit log events when results are released or revoked
- Tie `candidate_user_id` to assignment/attempt ownership automatically
- Sidebar navigation links to release control from grading workflow
- Expose `is_staff` on `/api/auth/me/` to avoid branding probe for staff checks
