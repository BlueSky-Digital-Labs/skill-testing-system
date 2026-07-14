from __future__ import annotations

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings


class StorageError(Exception):
    """Raised when S3 storage operations fail."""


def get_s3_client():
    return boto3.client(
        's3',
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
    )


def get_reports_bucket() -> str:
    bucket = settings.REPORTS_BUCKET or settings.CERTIFICATES_BUCKET
    if not bucket:
        raise StorageError('REPORTS_BUCKET is not configured.')
    return bucket


def upload_object(
    data: bytes,
    s3_key: str,
    *,
    content_type: str,
    bucket: str | None = None,
) -> None:
    target_bucket = bucket or get_reports_bucket()
    client = get_s3_client()
    try:
        client.put_object(
            Bucket=target_bucket,
            Key=s3_key,
            Body=data,
            ContentType=content_type,
        )
    except (BotoCoreError, ClientError) as exc:
        raise StorageError('Failed to upload object to S3.') from exc


def create_presigned_download_url(
    s3_key: str,
    *,
    expires: int | None = None,
    bucket: str | None = None,
) -> str:
    target_bucket = bucket or get_reports_bucket()
    client = get_s3_client()
    expires_in = expires or settings.REPORT_PRESIGNED_URL_EXPIRES
    try:
        return client.generate_presigned_url(
            'get_object',
            Params={'Bucket': target_bucket, 'Key': s3_key},
            ExpiresIn=expires_in,
        )
    except (BotoCoreError, ClientError) as exc:
        raise StorageError('Failed to generate presigned download URL.') from exc
