# Generated manually for Attempt model with shuffle order fields

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_candidate_groups'),
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
                (
                    'candidate_user_id',
                    models.IntegerField(db_index=True),
                ),
                (
                    'status',
                    models.CharField(
                        choices=[
                            ('in_progress', 'In Progress'),
                            ('submitted', 'Submitted'),
                            ('abandoned', 'Abandoned'),
                        ],
                        db_index=True,
                        default='in_progress',
                        max_length=16,
                    ),
                ),
                ('question_order_seed', models.BigIntegerField(blank=True, null=True)),
                ('option_order_seed', models.BigIntegerField(blank=True, null=True)),
                ('question_id_order', models.JSONField(blank=True, default=list)),
                ('option_id_orders', models.JSONField(blank=True, default=dict)),
                ('started_at', models.DateTimeField(auto_now_add=True)),
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
                'db_table': 'core_attempt',
                'ordering': ['-started_at'],
            },
        ),
        migrations.AddIndex(
            model_name='attempt',
            index=models.Index(
                fields=['assignment', 'candidate_user_id'],
                name='core_attemp_assignm_8f0c2a_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='attempt',
            index=models.Index(
                fields=['status', 'started_at'],
                name='core_attemp_status_4b7f1d_idx',
            ),
        ),
    ]
