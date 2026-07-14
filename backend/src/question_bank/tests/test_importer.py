"""
Tests for question spreadsheet import.
"""

from __future__ import annotations

import csv
import io
import json
import tempfile
from pathlib import Path

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.management.base import CommandError
from openpyxl import Workbook
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from question_bank.importers.parser import detect_format, parse_spreadsheet
from question_bank.importers.template import TEMPLATE_HEADERS, generate_template
from question_bank.importers.upsert import bulk_upsert
from question_bank.importers.validator import validate_rows
from question_bank.models import Difficulty, Question, QuestionType

User = get_user_model()

TEMPLATE_URL = '/api/question-import/template'
PARSE_URL = '/api/question-import/parse'
COMMIT_URL = '/api/question-import/commit'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def authenticated_user(db):
    return User.objects.create_user(
        email='importer@example.com',
        password='ImportPass123!',
    )


def auth_client(client, user):
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
    return client


def make_csv_bytes(rows: list[dict[str, str]]) -> bytes:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=TEMPLATE_HEADERS)
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue().encode('utf-8')


def make_xlsx_bytes(rows: list[dict[str, str]]) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(TEMPLATE_HEADERS)
    for row in rows:
        sheet.append([row.get(header, '') for header in TEMPLATE_HEADERS])
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def valid_mcq_row(**overrides):
    row = {
        'id': '',
        'subject': 'Mathematics',
        'topic': 'Algebra',
        'difficulty': Difficulty.MEDIUM,
        'type': QuestionType.MCQ,
        'text': 'What is 2 + 2?',
        'points': '2',
        'metadata': '{"source":"import-test"}',
        'options': json.dumps([
            {'label': 'A', 'value': '3', 'is_correct': False, 'order': 0},
            {'label': 'B', 'value': '4', 'is_correct': True, 'order': 1},
        ]),
        'blank_answer_keys': '',
    }
    row.update(overrides)
    return row


class TestTemplateGeneration:
    def test_generate_csv_template_has_headers_and_samples(self):
        content = generate_template('csv').decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(content))
        rows = list(reader)
        assert reader.fieldnames == TEMPLATE_HEADERS
        assert len(rows) == 3

    def test_generate_xlsx_template(self):
        content = generate_template('xlsx')
        assert content.startswith(b'PK')

    def test_generate_template_rejects_unknown_format(self):
        with pytest.raises(ValueError, match='Unsupported template format'):
            generate_template('pdf')


class TestParser:
    def test_detect_format_from_filename(self):
        assert detect_format('questions.csv') == 'csv'
        assert detect_format('questions.xlsx') == 'xlsx'

    def test_detect_format_rejects_unknown_extension(self):
        with pytest.raises(ValueError, match='Unsupported file type'):
            detect_format('questions.pdf')

    def test_parse_csv_rows(self):
        content = make_csv_bytes([valid_mcq_row()])
        rows = parse_spreadsheet(io.BytesIO(content), 'questions.csv')
        assert len(rows) == 1
        assert rows[0]['subject'] == 'Mathematics'
        assert rows[0]['_row_number'] == 2

    def test_parse_xlsx_rows(self):
        content = make_xlsx_bytes([valid_mcq_row()])
        rows = parse_spreadsheet(io.BytesIO(content), 'questions.xlsx')
        assert len(rows) == 1
        assert rows[0]['type'] == QuestionType.MCQ


@pytest.mark.django_db
class TestValidator:
    def test_validate_rows_accepts_valid_mcq(self):
        rows = parse_spreadsheet(
            io.BytesIO(make_csv_bytes([valid_mcq_row()])),
            'questions.csv',
        )
        valid_rows, error_rows = validate_rows(rows)
        assert len(valid_rows) == 1
        assert not error_rows
        assert valid_rows[0]['options'][0]['label'] == 'A'

    def test_validate_rows_reports_missing_required_fields(self):
        rows = parse_spreadsheet(
            io.BytesIO(make_csv_bytes([valid_mcq_row(subject='', topic='')])),
            'questions.csv',
        )
        _, error_rows = validate_rows(rows)
        assert len(error_rows) == 1
        assert 'subject' in error_rows[0]['errors']
        assert 'topic' in error_rows[0]['errors']

    def test_validate_rows_rejects_invalid_mcq_options(self):
        rows = parse_spreadsheet(
            io.BytesIO(make_csv_bytes([
                valid_mcq_row(
                    options=json.dumps([
                        {'label': 'A', 'value': '3', 'is_correct': False, 'order': 0},
                        {'label': 'B', 'value': '4', 'is_correct': False, 'order': 1},
                    ]),
                ),
            ])),
            'questions.csv',
        )
        _, error_rows = validate_rows(rows)
        assert len(error_rows) == 1
        assert 'options' in error_rows[0]['errors']

    def test_validate_payloads_from_parse_step(self):
        rows = parse_spreadsheet(
            io.BytesIO(make_csv_bytes([valid_mcq_row()])),
            'questions.csv',
        )
        valid_rows, _ = validate_rows(rows)
        revalidated, error_rows = validate_rows(valid_rows)
        assert len(revalidated) == 1
        assert not error_rows


