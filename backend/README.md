# Django REST + DRF Starter Project

A production-ready Django REST API starter with JWT authentication, Celery task queue, Redis cache, PostgreSQL database, and Docker containerization.

## 🚀 Features

- **Django 5.0** with Django REST Framework
- **Custom email-only User model** with JWT authentication
- **Celery** with Redis for background tasks
- **PostgreSQL** database with optimized indexing
- **CORS** configuration loaded from environment
- **DRY settings** with environment-specific overrides
- **Docker** containerization (no Nginx)
- **WhiteNoise** for static file serving
- **Comprehensive testing** setup
- **Swagger/OpenAPI 3.0** documentation with drf-spectacular
- **Makefile** for easy development workflows

## 📋 Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Django 5.0 + Django REST Framework |
| Authentication | SimpleJWT (JWT tokens) |
| Database | PostgreSQL with psycopg v3 |
| Cache/Queue | Redis |
| Task Queue | Celery + Celery Beat |
| Static Files | WhiteNoise |
| Containerization | Docker + Docker Compose |
| Environment | django-environ |
| Production Server | Gunicorn |
| API Documentation | drf-spectacular (OpenAPI 3.0) |

## 🏗️ Project Structure

```
backend/
├── manage.py
├── src/
│   ├── core/                    # Project package
│   │   ├── __init__.py
│   │   ├── settings/
│   │   │   ├── __init__.py     # DRY settings loader
│   │   │   └── base.py         # Common settings
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   ├── asgi.py
│   │   └── celery.py           # Celery configuration
│   └── authentication/         # Authentication app
│       ├── __init__.py
│       ├── apps.py
│       ├── models.py           # Custom User model
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       ├── admin.py
│       ├── tasks.py            # Celery tasks
│       └── tests/
│   └── branding/               # Organization branding settings
│       ├── models.py           # OrganizationSettings singleton
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       ├── admin.py
│       └── tests/
│   └── grading/                # Objective question auto-scoring
│       ├── models.py           # ObjectiveScore, ScoringPolicy
│       ├── services.py         # Deterministic scoring functions
│       ├── schemas.py          # Request validation forms
│       ├── views.py
│       ├── urls.py
│       ├── auth.py
│       ├── admin.py
│       └── tests/
│   └── audit/                  # Hash-chained audit logging
│       ├── models.py           # AuditLog model
│       ├── utils.py            # Logging helpers, decorators, verification
│       ├── views.py            # Read-only admin APIs
│       ├── urls.py
│       ├── admin.py
│       └── tests/
├── requirements.txt
├── Dockerfile
├── entrypoint.sh
├── compose.yml                 # Base compose config
├── compose.dev.yml             # Development overrides
├── compose.uat.yml             # UAT overrides
├── compose.prod.yml            # Production overrides
├── Makefile                    # Development shortcuts
├── env.local.example           # Local development template
├── env.dev.example             # Docker development template
├── env.uat.example             # UAT template
└── env.prod.example            # Production template
```

## 🛠️ Requirements

- **Docker** and **Docker Compose** (recommended for all environments)
- **Python 3.12** (for local development without Docker)
- **PostgreSQL** (for local development without Docker)
- **Redis** (for local development without Docker)

## ⚙️ Environment Setup

### 1. Copy Environment File

```bash
# Copy environment template
make setup-env

# Or manually:
cp env.example .env
```

### 2. Configure Environment Variables

Edit the `.env` file with your specific values:

#### Core Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DJANGO_ENV` | Environment identifier | `local`, `dev`, `uat`, `prod` |
| `SECRET_KEY` | Django secret key | Generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DEBUG` | Enable debug mode | `True` for dev, `False` for prod |
| `ALLOWED_HOSTS` | Allowed host headers | `localhost,127.0.0.1,yourdomain.com` |

#### Database Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Complete database URL | `postgresql://user:pass@host:5432/dbname` |
| `DB_NAME` | Database name (local only) | `backend_local` |
| `DB_USER` | Database user (local only) | `postgres` |
| `DB_PASSWORD` | Database password (local only) | `postgres` |
| `DB_HOST` | Database host (local only) | `localhost` |
| `DB_PORT` | Database port (local only) | `5432` |

