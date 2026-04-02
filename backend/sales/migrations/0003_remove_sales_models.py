from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('operations', '0007_remove_booking_quotation'),
        ('sales', '0002_quotation_destination_package_quotation_discount_and_more'),
    ]

    operations = [
        migrations.DeleteModel(
            name='QuotationItem',
        ),
        migrations.DeleteModel(
            name='Quotation',
        ),
    ]
