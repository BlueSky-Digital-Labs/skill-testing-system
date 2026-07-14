# Task Context: Test Builder UI (Frontend)

**Branch:** `sunset/task/feat-26133733`  
**PR:** https://github.com/BlueSky-Digital-Labs/skill-testing-system/pull/18

## Scope

Implement examiner-facing Test Builder UI in the React frontend: list page, editor page, reusable builder components, React Query API integration, validation, and tests.

### In scope (completed)
- Routes: `/tests` (list), `/tests/:id` (editor), `/tests/:id/preview` (read-only preview)
- Components under `frontend/src/components/tests/`: meta form, rules builder, question picker, settings/integrity/visibility panels, lifecycle controls, preview launcher
- API client `frontend/src/api/tests.ts` with React Query hooks in `hooks/useTests.ts`
- Form validation via `utils/testBuilder.ts`
- Vitest coverage for components, pages, API client, and validation helpers
- Minimal backend `GET /api/tests/` list endpoint to support the list page

### Out of scope / deferred
- Full candidate-facing test delivery UI
- Deep question preview with live question bank text in preview table
- Sidebar navigation link (can be added when IA is finalized)

## Key Implementation Decisions

1. **React Query introduced** via `@tanstack/react-query` and `QueryClientProvider` in `main.tsx` for test builder data flows.
2. **Single-section editor model** maps UI state to one backend section with `assembly_mode` in section settings.
3. **Examiner guard** on list/editor/preview routes; assignment route remains coordinator-accessible via existing page.
4. **Preview route** shows pinned question link metadata; full question text preview deferred until detail API enrichment.
5. **Backend list endpoint** added on same branch (`GET /api/tests/`) because prior API only supported create/detail.

## Files Changed

| Area | Files | Why |
|------|-------|-----|
| Frontend pages | `pages/tests/index.tsx`, `[id].tsx`, `preview.tsx` | List, editor, preview routes |
| Frontend components | `components/tests/*` | Builder UI panels |
| Frontend API/hooks | `api/tests.ts`, `hooks/useTests.ts`, `types/tests.ts`, `utils/testBuilder.ts` | API + state + validation |
| Frontend app | `App.tsx`, `main.tsx`, `types/index.ts` | Routing and React Query setup |
| Frontend tests | `*.test.tsx`, `api/tests.test.ts`, `utils/testBuilder.test.ts` | Coverage |
| Backend (supporting) | `tests/views.py` | `GET /api/tests/` list endpoint |

## Verification

```bash
cd frontend
npm ci
npm test
npm run lint
npm run build

cd ../backend
SECRET_KEY=test-secret DJANGO_SETTINGS_MODULE=core.settings.test PYTHONPATH=src python3 -m pytest src/tests/tests/ -v
```

Results: **154** frontend tests passed; backend tests app tests pass.

## Open Questions / Follow-ups

- Enrich preview with question bank text joins
- Add `/tests` link to sidebar navigation
- Support multi-section editing in UI when product requires it
