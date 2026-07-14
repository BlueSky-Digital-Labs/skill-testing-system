# Task Context: Question Versioning (Backend)

**Branch:** `sunset/task/25-24e719fa`  
**PR:** https://github.com/BlueSky-Digital-Labs/skill-testing-system/pull/16

## Scope

Implement version control for questions in the Django question bank so historical integrity is preserved via immutable version snapshots.

### In scope (completed)
- `QuestionVersion` model with snapshot fields and `sha256` content hash
- Versioning services: `compute_payload_hash`, `get_next_version_number`, `create_snapshot`, `snapshot_many`
- Idempotent snapshotting when question content hash is unchanged
- Signal guards to block edits/deletes on questions used in published tests
- Read-only Django admin for `QuestionVersion`
- Migration `0002_question_version`
- Pytest coverage for snapshot creation, version increment, and idempotency

### Out of scope / deferred
- Test-bank publishing integration (`is_in_published_test()` is a provisional stub returning `False`)
- Automatic snapshot hooks on question save/update (callers invoke `create_snapshot` explicitly)
- API endpoints for listing or retrieving question versions
- Dedicated `explanation` field on `Question` (snapshots read `metadata.explanation` when present)

## Key Implementation Decisions

1. **Snapshot field names**: Snapshots use `question_type` and `prompt` (mapped from live `Question.type` and `Question.text`) so version records are stable even if live model field names evolve.
2. **Hash input**: `compute_payload_hash` canonicalizes the full snapshot payload (`subject`, `topic`, `difficulty`, `question_type`, `prompt`, `points`, `image_url`, `explanation`, `options`, `correct_answers`) with sorted JSON keys.
3. **Idempotency**: `create_snapshot` compares the computed hash to the latest version’s `sha256` and returns that row instead of creating a duplicate.
4. **Correct answers**: Derived at snapshot time — option values for choice types, blank-answer keys for fill-in-the-blank, empty list for free text.
5. **Published-test guards**: `pre_save` / `pre_delete` receivers on `Question`, `Option`, and `BlankAnswerKey` raise `ValidationError` when `is_in_published_test()` is true; stubbed to `False` until test-bank code lands.
6. **Admin**: `QuestionVersionAdmin` is fully read-only (no add/change/delete).

## Files Changed

| File | Why |
|------|-----|
| `backend/src/question_bank/models.py` | Added `QuestionVersion` model |
| `backend/src/question_bank/services/versioning.py` | Snapshot build/hash/create helpers |
| `backend/src/question_bank/services/__init__.py` | Services package |
| `backend/src/question_bank/signals.py` | Published-test edit guards |
| `backend/src/question_bank/apps.py` | Register signals in `ready()` |
| `backend/src/question_bank/admin.py` | Read-only `QuestionVersion` admin |
| `backend/src/question_bank/migrations/0002_question_version.py` | Schema migration |
| `backend/src/question_bank/tests/test_versioning.py` | Versioning unit tests |

## Verification

```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=src SECRET_KEY=test-secret-key DJANGO_SETTINGS_MODULE=core.settings.test \
  python3 -m pytest src/ -v

# Lint (question_bank changes)
pip install flake8 black
python3 -m flake8 src/question_bank/models.py src/question_bank/admin.py \
  src/question_bank/apps.py src/question_bank/signals.py \
  src/question_bank/services/versioning.py src/question_bank/tests/test_versioning.py
python3 -m black --check src/question_bank/...
```

Results: **216** backend tests passed (7 new versioning tests).

## Open Questions / Follow-ups

- Wire `is_in_published_test()` to the test-bank publishing model when that app lands
- Decide whether question create/update APIs should auto-call `create_snapshot`
- Add a first-class `explanation` field on `Question` if product requires it outside `metadata`
- Expose version history via REST API for exam delivery and audit views
