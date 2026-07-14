"""
Tests for the seed_demo management command.
"""

from __future__ import annotations

import uuid

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from authentication.models import RoleKey, UserRole
from core.models import Assignment, CandidateGroup
from question_bank.models import Question

User = get_user_model()
DEMO_TEST_ID = uuid.UUID("11111111-1111-4111-8111-111111111111")


@pytest.mark.django_db
def test_seed_demo_creates_roles_questions_and_assignments():
    call_command("seed_demo")

    demo = User.objects.get(email="demo@sunset.dev")
    assert demo.is_staff is True

    role_keys = set(
        UserRole.objects.filter(user=demo).values_list("role__key", flat=True)
    )
    assert RoleKey.SYSTEM_ADMIN in role_keys
    assert RoleKey.EXAMINER in role_keys
    assert RoleKey.COORDINATOR in role_keys

    assert Question.objects.filter(subject="Mathematics", topic="Algebra").exists()
    assert CandidateGroup.objects.filter(name="Demo cohort").exists()
    assert Assignment.objects.filter(test_id=DEMO_TEST_ID).exists()

    call_command("seed_demo")
    assert Assignment.objects.filter(test_id=DEMO_TEST_ID).count() == 1
