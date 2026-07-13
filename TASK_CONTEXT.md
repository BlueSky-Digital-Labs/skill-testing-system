# Task Context: Organization Branding Settings (feat-6210f644)

## Scope

### Backend (completed)
- Organization-level branding settings API (`branding` Django app)
- Logo upload, theme colors, email header/footer HTML with server-side sanitization
- Admin-only REST endpoints at `/api/admin/settings` and `/api/admin/settings/update`

### Frontend (this iteration)
- Admin Branding configuration page at `/admin/branding`
- API client for branding settings (`getBranding`, `updateBranding`)
- App-wide theming via `ThemeContext` and CSS variables (`--brand-primary`, `--brand-secondary`)
- Admin route protection and sidebar navigation link
- Client-side HTML preview sanitization and logo upload validation

## Key Implementation Decisions

### Backend
1. **Singleton model**: `OrganizationSettings.load()` returns or creates the single settings row.
2. **Admin access**: DRF `IsAdminUser` (requires `is_staff=True`) with JWT authentication.
3. **Update endpoint**: `POST /api/admin/settings/update` (also accepts PUT/PATCH).
4. **HTML sanitization**: `bleach` with allowlisted tags; script/style blocks stripped.

### Frontend
1. **API client location**: `frontend/src/api/branding.ts` using `authorizedFetch` with existing JWT auth.
2. **Update endpoint**: Uses `POST /api/admin/settings/update` to match backend (multipart when logo included).
3. **Admin access check**: `AdminRoute` and `useAdminAccess` verify staff by calling `getBranding()`; 403 redirects to `/dashboard?access=denied`.
4. **Theme bootstrap**: `ThemeProvider` applies cached branding from `localStorage` immediately, then refreshes from API when authenticated.
5. **CSS variables**: `--brand-primary` / `--brand-secondary` mapped to existing `--hd-*` shell variables.
6. **Preview sanitization**: Client-side `sanitizeHtmlForPreview()` strips scripts, event handlers, and `javascript:` URLs before `dangerouslySetInnerHTML`.
7. **Logo validation**: Max 2MB, image MIME types only; preview via `URL.createObjectURL`.

## Files Changed

### Backend
| File | Why |
|------|-----|
| `backend/src/branding/` | Model, views, serializers, URLs, admin, tests |
| `backend/src/core/settings/base.py` | `BrandingConfig`, `MEDIA_ROOT`/`MEDIA_URL` |
| `backend/src/core/urls.py` | Include branding URLs; dev media serving |
| `backend/requirements.txt` | Pillow, bleach |
| `backend/README.md` | Endpoint and media documentation |

### Frontend
| File | Why |
|------|-----|
| `frontend/src/pages/admin/branding/` | BrandingPage UI with logo, colors, email HTML editors |
| `frontend/src/api/branding.ts` | `getBranding`, `updateBranding`, validation helpers |
| `frontend/src/api/branding.test.ts` | API client and validation tests |
| `frontend/src/theme/ThemeContext.tsx` | App-wide theme provider |
| `frontend/src/theme/brandCss.ts` | CSS variable application helper |
| `frontend/src/utils/sanitizeHtml.ts` | Client-side HTML preview sanitization |
| `frontend/src/components/organisms/AdminRoute/` | Staff-only route guard |
| `frontend/src/hooks/useAdminAccess.ts` | Sidebar admin visibility hook |
| `frontend/src/App.tsx` | `/admin/branding` route |
| `frontend/src/main.tsx` | Wrap app in `ThemeProvider` |
| `frontend/src/components/organisms/Sidebar/Sidebar.tsx` | Branding nav link for admins |
| `frontend/src/styles/theme.css` | Brand CSS variable defaults |
| `frontend/src/pages/auth/AuthPages.css` | Use brand variables on sign-in flow |
| `frontend/src/pages/dashboard/DashboardPage.tsx` | Access denied banner |

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/settings` | GET | JWT (staff) | Get organization branding settings |
| `/api/admin/settings/update` | POST | JWT (staff) | Update settings (JSON or multipart) |

## Verification

### Backend
```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test SECRET_KEY=test-secret \
  python3 manage.py test branding authentication
```

### Frontend
```bash
cd frontend
npm install
npm run test
npm run lint
npm run build
```

## Open Questions / Follow-ups

- Backend profile API does not expose `is_staff`; admin access is verified via branding API call.
- Public read endpoint for branding would allow unauthenticated theme bootstrap without cache.
- Production media serving requires reverse-proxy or object-storage configuration.
- Legacy axios auth stack still uses separate token key from `authStorage`.

## Assumptions / Limitations

- Branding is global (single organization).
- Non-staff users see default/cached theme colors only.
- Inline `style` attributes are stripped server-side from saved email HTML.
- Logo removal via API requires sending empty/null `logo` field (not yet exposed in UI).
