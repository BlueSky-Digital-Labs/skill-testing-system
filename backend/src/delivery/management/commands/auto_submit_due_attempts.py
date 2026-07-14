from django.core.management.base import BaseCommand
from django.utils import timezone

from delivery.services.attempts import auto_submit_due_attempts


class Command(BaseCommand):
    help = 'Auto-submit in-progress attempts that have exceeded their time limit.'

    def handle(self, *args, **options):
        now = timezone.now()
        count = auto_submit_due_attempts(now=now)
        self.stdout.write(
            self.style.SUCCESS(
                f'Auto-submitted {count} due attempt(s) at {now.isoformat()}'
            )
        )
