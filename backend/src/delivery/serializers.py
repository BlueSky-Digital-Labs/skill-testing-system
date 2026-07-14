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
