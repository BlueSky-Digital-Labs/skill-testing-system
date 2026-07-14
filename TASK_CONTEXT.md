# Task Context: Deterministic Attempt Shuffle Seeds

**Branch:** `sunset/task/feat-f69d79e6` (also `sunset/task/attempt-shuffle-seeds`)  
**PR:** https://github.com/BlueSky-Digital-Labs/skill-testing-system/pull/21

## Scope

Add deterministic per-attempt randomization for question and option delivery order using persisted shuffle seeds. This enables consistent exam presentation across resume flows while still supporting assignment-level shuffle toggles.

### In scope

- `delivery.shuffle` module with `stable_shuffle`, `derive_seed`, and `build_order`
- `Attempt` model fields for seeds and persisted orders
- `initialize_attempt_order` / `rehydrate_attempt_order` integration hooks
- Idempotent initialization and read-only guards on order fields after persistence
- Unit tests for shuffle service and attempt randomization service

### Out of scope / deferred

- Wiring `initialize_attempt_order` into a start-attempt API endpoint (no delivery start flow exists yet)
- Frontend consumption of persisted order fields
- Backfill migration for historical attempts without seeds

## Key Implementation Decisions

1. **Namespace-derived seeds** — A single `secrets.randbits(64)` base seed is hashed into separate question (`"q"`) and option (`"o"`) seeds via SHA-256. Derived seeds use signed 64-bit integers for SQLite/PostgreSQL `BigIntegerField` compatibility.
2. **Per-question option shuffling** — Option order for each question derives `derive_seed(option_order_seed, question_id)` so option permutations are independent but reproducible.
3. **Persisted orders + seeds** — Both seeds and computed orders are stored on `Attempt` so resume flows can read orders directly without recomputation; `rehydrate_attempt_order` can rebuild from seeds for legacy records missing persisted lists.
4. **Idempotency** — `initialize_attempt_order` returns early when seeds or orders are already set; `Attempt.save()` blocks mutation of order/seed fields once initialized.
5. **Delivery package is a plain module** — `delivery` is not registered as a Django app; it is imported via `pythonpath = src` like other internal packages.

## Files Changed

| File | Why |
|------|-----|
| `backend/src/delivery/__init__.py` | Package root for delivery helpers |
| `backend/src/delivery/shuffle/__init__.py` | Public shuffle API exports |
| `backend/src/delivery/shuffle/service.py` | Deterministic shuffle, seed derivation, order building |
| `backend/src/delivery/tests/__init__.py` | Test package marker |
| `backend/src/delivery/tests/test_shuffle_service.py` | Shuffle determinism and flag behavior tests |
| `backend/src/core/models/attempts.py` | `Attempt` model with shuffle/order fields and read-only guards |
| `backend/src/core/models/__init__.py` | Export `Attempt` and `AttemptStatus` |
| `backend/src/core/migrations/0003_attempt_shuffle_orders.py` | Database migration for `Attempt` |
| `backend/src/core/services/attempt_randomization.py` | Initialize/rehydrate hooks for attempt ordering |
| `backend/src/core/tests/test_attempt_randomization.py` | Integration tests for randomization service |

## Verification

```bash
cd backend && SECRET_KEY=test-secret-key python3 -m pytest -q
python3 -m flake8 src/delivery src/core/models/attempts.py src/core/services/attempt_randomization.py
```

## Open Questions / Follow-ups

- Call `initialize_attempt_order` from the future start-attempt view/service once question selection is implemented
- Expose `question_id_order` / `option_id_orders` in attempt delivery serializers for the frontend
- Consider admin registration for `Attempt` when attempt management UI is added
