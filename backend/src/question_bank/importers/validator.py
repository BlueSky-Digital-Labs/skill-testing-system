"""
Validate parsed spreadsheet rows before import.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

from question_bank.models import Difficulty, Question, QuestionType

BOOLEAN_TRUE = {'true', '1', 'yes', 'y'}
BOOLEAN_FALSE = {'false', '0', 'no', 'n'}

REQUIRED_FIELDS = ('subject', 'topic', 'type', 'text')


def validate_rows(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    """
    Validate parsed rows and split them into valid payloads and error records.

    Accepts raw parser output (string fields and ``_row_number``) or normalized
    payloads returned from a prior parse step (``row_number`` and typed nested
    fields).

    Returns:
        A tuple of ``(valid_rows, error_rows)``. Error rows include ``errors`` and
        ``row_number`` keys for actionable feedback.
    """
    valid_rows: list[dict] = []
    error_rows: list[dict] = []

    for row in rows:
        if _is_normalized_payload(row):
            normalized, errors = _validate_payload(row)
        else:
            normalized, errors = _validate_row(row)

        row_number = _row_number(row)
        if errors:
            error_rows.append(
                {
                    'row_number': row_number,
                    'errors': errors,
                    'row': _public_row_snapshot(row),
                },
            )
            continue
        valid_rows.append(normalized)

    return valid_rows, error_rows


def _row_number(row: dict) -> int | None:
    return row.get('_row_number') or row.get('row_number')


def _is_normalized_payload(row: dict) -> bool:
    return (
        isinstance(row.get('options'), list)
        or isinstance(row.get('blank_answer_keys'), list)
        or isinstance(row.get('metadata'), dict)
    )


def _validate_payload(row: dict) -> tuple[dict | None, dict[str, list[str]]]:
    errors: dict[str, list[str]] = {}

    for field in REQUIRED_FIELDS:
        if not str(row.get(field, '')).strip():
            errors.setdefault(field, []).append(f'{field} is required.')

    question_id = str(row.get('id', '')).strip()
    if question_id:
        try:
            uuid.UUID(question_id)
        except ValueError:
            errors.setdefault('id', []).append('id must be a valid UUID.')
        else:
            if not Question.objects.filter(pk=question_id).exists():
                errors.setdefault('id', []).append(
                    'No existing question found for this id. Leave id blank to create a new question.',
                )

    difficulty = str(row.get('difficulty', '')).strip() or Difficulty.MEDIUM
    if difficulty not in Difficulty.values:
        errors.setdefault('difficulty', []).append(
            f'difficulty must be one of: {", ".join(Difficulty.values)}.',
        )

    question_type = str(row.get('type', '')).strip().upper()
    if question_type not in QuestionType.values:
        errors.setdefault('type', []).append(
            f'type must be one of: {", ".join(QuestionType.values)}.',
        )

    points = row.get('points', 1)
    if not isinstance(points, int) or points < 1:
        errors.setdefault('points', []).append('points must be a positive integer.')

    metadata = row.get('metadata', {})
    if not isinstance(metadata, dict):
        errors.setdefault('metadata', []).append('metadata must be an object.')

    options = row.get('options', [])
    if not isinstance(options, list):
        errors.setdefault('options', []).append('options must be an array.')

    blank_keys = row.get('blank_answer_keys', [])
    if not isinstance(blank_keys, list):
        errors.setdefault('blank_answer_keys', []).append(
            'blank_answer_keys must be an array.',
        )

    if question_type in QuestionType.values and not errors.get('type'):
        type_errors = _validate_type_structure(
            question_type,
            options or [],
            blank_keys or [],
        )
        for field, messages in type_errors.items():
            errors.setdefault(field, []).extend(messages)

    if errors:
        return None, errors

    payload: dict[str, Any] = {
        'row_number': _row_number(row),
        'subject': str(row['subject']).strip(),
        'topic': str(row['topic']).strip(),
        'difficulty': difficulty,
        'type': question_type,
        'text': str(row['text']).strip(),
        'points': points,
        'metadata': metadata or {},
        'options': options or [],
        'blank_answer_keys': blank_keys or [],
    }
    if question_id:
        payload['id'] = question_id

    return payload, {}


def _public_row_snapshot(row: dict) -> dict:
    return {
        key: value
        for key, value in row.items()
        if not key.startswith('_')
    }


def _validate_row(row: dict) -> tuple[dict | None, dict[str, list[str]]]:
    errors: dict[str, list[str]] = {}

    for field in REQUIRED_FIELDS:
        if not str(row.get(field, '')).strip():
            errors.setdefault(field, []).append(f'{field} is required.')

    question_id = str(row.get('id', '')).strip()
    if question_id:
        try:
            parsed_id = uuid.UUID(question_id)
        except ValueError:
            errors.setdefault('id', []).append('id must be a valid UUID.')
        else:
            if not Question.objects.filter(pk=parsed_id).exists():
                errors.setdefault('id', []).append(
                    'No existing question found for this id. Leave id blank to create a new question.',
                )

    difficulty = str(row.get('difficulty', '')).strip() or Difficulty.MEDIUM
    if difficulty not in Difficulty.values:
        errors.setdefault('difficulty', []).append(
            f'difficulty must be one of: {", ".join(Difficulty.values)}.',
        )

    question_type = str(row.get('type', '')).strip().upper()
    if question_type not in QuestionType.values:
        errors.setdefault('type', []).append(
            f'type must be one of: {", ".join(QuestionType.values)}.',
        )

    points, points_errors = _parse_positive_int(row.get('points', ''), 'points', default=1)
    if points_errors:
        errors['points'] = points_errors

    metadata, metadata_errors = _parse_metadata(row.get('metadata', ''))
    if metadata_errors:
        errors['metadata'] = metadata_errors

    options, options_errors = _parse_options(row.get('options', ''))
    if options_errors:
        errors['options'] = options_errors

    blank_keys, blank_errors = _parse_blank_answer_keys(row.get('blank_answer_keys', ''))
    if blank_errors:
        errors['blank_answer_keys'] = blank_errors

    if question_type in QuestionType.values and not errors.get('type'):
        type_errors = _validate_type_structure(
            question_type,
            options or [],
            blank_keys or [],
        )
        for field, messages in type_errors.items():
            errors.setdefault(field, []).extend(messages)

    if errors:
        return None, errors

    payload: dict[str, Any] = {
        'row_number': _row_number(row),
        'subject': str(row['subject']).strip(),
        'topic': str(row['topic']).strip(),
        'difficulty': difficulty,
        'type': question_type,
        'text': str(row['text']).strip(),
        'points': points,
        'metadata': metadata or {},
        'options': options or [],
        'blank_answer_keys': blank_keys or [],
    }
    if question_id:
        payload['id'] = question_id

    return payload, {}


def _parse_positive_int(value: object, field_name: str, default: int) -> tuple[int, list[str]]:
    raw = str(value or '').strip()
    if not raw:
        return default, []

    try:
        parsed = int(raw)
    except ValueError:
        return default, [f'{field_name} must be a positive integer.']

    if parsed < 1:
        return default, [f'{field_name} must be at least 1.']
    return parsed, []


def _parse_metadata(value: object) -> tuple[dict | None, list[str]]:
    raw = str(value or '').strip()
    if not raw:
        return {}, []

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None, ['metadata must be valid JSON object text.']

    if not isinstance(parsed, dict):
        return None, ['metadata must be a JSON object.']
    return parsed, []


def _parse_options(value: object) -> tuple[list[dict] | None, list[str]]:
    raw = str(value or '').strip()
    if not raw:
        return [], []

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None, ['options must be valid JSON array text.']

    if not isinstance(parsed, list):
        return None, ['options must be a JSON array.']

    options: list[dict] = []
    for index, item in enumerate(parsed):
        if not isinstance(item, dict):
            return None, [f'options[{index}] must be an object.']

        label = str(item.get('label', '')).strip()
        option_value = str(item.get('value', '')).strip()
        if not label:
            return None, [f'options[{index}].label is required.']
        if not option_value:
            return None, [f'options[{index}].value is required.']

        is_correct, bool_errors = _parse_bool(item.get('is_correct', False), 'is_correct')
        if bool_errors:
            return None, [f'options[{index}].{bool_errors[0]}']

        order, order_errors = _parse_positive_int(item.get('order', index), 'order', default=index)
        if order_errors:
            return None, [f'options[{index}].{order_errors[0]}']

        options.append(
            {
                'label': label,
                'value': option_value,
                'is_correct': is_correct,
                'order': order,
            },
        )

    return options, []


def _parse_blank_answer_keys(value: object) -> tuple[list[dict] | None, list[str]]:
    raw = str(value or '').strip()
    if not raw:
        return [], []

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None, ['blank_answer_keys must be valid JSON array text.']

    if not isinstance(parsed, list):
        return None, ['blank_answer_keys must be a JSON array.']

    blank_keys: list[dict] = []
    for index, item in enumerate(parsed):
        if not isinstance(item, dict):
            return None, [f'blank_answer_keys[{index}] must be an object.']

        answer = str(item.get('answer', '')).strip()
        if not answer:
            return None, [f'blank_answer_keys[{index}].answer is required.']

        case_sensitive, bool_errors = _parse_bool(
            item.get('case_sensitive', False),
            'case_sensitive',
        )
        if bool_errors:
            return None, [f'blank_answer_keys[{index}].{bool_errors[0]}']

        blank_keys.append(
            {
                'answer': answer,
                'case_sensitive': case_sensitive,
            },
        )

    return blank_keys, []


def _parse_bool(value: object, field_name: str) -> tuple[bool, list[str]]:
    if isinstance(value, bool):
        return value, []

    raw = str(value).strip().lower()
    if raw in BOOLEAN_TRUE:
        return True, []
    if raw in BOOLEAN_FALSE:
        return False, []
    if not raw:
        return False, []
    return False, [f'{field_name} must be a boolean value.']


def _validate_type_structure(
    question_type: str,
    options: list[dict],
    blank_keys: list[dict],
) -> dict[str, list[str]]:
    errors: dict[str, list[str]] = {}

    if question_type == QuestionType.MCQ:
        if len(options) < 2:
            errors['options'] = ['MCQ questions must have at least two options.']
        else:
            correct_count = sum(1 for option in options if option['is_correct'])
            if correct_count != 1:
                errors['options'] = ['MCQ questions must have exactly one correct option.']

    elif question_type == QuestionType.MULTI_SELECT:
        if len(options) < 2:
            errors['options'] = ['Multi-select questions must have at least two options.']
        else:
            correct_count = sum(1 for option in options if option['is_correct'])
            if correct_count < 1:
                errors['options'] = ['Multi-select questions must have at least one correct option.']

    elif question_type == QuestionType.TRUE_FALSE:
        if len(options) != 2:
            errors['options'] = ['True/false questions must have exactly two options.']
        else:
            correct_count = sum(1 for option in options if option['is_correct'])
            if correct_count != 1:
                errors['options'] = ['True/false questions must have exactly one correct option.']

    elif question_type == QuestionType.FILL_IN_BLANK:
        if not blank_keys:
            errors['blank_answer_keys'] = [
                'Fill-in-the-blank questions require at least one accepted answer.',
            ]
        if options:
            errors['options'] = ['Fill-in-the-blank questions must not include options.']

    elif question_type == QuestionType.FREE_TEXT:
        if options:
            errors['options'] = ['Free-text questions must not include options.']
        if blank_keys:
            errors['blank_answer_keys'] = [
                'Free-text questions must not include blank answer keys.',
            ]

    return errors
