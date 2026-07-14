# Task Context: Certificate Generation Backend (FR-27)

**Branch:** `sunset/task/feat-4ac05372`  
**PR:** https://github.com/BlueSky-Digital-Labs/skill-testing-system/pull/22

## Scope

Implement backend features for generating PDF certificates, storing them in S3, and providing presigned download URLs when candidates pass a test.

### In scope

- Django app at `backend/src/results/certificates/`
- `Certificate` model with idempotency on `(attempt_id, template_version)`
- Service layer: eligibility, PDF rendering (WeasyPrint), S3 storage, presigned URLs, issuance orchestration
- DRF endpoints:
  - `POST /api/results/{attempt_id}/certificate/`
  - `GET /api/results/{attempt_id}/certificate/`
  - `GET /api/certificates/{certificate_id}/`
- `delivery.services.get_attempt_summary` helper for attempt/candidate context
- Settings, compose env vars, Makefile `migrate-certificates`, requirements (`weasyprint`, `boto3`)
- Unit and integration tests

### Out of scope / deferred

- Frontend certificate download UI
- Certificate revocation API (model field exists; no endpoint yet)
- Async/queued issuance via Celery
- Custom per-organization certificate branding beyond base HTML template

## Key Implementation Decisions

1. **Separate app label** — `results.certificates` registered as `results_certificates` to avoid clashing with the parent `results` app migrations.
2. **Eligibility** — Requires `delivery.get_attempt_summary` to report a submitted attempt and a passing `CombinedResult`.
3. **Idempotency** — `issue_certificate` returns an existing non-revoked record for the same `(attempt_id, template_version)` without re-uploading.
4. **S3 key layout** — `certificates/{attempt_id}/{template_version}.pdf` with SHA-256 checksum persisted on the model.
5. **Authorization** — Staff/coordinators/admins or the owning candidate may issue/retrieve certificates (`IsCertificateViewer`).
6. **Presigned URLs** — Generated on read via `CertificateSerializer.download_url`; skipped when revoked or storage is misconfigured.

## Files Changed

| File | Why |
|------|-----|
| `backend/src/results/certificates/*` | New certificates app (model, services, API, template, tests, migrations) |
| `backend/src/delivery/services/summary.py` | `get_attempt_summary` for certificate context and eligibility |
| `backend/src/delivery/services/__init__.py` | Export summary helper |
| `backend/src/core/settings/base.py` | Register app + S3/certificate settings |
| `backend/src/core/urls.py` | Wire certificate routes under `/api/results/` and `/api/certificates/` |
| `backend/compose.dev.yml`, `compose.prod.yml` | Certificate S3 environment variables |
| `backend/Makefile` | `migrate-certificates` target |
| `backend/requirements.txt` | `weasyprint==60.2`, `boto3==1.34.*` |
| `backend/env.example` | Document certificate env vars |

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/results/{attempt_id}/certificate/` | Issue certificate (201 new, 200 idempotent) |
| `GET` | `/api/results/{attempt_id}/certificate/` | Latest certificate for attempt |
| `GET` | `/api/certificates/{certificate_id}/` | Certificate by ID |

## Verification

```bash
cd backend
SECRET_KEY=test-secret PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test \
  python3 manage.py test authentication audit branding core delivery grading question_bank results results.certificates
python3 -m flake8 src/results/certificates src/delivery/services/summary.py
```

## Open Questions / Follow-ups

- Add WeasyPrint system libraries to `Dockerfile` if PDF rendering is required in-container (tests mock rendering)
- Expose certificate revocation endpoint for staff
- Tie issuance to results release gate (`ReleaseControl.released`) if business rules require it
- Support multiple active template versions per attempt in list responses