#### CORS Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | `http://localhost:3000,https://yourdomain.com` |
| `CSRF_TRUSTED_ORIGINS` | Comma-separated trusted origins | `http://localhost:3000,https://yourdomain.com` |
| `CORS_ALLOW_CREDENTIALS` | Allow credentials in CORS | `True` or `False` |

#### JWT Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SIMPLE_JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | Access token lifetime | `15` (15 minutes) |
| `SIMPLE_JWT_REFRESH_TOKEN_LIFETIME_DAYS` | Refresh token lifetime | `7` days |
| `SIMPLE_JWT_ROTATE_REFRESH_TOKENS` | Rotate refresh tokens | `True` |
| `SIMPLE_JWT_ALGORITHM` | JWT algorithm | `HS256` |

#### Celery Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CELERY_BROKER_URL` | Redis URL for Celery broker | `redis://redis:6379/0` |
| `CELERY_RESULT_BACKEND` | Redis URL for results | `redis://redis:6379/1` |

#### Email & Password Reset Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EMAIL_BACKEND` | Django email backend class | `django.core.mail.backends.console.EmailBackend` |
| `DEFAULT_FROM_EMAIL` | Sender address for outbound email | `no-reply@example.test` |
| `FRONTEND_URL` | Frontend base URL for password reset links | None |

## 🚀 Running the Application

### Development (Docker - Recommended)

```bash
# Quick start - setup and run development environment
make quickstart

# Or step by step:
make setup-env          # Copy environment file
make build              # Build Docker images
make dev               # Start development environment

# View logs
make logs

# Stop services
make down
```

### Development (Local without Docker)

**Note**: Update your `.env` file for local development by commenting/uncommenting the appropriate database and Redis URLs.

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
make install-local
# Or: pip install -r requirements.txt

# Set environment variables
export DJANGO_ENV=local
export DJANGO_SETTINGS_MODULE=core.settings

# Setup database (ensure PostgreSQL is running)
make migrate-local
# Or: python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
make runserver-local
# Or: python manage.py runserver

# In separate terminals, run Celery:
make celery-local       # Worker
make celery-beat-local  # Beat scheduler
```

### UAT Environment

**Note**: Update your `.env` file with UAT-specific values (DATABASE_URL, CORS origins, etc.)

```bash
# Start UAT environment
make uat

# View logs
make ENV=uat logs
```

### Production Environment

**Important**: Update your `.env` file with production values:
- Set `DJANGO_ENV=prod`
- Use external/managed PostgreSQL database URL
- Set production CORS origins
- Use secure SECRET_KEY

```bash
# Deploy to production
make deploy-prod

# Or step by step:
make ENV=prod build
make ENV=prod up

# View logs
make ENV=prod logs
```

## 🔧 Common Development Tasks

### Django Management Commands

```bash
# Create and apply migrations
make makemigrations
make migrate

# Create superuser
make createsuperuser

# Collect static files
make collectstatic

# Open Django shell
make shell

# Open database shell
make dbshell
```

### Celery Operations

```bash
# View Celery logs
make logs-celery

# Monitor Celery workers (in development)
docker compose --env-file .env.dev -f compose.yml -f compose.dev.yml exec celery celery -A core inspect active
```

### Database Operations

```bash
# Backup database
make backup-db

# Restore database
make restore-db BACKUP_FILE=backup_dev_20241201_120000.sql
```

### Testing

```bash
# Run tests
make test

