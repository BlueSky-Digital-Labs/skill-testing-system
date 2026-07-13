"""
Authentication views for user registration, login, and profile management.
"""

from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from django.contrib.auth import login
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample
from drf_spectacular.openapi import OpenApiTypes

from .models import User
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    TokenResponseSerializer,
    ErrorResponseSerializer
)


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
class UserViewSet(viewsets.ReadOnlyModelViewSet):
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


# JWT Token Views with OpenAPI documentation
class DocumentedTokenObtainPairView(TokenObtainPairView):
    @extend_schema(
        tags=['Authentication'],
        summary='Obtain JWT token pair',
        description='Get access and refresh tokens using email and password.',
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class DocumentedTokenRefreshView(TokenRefreshView):
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
