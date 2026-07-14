"""
Candidate group API views.
"""

from __future__ import annotations

import logging

from django.contrib.auth import get_user_model
from django.db.models import Count
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from audit.utils import log_action
from authentication.models import RoleKey
from authentication.utils import user_has_role
from core.models import CandidateGroup
from core.permissions import IsCoordinatorOrAdmin
from core.serializers.groups import (
    CandidateGroupDetailSerializer,
    CandidateGroupSummarySerializer,
    CandidateGroupWriteSerializer,
    GroupMemberActionSerializer,
    GroupMemberSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


def _resolve_member_users(user_ids, emails):
    """
    Resolve user_ids and emails to User instances.

    Returns a tuple of (resolved_users, not_found_user_ids, not_found_emails).
    """
    resolved = {}
    not_found_user_ids = []
    not_found_emails = []

    if user_ids:
        users_by_id = User.objects.filter(pk__in=user_ids).in_bulk()
        for user_id in user_ids:
            user = users_by_id.get(user_id)
            if user is None:
                not_found_user_ids.append(user_id)
            else:
                resolved[user.pk] = user

    if emails:
        for email in emails:
            user = User.objects.filter(email__iexact=email).first()
            if user is None:
                not_found_emails.append(email)
            else:
                resolved[user.pk] = user

    return list(resolved.values()), not_found_user_ids, not_found_emails


def _is_candidate(user) -> bool:
    return user_has_role(user, RoleKey.CANDIDATE)


@extend_schema(tags=['Candidate Groups'])
class CandidateGroupViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsCoordinatorOrAdmin]
    lookup_field = 'pk'
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        queryset = CandidateGroup.objects.all()
        if self.action == 'list':
            queryset = queryset.annotate(member_count=Count('members'))
        return queryset.order_by('name')

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return CandidateGroupWriteSerializer
        if self.action == 'retrieve':
            return CandidateGroupDetailSerializer
        return CandidateGroupSummarySerializer

    def perform_create(self, serializer):
        group = serializer.save()
        logger.info(
            'Candidate group created: id=%s name=%s by_user=%s',
            group.id,
            group.name,
            self.request.user.pk,
        )
        log_action(
            action='CANDIDATE_GROUP_CREATED',
            entity_type='candidate_group',
            entity_id=str(group.id),
            metadata={'name': group.name},
            request=self.request,
        )

    def perform_update(self, serializer):
        group = serializer.save()
        logger.info(
            'Candidate group updated: id=%s name=%s by_user=%s',
            group.id,
            group.name,
            self.request.user.pk,
        )
        log_action(
            action='CANDIDATE_GROUP_UPDATED',
            entity_type='candidate_group',
            entity_id=str(group.id),
            metadata={'name': group.name, 'is_active': group.is_active},
            request=self.request,
        )

    def perform_destroy(self, instance):
        group_id = str(instance.id)
        group_name = instance.name
        instance.delete()
        logger.info(
            'Candidate group deleted: id=%s name=%s by_user=%s',
            group_id,
            group_name,
            self.request.user.pk,
        )
        log_action(
            action='CANDIDATE_GROUP_DELETED',
            entity_type='candidate_group',
            entity_id=group_id,
            metadata={'name': group_name},
            request=self.request,
        )

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)

    def _member_action_response(self, group, *, added=None, removed=None, **extra):
        payload = {
            'group': CandidateGroupDetailSerializer(
                group,
                context={'request': self.request},
            ).data,
        }
        if added is not None:
            payload['added'] = GroupMemberSerializer(added, many=True).data
        if removed is not None:
            payload['removed'] = GroupMemberSerializer(removed, many=True).data
        payload.update(extra)
        return Response(payload, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Add members to a candidate group',
        request=GroupMemberActionSerializer,
        responses={200: CandidateGroupDetailSerializer},
    )
    @action(detail=True, methods=['post'], url_path='add-members')
    def add_members(self, request, pk=None):
        group = self.get_object()
        serializer = GroupMemberActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        users, not_found_user_ids, not_found_emails = _resolve_member_users(
            serializer.validated_data.get('user_ids', []),
            serializer.validated_data.get('emails', []),
        )

        added = []
        already_members = []
        invalid_users = []
        current_member_ids = set(group.members.values_list('pk', flat=True))

        for user in users:
            if not _is_candidate(user):
                invalid_users.append(GroupMemberSerializer(user).data)
                continue
            if user.pk in current_member_ids:
                already_members.append(GroupMemberSerializer(user).data)
                continue
            group.members.add(user)
            current_member_ids.add(user.pk)
            added.append(user)

        if added:
            group.refresh_from_db()
            logger.info(
                'Members added to candidate group %s: user_ids=%s by_user=%s',
                group.id,
                [user.pk for user in added],
                request.user.pk,
            )
            log_action(
                action='CANDIDATE_GROUP_MEMBERS_ADDED',
                entity_type='candidate_group',
                entity_id=str(group.id),
                metadata={
                    'added_user_ids': [user.pk for user in added],
                    'added_emails': [user.email for user in added],
                },
                request=request,
            )

        return self._member_action_response(
            group,
            added=added,
            already_members=already_members,
            invalid_users=invalid_users,
            not_found={
                'user_ids': not_found_user_ids,
                'emails': not_found_emails,
            },
        )

    @extend_schema(
        summary='Remove members from a candidate group',
        request=GroupMemberActionSerializer,
        responses={200: CandidateGroupDetailSerializer},
    )
    @action(detail=True, methods=['post'], url_path='remove-members')
    def remove_members(self, request, pk=None):
        group = self.get_object()
        serializer = GroupMemberActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        users, not_found_user_ids, not_found_emails = _resolve_member_users(
            serializer.validated_data.get('user_ids', []),
            serializer.validated_data.get('emails', []),
        )

        removed = []
        not_members = []
        current_member_ids = set(group.members.values_list('pk', flat=True))

        for user in users:
            if user.pk not in current_member_ids:
                not_members.append(GroupMemberSerializer(user).data)
                continue
            group.members.remove(user)
            current_member_ids.discard(user.pk)
            removed.append(user)

        if removed:
            group.refresh_from_db()
            logger.info(
                'Members removed from candidate group %s: user_ids=%s by_user=%s',
                group.id,
                [user.pk for user in removed],
                request.user.pk,
            )
            log_action(
                action='CANDIDATE_GROUP_MEMBERS_REMOVED',
                entity_type='candidate_group',
                entity_id=str(group.id),
                metadata={
                    'removed_user_ids': [user.pk for user in removed],
                    'removed_emails': [user.email for user in removed],
                },
                request=request,
            )

        return self._member_action_response(
            group,
            removed=removed,
            not_members=not_members,
            not_found={
                'user_ids': not_found_user_ids,
                'emails': not_found_emails,
            },
        )
