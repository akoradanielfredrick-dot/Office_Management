import uuid
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


def backfill_booking_fields(apps, schema_editor):
    Booking = apps.get_model('operations', 'Booking')

    for booking in Booking.objects.all():
        changed = False

        if booking.start_date and not booking.travel_date:
            booking.travel_date = booking.start_date
            changed = True

        if booking.destination_package and not booking.package_name:
            booking.package_name = booking.destination_package
            changed = True

        if not booking.number_of_days:
            booking.number_of_days = 1
            changed = True

        if changed:
            booking.save(update_fields=['travel_date', 'package_name', 'number_of_days'])


class Migration(migrations.Migration):

    dependencies = [
        ('operations', '0005_package'),
    ]

    operations = [
        migrations.RenameField(
            model_name='package',
            old_name='description',
            new_name='itinerary',
        ),
        migrations.AddField(
            model_name='package',
            name='package_type',
            field=models.CharField(choices=[('AIR_SAFARI', 'Air Safari'), ('ROAD_SAFARI', 'Road Safari')], default='ROAD_SAFARI', max_length=20),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='package',
            name='price',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=15),
        ),
        migrations.CreateModel(
            name='Excursion',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255, unique=True)),
                ('location', models.CharField(max_length=255)),
                ('price', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('itinerary', models.TextField(blank=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Excursion',
                'verbose_name_plural': 'Excursions',
                'ordering': ['name'],
            },
        ),
        migrations.AddField(
            model_name='supplier',
            name='address',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='supplier',
            name='notes',
            field=models.TextField(blank=True, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='supplier',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='booking',
            name='booking_validity',
            field=models.TextField(blank=True, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='booking',
            name='deposit_terms',
            field=models.TextField(blank=True, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='booking',
            name='extra_charges',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=15),
        ),
        migrations.AddField(
            model_name='booking',
            name='itinerary',
            field=models.TextField(blank=True, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='booking',
            name='number_of_days',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='booking',
            name='package',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bookings', to='operations.package'),
        ),
        migrations.AddField(
            model_name='booking',
            name='package_name',
            field=models.CharField(blank=True, default='', max_length=255),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='booking',
            name='package_type',
            field=models.CharField(blank=True, choices=[('AIR_SAFARI', 'Air Safari'), ('ROAD_SAFARI', 'Road Safari')], default='', max_length=20),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='booking',
            name='payment_channels',
            field=models.TextField(blank=True, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='booking',
            name='price_per_adult',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=15),
        ),
        migrations.AddField(
            model_name='booking',
            name='price_per_child',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=15),
        ),
        migrations.AddField(
            model_name='booking',
            name='travel_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_booking_fields, migrations.RunPython.noop),
    ]
