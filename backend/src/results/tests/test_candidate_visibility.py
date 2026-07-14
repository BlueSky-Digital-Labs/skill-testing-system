from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from grading.models import CombinedResult, ObjectiveScore
from results.models import DisclosureLevel, ReleaseControl
from results.services import (
    ReleaseControlAccessError,
    ReleaseControlNotFoundError,
    get_candidate_view,
)

User = get_user_model()


class CandidateVisibilityServiceTest(TestCase):
    def setUp(self):
        self.staff_user = User.objects.create_user(
            email="staff@example.com",
            password="SecurePass123!",
            is_staff=True,
        )
        self.candidate = User.objects.create_user(
            email="candidate@example.com",
            password="SecurePass123!",
        )
        self.other_candidate = User.objects.create_user(
            email="other@example.com",
            password="SecurePass123!",
        )
        CombinedResult.objects.create(
            attempt_id="attempt-vis",
            test_id="test-vis",
            total_awarded=Decimal("9.00"),
            total_max=Decimal("10.00"),
            by_topic={"science": {"awarded": "9.00", "max": "10.00"}},
            passed=True,
        )
        ObjectiveScore.objects.create(
            attempt_id="attempt-vis",
            question_id="q-1",
            question_version=1,
            question_type="mcq",
            awarded_points=Decimal("5.00"),
            max_points=Decimal("5.00"),
            is_correct=True,
            detail={"topic": "science"},
        )
        ObjectiveScore.objects.create(
            attempt_id="attempt-vis",
            question_id="q-2",
            question_version=1,
            question_type="mcq",
            awarded_points=Decimal("4.00"),
            max_points=Decimal("5.00"),
            is_correct=False,
            detail={"topic": "science"},
        )

    def _create_control(self, **overrides):
        defaults = {
            "attempt_id": "attempt-vis",
            "test_id": "test-vis",
            "candidate_user_id": self.candidate.id,
            "disclosure": DisclosureLevel.SUMMARY,
            "released": True,
            "released_at": timezone.now(),
            "released_by_user_id": self.staff_user.id,
        }
        defaults.update(overrides)
        return ReleaseControl.objects.create(**defaults)

    def test_candidate_summary_visibility(self):
        self._create_control(disclosure=DisclosureLevel.SUMMARY)

        payload = get_candidate_view("attempt-vis", self.candidate.id)

        self.assertEqual(payload["status"], "released")
        self.assertEqual(payload["visibility"], "candidate")
        self.assertIn("summary", payload)
        self.assertTrue(payload["summary"]["passed"])
        self.assertNotIn("items", payload)

    def test_candidate_detailed_visibility(self):
        self._create_control(disclosure=DisclosureLevel.DETAILED)

        payload = get_candidate_view("attempt-vis", self.candidate.id)

        self.assertIn("summary", payload)
        self.assertIn("items", payload)
        self.assertEqual(len(payload["items"]), 2)
        self.assertFalse(payload["items"][1]["is_correct"])

    def test_candidate_withheld_when_not_released(self):
        self._create_control(
            released=False, released_at=None, disclosure=DisclosureLevel.NONE
        )

        payload = get_candidate_view("attempt-vis", self.candidate.id)

        self.assertEqual(payload["status"], "withheld")
        self.assertFalse(payload["released"])
        self.assertNotIn("summary", payload)
        self.assertNotIn("items", payload)

    def test_other_candidate_denied(self):
        self._create_control()

        with self.assertRaises(ReleaseControlAccessError):
            get_candidate_view("attempt-vis", self.other_candidate.id)

    def test_staff_sees_unreleased_full_view(self):
        self._create_control(
            released=False, released_at=None, disclosure=DisclosureLevel.NONE
        )

        payload = get_candidate_view("attempt-vis", self.staff_user.id, is_staff=True)

        self.assertEqual(payload["status"], "unreleased")
        self.assertEqual(payload["visibility"], "full")
        self.assertIn("summary", payload)
        self.assertIn("items", payload)

    def test_missing_release_control_raises(self):
        with self.assertRaises(ReleaseControlNotFoundError):
            get_candidate_view("missing", self.candidate.id)


class CandidateVisibilityAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            email="staff@example.com",
            password="SecurePass123!",
            is_staff=True,
        )
        self.candidate = User.objects.create_user(
            email="candidate@example.com",
            password="SecurePass123!",
        )
        self.other_candidate = User.objects.create_user(
            email="other@example.com",
            password="SecurePass123!",
        )
        CombinedResult.objects.create(
            attempt_id="attempt-api-vis",
            test_id="test-api-vis",
            total_awarded=Decimal("6.00"),
            total_max=Decimal("10.00"),
            by_topic={},
            passed=False,
        )
        ObjectiveScore.objects.create(
            attempt_id="attempt-api-vis",
            question_id="q-api",
            question_version=1,
            question_type="true_false",
            awarded_points=Decimal("6.00"),
            max_points=Decimal("10.00"),
            is_correct=False,
        )
        ReleaseControl.objects.create(
            attempt_id="attempt-api-vis",
            test_id="test-api-vis",
            candidate_user_id=self.candidate.id,
            disclosure=DisclosureLevel.DETAILED,
            released=True,
            released_at=timezone.now(),
            released_by_user_id=self.staff_user.id,
        )

    def _authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_candidate_endpoint_requires_authentication(self):
        response = self.client.get(
            reverse("results_candidate", args=["attempt-api-vis"]),
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_candidate_can_view_own_released_results(self):
        self._authenticate(self.candidate)
        response = self.client.get(
            reverse("results_candidate", args=["attempt-api-vis"]),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(body["status"], "released")
        self.assertIn("summary", body)
        self.assertIn("items", body)
        self.assertEqual(len(body["items"]), 1)

    def test_candidate_cannot_view_other_candidate_results(self):
        self._authenticate(self.other_candidate)
        response = self.client.get(
            reverse("results_candidate", args=["attempt-api-vis"]),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_candidate_sees_withheld_when_unreleased(self):
        ReleaseControl.objects.filter(attempt_id="attempt-api-vis").update(
            released=False,
            released_at=None,
            disclosure=DisclosureLevel.NONE,
        )
        self._authenticate(self.candidate)
        response = self.client.get(
            reverse("results_candidate", args=["attempt-api-vis"]),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(body["status"], "withheld")
        self.assertNotIn("summary", body)

    def test_staff_can_view_unreleased_attempt(self):
        ReleaseControl.objects.filter(attempt_id="attempt-api-vis").update(
            released=False,
            released_at=None,
            disclosure=DisclosureLevel.NONE,
        )
        self._authenticate(self.staff_user)
        response = self.client.get(
            reverse("results_candidate", args=["attempt-api-vis"]),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(body["status"], "unreleased")
        self.assertIn("summary", body)
        self.assertIn("items", body)

    def test_candidate_endpoint_not_found(self):
        self._authenticate(self.candidate)
        response = self.client.get(reverse("results_candidate", args=["missing"]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
