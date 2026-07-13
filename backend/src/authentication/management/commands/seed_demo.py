"""
seed_demo — idempotent demo-data seeder.

Creates a demo login user (email demo@sunset.dev) from the DEMO_ADMIN_PASSWORD
environment variable, plus a handful of sample users so the app isn't empty on a
fresh deploy. Safe to re-run: existing users are left as-is; the demo user's
password is (re)synced each run so the printed credential always works.

Run automatically by the deterministic deploy's SEED stage. Also runnable locally:

    DEMO_ADMIN_PASSWORD=secret123 python manage.py seed_demo
"""

import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

DEMO_EMAIL = "demo@sunset.dev"
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
    help = "Seed idempotent demo data: a demo login user + sample users."

    def handle(self, *args, **options):
        User = get_user_model()
        demo_password = os.environ.get("DEMO_ADMIN_PASSWORD") or "demo-password-change-me"

        demo, created = User.objects.get_or_create(
            email=DEMO_EMAIL,
            defaults={"is_staff": True, "is_superuser": True, "is_active": True},
        )
        # Always (re)sync so the credential surfaced in chat works after every deploy.
        demo.is_staff = True
        demo.is_superuser = True
        demo.is_active = True
        demo.set_password(demo_password)
        demo.save()
        self.stdout.write(self.style.SUCCESS(
            f"{'Created' if created else 'Updated'} demo login user {DEMO_EMAIL}"
        ))

        created_count = 0
        for email in SAMPLE_USERS:
            user, was_new = User.objects.get_or_create(
                email=email, defaults={"is_active": True}
            )
            if was_new:
                user.set_password(SAMPLE_PASSWORD)
                user.save()
                created_count += 1
        self.stdout.write(self.style.SUCCESS(
            f"Sample users: {created_count} created, "
            f"{len(SAMPLE_USERS) - created_count} already present"
        ))
        self.stdout.write(self.style.SUCCESS("seed_demo complete"))
