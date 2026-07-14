import json
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from grading.models import CombinedResult
from results.models import DisclosureLevel, ReleaseControl
from results.services import ReleaseControlNotFoundError, mark_release

User = get_user_model()


class ReleaseServiceTest(TestCase):
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
        CombinedResult.objects.create(
            attempt_id="attempt-1",
            test_id="test-1",
            total_awarded=Decimal("8.00"),
            total_max=Decimal("10.00"),
            by_topic={"math": {"awarded": "8.00", "max": "10.00"}},
            passed=True,
        )

    def test_mark_release_creates_control_when_missing(self):
        control = mark_release(
            "attempt-1",
            self.staff_user.id,
            released=True,
            candidate_user_id=self.candidate.id,
        )

        self.assertTrue(control.released)
        self.assertEqual(control.test_id, "test-1")
        self.assertEqual(control.candidate_user_id, self.candidate.id)
        self.assertEqual(control.disclosure, DisclosureLevel.SUMMARY)
        self.assertIsNotNone(control.released_at)
        self.assertEqual(control.released_by_user_id, self.staff_user.id)

    def test_mark_release_updates_existing_control(self):
        ReleaseControl.objects.create(
            attempt_id="attempt-1",
            test_id="test-1",
            candidate_user_id=self.candidate.id,
            disclosure=DisclosureLevel.DETAILED,
            released=False,
        )

        control = mark_release(
            "attempt-1",
            self.staff_user.id,
            released=True,
            disclosure=DisclosureLevel.DETAILED,
        )

        self.assertTrue(control.released)
        self.assertEqual(control.disclosure, DisclosureLevel.DETAILED)

    def test_mark_release_revokes_release(self):
        ReleaseControl.objects.create(
            attempt_id="attempt-1",
            test_id="test-1",
            candidate_user_id=self.candidate.id,
            disclosure=DisclosureLevel.SUMMARY,
            released=True,
            released_at=timezone.now(),
            released_by_user_id=self.staff_user.id,
        )

        control = mark_release(
            "attempt-1",
            self.staff_user.id,
            released=False,
        )

        self.assertFalse(control.released)
        self.assertIsNone(control.released_at)
        self.assertEqual(control.disclosure, DisclosureLevel.NONE)

    def test_mark_release_raises_when_cannot_create(self):
        with self.assertRaises(ReleaseControlNotFoundError):
            mark_release("missing-attempt", self.staff_user.id, released=True)


class ReleaseAPITest(TestCase):
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
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="SecurePass123!",
        )
        CombinedResult.objects.create(
            attempt_id="attempt-api",
            test_id="test-api",
            total_awarded=Decimal("7.00"),
            total_max=Decimal("10.00"),
            by_topic={},
            passed=False,
        )

    def _authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def _post_json(self, url_name, payload):
        return self.client.post(
            reverse(url_name),
            data=json.dumps(payload),
            content_type="application/json",
        )

    def test_release_requires_authentication(self):
        response = self._post_json(
            "results_release",
            {
                "attempt_id": "attempt-api",
                "released": True,
                "candidate_user_id": self.candidate.id,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_release_requires_staff(self):
        self._authenticate(self.candidate)
        response = self._post_json(
            "results_release",
            {
                "attempt_id": "attempt-api",
                "released": True,
                "candidate_user_id": self.candidate.id,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_release_creates_and_persists_state(self):
        self._authenticate(self.staff_user)
        response = self._post_json(
            "results_release",
            {
                "attempt_id": "attempt-api",
                "released": True,
                "candidate_user_id": self.candidate.id,
                "disclosure": DisclosureLevel.SUMMARY,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertTrue(body["released"])
        self.assertEqual(body["disclosure"], DisclosureLevel.SUMMARY)
        self.assertEqual(body["candidate_user_id"], self.candidate.id)
        self.assertTrue(
            ReleaseControl.objects.filter(
                attempt_id="attempt-api", released=True
            ).exists()
        )

    def test_status_returns_release_control(self):
        ReleaseControl.objects.create(
            attempt_id="attempt-api",
            test_id="test-api",
            candidate_user_id=self.candidate.id,
            disclosure=DisclosureLevel.SUMMARY,
            released=True,
            released_at=timezone.now(),
            released_by_user_id=self.staff_user.id,
        )
        self._authenticate(self.staff_user)
        response = self.client.get(reverse("results_status", args=["attempt-api"]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(body["attempt_id"], "attempt-api")
        self.assertTrue(body["released"])

    def test_status_requires_staff(self):
        ReleaseControl.objects.create(
            attempt_id="attempt-api",
            test_id="test-api",
            candidate_user_id=self.candidate.id,
        )
        self._authenticate(self.candidate)
        response = self.client.get(reverse("results_status", args=["attempt-api"]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_status_not_found(self):
        self._authenticate(self.staff_user)
        response = self.client.get(reverse("results_status", args=["missing"]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_release_validation_error(self):
        self._authenticate(self.staff_user)
        response = self._post_json("results_release", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
