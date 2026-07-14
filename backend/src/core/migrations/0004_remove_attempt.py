# Remove Attempt model from core now that delivery owns attempt persistence.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('delivery', '0001_initial'),
        ('core', '0003_attempt_shuffle_orders'),
    ]

    operations = [
        migrations.DeleteModel(
            name='Attempt',
        ),
    ]
