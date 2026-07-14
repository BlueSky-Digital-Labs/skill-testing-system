# Task Context: Question Version-Aware Authoring UI (Frontend)

**Branch:** `sunset/task/frontend-question-version-ui`  
**PR:** _(pending)_

## Scope

Add version-aware authoring UI for question authors in the frontend, displaying version numbers, warning banners, save confirmation modals, and placeholder version history — integrated with existing question authoring components and optional backend versioning fields.

### In scope (completed)
- `QuestionEditPage.tsx` — version label, warning banner, save confirmation modal, collapsible version history
- `TestDetailPage.tsx` — placeholder test detail view with per-question version badges
- Shared components: `QuestionVersionBadge`, `SaveVersionConfirmModal`, `VersionHistorySection`
- Optional `latest_version_number` / `version_history` fields on `Question` type
- Version column on `QuestionsList` when data is present
- Vitest coverage for version display, warnings, modal flow, placeholders, and error handling

### Out of scope / deferred
- Backend API exposure of `latest_version_number` and version history (UI hides version elements when absent)
- Full test detail data fetching from backend
- Deep-linking to individual version snapshots

## Key Implementation Decisions

1. **`QuestionEditPage` replaces inline editor logic**: `QuestionEditor.tsx` re-exports `QuestionEditPage` for backward compatibility with existing routes/tests.
2. **Graceful degradation**: Version UI renders only when `latest_version_number` is a number ≥ 1; missing/incomplete API data hides badges, warnings, and save modal.
3. **Save confirmation**: Edit saves for versioned questions open an accessible modal (focus trap, Escape, `aria-*`) before calling `updateQuestion`.
4. **Version history**: Collapsible section lists `version_history` when provided; otherwise shows a placeholder message for future backend links.
5. **`TestDetailPage` props**: Accepts optional `questions` with `versionNumber` for badge display until test composition API lands.

## Files Changed

| File | Why |
|------|-----|
| `frontend/src/types/questionBank.ts` | Optional version fields on `Question` |
| `frontend/src/pages/questions/QuestionEditPage.tsx` | Version-aware edit page |
| `frontend/src/pages/questions/QuestionEditor.tsx` | Re-export shim |
| `frontend/src/pages/questions/components/QuestionVersionBadge.tsx` | Reusable version badge |
| `frontend/src/pages/questions/components/SaveVersionConfirmModal.tsx` | Accessible save confirmation |
| `frontend/src/pages/questions/components/VersionHistorySection.tsx` | Collapsible history / placeholder |
| `frontend/src/pages/questions/QuestionEditPage.test.tsx` | Version UI tests |
| `frontend/src/pages/questions/QuestionsList.tsx` | Version column in list |
| `frontend/src/pages/questions/questions.css` | Version UI styles |
| `frontend/src/pages/questions/index.ts` | Export `QuestionEditPage` |
| `frontend/src/pages/tests/TestDetailPage.tsx` | Test detail placeholder with badges |
| `frontend/src/pages/tests/TestDetailPage.test.tsx` | Badge/placeholder tests |
| `frontend/src/pages/tests/tests.css` | Test page styles |
| `frontend/src/App.tsx` | Routes for edit page and test detail |

## Verification

```bash
cd frontend
npm ci
npm test
npm run lint
npm run build
```

Results: **141** frontend tests passed (9 new version UI tests).

## Open Questions / Follow-ups

- Expose `latest_version_number` and `version_history` from Django `QuestionSerializer`
- Wire `TestDetailPage` to real test composition API
- Auto-call `create_snapshot` on question update in backend views
- Add version history deep links when REST endpoints exist
