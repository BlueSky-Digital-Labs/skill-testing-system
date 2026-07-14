import hashlib
import json
from functools import wraps

from django.db import transaction
from django.utils import timezone

from .models import AuditLog

GENESIS_HASH = ''


def build_canonical_payload(
    *,
    timestamp,
    actor_id,
    actor_display,
    action,
    entity_type,
    entity_id,
    metadata,
    prev_hash,
):
    """Return a stable JSON string used as hash input."""
    payload = {
        'timestamp': timestamp.isoformat() if hasattr(timestamp, 'isoformat') else str(timestamp),
        'actor_id': actor_id or '',
        'actor_display': actor_display or '',
        'action': action,
        'entity_type': entity_type or '',
        'entity_id': entity_id or '',
        'metadata': metadata or {},
        'prev_hash': prev_hash or '',
    }
    return json.dumps(payload, sort_keys=True, separators=(',', ':'))


def compute_hash(canonical_payload):
    """Compute SHA-256 hex digest for a canonical payload string."""
    return hashlib.sha256(canonical_payload.encode('utf-8')).hexdigest()


def _resolve_actor(request):
    user = getattr(request, 'user', None)
    if user is not None and getattr(user, 'is_authenticated', False):
        actor_id = str(getattr(user, 'pk', '') or '')
        actor_display = (
            getattr(user, 'get_full_name', lambda: '')()
            or getattr(user, 'email', '')
            or actor_id
        )
        return actor_id, actor_display
    return '', 'system'


def log_action(
    *,
    action,
    entity_type='',
    entity_id='',
    metadata=None,
    actor_id='',
    actor_display='',
    request=None,
):
    """Append a hash-chained audit log entry."""
    if request is not None:
        req_actor_id, req_actor_display = _resolve_actor(request)
        actor_id = actor_id or req_actor_id
        actor_display = actor_display or req_actor_display

    metadata = metadata or {}
    timestamp = timezone.now()

    with transaction.atomic():
        last_entry = (
            AuditLog.objects.select_for_update()
            .order_by('-id')
            .first()
        )
        prev_hash = last_entry.hash if last_entry else GENESIS_HASH
        canonical_payload = build_canonical_payload(
            timestamp=timestamp,
            actor_id=actor_id,
            actor_display=actor_display,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata=metadata,
            prev_hash=prev_hash,
        )
        entry_hash = compute_hash(canonical_payload)
        return AuditLog.objects.create(
            timestamp=timestamp,
            actor_id=actor_id,
            actor_display=actor_display,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata=metadata,
            prev_hash=prev_hash,
            hash=entry_hash,
        )


def verify_hash_chain():
    """
    Verify the integrity of the audit log hash chain.

    Returns a dict with overall status and any broken links.
    """
    entries = list(AuditLog.objects.order_by('id'))
    if not entries:
        return {
            'valid': True,
            'total_entries': 0,
            'broken_at_id': None,
            'message': 'No audit log entries to verify.',
        }

    expected_prev_hash = GENESIS_HASH
    for entry in entries:
        if entry.prev_hash != expected_prev_hash:
            return {
                'valid': False,
                'total_entries': len(entries),
                'broken_at_id': entry.id,
                'message': (
                    f'Previous hash mismatch at entry {entry.id}: '
                    f'expected prev_hash {expected_prev_hash!r}, '
                    f'found {entry.prev_hash!r}.'
                ),
            }

        canonical_payload = build_canonical_payload(
            timestamp=entry.timestamp,
            actor_id=entry.actor_id,
            actor_display=entry.actor_display,
            action=entry.action,
            entity_type=entry.entity_type,
            entity_id=entry.entity_id,
            metadata=entry.metadata,
            prev_hash=entry.prev_hash,
        )
        expected_hash = compute_hash(canonical_payload)
        if entry.hash != expected_hash:
            return {
                'valid': False,
                'total_entries': len(entries),
                'broken_at_id': entry.id,
                'message': (
                    f'Hash mismatch at entry {entry.id}: '
                    f'expected {expected_hash!r}, found {entry.hash!r}.'
                ),
            }

        expected_prev_hash = entry.hash

    return {
        'valid': True,
        'total_entries': len(entries),
        'broken_at_id': None,
        'message': 'Audit log hash chain is valid.',
    }


def audit_log_action(
    action,
    entity_type='',
    entity_id='',
    metadata=None,
    get_entity_type=None,
    get_entity_id=None,
    get_metadata=None,
):
    """
    Decorator for function-based views that logs an action after a successful response.
    """

    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            response = view_func(request, *args, **kwargs)
            status_code = getattr(response, 'status_code', 200)
            if 200 <= status_code < 300:
                resolved_entity_type = (
                    get_entity_type(request, response, *args, **kwargs)
                    if callable(get_entity_type)
                    else entity_type
                )
                resolved_entity_id = (
                    get_entity_id(request, response, *args, **kwargs)
                    if callable(get_entity_id)
                    else entity_id
                )
                resolved_metadata = (
                    get_metadata(request, response, *args, **kwargs)
                    if callable(get_metadata)
                    else metadata
                )
                log_action(
                    action=action,
                    entity_type=resolved_entity_type or '',
                    entity_id=str(resolved_entity_id or ''),
                    metadata=resolved_metadata or {},
                    request=request,
                )
            return response

        return wrapper

    return decorator


class AuditLogMixin:
    """Mixin helper for class-based views to log actions after a successful response."""

    def log_audit_action(
        self,
        request,
        response,
        *,
        action,
        entity_type='',
        entity_id='',
        metadata=None,
    ):
        status_code = getattr(response, 'status_code', 200)
        if not (200 <= status_code < 300):
            return None
        return log_action(
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id or ''),
            metadata=metadata or {},
            request=request,
        )
