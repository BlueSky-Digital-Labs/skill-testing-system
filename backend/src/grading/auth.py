from functools import wraps

from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication


def _authenticate_request(request):
    authenticator = JWTAuthentication()
    auth_result = authenticator.authenticate(request)
    if auth_result is not None:
        request.user, request.auth = auth_result


def require_staff_or_examiner(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        _authenticate_request(request)
        if not request.user.is_authenticated:
            return JsonResponse(
                {'detail': 'Authentication credentials were not provided.'},
                status=401,
            )
        if not request.user.is_staff:
            return JsonResponse(
                {'detail': 'You do not have permission to perform this action.'},
                status=403,
            )
        return view_func(request, *args, **kwargs)

    return wrapper
