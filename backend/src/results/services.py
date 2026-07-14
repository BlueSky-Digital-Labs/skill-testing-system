from decimal import Decimal

from django.utils import timezone

from grading.models import CombinedResult, ObjectiveScore

from .models import DisclosureLevel, ReleaseControl


class ReleaseControlNotFoundError(Exception):
    pass


class ReleaseControlAccessError(Exception):
    pass


def _serialize_decimal(value):
    if isinstance(value, Decimal):
        return format(value.quantize(Decimal("0.01")), "f")
    return value


def _serialize_combined_result(result):
    serialized_by_topic = {
        topic: {
            "awarded": _serialize_decimal(values["awarded"]),
            "max": _serialize_decimal(values["max"]),
        }
        for topic, values in result.by_topic.items()
    }
    return {
        "id": str(result.id),
        "attempt_id": result.attempt_id,
        "test_id": result.test_id,
        "total_awarded": _serialize_decimal(result.total_awarded),
        "total_max": _serialize_decimal(result.total_max),
        "by_topic": serialized_by_topic,
        "passed": result.passed,
        "created_at": result.created_at.isoformat(),
        "updated_at": result.updated_at.isoformat(),
    }


def _serialize_objective_scores(attempt_id):
    return [
        {
            "id": str(score.id),
            "question_id": score.question_id,
            "question_version": score.question_version,
            "question_type": score.question_type,
            "is_correct": score.is_correct,
            "awarded_points": _serialize_decimal(score.awarded_points),
            "max_points": _serialize_decimal(score.max_points),
        }
        for score in ObjectiveScore.objects.filter(attempt_id=attempt_id).order_by(
            "question_id",
        )
    ]


def _serialize_release_control(control):
    return {
        "id": str(control.id),
        "attempt_id": control.attempt_id,
        "test_id": control.test_id,
        "candidate_user_id": control.candidate_user_id,
        "disclosure": control.disclosure,
        "released": control.released,
        "released_at": (
            control.released_at.isoformat() if control.released_at else None
        ),
        "released_by_user_id": control.released_by_user_id,
        "created_at": control.created_at.isoformat(),
        "updated_at": control.updated_at.isoformat(),
    }


def mark_release(
    attempt_id,
    released_by_user_id,
    released=True,
    *,
    disclosure=None,
    test_id=None,
    candidate_user_id=None,
):
    control = ReleaseControl.objects.filter(attempt_id=attempt_id).first()

    if control is None:
        combined = CombinedResult.objects.filter(attempt_id=attempt_id).first()
        resolved_test_id = test_id or (combined.test_id if combined else None)
        resolved_candidate_user_id = candidate_user_id

        if resolved_test_id is None or resolved_candidate_user_id is None:
            raise ReleaseControlNotFoundError(
                "Release control not found and insufficient data to create one.",
            )

        control = ReleaseControl.objects.create(
            attempt_id=attempt_id,
            test_id=resolved_test_id,
            candidate_user_id=resolved_candidate_user_id,
        )

    control.released = released
    control.released_by_user_id = released_by_user_id

    if released:
        control.released_at = timezone.now()
        if disclosure is not None:
            control.disclosure = disclosure
        elif control.disclosure == DisclosureLevel.NONE:
            control.disclosure = DisclosureLevel.SUMMARY
    else:
        control.released_at = None
        control.disclosure = DisclosureLevel.NONE

    control.save()
    return control


def get_candidate_view(attempt_id, requester_user_id, *, is_staff=False):
    control = ReleaseControl.objects.filter(attempt_id=attempt_id).first()
    if control is None:
        raise ReleaseControlNotFoundError("Release control not found.")

    if not is_staff and requester_user_id != control.candidate_user_id:
        raise ReleaseControlAccessError(
            "You do not have permission to view these results.",
        )

    payload = {
        "attempt_id": attempt_id,
        "released": control.released,
        "disclosure": control.disclosure,
        "visibility": "full" if is_staff else "candidate",
    }

    if not control.released and not is_staff:
        payload["status"] = "withheld"
        return payload

    combined = CombinedResult.objects.filter(attempt_id=attempt_id).first()
    if combined is not None and (
        is_staff or control.disclosure != DisclosureLevel.NONE
    ):
        payload["summary"] = _serialize_combined_result(combined)

    effective_disclosure = (
        control.disclosure if control.released else DisclosureLevel.DETAILED
    )
    if is_staff or effective_disclosure == DisclosureLevel.DETAILED:
        payload["items"] = _serialize_objective_scores(attempt_id)

    if control.released:
        payload["status"] = "released"
    elif is_staff:
        payload["status"] = "unreleased"

    return payload


def get_release_status(attempt_id):
    control = ReleaseControl.objects.filter(attempt_id=attempt_id).first()
    if control is None:
        raise ReleaseControlNotFoundError("Release control not found.")
    return _serialize_release_control(control)