# Run tests with coverage
make test-coverage
```

## 🔐 Authentication & JWT Usage

### API Endpoints

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/health/` | GET | Health check | None |
| `/api/auth/register/` | POST | User registration | None |
| `/api/auth/login/` | POST | User login | None |
| `/api/auth/jwt/create/` | POST | Obtain JWT token | None |
| `/api/auth/jwt/refresh/` | POST | Refresh JWT token | None |
| `/api/auth/jwt/verify/` | POST | Verify JWT token | None |
| `/api/auth/token/` | POST | Obtain JWT tokens (email + password) | None |
| `/api/auth/token/refresh/` | POST | Refresh JWT access token | None |
| `/api/auth/password/forgot/` | POST | Request password reset email | None |
| `/api/auth/password/reset/` | POST | Confirm password reset with token | None |
| `/api/auth/me/` | GET | Current user profile | JWT |
| `/api/auth/users/` | GET | List users | JWT |
| `/api/admin/settings` | GET | Organization branding settings | JWT (staff) |
| `/api/admin/settings/update` | POST | Update branding settings (JSON or multipart) | JWT (staff) |
| `/api/grading/mcq/` | POST | Score a multiple-choice question | JWT (staff) |
| `/api/grading/true-false/` | POST | Score a true/false question | JWT (staff) |
| `/api/grading/fib/` | POST | Score a fill-in-the-blank question | JWT (staff) |
| `/api/grading/multi-select/` | POST | Score a multi-select question | JWT (staff) |
| `/api/grading/queue/enqueue-free-text/` | POST | Enqueue a free-text response for manual grading | JWT (staff) |
| `/api/grading/queue/list/` | GET | List manual grading queue items | JWT (staff) |
| `/api/grading/grade/` | POST | Submit a manual grade for a queue item | JWT (staff) |
| `/api/grading/aggregate/attempt/` | POST | Aggregate objective + manual scores for an attempt | JWT (staff) |
| `/api/grading/result/<attempt_id>/` | GET | Retrieve persisted combined result | JWT (staff) |
| `/api/audit/logs/` | GET | List hash-chained audit logs (filterable) | JWT (staff) |
| `/api/audit/verify/` | GET | Verify audit log hash chain integrity | JWT (staff) |
| `/api/audit/test-log` | POST | Create a `DEV_TEST` audit entry (DEBUG only) | JWT |

## 📖 API Documentation

The API includes comprehensive Swagger/OpenAPI 3.0 documentation powered by `drf-spectacular`.

### Accessing Documentation

Once the server is running, you can access the API documentation at:

| Documentation Type | URL | Description |
|-------------------|-----|-------------|
| **Swagger UI** | `http://localhost:8000/api/docs/` | Interactive API explorer with "Try it out" functionality |
| **ReDoc** | `http://localhost:8000/api/redoc/` | Clean, responsive documentation |
| **OpenAPI Schema** | `http://localhost:8000/api/schema/` | Raw OpenAPI 3.0 schema in YAML format |

### Quick Access

```bash
# Start the development server
make dev

# View documentation URLs
make docs

# Generate schema file locally
make schema
```

### Features

- **Interactive Testing**: Test all endpoints directly from Swagger UI
- **JWT Authentication**: Built-in "Authorize" button for JWT token management
- **Request/Response Examples**: Comprehensive examples for all endpoints
- **Organized by Tags**: Endpoints grouped by functionality (Authentication, Users, Health)
- **Parameter Documentation**: Detailed parameter descriptions and validation rules
- **Error Response Examples**: Example error responses for better error handling

### Using JWT Authentication in Swagger

1. Register a new user or login at `/api/auth/login/`
2. Copy the `access` token from the response
3. Click the "🔒 Authorize" button in Swagger UI
4. Enter: `Bearer YOUR_ACCESS_TOKEN`
5. Click "Authorize" and close the modal
6. All protected endpoints are now accessible

### Registration Example

```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "password_confirm": "securepassword123"
  }'
```

### Login Example

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

### Using JWT Token

```bash
# Get user profile
curl -X GET http://localhost:8000/api/auth/me/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### JWT Token Refresh

```bash
curl -X POST http://localhost:8000/api/auth/jwt/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "YOUR_REFRESH_TOKEN"}'
```

### Password Reset

Request a reset link (always returns 200 to avoid revealing whether an account exists):

```bash
curl -X POST http://localhost:8000/api/auth/password/forgot/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

Confirm the reset with the token from the email:

