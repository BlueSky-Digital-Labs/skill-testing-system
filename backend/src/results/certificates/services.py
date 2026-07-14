from __future__ import annotations

import hashlib
from dataclasses import dataclass
from io import BytesIO

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone

from delivery import services as delivery_services
from grading.models import CombinedResult

from .models import Certificate


class CertificateServiceError(Exception):
    """Base class for certificate service errors."""


class CertificateNotEligible(CertificateServiceError):
    """Attempt is not eligible for certificate issuance."""


class CertificateNotFound(CertificateServiceError):
    """Certificate record was not found."""


class CertificateStorageError(CertificateServiceError):
    """Certificate PDF could not be stored."""


@dataclass(frozen=True)
class EligibilityResult:
    eligible: bool
    reason: str | None = None


def get_eligibility(attempt_id: str) -> EligibilityResult:
    """
    Determine whether a certificate can be issued for the attempt.
    """
    try:
        summary = delivery_services.get_attempt_summary(attempt_id)
    except Exception as exc:
        return EligibilityResult(eligible=False, reason=str(exc))

    if not summary.get('passed'):
        return EligibilityResult(
            eligible=False,
            reason='Attempt did not meet the passing threshold.',
        )

    combined = CombinedResult.objects.filter(attempt_id=attempt_id).first()
    if combined is None or not combined.passed:
        return EligibilityResult(
            eligible=False,
            reason='No passing combined result found.',
        )

    return EligibilityResult(eligible=True)


def render_pdf(context: dict) -> bytes:
    """
    Render a certificate PDF from the base HTML template.
    """
    html = render_to_string('certificates/base_template.html', context)
    try:
        from weasyprint import HTML
    except ImportError as exc:
        raise CertificateServiceError(
            'PDF rendering is unavailable (weasyprint not installed).',
        ) from exc

    pdf_buffer = BytesIO()
    HTML(string=html).write_pdf(pdf_buffer)
    return pdf_buffer.getvalue()


def _get_s3_client():
    return boto3.client(
        's3',
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
    )


def store_pdf(pdf_bytes: bytes, s3_key: str) -> None:
    """
    Store rendered PDF bytes in the configured certificates bucket.
    """
    bucket = settings.CERTIFICATES_BUCKET
    if not bucket:
        raise CertificateStorageError('CERTIFICATES_BUCKET is not configured.')

    client = _get_s3_client()
    try:
        client.put_object(
            Bucket=bucket,
            Key=s3_key,
            Body=pdf_bytes,
            ContentType='application/pdf',
        )
    except (BotoCoreError, ClientError) as exc:
        raise CertificateStorageError('Failed to upload certificate PDF.') from exc


def create_presigned_url(s3_key: str, expires: int) -> str:
    """
    Generate a presigned download URL for a stored certificate PDF.
    """
    bucket = settings.CERTIFICATES_BUCKET
    if not bucket:
        raise CertificateStorageError('CERTIFICATES_BUCKET is not configured.')

    client = _get_s3_client()
    try:
        return client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket, 'Key': s3_key},
            ExpiresIn=expires,
        )
    except (BotoCoreError, ClientError) as exc:
        raise CertificateStorageError(
            'Failed to generate certificate download URL.',
        ) from exc


def _build_s3_key(attempt_id: str, template_version: str) -> str:
    return f'certificates/{attempt_id}/{template_version}.pdf'


def _build_render_context(summary: dict, template_version: str) -> dict:
    return {
        'candidate_name': summary.get('candidate_name') or 'Candidate',
        'candidate_email': summary.get('candidate_email', ''),
        'attempt_id': summary['attempt_id'],
        'test_id': summary['test_id'],
        'template_version': template_version,
        'issued_at': timezone.now(),
        'total_awarded': summary.get('total_awarded'),
        'total_max': summary.get('total_max'),
        'passed': summary.get('passed', False),
    }


def issue_certificate(
    attempt_id: str,
    template_version: str,
    *,
    meta: dict | None = None,
) -> Certificate:
    """
    Issue a certificate for a passing attempt, idempotently.
    """
    eligibility = get_eligibility(attempt_id)
    if not eligibility.eligible:
        raise CertificateNotEligible(
            eligibility.reason or 'Attempt is not eligible for a certificate.',
        )

    existing = Certificate.objects.filter(
        attempt_id=attempt_id,
        template_version=template_version,
    ).first()
    if existing is not None and existing.revoked_at is None:
        return existing

    summary = delivery_services.get_attempt_summary(attempt_id)
    context = _build_render_context(summary, template_version)
    pdf_bytes = render_pdf(context)
    checksum = hashlib.sha256(pdf_bytes).hexdigest()
    s3_key = _build_s3_key(attempt_id, template_version)
    store_pdf(pdf_bytes, s3_key)

    certificate_meta = {
        'candidate_user_id': summary['candidate_user_id'],
        'candidate_name': summary.get('candidate_name'),
        'test_id': summary['test_id'],
        **(meta or {}),
    }

    certificate, _created = Certificate.objects.update_or_create(
        attempt_id=attempt_id,
        template_version=template_version,
        defaults={
            'pdf_s3_key': s3_key,
            'checksum_sha256': checksum,
            'revoked_at': None,
            'meta': certificate_meta,
        },
    )
    return certificate


def get_certificate_for_attempt(attempt_id: str) -> Certificate:
    certificate = (
        Certificate.objects.filter(attempt_id=attempt_id, revoked_at__isnull=True)
        .order_by('-issued_at')
        .first()
    )
    if certificate is None:
        raise CertificateNotFound('Certificate not found for attempt.')
    return certificate


def get_certificate_by_id(certificate_id) -> Certificate:
    certificate = Certificate.objects.filter(pk=certificate_id).first()
    if certificate is None:
        raise CertificateNotFound('Certificate not found.')
    return certificate
