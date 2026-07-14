import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0003_attempt_shuffle_orders'),
    ]

    operations = [
        migrations.CreateModel(
            name='Attempt',
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
                ('candidate_id', models.IntegerField(db_index=True)),
                ('test_id', models.UUIDField(db_index=True)),
                (
                    'status',
                    models.CharField(
                        choices=[
                            ('in_progress', 'In Progress'),
                            ('submitted', 'Submitted'),
                            ('auto_submitted', 'Auto Submitted'),
                            ('abandoned', 'Abandoned'),
                        ],
                        db_index=True,
                        default='in_progress',
                        max_length=16,
                    ),
                ),
                ('time_limit_seconds', models.PositiveIntegerField()),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField(db_index=True)),
                ('submitted_at', models.DateTimeField(blank=True, null=True)),
                ('last_saved_at', models.DateTimeField(blank=True, null=True)),
                ('question_order_seed', models.BigIntegerField(blank=True, null=True)),
                ('option_order_seed', models.BigIntegerField(blank=True, null=True)),
                ('question_id_order', models.JSONField(blank=True, default=list)),
                ('option_id_orders', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                (
                    'assignment',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='attempts',
                        to='core.assignment',
                    ),
                ),
            ],
            options={
                'db_table': 'delivery_attempt',
                'ordering': ['-started_at'],
            },
        ),
        migrations.CreateModel(
            name='AttemptAnswer',
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
                ('question_id', models.UUIDField(db_index=True)),
                ('question_version', models.PositiveIntegerField(default=1)),
                ('response', models.JSONField(blank=True, default=dict)),
                ('saved_at', models.DateTimeField(auto_now=True)),
                (
                    'attempt',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='answers',
                        to='delivery.attempt',
                    ),
                ),
            ],
            options={
                'db_table': 'delivery_attempt_answer',
                'ordering': ['saved_at'],
            },
        ),
        migrations.AddIndex(
            model_name='attempt',
            index=models.Index(
                fields=['assignment', 'candidate_id'],
                name='delivery_at_assignm_91f4b2_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='attempt',
            index=models.Index(
                fields=['status', 'expires_at'],
                name='delivery_at_status_2c8e11_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='attempt',
            index=models.Index(
                fields=['candidate_id', 'test_id'],
                name='delivery_at_candida_7a1d03_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='attemptanswer',
            index=models.Index(
                fields=['attempt', 'question_id'],
                name='delivery_at_attempt_4f0a9c_idx',
            ),
        ),
        migrations.AddConstraint(
            model_name='attemptanswer',
            constraint=models.UniqueConstraint(
                fields=('attempt', 'question_id'),
                name='delivery_unique_answer_per_question',
            ),
        ),
    ]