```bash
curl -X POST http://localhost:8000/api/auth/password/reset/ \
  -H "Content-Type: application/json" \
  -d '{
    "token": "RESET_TOKEN_FROM_EMAIL",
    "new_password": "newSecurePassword123"
  }'
```

### JWT Token Obtain (email-based)

```bash
curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

### JWT Token Refresh

```bash
curl -X POST http://localhost:8000/api/auth/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "YOUR_REFRESH_TOKEN"}'
```

### Organization Branding Settings (admin)

Staff users can manage organization-level branding (logo, theme colors, email header/footer HTML).

```bash
# Get current settings
curl -X GET http://localhost:8000/api/admin/settings \
  -H "Authorization: Bearer YOUR_STAFF_ACCESS_TOKEN"

# Update colors and email HTML (JSON)
curl -X POST http://localhost:8000/api/admin/settings/update \
  -H "Authorization: Bearer YOUR_STAFF_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "primary_color": "#0A5FFF",
    "secondary_color": "#111827",
    "email_header_html": "<p>Welcome</p>",
    "email_footer_html": "<p>Thanks for reading</p>"
  }'

# Upload a logo (multipart)
curl -X POST http://localhost:8000/api/admin/settings/update \
  -H "Authorization: Bearer YOUR_STAFF_ACCESS_TOKEN" \
  -F "logo=@/path/to/logo.png" \
  -F "primary_color=#0A5FFF"
```

### Objective Auto-Scoring (staff)

Staff users can score objective questions via deterministic scoring endpoints. Each request persists an `ObjectiveScore` record and returns the computed result.

Optional `scoring_policy_id` references a `ScoringPolicy` that controls partial credit and negative marking.

```bash
# Score an MCQ
curl -X POST http://localhost:8000/api/grading/mcq/ \
  -H "Authorization: Bearer YOUR_STAFF_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "attempt_id": "attempt-123",
    "question_id": "question-456",
    "question_version": 1,
    "selected_option": "B",
    "correct_option": "B",
    "max_points": "2.00"
  }'

# Example response
# {
#   "id": "uuid",
#   "attempt_id": "attempt-123",
#   "question_id": "question-456",
#   "question_version": 1,
#   "question_type": "mcq",
#   "awarded_points": "2.00",
#   "max_points": "2.00",
#   "is_correct": true,
#   "detail": {"selected_option": "B", "correct_option": "B"},
#   "created_at": "2026-07-13T11:00:00+00:00"
# }

# Score true/false
curl -X POST http://localhost:8000/api/grading/true-false/ \
  -H "Authorization: Bearer YOUR_STAFF_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "attempt_id": "attempt-123",
    "question_id": "question-789",
    "question_version": 1,
    "selected_answer": false,
    "correct_answer": true,
    "max_points": "1.00"
  }'

# Score fill-in-the-blank (answers are normalized: trimmed, lowercased, whitespace collapsed)
curl -X POST http://localhost:8000/api/grading/fib/ \
  -H "Authorization: Bearer YOUR_STAFF_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "attempt_id": "attempt-123",
    "question_id": "question-101",
    "question_version": 1,
    "submitted_answer": " Paris ",
    "accepted_answers": ["paris", "Paris, France"],
    "max_points": "3.00"
  }'

# Score multi-select with optional scoring policy
curl -X POST http://localhost:8000/api/grading/multi-select/ \
  -H "Authorization: Bearer YOUR_STAFF_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "attempt_id": "attempt-123",
    "question_id": "question-202",
    "question_version": 1,
    "selected_options": ["A", "C"],
    "correct_options": ["A", "B"],
    "max_points": "4.00",
    "scoring_policy_id": "POLICY_UUID"
  }'
