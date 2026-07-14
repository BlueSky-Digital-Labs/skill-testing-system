import json

from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from .auth import require_authenticated, require_staff_or_examiner
from .schemas import ReleaseForm
from .services import (
    ReleaseControlAccessError,
    ReleaseControlNotFoundError,
    get_candidate_view,
    get_release_status,
    mark_release,
)


def _parse_request_data(request):
    if not request.body:
        return {}
    try:
        return json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def _validation_error_response(form):
    return JsonResponse(form.errors, status=400)


@method_decorator(csrf_exempt, name="dispatch")
@method_decorator(require_staff_or_examiner, name="dispatch")
class ReleaseView(View):
    def post(self, request):
        data = _parse_request_data(request)
        if data is None:
            return JsonResponse({"detail": "Invalid JSON payload."}, status=400)

        form = ReleaseForm(data)
        if not form.is_valid():
            return _validation_error_response(form)

        cleaned = form.cleaned_data
        try:
            control = mark_release(
                cleaned["attempt_id"],
                request.user.id,
                released=cleaned.get("released", False),
                disclosure=cleaned.get("disclosure"),
                test_id=cleaned.get("test_id"),
                candidate_user_id=cleaned.get("candidate_user_id"),
            )
        except ReleaseControlNotFoundError as exc:
            return JsonResponse({"detail": str(exc)}, status=404)

        return JsonResponse(
            {
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
        )


@method_decorator(csrf_exempt, name="dispatch")
@method_decorator(require_staff_or_examiner, name="dispatch")
class ReleaseStatusView(View):
    def get(self, request, attempt_id):
        try:
            status_payload = get_release_status(attempt_id)
        except ReleaseControlNotFoundError as exc:
            return JsonResponse({"detail": str(exc)}, status=404)
        return JsonResponse(status_payload)


@method_decorator(csrf_exempt, name="dispatch")
@method_decorator(require_authenticated, name="dispatch")
class CandidateResultView(View):
    def get(self, request, attempt_id):
        try:
            payload = get_candidate_view(
                attempt_id,
                request.user.id,
                is_staff=request.user.is_staff,
            )
        except ReleaseControlNotFoundError as exc:
            return JsonResponse({"detail": str(exc)}, status=404)
        except ReleaseControlAccessError as exc:
            return JsonResponse({"detail": str(exc)}, status=403)
        return JsonResponse(payload)
