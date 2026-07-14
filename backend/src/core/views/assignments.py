"""
Assignment API views.
"""

from django.db.models import Case, CharField, Q, Value, When
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.models import Assignment, AssignmentStatus
from core.permissions.assignment_permissions import IsCoordinatorOrAdmin
from core.serializers.assignments import (
    AssignmentCreateSerializer,
    AssignmentSerializer,
)


def annotate_assignment_state(queryset, now=None):
    """Annotate queryset rows with a computed dashboard state."""
    if now is None:
        now = timezone.now()

    return queryset.annotate(
        state=Case(
            When(status=AssignmentStatus.ARCHIVED, then=Value('archived')),
            When(opens_at__gt=now, then=Value('upcoming')),
            When(
                Q(closes_at__isnull=False) & Q(closes_at__lte=now),
                then=Value('closed'),
            ),
            When(
                Q(due_at__isnull=False) & Q(due_at__lt=now),
                then=Value('overdue'),
            ),
            When(opens_at__lte=now, then=Value('open')),
            default=Value('closed'),
            output_field=CharField(),
        )
    )


@extend_schema(tags=['Assignments'])
class AssignmentViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsCoordinatorOrAdmin]
    lookup_field = 'pk'
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        queryset = Assignment.objects.all().order_by('-created_at')
        if self.action == 'list':
            queryset = annotate_assignment_state(queryset)
            queryset = self._apply_list_filters(queryset)
        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return AssignmentCreateSerializer
        return AssignmentSerializer

    def _apply_list_filters(self, queryset):
        params = self.request.query_params

        test_id = params.get('test_id')
        if test_id:
            queryset = queryset.filter(test_id=test_id)

        assignee_user_id = params.get('assignee_user_id')
        if assignee_user_id:
            queryset = queryset.filter(assignee_user_id=assignee_user_id)

        assignee_group_id = params.get('assignee_group_id')
        if assignee_group_id:
            queryset = queryset.filter(assignee_group_id=assignee_group_id)

        status_value = params.get('status')
        if status_value:
            queryset = queryset.filter(status=status_value)

        state = params.get('state')
        if state:
            queryset = queryset.filter(state=state)

        return queryset

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary='Archive assignment',
        responses={200: AssignmentSerializer},
    )
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        assignment = self.get_object()
        assignment.status = AssignmentStatus.ARCHIVED
        assignment.save(update_fields=['status', 'updated_at'])
        serializer = AssignmentSerializer(assignment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
