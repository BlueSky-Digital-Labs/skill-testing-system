"""
Authentication views for user registration, login, and profile management.
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView as SimpleJWTTokenRefreshView,
    TokenVerifyView,
)
from django.contrib.auth import login
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample
from drf_spectacular.openapi import OpenApiTypes

from core.permissions import IsSystemAdmin

from .models import Role, RoleKey, User, UserRole
from .password_reset import create_password_reset_token, send_password_reset_email
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    TokenResponseSerializer,
    ErrorResponseSerializer,
    TokenObtainSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    RoleSerializer,
    UserSerializer,
    UserRoleAssignSerializer,
)
from .utils import get_active_system_admin_count, user_has_role


@extend_schema(
    tags=['Authentication'],
    summary='Register a new user',
    description='Create a new user account and return JWT tokens for immediate authentication.',
    request=UserRegistrationSerializer,
    responses={
        201: OpenApiResponse(
            response=TokenResponseSerializer,
            description='User successfully registered',
            examples=[
                OpenApiExample(
                    'Registration Success',
                    value={
                        'user': {
                            'id': 1,
                            'email': 'user@example.com',
                            'date_joined': '2024-01-01T00:00:00Z',
                            'is_active': True
                        },
                        'access': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
                        'refresh': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...'
                    }
                )
            ]
        ),
        400: OpenApiResponse(
            response=ErrorResponseSerializer,
            description='Validation errors',
            examples=[
                OpenApiExample(
                    'Validation Error',
                    value={
                        'email': ['This field is required.'],
                        'password': ['This field is required.']
                    }
                )
            ]
        )
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    Register a new user and return JWT tokens.
    """
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserProfileSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    tags=['Authentication'],
    summary='Login user',
    description='Authenticate user with email and password, return JWT tokens.',
    request=UserLoginSerializer,
    responses={
        200: OpenApiResponse(
            response=TokenResponseSerializer,
            description='User successfully authenticated',
            examples=[
                OpenApiExample(
                    'Login Success',
                    value={
                        'user': {
                            'id': 1,
                            'email': 'user@example.com',
                            'date_joined': '2024-01-01T00:00:00Z',
                            'is_active': True
                        },
                        'access': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
                        'refresh': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...'
                    }
                )
            ]
        ),
        400: OpenApiResponse(
            response=ErrorResponseSerializer,
            description='Authentication failed',
            examples=[
                OpenApiExample(
                    'Invalid Credentials',
                    value={
                        'non_field_errors': ['Unable to authenticate with provided credentials.']
                    }
                )
            ]
        )
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Login user and return JWT tokens.
    """
    serializer = UserLoginSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = serializer.validated_data['user']
        login(request, user)
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserProfileSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    tags=['Authentication'],
    summary='Get current user profile',
    description='Retrieve the profile information of the currently authenticated user.',
    responses={
        200: OpenApiResponse(
            response=UserProfileSerializer,
            description='User profile retrieved successfully',
            examples=[
                OpenApiExample(
                    'Profile Success',
                    value={
                        'id': 1,
                        'email': 'user@example.com',
                        'date_joined': '2024-01-01T00:00:00Z',
                        'is_active': True
                    }
                )
            ]
        ),
        401: OpenApiResponse(
            response=ErrorResponseSerializer,
            description='Authentication required',
            examples=[
                OpenApiExample(
                    'Unauthorized',
                    value={
                        'detail': 'Authentication credentials were not provided.'
                    }
                )
            ]
        )
    }
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    """
    Get current user profile.
    """
    serializer = UserProfileSerializer(request.user)
    return Response(serializer.data)


@extend_schema(tags=['Users'])
class AuthUserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for reading user information (JWT protected).
    
    Provides list and retrieve operations for users.
    Supports filtering by email via query parameter.
    """
    queryset = User.objects.filter(is_active=True)
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='List users',
        description='Get a paginated list of active users. Supports email filtering.',
        parameters=[
            {
                'name': 'email',
                'in': 'query',
                'description': 'Filter users by email (partial match)',
                'required': False,
                'type': 'string'
            }
        ],
        responses={
            200: UserProfileSerializer(many=True),
            401: OpenApiResponse(
                response=ErrorResponseSerializer,
                description='Authentication required'
            )
        }
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary='Retrieve user',
        description='Get detailed information about a specific user.',
        responses={
            200: UserProfileSerializer,
            401: OpenApiResponse(
                response=ErrorResponseSerializer,
                description='Authentication required'
            ),
            404: OpenApiResponse(
                response=ErrorResponseSerializer,
                description='User not found'
            )
        }
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    def get_queryset(self):
        """
        Optionally restricts the returned users,
        by filtering against a `email` query parameter in the URL.
        """
        queryset = User.objects.filter(is_active=True)
        email = self.request.query_params.get('email')
        if email is not None:
            queryset = queryset.filter(email__icontains=email)
        return queryset


@extend_schema(tags=['Admin Roles'])
class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all().order_by('key')
    serializer_class = RoleSerializer
    permission_classes = [IsSystemAdmin]
    lookup_field = 'pk'

    def perform_destroy(self, instance):
        if instance.key == RoleKey.SYSTEM_ADMIN:
            raise ValidationError(
                {'detail': 'The SYSTEM_ADMIN role cannot be deleted.'}
            )
        if instance.user_roles.exists():
            raise ValidationError(
                {'detail': 'Cannot delete a role that is assigned to users.'}
            )
        instance.delete()


@extend_schema(tags=['Admin Users'])
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('email')
    serializer_class = UserSerializer
    permission_classes = [IsSystemAdmin]

    def get_queryset(self):
        queryset = User.objects.all().order_by('email')
        email = self.request.query_params.get('email')
        if email is not None:
            queryset = queryset.filter(email__icontains=email)
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            active_values = ('true', '1', 'yes')
            queryset = queryset.filter(
                is_active=is_active.lower() in active_values,
            )
        return queryset

    def perform_destroy(self, instance):
        if user_has_role(instance, RoleKey.SYSTEM_ADMIN):
            remaining = get_active_system_admin_count(exclude_user_id=instance.pk)
            if remaining == 0:
                raise ValidationError(
                    {'detail': 'Cannot delete the last active system administrator.'}
                )
        instance.is_active = False
        instance.save(update_fields=['is_active'])

    @extend_schema(
        summary='Assign role to user',
        request=UserRoleAssignSerializer,
        responses={200: UserSerializer},
    )
    @action(detail=True, methods=['post'], url_path='assign-role')
    def assign_role(self, request, pk=None):
        user = self.get_object()
        serializer = UserRoleAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = Role.objects.get(key=serializer.validated_data['role_key'])
        UserRole.objects.get_or_create(
            user=user,
            role=role,
            defaults={'assigned_by': request.user},
        )
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Remove role from user',
        request=UserRoleAssignSerializer,
        responses={200: UserSerializer},
    )
    @action(detail=True, methods=['post'], url_path='remove-role')
    def remove_role(self, request, pk=None):
        user = self.get_object()
        serializer = UserRoleAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role_key = serializer.validated_data['role_key']
        if role_key == RoleKey.SYSTEM_ADMIN:
            if user_has_role(user, RoleKey.SYSTEM_ADMIN):
                remaining = get_active_system_admin_count(exclude_user_id=user.pk)
                if remaining == 0:
                    return Response(
                        {
                            'detail': (
                                'Cannot remove SYSTEM_ADMIN from the last '
                                'active administrator.'
                            ),
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
        deleted, _ = UserRole.objects.filter(
            user=user,
            role__key=role_key,
        ).delete()
        if not deleted:
            return Response(
                {'detail': 'User does not have this role.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


# JWT Token Views with OpenAPI documentation
class DocumentedTokenObtainPairView(TokenObtainPairView):
    @extend_schema(
        tags=['Authentication'],
        summary='Obtain JWT token pair',
        description='Get access and refresh tokens using email and password.',
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class DocumentedTokenRefreshView(SimpleJWTTokenRefreshView):
    @extend_schema(
        tags=['Authentication'],
        summary='Refresh JWT token',
        description='Get a new access token using a valid refresh token.',
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class DocumentedTokenVerifyView(TokenVerifyView):
    @extend_schema(
        tags=['Authentication'],
        summary='Verify JWT token',
        description='Verify if a JWT token is valid.',
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class EmailTokenObtainPairView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = TokenObtainSerializer(
            data=request.data,
            context={'request': request},
        )
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            return Response(
                {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user = User.objects.filter(email__iexact=email, is_active=True).first()
            if user:
                reset_token = create_password_reset_token(user)
                send_password_reset_email(user, reset_token)
            return Response(status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            reset_token = serializer.validated_data['reset_token']
            user = reset_token.user
            user.set_password(serializer.validated_data['new_password'])
            user.save(update_fields=['password'])
            reset_token.used_at = timezone.now()
            reset_token.save(update_fields=['used_at'])
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


TokenRefreshView = SimpleJWTTokenRefreshView
