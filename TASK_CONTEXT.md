# Task Context: Docker Build + Frontend Stack Overflow Fix

**Branch:** `sunset/task/42-3385d121`  
**PR:** https://github.com/BlueSky-Digital-Labs/skill-testing-system/pull/19

## Scope

Fix two deployment/runtime issues in the monorepo:

1. **Backend — Docker build failure on Sunset**: Deploy contract used repo-root paths (`backend/Dockerfile`, `context: backend`) while the platform stages each service directory into `_src/`, so `docker build -f "_src/$DOCKERFILE" "_src/$CONTEXT"` could not find the Dockerfile.
2. **Frontend — blank page / `Maximum call stack size exceeded`**: Circular ES module imports caused runtime initialization failures (surfacing in minified bundles near `useRef`).

### In scope (completed)

- `.sunset/deploy.yaml` — correct `dockerfile` / `context` for backend and frontend services
- Break `api/auth.ts` ↔ `api/client.ts` ↔ `api/http.ts` cycle by removing `authorizedFetch` re-export from `client.ts`
- Break `hooks/useAuth.ts` ↔ `hooks/useAdminAccess.ts` cycle by removing unused admin access coupling from `useAuth`
- Remove unused `QuestionVersionBadge` import blocking production `tsc` build (Docker frontend image)
- Add `moduleGraph.test.ts` to guard against API module circular imports

### Out of scope / deferred

- Refactoring `useAdminAccess` consumers to read auth state from Redux directly (not needed once `useAuth` no longer imports it)
- Installing Docker in CI/dev VM for local image builds (path fix validated via staged `_src` simulation)

## Key Implementation Decisions

1. **Deploy paths are relative to the staged service root**: With `path: backend`, Sunset copies `backend/` contents into `_src/`. Build must use `dockerfile: Dockerfile` and `context: .` so the command resolves to `-f "_src/Dockerfile" "_src/."`.
2. **Keep `authorizedFetch` in `http.ts`**: Call sites that previously imported it from `client.ts` now import from `http.ts`; `client.ts` no longer eagerly loads `http.ts`, breaking the `auth → client → http → auth` loop.
3. **`useAuth` stays focused on Redux session state**: `isStaff` / `isStaffChecking` were unused outside `useAuth`; removing them avoids the hook cycle without API changes.

## Files Changed

| File | Why |
|------|-----|
| `.sunset/deploy.yaml` | Fix Docker build paths for Sunset `_src` staging |
| `frontend/src/api/client.ts` | Remove `authorizedFetch` re-export that closed the import cycle |
| `frontend/src/api/audit.ts` | Import `authorizedFetch` from `http.ts` |
| `frontend/src/api/results.ts` | Import `authorizedFetch` from `http.ts` |
| `frontend/src/api/grading.ts` | Import `authorizedFetch` from `http.ts` |
| `frontend/src/pages/tests/assign/api.ts` | Import `authorizedFetch` from `http.ts` |
| `frontend/src/pages/attempts/api.ts` | Import `authorizedFetch` from `http.ts` |
| `frontend/src/hooks/useAuth.ts` | Remove `useAdminAccess` dependency |
| `frontend/src/pages/questions/QuestionEditPage.tsx` | Remove unused import (fixes `tsc`/Docker build) |
| `frontend/src/api/moduleGraph.test.ts` | Regression test for API module graph |

## Verification

```bash
# Deploy contract
python3 .sunset/validate_deploy_contract.py

# Frontend
cd frontend && npm ci && npm test && npm run lint && npm run build
npx madge --circular --extensions ts,tsx src/   # expect no cycles

# Backend (tests only; deploy path validated separately)
cd backend && SECRET_KEY=test-secret-key python3 -m pytest -q
```

Results:
- Deploy contract OK
- **142** frontend tests passed (1 new module graph test)
- Frontend lint: 0 errors (2 pre-existing warnings)
- Frontend production build succeeded
- **216** backend tests passed

## Open Questions / Follow-ups

- Confirm Sunset staging always mirrors `path/` into `_src/` for all project types (assumption matches observed build command and local simulation)
- Consider adding deploy-contract validation for `build.dockerfile` / `build.context` when `path` is set