@pytest.mark.django_db
class TestBulkUpsert:
    def test_bulk_upsert_creates_questions(self, authenticated_user):
        rows = parse_spreadsheet(
            io.BytesIO(make_csv_bytes([valid_mcq_row()])),
            'questions.csv',
        )
        valid_rows, _ = validate_rows(rows)
        summary = bulk_upsert(valid_rows, author=authenticated_user)

        assert summary['created'] == 1
        assert summary['updated'] == 0
        assert Question.objects.count() == 1
        question = Question.objects.get()
        assert question.author == authenticated_user
        assert question.options.count() == 2

    def test_bulk_upsert_updates_existing_question(self, authenticated_user):
        rows = parse_spreadsheet(
            io.BytesIO(make_csv_bytes([valid_mcq_row()])),
            'questions.csv',
        )
        valid_rows, _ = validate_rows(rows)
        created = bulk_upsert(valid_rows, author=authenticated_user)
        question_id = created['question_ids'][0]

        update_rows, _ = validate_rows(parse_spreadsheet(
            io.BytesIO(make_csv_bytes([
                valid_mcq_row(id=question_id, text='Updated import text'),
            ])),
            'questions.csv',
        ))
        summary = bulk_upsert(update_rows, author=authenticated_user)

        assert summary['created'] == 0
        assert summary['updated'] == 1
        question = Question.objects.get(pk=question_id)
        assert question.text == 'Updated import text'


@pytest.mark.django_db
class TestImportAPI:
    def test_template_endpoint_requires_authentication(self, api_client):
        response = api_client.get(TEMPLATE_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_download_csv_template(self, api_client, authenticated_user):
        client = auth_client(api_client, authenticated_user)
        response = client.get(TEMPLATE_URL)
        assert response.status_code == status.HTTP_200_OK
        assert 'text/csv' in response['Content-Type']
        assert b'subject' in response.content

    def test_download_xlsx_template(self, api_client, authenticated_user):
        client = auth_client(api_client, authenticated_user)
        response = client.get(f'{TEMPLATE_URL}?file_format=xlsx')
        assert response.status_code == status.HTTP_200_OK
        assert response.content.startswith(b'PK')

    def test_parse_endpoint_validates_upload(self, api_client, authenticated_user):
        client = auth_client(api_client, authenticated_user)
        upload = SimpleUploadedFile(
            'questions.csv',
            make_csv_bytes([valid_mcq_row()]),
            content_type='text/csv',
        )
        response = client.post(PARSE_URL, {'file': upload}, format='multipart')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['valid_count'] == 1
        assert response.data['error_count'] == 0
        assert len(response.data['valid_rows']) == 1

    def test_parse_endpoint_reports_validation_errors(self, api_client, authenticated_user):
        client = auth_client(api_client, authenticated_user)
        upload = SimpleUploadedFile(
            'questions.csv',
            make_csv_bytes([valid_mcq_row(subject='')]),
            content_type='text/csv',
        )
        response = client.post(PARSE_URL, {'file': upload}, format='multipart')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['valid_count'] == 0
        assert response.data['error_count'] == 1

    def test_commit_endpoint_creates_questions(self, api_client, authenticated_user):
        client = auth_client(api_client, authenticated_user)
        upload = SimpleUploadedFile(
            'questions.csv',
            make_csv_bytes([valid_mcq_row()]),
            content_type='text/csv',
        )
        parse_response = client.post(PARSE_URL, {'file': upload}, format='multipart')
        commit_response = client.post(
            COMMIT_URL,
            {'rows': parse_response.data['valid_rows']},
            format='json',
        )
        assert commit_response.status_code == status.HTTP_200_OK
        assert commit_response.data['created'] == 1
        assert Question.objects.count() == 1

    def test_commit_endpoint_rejects_invalid_rows(self, api_client, authenticated_user):
        client = auth_client(api_client, authenticated_user)
        response = client.post(
            COMMIT_URL,
            {'rows': [{'subject': '', 'topic': '', 'type': 'MCQ', 'text': ''}]},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'errors' in response.data


@pytest.mark.django_db
class TestImportQuestionsCommand:
    def test_command_dry_run_reports_validation_errors(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / 'invalid.csv'
            file_path.write_bytes(make_csv_bytes([valid_mcq_row(subject='')]))
            with pytest.raises(CommandError, match='validation errors'):
                call_command('import_questions', str(file_path))

    def test_command_commit_imports_rows(self, authenticated_user):
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / 'questions.csv'
            file_path.write_bytes(make_csv_bytes([valid_mcq_row()]))
            call_command(
                'import_questions',
                str(file_path),
                '--commit',
                f'--author-email={authenticated_user.email}',
            )
            assert Question.objects.count() == 1
