from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0002_quotation_destination_package_quotation_discount_and_more'),
        ('operations', '0006_operations_upgrade'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='booking',
            name='quotation',
        ),
    ]
