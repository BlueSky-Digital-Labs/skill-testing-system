# Task Context: Delivery / Attempt Backend

**Branch:** `sunset/task/feat-f69d79e6`  
**PR:** https://github.com/BlueSky-Digital-Labs/skill-testing-system/pull/21

## Scope

Implement the Django delivery app so candidates can start, autosave, resume, and submit test attempts with server-side timing, integrity rules, and deterministic question/option ordering.

### In scope

- `delivery` Django app with `Attempt` and `AttemptAnswer` models
- REST APIs under `/api/attempts/` (start, save, resume, submit)
- Attempt lifecycle services (eligibility, timing, shuffle integration, idempotency)
- `auto_submit_due_attempts` management command
- Tests for APIs, services, shuffle randomization, and auto-submit

### Out of scope / deferred

- Frontend wiring for delivery endpoints
- Grading pipeline integration on submit (objective scoring still separate)
- Dedicated `Test` model / composition API for question selection (uses `metadata.test_id` tagging)
- Celery beat scheduling for auto-submit (command is ready for cron/beat)

## Key Implementation Decisions

1. **Attempt ownership moved to `delivery` app** — `Attempt`/`AttemptAnswer` live in `delivery.models`; core migration `0004_remove_attempt` drops the interim `core_attempt` table from the earlier shuffle-seed spike.
2. **Server-side timing** — `time_limit_seconds` and `expires_at` are set at start from assignment window (capped at 3600s). `remaining_time_seconds` is computed on every payload; expired attempts return HTTP 410.
3. **Shuffle integration** — `start_attempt` calls `initialize_attempt_order` using assignment shuffle flags; resume uses `rehydrate_attempt_order` for stable order reproduction.
4. **Question resolution** — Questions tagged with `metadata.test_id` matching the assignment's `test_id`; falls back to all questions when none are tagged (supports demo/dev).
5. **Integrity rules** — Ownership checks, terminal-state guards, answer upserts scoped to `question_id_order`, `select_for_update` on writes, idempotent start for in-progress attempts.
6. **Auto-submit** — Management command marks overdue in-progress attempts as `auto_submitted`.

## Files Changed

| File | Why |
|------|-----|
| `backend/src/delivery/apps.py` | Register delivery Django app |
| `backend/src/delivery/models.py` | `Attempt` and `AttemptAnswer` models |
| `backend/src/delivery/migrations/0001_initial.py` | Initial delivery tables |
| `backend/src/core/migrations/0004_remove_attempt.py` | Remove interim core Attempt model |
| `backend/src/delivery/services/attempts.py` | Start/save/resume/submit lifecycle logic |
| `backend/src/delivery/services/randomization.py` | Shuffle seed persistence (moved from core) |
| `backend/src/delivery/serializers.py` | API input serializers |
| `backend/src/delivery/views.py` | REST endpoints |
| `backend/src/delivery/urls.py` | `/api/attempts/` routing |
| `backend/src/delivery/management/commands/auto_submit_due_attempts.py` | Auto-submit command |
| `backend/src/delivery/tests/test_attempt_api.py` | API integration tests |
| `backend/src/delivery/tests/test_attempt_randomization.py` | Randomization service tests |
| `backend/src/core/settings/base.py` | Register delivery app + OpenAPI tag |
| `backend/src/core/urls.py` | Mount delivery URLs |
| `backend/src/core/models/__init__.py` | Remove Attempt export from core |
| `backend/src/core/permissions/attempt_permissions.py` | Support `candidate_id` alias |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/attempts/start/` | Start or resume in-progress attempt |
| PUT | `/api/attempts/{id}/save` | Autosave answers (idempotent upsert) |
| GET | `/api/attempts/{id}/resume` | Resume payload with timing + order |
| POST | `/api/attempts/{id}/submit` | Submit attempt |

## Verification

```bash
cd backend && SECRET_KEY=test-secret-key python3 -m pytest -q
python3 -m flake8 src/delivery
```

## Open Questions / Follow-ups

- Schedule `auto_submit_due_attempts` via Celery beat or external cron
- Trigger grading aggregation automatically on submit
- Replace question `metadata.test_id` tagging with a formal test composition model
- Wire frontend attempt player to new delivery APIs
