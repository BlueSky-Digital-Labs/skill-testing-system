"""
Candidate group serializers.
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers

from core.models import CandidateGroup

User = get_user_model()


class GroupMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name']
        read_only_fields = fields


class CandidateGroupSummarySerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = CandidateGroup
        fields = [
            'id',
            'name',
            'description',
            'is_active',
            'member_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'member_count',
            'created_at',
            'updated_at',
        ]

    def get_member_count(self, obj: CandidateGroup) -> int:
        if hasattr(obj, 'member_count'):
            return obj.member_count
        return obj.members.count()


class CandidateGroupDetailSerializer(CandidateGroupSummarySerializer):
    members = GroupMemberSerializer(many=True, read_only=True)

    class Meta(CandidateGroupSummarySerializer.Meta):
        fields = CandidateGroupSummarySerializer.Meta.fields + [
            'members',
            'created_by_id',
        ]


class CandidateGroupWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CandidateGroup
        fields = ['name', 'description', 'is_active']

    def validate_name(self, value: str) -> str:
        queryset = CandidateGroup.objects.filter(name__iexact=value)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                'A candidate group with this name already exists.'
            )
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)

    def to_representation(self, instance):
        return CandidateGroupDetailSerializer(instance, context=self.context).data


class GroupMemberActionSerializer(serializers.Serializer):
    user_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
        default=list,
    )
    emails = serializers.ListField(
        child=serializers.EmailField(),
        required=False,
        allow_empty=True,
        default=list,
    )

    def validate(self, attrs):
        user_ids = attrs.get('user_ids') or []
        emails = attrs.get('emails') or []
        if not user_ids and not emails:
            raise serializers.ValidationError(
                'At least one of user_ids or emails must be provided.'
            )
        return attrs
