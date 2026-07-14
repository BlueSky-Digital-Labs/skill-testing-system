"""
Question bank serializers.
"""

from __future__ import annotations

from rest_framework import serializers

from .models import BlankAnswerKey, Option, Question, QuestionType


class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ('id', 'label', 'value', 'is_correct', 'order')
        read_only_fields = ('id',)


class BlankAnswerKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = BlankAnswerKey
        fields = ('id', 'answer', 'case_sensitive')
        read_only_fields = ('id',)


class QuestionSerializer(serializers.ModelSerializer):
    options = OptionSerializer(many=True, required=False)
    blank_answer_keys = BlankAnswerKeySerializer(many=True, required=False)
    author_email = serializers.EmailField(source='author.email', read_only=True)

    class Meta:
        model = Question
        fields = (
            'id',
            'subject',
            'topic',
            'difficulty',
            'type',
            'text',
            'image',
            'points',
            'author',
            'author_email',
            'metadata',
            'options',
            'blank_answer_keys',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'author', 'created_at', 'updated_at')

    def validate(self, attrs):
        question_type = attrs.get(
            'type',
            getattr(self.instance, 'type', None),
        )
        options_data = attrs.get('options')
        blank_keys_data = attrs.get('blank_answer_keys')

        if self.instance is None:
            self._validate_create_payload(question_type, options_data, blank_keys_data)
        else:
            self._validate_update_payload(
                question_type,
                options_data,
                blank_keys_data,
            )
        return attrs

    def _validate_create_payload(self, question_type, options_data, blank_keys_data):
        if question_type is None:
            raise serializers.ValidationError({'type': 'Question type is required.'})

        options_data = options_data or []
        blank_keys_data = blank_keys_data or []
        self._validate_type_structure(question_type, options_data, blank_keys_data)

    def _validate_update_payload(self, question_type, options_data, blank_keys_data):
        effective_type = question_type or self.instance.type

        if options_data is None and blank_keys_data is None:
            return

        if options_data is None:
            options_data = list(
                self.instance.options.values('label', 'value', 'is_correct', 'order'),
            )
        if blank_keys_data is None:
            blank_keys_data = list(
                self.instance.blank_answer_keys.values('answer', 'case_sensitive'),
            )

        self._validate_type_structure(effective_type, options_data, blank_keys_data)

    def _validate_type_structure(self, question_type, options_data, blank_keys_data):
        if question_type == QuestionType.MCQ:
            self._validate_mcq(options_data)
        elif question_type == QuestionType.MULTI_SELECT:
            self._validate_multi_select(options_data)
        elif question_type == QuestionType.TRUE_FALSE:
            self._validate_true_false(options_data)
        elif question_type == QuestionType.FILL_IN_BLANK:
            self._validate_fill_in_blank(options_data, blank_keys_data)
        elif question_type == QuestionType.FREE_TEXT:
            self._validate_free_text(options_data, blank_keys_data)

    @staticmethod
    def _validate_mcq(options_data):
        if len(options_data) < 2:
            raise serializers.ValidationError(
                {'options': 'MCQ questions must have at least two options.'},
            )
        correct_count = sum(1 for option in options_data if option.get('is_correct'))
        if correct_count != 1:
            raise serializers.ValidationError(
                {'options': 'MCQ questions must have exactly one correct option.'},
            )

    @staticmethod
    def _validate_multi_select(options_data):
        if len(options_data) < 2:
            raise serializers.ValidationError(
                {'options': 'Multi-select questions must have at least two options.'},
            )
        correct_count = sum(1 for option in options_data if option.get('is_correct'))
        if correct_count < 1:
            raise serializers.ValidationError(
                {'options': 'Multi-select questions must have at least one correct option.'},
            )

    @staticmethod
    def _validate_true_false(options_data):
        if len(options_data) != 2:
            raise serializers.ValidationError(
                {'options': 'True/false questions must have exactly two options.'},
            )
        correct_count = sum(1 for option in options_data if option.get('is_correct'))
        if correct_count != 1:
            raise serializers.ValidationError(
                {'options': 'True/false questions must have exactly one correct option.'},
            )

    @staticmethod
    def _validate_fill_in_blank(options_data, blank_keys_data):
        if not blank_keys_data:
            raise serializers.ValidationError(
                {'blank_answer_keys': 'Fill-in-the-blank questions require at least one accepted answer.'},
            )
        if options_data:
            raise serializers.ValidationError(
                {'options': 'Fill-in-the-blank questions must not include options.'},
            )

    @staticmethod
    def _validate_free_text(options_data, blank_keys_data):
        if options_data:
            raise serializers.ValidationError(
                {'options': 'Free-text questions must not include options.'},
            )
        if blank_keys_data:
            raise serializers.ValidationError(
                {'blank_answer_keys': 'Free-text questions must not include blank answer keys.'},
            )

    def create(self, validated_data):
        options_data = validated_data.pop('options', [])
        blank_keys_data = validated_data.pop('blank_answer_keys', [])
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['author'] = request.user

        question = Question.objects.create(**validated_data)
        self._replace_nested(question, options_data, blank_keys_data)
        question.full_clean()
        return question

    def update(self, instance, validated_data):
        options_data = validated_data.pop('options', None)
        blank_keys_data = validated_data.pop('blank_answer_keys', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if options_data is not None or blank_keys_data is not None:
            effective_options = options_data
            effective_blank_keys = blank_keys_data
            if effective_options is None:
                effective_options = list(
                    instance.options.values('label', 'value', 'is_correct', 'order'),
                )
            if effective_blank_keys is None:
                effective_blank_keys = list(
                    instance.blank_answer_keys.values('answer', 'case_sensitive'),
                )
            self._replace_nested(instance, effective_options, effective_blank_keys)

        instance.full_clean()
        return instance

    @staticmethod
    def _replace_nested(question, options_data, blank_keys_data):
        question.options.all().delete()
        question.blank_answer_keys.all().delete()

        for option_data in options_data:
            Option.objects.create(question=question, **option_data)

        for blank_key_data in blank_keys_data:
            BlankAnswerKey.objects.create(question=question, **blank_key_data)
