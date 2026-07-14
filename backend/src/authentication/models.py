"""
Authentication models with custom email-only User.
"""

import uuid
from datetime import timedelta

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.contrib.auth.base_user import BaseUserManager
from django.conf import settings
from django.db import models
from django.utils import timezone


def default_password_reset_expires_at():
    return timezone.now() + timedelta(hours=1)


def default_invitation_expires_at():
    return timezone.now() + timedelta(days=7)


class UserManager(BaseUserManager):
    """
    Custom user manager for email-only authentication.
    """

    def create_user(self, email, password=None, **extra_fields):
        """
        Create and return a regular user with an email and password.
        """
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and return a superuser with an email and password.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class RoleKey(models.TextChoices):
    SYSTEM_ADMIN = 'SYSTEM_ADMIN', 'System Admin'
    EXAMINER = 'EXAMINER', 'Examiner'
    COORDINATOR = 'COORDINATOR', 'Coordinator'
    CANDIDATE = 'CANDIDATE', 'Candidate'


class Role(models.Model):
    key = models.CharField(max_length=50, unique=True, choices=RoleKey.choices)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'auth_role'
        ordering = ['key']

    def __str__(self):
        return self.name


class UserRole(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='user_roles',
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name='user_roles',
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='roles_assigned',
    )

    class Meta:
        db_table = 'auth_user_role'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'role'],
                name='unique_user_role',
            ),
        ]

    def __str__(self):
        return f'{self.user_id} -> {self.role.key}'


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model that uses email as the unique identifier.
    """

    email = models.EmailField(
        unique=True,
        db_index=True,
        help_text='Email address used for authentication'
    )
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'auth_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['email'], name='user_email_idx'),
            models.Index(
                fields=['is_active'],
                name='user_active_idx',
                condition=models.Q(is_active=True)
            ),
        ]

    def __str__(self):
        return self.email

    def get_full_name(self):
        return self.email

    def get_short_name(self):
        return self.email.split('@')[0]


class PasswordResetToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    token = models.CharField(max_length=128, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=default_password_reset_expires_at)
    used_at = models.DateTimeField(null=True, blank=True)

    def is_valid(self):
        return self.expires_at > timezone.now() and self.used_at is None


class Invitation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(db_index=True)
    token = models.CharField(max_length=128, unique=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='invitations_created',
    )
    role_key = models.CharField(max_length=50, choices=RoleKey.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=default_invitation_expires_at)
    accepted_at = models.DateTimeField(null=True, blank=True)
    consumed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='invitations_consumed',
    )

    class Meta:
        db_table = 'auth_invitation'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['email'],
                condition=models.Q(accepted_at__isnull=True),
                name='unique_pending_invitation_per_email',
            ),
        ]

    def is_valid(self):
        return self.expires_at > timezone.now() and self.accepted_at is None

    def __str__(self):
        return f'Invitation for {self.email} ({self.role_key})'
