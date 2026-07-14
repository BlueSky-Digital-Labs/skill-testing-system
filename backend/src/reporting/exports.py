from __future__ import annotations

import csv
import io
import json
from datetime import datetime
from decimal import Decimal
from typing import Any

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.lib import colors


def _serialize_value(value: Any) -> str:
    if value is None:
        return ''
    if isinstance(value, (datetime, Decimal)):
        return str(value)
    if isinstance(value, (dict, list)):
        return json.dumps(value, default=str)
    return str(value)


def _flatten_report_data(
    report_type: str,
    data: dict[str, Any],
) -> list[dict[str, str]]:
    if report_type == 'individual':
        rows = []
        for question in data.get('questions', []):
            rows.append(
                {
                    'attempt_id': _serialize_value(data.get('attempt_id')),
                    'test_id': _serialize_value(data.get('test_id')),
                    'candidate_id': _serialize_value(data.get('candidate_id')),
                    'status': _serialize_value(data.get('status')),
                    'total_awarded': _serialize_value(data.get('total_awarded')),
                    'total_max': _serialize_value(data.get('total_max')),
                    'passed': _serialize_value(data.get('passed')),
                    'question_id': _serialize_value(question.get('question_id')),
                    'question_version': _serialize_value(
                        question.get('question_version'),
                    ),
                    'is_correct': _serialize_value(question.get('is_correct')),
                    'topic': _serialize_value(question.get('topic')),
                }
            )
        if not rows:
            rows.append(
                {
                    key: _serialize_value(value)
                    for key, value in data.items()
                    if key != 'questions'
                }
            )
        return rows

    if report_type == 'test_summary':
        return [{key: _serialize_value(value) for key, value in data.items()}]

    if report_type == 'question_performance':
        return [
            {
                'test_id': _serialize_value(data.get('test_id')),
                **{
                    key: _serialize_value(value)
                    for key, value in item.items()
                },
            }
            for item in data.get('questions', [])
        ]

    if report_type == 'group_comparison':
        return [
            {
                'test_id': _serialize_value(data.get('test_id')),
                **{
                    key: _serialize_value(value)
                    for key, value in item.items()
                },
            }
            for item in data.get('groups', [])
        ]

    if report_type == 'progress':
        return [
            {
                'group_id': _serialize_value(data.get('group_id')),
                'group_name': _serialize_value(data.get('group_name')),
                'topic': _serialize_value(data.get('topic')),
                **{
                    key: _serialize_value(value)
                    for key, value in bucket.items()
                },
            }
            for bucket in data.get('buckets', [])
        ]

    return [{key: _serialize_value(value) for key, value in data.items()}]


def csv_export(report_type: str, data: dict[str, Any]) -> bytes:
    """
    Render report data as CSV bytes.
    """
    rows = _flatten_report_data(report_type, data)
    buffer = io.StringIO()
    if not rows:
        buffer.write('')
        return buffer.getvalue().encode('utf-8')

    fieldnames = list(rows[0].keys())
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue().encode('utf-8')


def _pdf_table(rows: list[dict[str, str]]) -> Table:
    if not rows:
        return Table([['No data']])

    headers = list(rows[0].keys())
    body = [headers]
    for row in rows:
        body.append([row.get(header, '') for header in headers])
    table = Table(body, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def pdf_export(report_type: str, data: dict[str, Any]) -> bytes:
    """
    Render report data as PDF bytes using ReportLab.
    """
    rows = _flatten_report_data(report_type, data)
    buffer = io.BytesIO()
    document = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = [
        Paragraph(f'Report: {report_type}', styles['Title']),
        Spacer(1, 12),
    ]
    story.append(_pdf_table(rows))
    document.build(story)
    return buffer.getvalue()
