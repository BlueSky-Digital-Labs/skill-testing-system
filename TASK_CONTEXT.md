# Task Context: Full-Stack Feature Integration (Task #41)

**Branch:** `sunset/task/41-3385d121`  
**PR:** _(pending)_

## Scope

Integrate implemented frontend features into the skill-testing-system monorepo so the React UI and Django backend work cohesively end-to-end. Replace starter-template boilerplate, wire navigation and routes to real feature pages, connect UI to existing API services, and ensure demo seed data supports integrated flows.

### In scope

- Replace demo dashboard (hardcoded jobs/workers data) with role-aware summary cards backed by existing APIs
- Remove dead sidebar links (`/jobs`, `/calendar`, etc.) and expose skill-testing features (question bank, assignments, groups, grading, admin)
- Add `/assignments` coordinator route listing test assignments with links to test detail and assign flows
- Wire `TestDetailPage` to `listAssignments` using route `testId`
- Extend `seed_demo` with RBAC roles, sample questions, a candidate group, and a demo assignment
- Frontend/backend tests for new integration surfaces

### Out of scope / deferred

- Test composition API (no `Test` model yet; question list on test detail remains informational)
- Consolidating dual auth stacks (`LoginPage` axios vs `SignIn` fetch)
- Mounting orphaned `Layout` / `Header` / `RegisterPage` components
- `GroupPicker` adoption in assign form (still uses plain ID fields)

## Key Implementation Decisions

1. **Dashboard aggregates existing APIs** — `useDashboardStats` fetches counts from `listQuestions`, `listAssignments`, `listGroupsPaginated`, and `listQueue` based on role probes (`useExaminerAccess`, `useCoordinatorAccess`, `useAdminAccess`). No new backend summary endpoint.
2. **Assignments hub at `/assignments`** — Coordinator-guarded list page reuses `pages/tests/assign/api.ts` and links to `/tests/:testId` and `/tests/:testId/assign`.
3. **Test detail shows assignments, not composition** — Backend stores `test_id` as an opaque UUID without question membership; the page loads assignments for the route id and keeps question rendering for tests/props only.
4. **Seed data uses stable demo test UUID** — `11111111-1111-4111-8111-111111111111` for repeatable assignment links in docs and UI demos.
5. **Sidebar active-state helper** — `isPathActive` covers nested routes (e.g. `/questions/import` highlights Question bank).

## Files Changed

| File | Why |
|------|-----|
| `frontend/src/App.tsx` | Register `/assignments` route with coordinator guard |
| `frontend/src/components/organisms/Sidebar/Sidebar.tsx` | Skill-testing navigation; remove template dead links |
| `frontend/src/content/index.ts` | Dashboard/sidebar copy for assessment domain |
| `frontend/src/pages/dashboard/DashboardPage.tsx` | Role-aware dashboard with live API stats |
| `frontend/src/pages/dashboard/DashboardPage.css` | Quick links + recent assignments styling |
| `frontend/src/pages/dashboard/useDashboardStats.ts` | Dashboard data hook |
| `frontend/src/pages/dashboard/DashboardPage.test.tsx` | Dashboard integration test |
| `frontend/src/pages/tests/AssignmentsListPage.tsx` | Coordinator assignments index |
| `frontend/src/pages/tests/AssignmentsListPage.test.tsx` | Assignments list test |
| `frontend/src/pages/tests/TestDetailPage.tsx` | Wire to `listAssignments` via route param |
| `frontend/src/pages/tests/TestDetailPage.test.tsx` | Updated tests for API wiring |
| `frontend/src/pages/tests/tests.css` | Layout styles for test/assignment pages |
| `backend/src/authentication/management/commands/seed_demo.py` | Roles, questions, group, assignment seed data |
| `backend/src/authentication/tests/test_seed_demo.py` | Seed command regression test |

## Verification

```bash
# Frontend
cd frontend && npm ci && npm test && npm run lint && npm run build

# Backend
cd backend && SECRET_KEY=test-secret-key python3 -m pytest -q
```

## Open Questions / Follow-ups

- Add a dedicated tests index API when the `Test` model lands so test detail can show composition
- Link grading/results/attempt routes from assignment rows once attempt ids are surfaced in assignment APIs
- Consider `GroupPicker` in `AssignForm` to replace manual group UUID entry
