"""
Authentication serializers for user registration, login, and profile.
"""

from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import PasswordResetToken, Role, RoleKey, User, UserRole
from .utils import get_active_system_admin_count


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


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ('id', 'key', 'name', 'description', 'is_active')
        read_only_fields = ('id',)

    def validate_key(self, value):
        if self.instance is not None and value != self.instance.key:
            raise serializers.ValidationError('Role key cannot be changed.')
        return value

    def validate(self, attrs):
        is_active = attrs.get(
            'is_active',
            getattr(self.instance, 'is_active', True),
        )
        key = attrs.get('key', getattr(self.instance, 'key', None))
        if (
            self.instance
            and self.instance.key == RoleKey.SYSTEM_ADMIN
            and is_active is False
        ):
            raise serializers.ValidationError(
                {'is_active': 'The SYSTEM_ADMIN role cannot be deactivated.'}
            )
        if key == RoleKey.SYSTEM_ADMIN and is_active is False:
            raise serializers.ValidationError(
                {'is_active': 'The SYSTEM_ADMIN role cannot be deactivated.'}
            )
        return attrs


class UserRoleSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)

    class Meta:
        model = UserRole
        fields = ('id', 'role', 'assigned_at', 'assigned_by')
        read_only_fields = fields


class UserSerializer(serializers.ModelSerializer):
    username = serializers.EmailField(source='email', read_only=True)
    roles = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'username',
            'first_name',
            'last_name',
            'is_active',
            'roles',
            'password',
        )
        read_only_fields = ('id',)

    def get_roles(self, obj):
        assignments = obj.user_roles.select_related('role').filter(
            role__is_active=True,
        )
        roles = [assignment.role for assignment in assignments]
        return RoleSerializer(roles, many=True).data

    def validate(self, attrs):
        is_active = attrs.get('is_active', getattr(self.instance, 'is_active', True))
        if self.instance and is_active is False:
            if user_has_system_admin_role(self.instance):
                remaining = get_active_system_admin_count(
                    exclude_user_id=self.instance.pk,
                )
                if remaining == 0:
                    raise serializers.ValidationError({
                        'is_active': (
                            'Cannot deactivate the last active '
                            'system administrator.'
                        ),
                    })
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create_user(**validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=['password'])
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=['password'])
        return user


def user_has_system_admin_role(user) -> bool:
    return user.user_roles.filter(
        role__key=RoleKey.SYSTEM_ADMIN,
        role__is_active=True,
    ).exists()


class UserRoleAssignSerializer(serializers.Serializer):
    role_key = serializers.ChoiceField(choices=RoleKey.choices)

    def validate_role_key(self, value):
        try:
            role = Role.objects.get(key=value)
        except Role.DoesNotExist:
            raise serializers.ValidationError('Role does not exist.')
        if not role.is_active:
            raise serializers.ValidationError('Cannot assign an inactive role.')
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
