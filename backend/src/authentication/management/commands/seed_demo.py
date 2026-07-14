"""
seed_demo — idempotent demo-data seeder.

Creates a demo login user (email demo@sunset.dev) from the DEMO_ADMIN_PASSWORD
environment variable, plus sample users, roles, questions, groups, and assignments
so integrated UI features have data on a fresh deploy. Safe to re-run.

Run automatically by the deterministic deploy's SEED stage. Also runnable locally:

    DEMO_ADMIN_PASSWORD=secret123 python manage.py seed_demo
"""

from __future__ import annotations

import os
import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from authentication.models import Role, RoleKey, UserRole
from core.models import Assignment, AssignmentStatus, CandidateGroup
from question_bank.models import Difficulty, Option, Question, QuestionType

DEMO_EMAIL = "demo@sunset.dev"
DEMO_TEST_ID = uuid.UUID("11111111-1111-4111-8111-111111111111")
SAMPLE_USERS = [
    "alice@example.com",
    "bob@example.com",
    "carol@example.com",
    "dave@example.com",
    "erin@example.com",
]
# Non-secret password for the throwaway sample accounts only (not the demo login).
SAMPLE_PASSWORD = "demo-sample-pass"


class Command(BaseCommand):
    help = "Seed idempotent demo data: users, roles, questions, groups, and assignments."

    def handle(self, *args, **options):
        User = get_user_model()
        demo_password = os.environ.get("DEMO_ADMIN_PASSWORD") or "demo-password-change-me"

        demo, created = User.objects.get_or_create(
            email=DEMO_EMAIL,
            defaults={"is_staff": True, "is_superuser": True, "is_active": True},
        )
        demo.is_staff = True
        demo.is_superuser = True
        demo.is_active = True
        demo.set_password(demo_password)
        demo.save()
        self.stdout.write(self.style.SUCCESS(
            f"{'Created' if created else 'Updated'} demo login user {DEMO_EMAIL}"
        ))

        created_count = 0
        sample_users = []
        for email in SAMPLE_USERS:
            user, was_new = User.objects.get_or_create(
                email=email, defaults={"is_active": True}
            )
            if was_new:
                user.set_password(SAMPLE_PASSWORD)
                user.save()
                created_count += 1
            sample_users.append(user)
        self.stdout.write(self.style.SUCCESS(
            f"Sample users: {created_count} created, "
            f"{len(SAMPLE_USERS) - created_count} already present"
        ))

        role_keys = [
            RoleKey.SYSTEM_ADMIN,
            RoleKey.EXAMINER,
            RoleKey.COORDINATOR,
        ]
        for role_key in role_keys:
            role = Role.objects.get(key=role_key)
            UserRole.objects.get_or_create(
                user=demo,
                role=role,
                defaults={"assigned_by": demo},
            )

        candidate_role = Role.objects.get(key=RoleKey.CANDIDATE)
        for user in sample_users:
            UserRole.objects.get_or_create(
                user=user,
                role=candidate_role,
                defaults={"assigned_by": demo},
            )

        group, group_created = CandidateGroup.objects.get_or_create(
            name="Demo cohort",
            defaults={
                "description": "Sample candidate group for assignment demos",
                "is_active": True,
            },
        )
        group.members.set(sample_users[:3])
        self.stdout.write(self.style.SUCCESS(
            f"{'Created' if group_created else 'Reused'} candidate group {group.name}"
        ))

        question_specs = [
            {
                "subject": "Mathematics",
                "topic": "Algebra",
                "text": "What is 2 + 2?",
                "options": [
                    ("A", "3", False),
                    ("B", "4", True),
                    ("C", "5", False),
                ],
            },
            {
                "subject": "Science",
                "topic": "Biology",
                "text": "Plants produce oxygen during photosynthesis.",
                "options": [
                    ("A", "True", True),
                    ("B", "False", False),
                ],
            },
        ]

        question_count = 0
        for spec in question_specs:
            question, was_created = Question.objects.get_or_create(
                subject=spec["subject"],
                topic=spec["topic"],
                text=spec["text"],
                defaults={
                    "difficulty": Difficulty.MEDIUM,
                    "type": (
                        QuestionType.TRUE_FALSE
                        if spec["subject"] == "Science"
                        else QuestionType.MCQ
                    ),
                    "points": 2,
                    "author": demo,
                },
            )
            if was_created:
                question_count += 1
                for order, (label, value, is_correct) in enumerate(spec["options"]):
                    Option.objects.create(
                        question=question,
                        label=label,
                        value=value,
                        is_correct=is_correct,
                        order=order,
                    )

        self.stdout.write(self.style.SUCCESS(
            f"Question bank: {question_count} created, "
            f"{len(question_specs) - question_count} already present"
        ))

        now = timezone.now()
        assignment, assignment_created = Assignment.objects.get_or_create(
            test_id=DEMO_TEST_ID,
            assignee_group_id=group.id,
            defaults={
                "created_by_user_id": demo.id,
                "opens_at": now - timedelta(days=1),
                "due_at": now + timedelta(days=7),
                "closes_at": now + timedelta(days=14),
                "max_attempts": 2,
                "shuffle_questions": True,
                "shuffle_options": False,
                "status": AssignmentStatus.ACTIVE,
            },
        )
        self.stdout.write(self.style.SUCCESS(
            f"{'Created' if assignment_created else 'Reused'} demo assignment for test {DEMO_TEST_ID}"
        ))

        self.stdout.write(self.style.SUCCESS("seed_demo complete"))
