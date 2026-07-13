"""
Authentication serializers for user registration, login, and profile.
"""

from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import PasswordResetToken, User


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    """
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = ('email', 'password', 'password_confirm')

    def validate(self, attrs):
        """
        Validate that the two password entries match.
        """
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs

    def create(self, validated_data):
        """
        Create a new user with encrypted password.
        """
        validated_data.pop('password_confirm', None)
        user = User.objects.create_user(**validated_data)
        return user


class UserLoginSerializer(serializers.Serializer):
    """
    Serializer for user login.
    """
    email = serializers.EmailField()
    password = serializers.CharField(
        style={'input_type': 'password'},
        trim_whitespace=False
    )

    def validate(self, attrs):
        """
        Validate and authenticate the user.
        """
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            user = authenticate(
                request=self.context.get('request'),
                username=email,
                password=password
            )

            if not user:
                raise serializers.ValidationError(
                    'Unable to authenticate with provided credentials.'
                )

            if not user.is_active:
                raise serializers.ValidationError(
                    'User account is disabled.'
                )

            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError(
                'Must include "email" and "password".'
            )


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile (read-only for now).
    """
    
    class Meta:
        model = User
        fields = ('id', 'email', 'date_joined', 'is_active')
        read_only_fields = ('id', 'email', 'date_joined', 'is_active')


class TokenResponseSerializer(serializers.Serializer):
    """
    Serializer for JWT token response.
    """
    access = serializers.CharField(
        help_text="JWT access token. Use this in the Authorization header as 'Bearer <token>'"
    )
    refresh = serializers.CharField(
        help_text="JWT refresh token. Use this to obtain new access tokens"
    )
    user = UserProfileSerializer(help_text="User profile information")


class ErrorResponseSerializer(serializers.Serializer):
    """
    Serializer for error responses.
    """
    detail = serializers.CharField(help_text="Error message describing what went wrong")
    
    class Meta:
        examples = [
            {
                "detail": "Invalid credentials provided"
            },
            {
                "email": ["This field is required."],
                "password": ["This field is required."]
            }
        ]


class TokenObtainSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(
            request=self.context.get('request'),
            email=data['email'],
            password=data['password'],
        )
        if user is None:
            raise serializers.ValidationError('Invalid credentials')
        if not user.is_active:
            raise serializers.ValidationError('Invalid credentials')
        data['user'] = user
        return data


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate(self, data):
        try:
            reset_token = PasswordResetToken.objects.select_related('user').get(
                token=data['token']
            )
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError({'token': 'Invalid or expired token'})

        if not reset_token.is_valid():
            raise serializers.ValidationError({'token': 'Invalid or expired token'})

        try:
            validate_password(data['new_password'], reset_token.user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'new_password': list(exc.messages)})

        data['reset_token'] = reset_token
        return data
