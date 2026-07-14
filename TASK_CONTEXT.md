# Task Context: Frontend Test Assignment UI (Task #13 / sunset/task/feat-frontend-assign)

## Scope

Implement a coordinator-facing React UI for assigning tests to users and groups:

- Route `/tests/:testId/assign` rendering `TestAssignPage`
- Assignment form with datetime windows, attempt limits, shuffle toggles, and comma-separated user/group UUID entry
- Page-local API client for bulk assignment creation and filtered listing
- Assignments table with state/status filters
- React Testing Library coverage for submission, validation, filtering, and partial failure feedback

## Key Implementation Decisions

1. **Route guard**: Uses `ProtectedRoute` (not `AdminRoute`) because coordinators may not pass staff/branding checks; the backend assignments API enforces `COORDINATOR` / `SYSTEM_ADMIN` roles.
2. **Bulk creation**: `postBulkAssignments()` fans out to one `POST /api/assignments/` per assignee, chunked in batches of 25 with per-assignee error collection and a summary message when partial failures occur.
3. **Same-origin API**: Uses existing `authorizedFetch` + `getApiBase()` (`/api` relative path) — no absolute URLs.
4. **Datetime UX**: `datetime-local` inputs convert to ISO via `Date.toISOString()`; `dueAt` / `closesAt` stay disabled until `opensAt` is set and receive +1 / +2 day suggestions when opens changes.
5. **Validation**: Client-side checks for at least one assignee, UUID format, temporal ordering (`opensAt <= dueAt <= closesAt`), and `maxAttempts >= 1` in `validation.ts`.
6. **Feedback ordering**: Submit success/error messages are applied after list refresh so `loadAssignments()` does not clear partial-failure errors.

## Files Changed

| File | Why |
|------|-----|
| `frontend/src/pages/tests/assign/index.tsx` | `TestAssignPage` — wires form, table, and API |
| `frontend/src/pages/tests/assign/AssignForm.tsx` | Assignment creation form |
| `frontend/src/pages/tests/assign/AssignmentsTable.tsx` | Filterable assignments table |
| `frontend/src/pages/tests/assign/api.ts` | `postBulkAssignments`, `listAssignments` |
| `frontend/src/pages/tests/assign/validation.ts` | Form validation helpers |
| `frontend/src/pages/tests/assign/TestAssignPage.css` | Page styling |
| `frontend/src/pages/tests/assign/__tests__/TestAssignPage.test.tsx` | RTL tests |
| `frontend/src/App.tsx` | Registered `/tests/:testId/assign` route |

## API Integration

| Function | Endpoint | Notes |
|----------|----------|-------|
| `listAssignments(params)` | `GET /api/assignments/` | Filters: `test_id`, `state`, `status`, etc. |
| `postBulkAssignments(payload)` | `POST /api/assignments/` (per assignee) | Chunked; returns `{ created, failed }` |

Depends on backend assignments API from PR #8 (`sunset/task/feat-f7d06aea`).

## Verification

```bash
cd frontend
npm ci
npm test
npm run lint
npm run build
```

Navigate to `/tests/<test-uuid>/assign` while authenticated as a coordinator or system admin.

## Open Questions / Follow-ups

- Add sidebar navigation link once a test catalog/list page exists.
- Replace comma-separated UUID inputs with searchable user/group pickers.
- Dedicated coordinator route guard that probes assignments API instead of generic auth.
- Surface archive action and pagination in the assignments table.
