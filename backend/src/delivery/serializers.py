from __future__ import annotations

from rest_framework import serializers

from delivery.services.attempts import AnswerPayload


class AnswerInputSerializer(serializers.Serializer):
    question_id = serializers.UUIDField()
    question_version = serializers.IntegerField(min_value=1, default=1)
    response = serializers.JSONField()


class StartAttemptSerializer(serializers.Serializer):
    assignment_id = serializers.UUIDField()


class SaveAttemptSerializer(serializers.Serializer):
    answers = AnswerInputSerializer(many=True)

    def to_answer_payloads(self) -> list[AnswerPayload]:
        return [
            AnswerPayload(
                question_id=item['question_id'],
                question_version=item['question_version'],
                response=item['response'],
            )
            for item in self.validated_data['answers']
        ]


class PreviewStartSerializer(serializers.Serializer):
    seed = serializers.IntegerField(required=False)


class PreviewAnswerSerializer(serializers.Serializer):
    question_id = serializers.UUIDField()
    answer = serializers.JSONField()


class ReminderRequestSerializer(serializers.Serializer):
    group_id = serializers.UUIDField(required=False, allow_null=True)
    include_not_started = serializers.BooleanField(default=True)
    include_in_progress = serializers.BooleanField(default=True)
    include_overdue = serializers.BooleanField(default=True)


class EmailDeliveryDetailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    status = serializers.CharField()
    bucket = serializers.CharField(required=False)
    detail = serializers.CharField(required=False)


class ResendInviteResponseSerializer(serializers.Serializer):
    assignment_id = serializers.UUIDField()
    sent_count = serializers.IntegerField()
    throttled_count = serializers.IntegerField()
    failed_count = serializers.IntegerField()
    details = EmailDeliveryDetailSerializer(many=True)


class ReminderResponseSerializer(serializers.Serializer):
    test_id = serializers.UUIDField()
    sent_count = serializers.IntegerField()
    failed_count = serializers.IntegerField()
    details = EmailDeliveryDetailSerializer(many=True)


class GroupStatusSummarySerializer(serializers.Serializer):
    group_id = serializers.UUIDField()
    group_name = serializers.CharField()
    member_count = serializers.IntegerField()
    assignment_count = serializers.IntegerField()
    not_started_count = serializers.IntegerField()
    in_progress_count = serializers.IntegerField()
    submitted_count = serializers.IntegerField()
    attempt_status_counts = serializers.DictField(child=serializers.IntegerField())


class TestStatusSummarySerializer(serializers.Serializer):
    test_id = serializers.UUIDField()
    assignment_count = serializers.IntegerField()
    assignment_status_counts = serializers.DictField(child=serializers.IntegerField())
    assignment_state_counts = serializers.DictField(child=serializers.IntegerField())
    attempt_status_counts = serializers.DictField(child=serializers.IntegerField())
    group_breakdown = GroupStatusSummarySerializer(many=True)
