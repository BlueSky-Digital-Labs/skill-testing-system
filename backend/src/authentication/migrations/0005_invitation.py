# Generated manually for Invitation model

import uuid

import authentication.models
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0004_seed_default_roles'),
    ]

    operations = [
        migrations.CreateModel(
            name='Invitation',
            fields=[
                (
                    'id',
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ('email', models.EmailField(db_index=True, max_length=254)),
                ('token', models.CharField(db_index=True, max_length=128, unique=True)),
                ('role_key', models.CharField(
                    choices=[
                        ('SYSTEM_ADMIN', 'System Admin'),
                        ('EXAMINER', 'Examiner'),
                        ('COORDINATOR', 'Coordinator'),
                        ('CANDIDATE', 'Candidate'),
                    ],
                    max_length=50,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                (
                    'expires_at',
                    models.DateTimeField(
                        default=authentication.models.default_invitation_expires_at,
                    ),
                ),
                ('accepted_at', models.DateTimeField(blank=True, null=True)),
                (
                    'consumed_by',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='invitations_consumed',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'created_by',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='invitations_created',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'db_table': 'auth_invitation',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='invitation',
            constraint=models.UniqueConstraint(
                condition=models.Q(('accepted_at__isnull', True)),
                fields=('email',),
                name='unique_pending_invitation_per_email',
            ),
        ),
    ]
