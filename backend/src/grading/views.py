import json
from decimal import Decimal

from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from .auth import require_staff_or_examiner
from .aggregates import compile_attempt_scores
from .models import (
    CombinedResult,
    FreeTextQueueItem,
    ManualGrade,
    ObjectiveScore,
    ScoringPolicy,
)
from .schemas import (
    AggregateAttemptForm,
    EnqueueFreeTextForm,
    FIBScoreForm,
    ManualGradeForm,
    MCQScoreForm,
    MultiSelectScoreForm,
    QueueListForm,
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


def _mask_candidate_display(queue_item):
    if queue_item.blind_marking:
        return None
    return queue_item.candidate_display


def _serialize_queue_item(queue_item):
    manual_grade = getattr(queue_item, 'manual_grade', None)
    return {
        'id': str(queue_item.id),
        'attempt_id': queue_item.attempt_id,
        'test_id': queue_item.test_id,
        'question_id': queue_item.question_id,
        'question_version': queue_item.question_version,
        'candidate_display': _mask_candidate_display(queue_item),
        'blind_marking': queue_item.blind_marking,
        'response_text': queue_item.response_text,
        'max_points': _serialize_decimal(queue_item.max_points),
        'topic': queue_item.topic,
        'status': queue_item.status,
        'created_at': queue_item.created_at.isoformat(),
        'updated_at': queue_item.updated_at.isoformat(),
        'manual_grade': (
            {
                'id': str(manual_grade.id),
                'grader_user_id': manual_grade.grader_user_id,
                'awarded_points': _serialize_decimal(manual_grade.awarded_points),
                'feedback': manual_grade.feedback,
                'created_at': manual_grade.created_at.isoformat(),
            }
            if manual_grade is not None
            else None
        ),
    }


def _serialize_combined_result(result):
    serialized_by_topic = {
        topic: {
            'awarded': _serialize_decimal(values['awarded']),
            'max': _serialize_decimal(values['max']),
        }
        for topic, values in result.by_topic.items()
    }
    return {
        'id': str(result.id),
        'attempt_id': result.attempt_id,
        'test_id': result.test_id,
        'total_awarded': _serialize_decimal(result.total_awarded),
        'total_max': _serialize_decimal(result.total_max),
        'by_topic': serialized_by_topic,
        'passed': result.passed,
        'created_at': result.created_at.isoformat(),
        'updated_at': result.updated_at.isoformat(),
    }


def _serialize_compiled_result(compiled):
    serialized_by_topic = {
        topic: {
            'awarded': _serialize_decimal(values['awarded']),
            'max': _serialize_decimal(values['max']),
        }
        for topic, values in compiled['by_topic'].items()
    }
    return {
        'attempt_id': compiled['attempt_id'],
        'test_id': compiled['test_id'],
        'total_awarded': _serialize_decimal(compiled['total_awarded']),
        'total_max': _serialize_decimal(compiled['total_max']),
        'by_topic': serialized_by_topic,
        'passed': compiled['passed'],
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


@method_decorator(csrf_exempt, name='dispatch')
@method_decorator(require_staff_or_examiner, name='dispatch')
class EnqueueFreeTextView(View):
    def post(self, request):
        data = _parse_request_data(request)
        if data is None:
            return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

        form = EnqueueFreeTextForm(data)
        if not form.is_valid():
            return _validation_error_response(form)

        cleaned = form.cleaned_data
        queue_item = FreeTextQueueItem.objects.create(
            attempt_id=cleaned['attempt_id'],
            test_id=cleaned['test_id'],
            question_id=cleaned['question_id'],
            question_version=cleaned.get('question_version') or None,
            candidate_display=cleaned.get('candidate_display') or None,
            blind_marking=cleaned.get('blind_marking', False),
            response_text=cleaned['response_text'],
            max_points=cleaned['max_points'],
            topic=cleaned['topic'],
            status=FreeTextQueueItem.STATUS_QUEUED,
        )
        return JsonResponse(_serialize_queue_item(queue_item), status=201)


@method_decorator(csrf_exempt, name='dispatch')
@method_decorator(require_staff_or_examiner, name='dispatch')
class QueueListView(View):
    def get(self, request):
        form = QueueListForm(request.GET)
        if not form.is_valid():
            return _validation_error_response(form)

        queryset = FreeTextQueueItem.objects.select_related('manual_grade').order_by(
            'created_at',
        )
        cleaned = form.cleaned_data
        if cleaned.get('status'):
            queryset = queryset.filter(status=cleaned['status'])
        if cleaned.get('test_id'):
            queryset = queryset.filter(test_id=cleaned['test_id'])
        if cleaned.get('attempt_id'):
            queryset = queryset.filter(attempt_id=cleaned['attempt_id'])

        return JsonResponse(
            {
                'count': queryset.count(),
                'results': [_serialize_queue_item(item) for item in queryset],
            }
        )


@method_decorator(csrf_exempt, name='dispatch')
@method_decorator(require_staff_or_examiner, name='dispatch')
class ManualGradeView(View):
    def post(self, request):
        data = _parse_request_data(request)
        if data is None:
            return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

        form = ManualGradeForm(data)
        if not form.is_valid():
            return _validation_error_response(form)

        cleaned = form.cleaned_data
        queue_item = FreeTextQueueItem.objects.filter(
            id=cleaned['queue_item_id'],
        ).first()
        if queue_item is None:
            return JsonResponse({'queue_item_id': ['Queue item not found.']}, status=404)
        if queue_item.status == FreeTextQueueItem.STATUS_GRADED:
            return JsonResponse(
                {'queue_item_id': ['Queue item has already been graded.']},
                status=400,
            )
        if cleaned['awarded_points'] > queue_item.max_points:
            return JsonResponse(
                {'awarded_points': ['Awarded points cannot exceed max points.']},
                status=400,
            )

        manual_grade = ManualGrade.objects.create(
            queue_item=queue_item,
            grader_user_id=request.user.id,
            awarded_points=cleaned['awarded_points'],
            feedback=cleaned.get('feedback') or None,
        )
        queue_item.status = FreeTextQueueItem.STATUS_GRADED
        queue_item.save(update_fields=['status', 'updated_at'])

        queue_item.manual_grade = manual_grade
        return JsonResponse(_serialize_queue_item(queue_item))


@method_decorator(csrf_exempt, name='dispatch')
@method_decorator(require_staff_or_examiner, name='dispatch')
class AggregateAttemptView(View):
    def post(self, request):
        data = _parse_request_data(request)
        if data is None:
            return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

        form = AggregateAttemptForm(data)
        if not form.is_valid():
            return _validation_error_response(form)

        cleaned = form.cleaned_data
        attempt_id = cleaned['attempt_id']
        test_id_override = cleaned.get('test_id')
        compiled = compile_attempt_scores(attempt_id, test_id=test_id_override)
        test_id = compiled['test_id']
        if not test_id:
            return JsonResponse(
                {'test_id': ['Unable to determine test_id for this attempt.']},
                status=400,
            )

        combined_result, _ = CombinedResult.objects.update_or_create(
            attempt_id=attempt_id,
            defaults={
                'test_id': test_id,
                'total_awarded': compiled['total_awarded'],
                'total_max': compiled['total_max'],
                'by_topic': {
                    topic: {
                        'awarded': str(values['awarded']),
                        'max': str(values['max']),
                    }
                    for topic, values in compiled['by_topic'].items()
                },
                'passed': compiled['passed'],
            },
        )
        return JsonResponse(_serialize_combined_result(combined_result))


@method_decorator(csrf_exempt, name='dispatch')
@method_decorator(require_staff_or_examiner, name='dispatch')
class AttemptResultView(View):
    def get(self, request, attempt_id):
        combined_result = CombinedResult.objects.filter(attempt_id=attempt_id).first()
        if combined_result is None:
            return JsonResponse({'detail': 'Combined result not found.'}, status=404)
        return JsonResponse(_serialize_combined_result(combined_result))
