"""
Assignment serializers.
"""

from __future__ import annotations

from django.utils import timezone
from rest_framework import serializers

from core.models import Assignment
from core.services.availability import assignment_state


class AssignmentSerializer(serializers.ModelSerializer):
    state = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            'id',
            'test_id',
            'assignee_user_id',
            'assignee_group_id',
            'created_by_user_id',
            'opens_at',
            'due_at',
            'closes_at',
            'max_attempts',
            'shuffle_questions',
            'shuffle_options',
            'status',
            'state',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_by_user_id',
            'state',
            'created_at',
            'updated_at',
        ]

    def get_state(self, obj: Assignment) -> str:
        annotated_state = getattr(obj, 'state', None)
        if annotated_state:
            return annotated_state
        return assignment_state(obj, timezone.now())


class AssignmentCreateSerializer(serializers.ModelSerializer):
    assignee_user_id = serializers.UUIDField(required=False, allow_null=True)
    assignee_group_id = serializers.UUIDField(required=False, allow_null=True)
    due_at = serializers.DateTimeField(required=False, allow_null=True)
    closes_at = serializers.DateTimeField(required=False, allow_null=True)

    class Meta:
        model = Assignment
        fields = [
            'test_id',
            'assignee_user_id',
            'assignee_group_id',
            'opens_at',
            'due_at',
            'closes_at',
            'max_attempts',
            'shuffle_questions',
            'shuffle_options',
            'status',
        ]
        validators = []

    def validate(self, attrs):
        assignee_user_id = attrs.get(
            'assignee_user_id',
            getattr(self.instance, 'assignee_user_id', None),
        )
        assignee_group_id = attrs.get(
            'assignee_group_id',
            getattr(self.instance, 'assignee_group_id', None),
        )
        if not assignee_user_id and not assignee_group_id:
            raise serializers.ValidationError(
                {'non_field_errors': [
                    'At least one of assignee_user_id or assignee_group_id is required.'
                ]}
            )

        opens_at = attrs.get('opens_at', getattr(self.instance, 'opens_at', None))
        due_at = attrs.get('due_at', getattr(self.instance, 'due_at', None))
        closes_at = attrs.get('closes_at', getattr(self.instance, 'closes_at', None))

        if opens_at and due_at and due_at < opens_at:
            raise serializers.ValidationError(
                {'due_at': 'due_at must be on or after opens_at.'}
            )
        if due_at and closes_at and closes_at < due_at:
            raise serializers.ValidationError(
                {'closes_at': 'closes_at must be on or after due_at.'}
            )
        if opens_at and closes_at and closes_at < opens_at:
            raise serializers.ValidationError(
                {'closes_at': 'closes_at must be on or after opens_at.'}
            )

        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            validated_data['created_by_user_id'] = _user_uuid(request.user.pk)
        return super().create(validated_data)

    def to_representation(self, instance):
        return AssignmentSerializer(instance, context=self.context).data


def _user_uuid(user_pk: int):
    import uuid

    return uuid.UUID(int=user_pk)