```

### Manual Grading and Combined Results (staff, FR-24 / FR-25)

Free-text responses are enqueued for manual grading. Graders submit scores that are combined with auto-scored objective results. When `blind_marking` is enabled, `candidate_display` is omitted from API responses.

```bash
# Enqueue a free-text response
curl -X POST http://localhost:8000/api/grading/queue/enqueue-free-text/ \
  -H "Authorization: Bearer YOUR_STAFF_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "attempt_id": "attempt-123",
    "test_id": "test-456",
    "question_id": "question-essay-1",
    "question_version": "1",
    "candidate_display": "Jane Candidate",
    "blind_marking": true,
    "response_text": "My essay response...",
    "max_points": "10.00",
    "topic": "essay"
  }'

# List queue items (optional filters: status, test_id, attempt_id)
curl -X GET "http://localhost:8000/api/grading/queue/list/?status=queued" \
  -H "Authorization: Bearer YOUR_STAFF_ACCESS_TOKEN"

# Submit a manual grade
curl -X POST http://localhost:8000/api/grading/grade/ \
  -H "Authorization: Bearer YOUR_STAFF_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "queue_item_id": "QUEUE_ITEM_UUID",
    "awarded_points": "8.50",
    "feedback": "Well structured answer."
  }'

# Aggregate objective + manual scores for an attempt
curl -X POST http://localhost:8000/api/grading/aggregate/attempt/ \
  -H "Authorization: Bearer YOUR_STAFF_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "attempt_id": "attempt-123",
    "test_id": "test-456"
  }'

# Retrieve persisted combined result
curl -X GET http://localhost:8000/api/grading/result/attempt-123/ \
  -H "Authorization: Bearer YOUR_STAFF_ACCESS_TOKEN"
```

Pass/fail is determined from `TestConfigSnapshot` using `passing_score` and `pass_type` (`absolute` or `percent`).

### Audit Logging (staff)

The `audit` app records immutable, hash-chained audit events. Each entry links to the previous entry's hash so tampering can be detected.

**Programmatic logging**

```python
from audit.utils import log_action, audit_log_action, AuditLogMixin

# Direct logging
log_action(
    action='UPDATE',
    entity_type='user',
    entity_id='42',
    metadata={'field': 'email'},
    request=request,
)

# Function-based view decorator (logs after successful 2xx response)
@audit_log_action('DELETE', entity_type='document', entity_id='doc-1')
def delete_document(request):
    ...

# Class-based view helper
class MyView(AuditLogMixin, APIView):
    def post(self, request):
        response = Response({'ok': True})
        self.log_audit_action(
            request,
            response,
            action='CREATE',
            entity_type='item',
            entity_id='new-id',
        )
        return response
```

**Read APIs**

```bash
# List audit logs (optional filters: actor, action, entity_type, entity_id, from, to, page, page_size)
curl -X GET "http://localhost:8000/api/audit/logs/?action=CREATE&page=1&page_size=20" \
  -H "Authorization: Bearer YOUR_STAFF_ACCESS_TOKEN"

# Verify hash chain integrity
curl -X GET http://localhost:8000/api/audit/verify/ \
  -H "Authorization: Bearer YOUR_STAFF_ACCESS_TOKEN"
```

**Development test endpoint** (returns 404 when `DEBUG=False`):

```bash
curl -X POST http://localhost:8000/api/audit/test-log \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Audit entries are also visible in Django Admin as read-only records.

## 🌐 CORS Configuration

CORS settings are loaded from environment variables:

- **Development**: Allows `localhost:3000` and `127.0.0.1:3000`
- **Production**: Configure with your actual frontend domains

The CORS middleware is positioned correctly in the middleware stack:
1. `corsheaders.middleware.CorsMiddleware` (first)
2. `whitenoise.middleware.WhiteNoiseMiddleware`
3. Other Django middleware...

## 📁 Static Files

Static files are handled by **WhiteNoise**:

- Collected to `/app/staticfiles/` in containers
- Served directly by Django (no Nginx required)
- Compression and caching enabled
- Automatically collected during container startup

```bash
# Manually collect static files
make collectstatic
```

## 📷 Media Files

User-uploaded media (organization logos, etc.) are stored on disk:

| Setting | Default | Description |
|---------|---------|-------------|
| `MEDIA_ROOT` | `backend/media/` | Filesystem path for uploads |
| `MEDIA_URL` | `/media/` | URL prefix for uploaded files |

