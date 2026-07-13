import json
from decimal import Decimal

from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from .auth import require_staff_or_examiner
from .models import ObjectiveScore, ScoringPolicy
from .schemas import (
    FIBScoreForm,
    MCQScoreForm,
    MultiSelectScoreForm,
    TrueFalseScoreForm,
)
from .services import score_fib, score_mcq, score_multi_select, score_true_false


def _load_policy(policy_id):
    if not policy_id:
        return None
    return ScoringPolicy.objects.filter(id=policy_id).first()


def _serialize_decimal(value):
    if isinstance(value, Decimal):
        return format(value.quantize(Decimal('0.01')), 'f')
    return value


def _serialize_score(score):
    return {
        'id': str(score.id),
        'attempt_id': score.attempt_id,
        'question_id': score.question_id,
        'question_version': score.question_version,
        'question_type': score.question_type,
        'awarded_points': _serialize_decimal(score.awarded_points),
        'max_points': _serialize_decimal(score.max_points),
        'is_correct': score.is_correct,
        'detail': score.detail,
        'created_at': score.created_at.isoformat(),
    }


def _parse_request_data(request):
    if request.content_type and 'application/json' in request.content_type:
        try:
            return json.loads(request.body.decode('utf-8') or '{}')
        except json.JSONDecodeError:
            return None
    return request.POST.dict()


def _validation_error_response(form):
    return JsonResponse(form.errors, status=400)


def _persist_score(*, question_type, cleaned_data, result):
    return ObjectiveScore.objects.create(
        attempt_id=cleaned_data['attempt_id'],
        question_id=cleaned_data['question_id'],
        question_version=cleaned_data['question_version'],
        question_type=question_type,
        awarded_points=result['awarded_points'],
        max_points=result['max_points'],
        is_correct=result['is_correct'],
        detail=result['detail'],
    )


@method_decorator(csrf_exempt, name='dispatch')
@method_decorator(require_staff_or_examiner, name='dispatch')
class ScoreMCQView(View):
    def post(self, request):
        data = _parse_request_data(request)
        if data is None:
            return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

        form = MCQScoreForm(data)
        if not form.is_valid():
            return _validation_error_response(form)

        cleaned = form.cleaned_data
        policy = _load_policy(cleaned.get('scoring_policy_id'))
        result = score_mcq(
            selected_option=cleaned['selected_option'],
            correct_option=cleaned['correct_option'],
            max_points=cleaned['max_points'],
            policy=policy,
        )
        score = _persist_score(
            question_type='mcq',
            cleaned_data=cleaned,
            result=result,
        )
        return JsonResponse(_serialize_score(score))


@method_decorator(csrf_exempt, name='dispatch')
@method_decorator(require_staff_or_examiner, name='dispatch')
class ScoreTrueFalseView(View):
    def post(self, request):
        data = _parse_request_data(request)
        if data is None:
            return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

        form = TrueFalseScoreForm(data)
        if not form.is_valid():
            return _validation_error_response(form)

        cleaned = form.cleaned_data
        policy = _load_policy(cleaned.get('scoring_policy_id'))
        result = score_true_false(
            selected_answer=cleaned['selected_answer'],
            correct_answer=cleaned['correct_answer'],
            max_points=cleaned['max_points'],
            policy=policy,
        )
        score = _persist_score(
            question_type='true_false',
            cleaned_data=cleaned,
            result=result,
        )
        return JsonResponse(_serialize_score(score))


@method_decorator(csrf_exempt, name='dispatch')
@method_decorator(require_staff_or_examiner, name='dispatch')
class ScoreFIBView(View):
    def post(self, request):
        data = _parse_request_data(request)
        if data is None:
            return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

        form = FIBScoreForm(data)
        if not form.is_valid():
            return _validation_error_response(form)

        cleaned = form.cleaned_data
        policy = _load_policy(cleaned.get('scoring_policy_id'))
        result = score_fib(
            submitted_answer=cleaned['submitted_answer'],
            accepted_answers=cleaned['accepted_answers'],
            max_points=cleaned['max_points'],
            policy=policy,
        )
        score = _persist_score(
            question_type='fib',
            cleaned_data=cleaned,
            result=result,
        )
        return JsonResponse(_serialize_score(score))


@method_decorator(csrf_exempt, name='dispatch')
@method_decorator(require_staff_or_examiner, name='dispatch')
class ScoreMultiSelectView(View):
    def post(self, request):
        data = _parse_request_data(request)
        if data is None:
            return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

        form = MultiSelectScoreForm(data)
        if not form.is_valid():
            return _validation_error_response(form)

        cleaned = form.cleaned_data
        policy = _load_policy(cleaned.get('scoring_policy_id'))
        result = score_multi_select(
            selected_options=cleaned['selected_options'],
            correct_options=cleaned['correct_options'],
            max_points=cleaned['max_points'],
            policy=policy,
        )
        score = _persist_score(
            question_type='multi_select',
            cleaned_data=cleaned,
            result=result,
        )
        return JsonResponse(_serialize_score(score))
