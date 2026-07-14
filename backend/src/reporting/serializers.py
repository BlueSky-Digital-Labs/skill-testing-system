from __future__ import annotations

from rest_framework import serializers

REPORT_TYPES = (
    'individual',
    'test_summary',
    'question_performance',
    'group_comparison',
    'progress',
)

EXPORT_FORMATS = ('csv', 'pdf')


class IndividualQuestionSerializer(serializers.Serializer):
    question_id = serializers.CharField()
    question_version = serializers.IntegerField()
    question_type = serializers.CharField()
    awarded_points = serializers.DecimalField(max_digits=8, decimal_places=2)
    max_points = serializers.DecimalField(max_digits=8, decimal_places=2)
    is_correct = serializers.BooleanField()
    topic = serializers.CharField()


class IndividualReportSerializer(serializers.Serializer):
    attempt_id = serializers.CharField()
    test_id = serializers.CharField()
    candidate_id = serializers.IntegerField()
    status = serializers.CharField()
    started_at = serializers.DateTimeField()
    submitted_at = serializers.DateTimeField(allow_null=True)
    total_awarded = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        allow_null=True,
    )
    total_max = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        allow_null=True,
    )
    passed = serializers.BooleanField(allow_null=True)
    by_topic = serializers.DictField(child=serializers.DictField())
    questions = IndividualQuestionSerializer(many=True)


class TestSummarySerializer(serializers.Serializer):
    test_id = serializers.CharField()
    attempt_count = serializers.IntegerField()
    completed_count = serializers.IntegerField()
    completion_rate = serializers.DecimalField(max_digits=8, decimal_places=4)
    result_count = serializers.IntegerField()
    passed_count = serializers.IntegerField()
    pass_rate = serializers.DecimalField(max_digits=8, decimal_places=4)
    average_awarded = serializers.DecimalField(max_digits=10, decimal_places=2)
    average_max = serializers.DecimalField(max_digits=10, decimal_places=2)
    average_percent = serializers.DecimalField(max_digits=8, decimal_places=2)


class QuestionPerformanceItemSerializer(serializers.Serializer):
    question_id = serializers.CharField()
    question_version = serializers.IntegerField()
    attempts = serializers.IntegerField()
    correct_count = serializers.IntegerField()
    correctness_rate = serializers.DecimalField(max_digits=8, decimal_places=4)
    average_awarded = serializers.DecimalField(max_digits=8, decimal_places=2)


class QuestionPerformanceSerializer(serializers.Serializer):
    test_id = serializers.CharField()
    questions = QuestionPerformanceItemSerializer(many=True)


class GroupComparisonItemSerializer(serializers.Serializer):
    group_id = serializers.CharField()
    group_name = serializers.CharField()
    member_count = serializers.IntegerField()
    attempt_count = serializers.IntegerField()
    completed_count = serializers.IntegerField()
    completion_rate = serializers.DecimalField(max_digits=8, decimal_places=4)
    result_count = serializers.IntegerField()
    passed_count = serializers.IntegerField()
    pass_rate = serializers.DecimalField(max_digits=8, decimal_places=4)
    average_awarded = serializers.DecimalField(max_digits=10, decimal_places=2)
    average_max = serializers.DecimalField(max_digits=10, decimal_places=2)
    average_percent = serializers.DecimalField(max_digits=8, decimal_places=2)


class GroupComparisonSerializer(serializers.Serializer):
    test_id = serializers.CharField()
    groups = GroupComparisonItemSerializer(many=True)


class ProgressBucketSerializer(serializers.Serializer):
    period_start = serializers.DateTimeField()
    period_end = serializers.DateTimeField()
    completion_count = serializers.IntegerField()
    average_percent = serializers.DecimalField(max_digits=8, decimal_places=2)


class ProgressReportSerializer(serializers.Serializer):
    group_id = serializers.CharField()
    group_name = serializers.CharField()
    topic = serializers.CharField(allow_null=True)
    from_dt = serializers.DateTimeField(allow_null=True)
    to_dt = serializers.DateTimeField(allow_null=True)
    buckets = ProgressBucketSerializer(many=True)


class ExportRequestSerializer(serializers.Serializer):
    report_type = serializers.ChoiceField(choices=REPORT_TYPES)
    format = serializers.ChoiceField(choices=EXPORT_FORMATS)
    parameters = serializers.DictField(child=serializers.CharField(), required=False)


class ExportResponseSerializer(serializers.Serializer):
    download_url = serializers.URLField()
    s3_key = serializers.CharField()
    expires_in = serializers.IntegerField()
