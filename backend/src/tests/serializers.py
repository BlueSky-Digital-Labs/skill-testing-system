"""
Serializers for test assembly APIs.
"""

from __future__ import annotations

from rest_framework import serializers

from question_bank.models import Difficulty, Question, QuestionType
from tests.models import (
    SelectionRule,
    Test,
    TestLifecycle,
    TestQuestionLink,
    TestSection,
    TestShuffleSeed,
)


class SelectionRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = SelectionRule
        fields = (
            'id',
            'subject',
            'topic',
            'difficulty',
            'question_type',
            'count',
            'order',
        )
        read_only_fields = ('id',)


class TestQuestionLinkSerializer(serializers.ModelSerializer):
    question_id = serializers.UUIDField(source='question.id', read_only=True)
    version_number = serializers.SerializerMethodField()

    class Meta:
        model = TestQuestionLink
        fields = (
            'id',
            'question_id',
            'order',
            'source',
            'version_number',
        )
        read_only_fields = ('id', 'source', 'version_number')

    def get_version_number(self, obj):
        if obj.question_version_id:
            return obj.question_version.version_number
        return None


class TestQuestionLinkWriteSerializer(serializers.Serializer):
    question_id = serializers.UUIDField()
    order = serializers.IntegerField(min_value=0, default=0)

    def validate_question_id(self, value):
        if not Question.objects.filter(pk=value).exists():
            raise serializers.ValidationError('Question not found.')
        return value


class SelectionRuleWriteSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=128, required=False, allow_blank=True)
    topic = serializers.CharField(max_length=128, required=False, allow_blank=True)
    difficulty = serializers.ChoiceField(
        choices=Difficulty.choices,
        required=False,
        allow_blank=True,
    )
    question_type = serializers.ChoiceField(
        choices=QuestionType.choices,
        required=False,
        allow_blank=True,
    )
    count = serializers.IntegerField(min_value=1)
    order = serializers.IntegerField(min_value=0, default=0)


class TestSectionWriteSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    order = serializers.IntegerField(min_value=0, default=0)
    settings = serializers.JSONField(required=False, default=dict)
    question_links = TestQuestionLinkWriteSerializer(many=True, required=False)
    selection_rules = SelectionRuleWriteSerializer(many=True, required=False)


class TestSectionSerializer(serializers.ModelSerializer):
    question_links = TestQuestionLinkSerializer(many=True, read_only=True)
    selection_rules = SelectionRuleSerializer(many=True, read_only=True)

    class Meta:
        model = TestSection
        fields = (
            'id',
            'title',
            'description',
            'order',
            'settings',
            'question_links',
            'selection_rules',
        )


class TestShuffleSeedSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestShuffleSeed
        fields = ('id', 'seed_type', 'seed_value', 'created_at')
        read_only_fields = fields


class TestSerializer(serializers.ModelSerializer):
    sections = TestSectionSerializer(many=True, read_only=True)
    shuffle_seeds = TestShuffleSeedSerializer(many=True, read_only=True)

    class Meta:
        model = Test
        fields = (
            'id',
            'title',
            'description',
            'lifecycle',
            'settings',
            'published_at',
            'created_by',
            'created_at',
            'updated_at',
            'sections',
            'shuffle_seeds',
        )
        read_only_fields = (
            'id',
            'lifecycle',
            'published_at',
            'created_by',
            'created_at',
            'updated_at',
            'shuffle_seeds',
        )


class TestCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    settings = serializers.JSONField(required=False, default=dict)
    sections = TestSectionWriteSerializer(many=True, required=False)


class TestUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    settings = serializers.JSONField(required=False)
    sections = TestSectionWriteSerializer(many=True, required=False)

    def validate(self, attrs):
        test = self.context.get('test')
        if test and test.lifecycle != TestLifecycle.DRAFT:
            raise serializers.ValidationError(
                'Only draft tests can be modified.',
            )
        return attrs
