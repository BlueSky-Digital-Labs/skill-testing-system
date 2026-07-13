# Task Context: Organization Branding Settings (feat-6210f644)

## Scope

Add organization-level branding settings to the Django backend, including:
- Logo upload with media file support
- Theme color management (primary/secondary hex colors)
- Email header/footer HTML content with sanitization
- Admin-only REST API endpoints for reading and updating settings
- Django admin registration for inspection

## Key Implementation Decisions

1. **Singleton model pattern**: `OrganizationSettings.load()` returns the first row or creates defaults — suitable for single-tenant org branding.
2. **Admin access control**: Endpoints use DRF `IsAdminUser` (requires `is_staff=True`) with JWT authentication.
3. **URL layout**: Branding routes at `/api/admin/settings` and `/api/admin/settings/update`, included from `branding.urls` at project root.
4. **Media files**: `MEDIA_ROOT = BASE_DIR / 'media'`, `MEDIA_URL = '/media/'`; served via Django in development when `DEBUG=True`.
5. **HTML sanitization**: `bleach` with an allowlist of tags/attributes; `<script>` and `<style>` blocks stripped before cleaning.
6. **Color validation**: Reusable `validate_hex_color()` enforces `#RRGGBB` format.
7. **Dependencies added**: `Pillow` (ImageField), `bleach` (HTML sanitization).

## Files Changed

| File | Why |
|------|-----|
| `backend/src/branding/` (new app) | Model, views, serializers, URLs, admin, tests |
| `backend/src/branding/migrations/0001_initial.py` | Initial migration for `OrganizationSettings` |
| `backend/src/core/settings/base.py` | `BrandingConfig` in `INSTALLED_APPS`, `MEDIA_ROOT`/`MEDIA_URL`, OpenAPI tag |
| `backend/src/core/settings/test.py` | Test media root for file upload tests |
| `backend/src/core/urls.py` | Include branding URLs; serve media in DEBUG |
| `backend/requirements.txt` | Add Pillow and bleach |
| `backend/README.md` | Document endpoints, media paths, curl examples |

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/settings` | GET | JWT (staff) | Get current organization settings |
| `/api/admin/settings/update` | POST/PUT/PATCH | JWT (staff) | Update settings (JSON or multipart) |

## Verification

```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test SECRET_KEY=test-secret \
  python3 manage.py test branding authentication
```

## Open Questions / Follow-ups

- Production media serving requires reverse-proxy or object-storage configuration (not handled by Django when `DEBUG=False`).
- Only a single `OrganizationSettings` row is enforced by convention, not a database constraint.
- Non-staff admin UI users (`is_superuser` without `is_staff`) cannot access the API — align with `IsAdminUser` semantics.

## Assumptions / Limitations

- Organization branding is global (not per-tenant/multi-org).
- Logo removal via API sends an empty/null `logo` field in multipart or JSON.
- Inline `style` attributes are stripped from email HTML for security (class-based styling only).
