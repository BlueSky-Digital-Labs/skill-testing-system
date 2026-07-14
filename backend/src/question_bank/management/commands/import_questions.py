"""
import_questions — parse, validate, and optionally commit spreadsheet imports.

Examples:
    python manage.py import_questions questions.csv
    python manage.py import_questions questions.xlsx --commit
    python manage.py import_questions questions.csv --commit --author-email examiner@example.com
"""

from __future__ import annotations

from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from question_bank.importers.parser import detect_format, parse_spreadsheet
from question_bank.importers.upsert import ImportUpsertError, bulk_upsert
from question_bank.importers.validator import validate_rows

User = get_user_model()


class Command(BaseCommand):
    help = 'Parse and validate question import spreadsheets; optionally commit them.'

    def add_arguments(self, parser):
        parser.add_argument('file', type=str, help='Path to a .csv or .xlsx import file.')
        parser.add_argument(
            '--commit',
            action='store_true',
            help='Persist validated rows to the database.',
        )
        parser.add_argument(
            '--author-email',
            type=str,
            default='',
            help='Optional author email to assign on created questions.',
        )

    def handle(self, *args, **options):
        file_path = Path(options['file'])
        if not file_path.exists():
            raise CommandError(f'File not found: {file_path}')

        try:
            file_format = detect_format(file_path.name)
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        with file_path.open('rb') as handle:
            try:
                rows = parse_spreadsheet(handle, file_path.name)
            except ValueError as exc:
                raise CommandError(str(exc)) from exc
            except Exception as exc:
                raise CommandError(
                    f'Unable to read {file_format.upper()} file: {exc}',
                ) from exc

        valid_rows, error_rows = validate_rows(rows)
        self.stdout.write(
            f'Parsed {len(rows)} row(s): {len(valid_rows)} valid, {len(error_rows)} invalid.',
        )

        for error in error_rows:
            row_number = error.get('row_number', '?')
            messages = []
            for field, field_errors in error.get('errors', {}).items():
                for message in field_errors:
                    messages.append(f'{field}: {message}')
            self.stdout.write(self.style.ERROR(
                f'Row {row_number}: {"; ".join(messages)}',
            ))

        if error_rows:
            raise CommandError('Import file contains validation errors.')

        if not options['commit']:
            self.stdout.write(self.style.WARNING(
                'Dry run only. Re-run with --commit to persist validated rows.',
            ))
            return

        author = None
        author_email = (options.get('author_email') or '').strip()
        if author_email:
            try:
                author = User.objects.get(email=author_email)
            except User.DoesNotExist as exc:
                raise CommandError(f'Author not found: {author_email}') from exc

        try:
            summary = bulk_upsert(valid_rows, author=author)
        except ImportUpsertError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(self.style.SUCCESS(
            'Import complete: '
            f'{summary["created"]} created, {summary["updated"]} updated.',
        ))
