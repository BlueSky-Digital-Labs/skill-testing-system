"""
Attempt review disclosure policies.
"""


def _get_value(obj, key, default=None):
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


class DisclosureMode:
    """Enum-like disclosure modes for attempt review payloads."""

    SCORE_ONLY = 'score_only'
    SCORE_AND_FEEDBACK = 'score_and_feedback'
    WITHHOLD_UNTIL_RELEASE = 'withhold_until_release'

    _ALL = frozenset({
        SCORE_ONLY,
        SCORE_AND_FEEDBACK,
        WITHHOLD_UNTIL_RELEASE,
    })

    @classmethod
    def normalize(cls, value):
        if value in cls._ALL:
            return value
        if value in ('summary',):
            return cls.SCORE_ONLY
        if value in ('detailed', 'full'):
            return cls.SCORE_AND_FEEDBACK
        return cls.SCORE_ONLY


def evaluate_disclosure(attempt, test_settings):
    """
    Determine the effective disclosure mode for an attempt review.

    Results are withheld until explicitly released. Once released, the
    configured disclosure level controls whether feedback is included.
    """
    released = _get_value(test_settings, 'results_released', False)
    if not released:
        return DisclosureMode.WITHHOLD_UNTIL_RELEASE

    configured = _get_value(
        test_settings,
        'results_disclosure',
        DisclosureMode.SCORE_ONLY,
    )
    return DisclosureMode.normalize(configured)


def filter_attempt_payload(attempt_dict, mode):
    """
    Filter an attempt review payload according to the disclosure mode.
    """
    payload = dict(attempt_dict)
    payload['disclosure_mode'] = mode

    if mode == DisclosureMode.WITHHOLD_UNTIL_RELEASE:
        payload.pop('summary', None)
        payload.pop('score', None)
        payload.pop('items', None)
        payload['status'] = 'withheld'
        return payload

    payload['status'] = 'released'

    if mode == DisclosureMode.SCORE_ONLY:
        items = payload.get('items')
        if items is not None:
            payload['items'] = [
                {key: value for key, value in item.items() if key != 'feedback'}
                for item in items
            ]

    return payload
