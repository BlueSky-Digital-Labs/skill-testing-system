"""
Test settings using an in-memory SQLite database.
"""

import os

os.environ.setdefault('SECRET_KEY', 'test-secret-key')
os.environ.setdefault('DEBUG', 'True')
os.environ.setdefault('DJANGO_ENV', 'local')

from .base import *  # noqa: E402,F403

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
EMAIL_PROVIDER = 'console'
FRONTEND_URL = 'http://localhost:3000'
RESEND_INVITE_THROTTLE_SECONDS = 60
INVITATION_URL_EXPIRE_SECONDS = 3600
ALLOW_SELF_REGISTRATION = True
MEDIA_ROOT = BASE_DIR / 'test_media'

DEBUG = True