In development (`DEBUG=True`), Django serves media files directly. In production, configure your reverse proxy or object storage to serve `/media/` (Django does not serve media in production by default).

Uploaded branding logos are stored under `branding/` within `MEDIA_ROOT`.

## 🗄️ Database Migrations & Indexing

### Creating Migrations

```bash
# Create migrations for model changes
make makemigrations

# Apply migrations
make migrate
```

### Database Indexes

The custom User model includes optimized indexes:

- **Email index**: `user_email_idx` on email field
- **Active users index**: `user_active_idx` with partial condition for active users

### Verifying Indexes

```bash
# Connect to database and check indexes
make dbshell

# In PostgreSQL shell:
\d+ auth_user;  -- Show table structure with indexes
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'auth_user';
```

## 📊 Health Checks & Monitoring

### Health Check Endpoint

```bash
curl http://localhost:8000/api/health/
# Response: {"status": "ok"}
```

### Service Health

```bash
# Check all service health
make health

# Check container status
make ps
```

### Docker Health Checks

All services include health checks:
- **Web**: HTTP check on `/api/health/`
- **Database**: PostgreSQL connection check
- **Redis**: Redis ping check

## 🔧 Troubleshooting

### Common Issues

1. **Database connection errors**
   ```bash
   # Check if database is running
   make ps
   
   # Check database logs
   docker compose logs db
   
   # Verify database connection
   make exec-web CMD="python manage.py dbshell"
   ```

2. **Celery not working**
   ```bash
   # Check Redis connection
   make exec-redis
   
   # Check Celery logs
   make logs-celery
   
   # Test Celery task
   make shell
   # In shell: from authentication.tasks import cleanup_inactive_users; cleanup_inactive_users.delay()
   ```

3. **CORS issues**
   - Verify `CORS_ALLOWED_ORIGINS` in your `.env` file
   - Ensure your frontend URL is included
   - Check that `CORS_ALLOW_CREDENTIALS=True` if sending cookies

4. **Static files not loading**
   ```bash
   # Collect static files
   make collectstatic
   
   # Check static files directory
   make exec-web CMD="ls -la /app/staticfiles/"
   ```

### Environment-Specific Issues

#### Development
- Ensure Docker Desktop is running
- Check port conflicts (8000, 5432, 6379)
- Verify environment file exists: `.env.dev`

#### Production
- Ensure `DATABASE_URL` points to external database
- Verify all secrets are properly set in `.env.prod`
- Check firewall/security group settings for database access

## 🔄 Development Workflow

### Daily Development

```bash
# Start services
make dev

# Make code changes...

# Create and apply migrations
make makemigrations
make migrate

# Run tests
make test

# Stop services
make down
```

### Adding New Features

1. Create new Django apps:
   ```bash
   make exec-web CMD="python manage.py startapp myapp"
   ```

2. Add to `INSTALLED_APPS` in `settings/base.py`

3. Create models, views, serializers

4. Add URL patterns

5. Create and apply migrations

6. Write tests

### Production Deployment

1. Update `.env.prod` with production values
2. Ensure external database is configured
3. Deploy:
   ```bash
   make deploy-prod
   ```

## 📝 Additional Configuration

### Email Configuration (Optional)

Add to your `.env.prod` file:

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@yourdomain.com
EMAIL_HOST_PASSWORD=your-email-password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

### Scheduled Tasks

Celery Beat is configured to run periodic tasks. Example tasks are in `authentication/tasks.py`:

- `cleanup_inactive_users`: Logs inactive user count
- `generate_user_stats`: Generates user statistics

### Monitoring (Optional)

Enable monitoring tools in UAT:

```bash
make ENV=uat monitoring
# Access Redis Commander at http://localhost:8081
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Run tests: `make test`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:

1. Check the troubleshooting section above
2. Review Docker logs: `make logs`
3. Check service health: `make health`
4. Create an issue in the project repository

---

**Happy coding! 🎉**
