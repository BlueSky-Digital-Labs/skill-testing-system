# Task Context: Certificate Generation (FR-27)

**Branch:** `sunset/task/feat-4ac05372`  
**PR:** https://github.com/BlueSky-Digital-Labs/skill-testing-system/pull/22

## Scope

End-to-end certificate support for passing test attempts: backend PDF issuance/S3 storage and frontend result pages that surface certificate availability and download links.

### Backend (completed)

- Django app at `backend/src/results/certificates/`
- PDF rendering (WeasyPrint), S3 storage (boto3), presigned URLs
- API: `POST/GET /api/results/{attempt_id}/certificate/`, `GET /api/certificates/{id}/`

### Frontend (this change)

- Extend `frontend/src/api/results.ts` with `getCertificate` and `issueCertificate`
- `CandidateResultPage` — candidate results + certificate download when passed/released
- `AdminResultPage` — admin results view with generate + download controls
- `CertificateLink` presentational component
- Routes: `/results/:attemptId`, `/admin/results/:attemptId`

### Out of scope / deferred

- Candidate assignment discovery for results navigation
- Certificate revocation UI
- Custom branded certificate templates in frontend

## Key Implementation Decisions

1. **API mapping** — Backend returns `download_url`; frontend `CertificateDto` exposes `url` for UI consumption.
2. **404 handling** — `getCertificate` returns `null` on 404 so pages can distinguish “not issued yet” from hard errors.
3. **Candidate visibility** — Certificate section shown only when results are released and the attempt passed.
4. **Admin generate** — Shown when admin access is confirmed, attempt passed, and certificate GET returns 404.
5. **Expired links** — `CertificateLink` offers “Refresh download link” and explains presigned URL expiry; refresh re-fetches certificate metadata/URL.
6. **Shared logic** — `useCertificate` hook centralizes load/generate/refresh/download behavior for both pages.
7. **Backward compatibility** — `CandidateResult` export aliases `CandidateResultPage` for existing imports.

## Files Changed

| File | Why |
|------|-----|
| `frontend/src/api/results.ts` | `CertificateDto`, `getCertificate`, `issueCertificate` |
| `frontend/src/api/results.test.ts` | API client tests for certificate endpoints |
| `frontend/src/components/results/CertificateLink.tsx` | Reusable certificate UI |
| `frontend/src/components/results/CertificateLink.test.tsx` | Component tests |
| `frontend/src/pages/results/CandidateResultPage.tsx` | Candidate results + certificate download |
| `frontend/src/pages/results/AdminResultPage.tsx` | Admin results + generate/download |
| `frontend/src/pages/results/useCertificate.ts` | Shared certificate state/actions |
| `frontend/src/pages/results/ResultPanels.tsx` | Shared result summary/breakdown panels |
| `frontend/src/pages/results/ResultContent.tsx` | Shared result body renderer |
| `frontend/src/pages/results/CandidateResultPage.test.tsx` | Page tests incl. certificate states |
| `frontend/src/pages/results/AdminResultPage.test.tsx` | Admin generate flow tests |
| `frontend/src/pages/results/index.ts` | Export new pages |
| `frontend/src/pages/results/results.css` | Certificate panel styles |
| `frontend/src/App.tsx` | Routes for candidate/admin result pages |
| `backend/src/results/certificates/*` | Backend certificate app (prior commit) |
| `backend/src/delivery/services/summary.py` | Attempt summary helper |
| `backend/*` compose/settings/Makefile/requirements | Backend wiring (prior commit) |

## Routes

| Path | Page | Purpose |
|------|------|---------|
| `/results/:attemptId` | `CandidateResultPage` | Candidate results + certificate download |
| `/admin/results/:attemptId` | `AdminResultPage` | Admin results + certificate generate/download |
| `/admin/results/release/:attemptId` | `ReleaseControl` | Existing release controls |

## Verification

```bash
# Frontend
cd frontend && npm test && npm run lint && npm run build

# Backend
cd backend
SECRET_KEY=test-secret PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test \
  python3 manage.py test authentication audit branding core delivery grading question_bank results results.certificates
```

## Open Questions / Follow-ups

- Surface direct navigation links to results pages from attempt completion flow
- Tie certificate visibility to explicit business rule on results release if required beyond “passed + released”
- Add WeasyPrint OS dependencies to backend Docker image for in-container PDF rendering
