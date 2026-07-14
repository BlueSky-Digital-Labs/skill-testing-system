from django.db import migrations


DEFAULT_ROLES = [
    {
        'key': 'SYSTEM_ADMIN',
        'name': 'System Administrator',
        'description': 'Full platform administration access.',
    },
    {
        'key': 'EXAMINER',
        'name': 'Examiner',
        'description': 'Grades and reviews candidate submissions.',
    },
    {
        'key': 'COORDINATOR',
        'name': 'Coordinator',
        'description': 'Coordinates exam sessions and logistics.',
    },
    {
        'key': 'CANDIDATE',
        'name': 'Candidate',
        'description': 'Takes exams and views personal results.',
    },
]


def seed_roles(apps, schema_editor):
    Role = apps.get_model('authentication', 'Role')
    for role_data in DEFAULT_ROLES:
        Role.objects.get_or_create(
            key=role_data['key'],
            defaults={
                'name': role_data['name'],
                'description': role_data['description'],
                'is_active': True,
            },
        )


def unseed_roles(apps, schema_editor):
    Role = apps.get_model('authentication', 'Role')
    Role.objects.filter(key__in=[role['key'] for role in DEFAULT_ROLES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0003_role_user_first_name_user_last_name_userrole_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_roles, unseed_roles),
    ]
