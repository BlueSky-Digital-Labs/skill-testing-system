"""
Generate downloadable CSV/XLSX import templates.
"""

from __future__ import annotations

import csv
import io

from openpyxl import Workbook

TEMPLATE_HEADERS = [
    'id',
    'subject',
    'topic',
    'difficulty',
    'type',
    'text',
    'points',
    'metadata',
    'options',
    'blank_answer_keys',
]

SAMPLE_ROWS = [
    {
        'id': '',
        'subject': 'Mathematics',
        'topic': 'Algebra',
        'difficulty': 'MEDIUM',
        'type': 'MCQ',
        'text': 'What is 2 + 2?',
        'points': '2',
        'metadata': '{"source":"import-template"}',
        'options': (
            '[{"label":"A","value":"3","is_correct":false,"order":0},'
            '{"label":"B","value":"4","is_correct":true,"order":1}]'
        ),
        'blank_answer_keys': '',
    },
    {
        'id': '',
        'subject': 'Science',
        'topic': 'Biology',
        'difficulty': 'EASY',
        'type': 'FILL_IN_BLANK',
        'text': 'Water is made of hydrogen and ____.',
        'points': '1',
        'metadata': '',
        'options': '',
        'blank_answer_keys': '[{"answer":"oxygen","case_sensitive":false}]',
    },
    {
        'id': '',
        'subject': 'General Knowledge',
        'topic': 'Facts',
        'difficulty': 'EASY',
        'type': 'TRUE_FALSE',
        'text': 'The sky is blue.',
        'points': '1',
        'metadata': '',
        'options': (
            '[{"label":"T","value":"True","is_correct":true,"order":0},'
            '{"label":"F","value":"False","is_correct":false,"order":1}]'
        ),
        'blank_answer_keys': '',
    },
]


def generate_template(format: str = 'csv') -> bytes:
    """
    Build a CSV or XLSX template with headers and sample rows.

    Args:
        format: ``csv`` (default) or ``xlsx``.

    Returns:
        Raw file bytes suitable for an HTTP attachment response.
    """
    normalized = (format or 'csv').strip().lower()
    if normalized == 'xlsx':
        return _generate_xlsx()
    if normalized != 'csv':
        raise ValueError(f'Unsupported template format: {format!r}. Use "csv" or "xlsx".')
    return _generate_csv()


def _generate_csv() -> bytes:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=TEMPLATE_HEADERS)
    writer.writeheader()
    writer.writerows(SAMPLE_ROWS)
    return buffer.getvalue().encode('utf-8-sig')


def _generate_xlsx() -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = 'Questions'
    sheet.append(TEMPLATE_HEADERS)
    for row in SAMPLE_ROWS:
        sheet.append([row[header] for header in TEMPLATE_HEADERS])

    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()
