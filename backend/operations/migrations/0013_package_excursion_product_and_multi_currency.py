from django.db import migrations, models
import django.db.models.deletion


def backfill_legacy_currency_fields(apps, schema_editor):
    Package = apps.get_model("operations", "Package")
    Excursion = apps.get_model("operations", "Excursion")

    for package in Package.objects.all():
        updates = {}
        if not package.price_usd and package.price:
            updates["price_usd"] = package.price
        if updates:
            Package.objects.filter(pk=package.pk).update(**updates)

    for excursion in Excursion.objects.all():
        updates = {}
        if not excursion.price_usd and excursion.price:
            updates["price_usd"] = excursion.price
        if updates:
            Excursion.objects.filter(pk=excursion.pk).update(**updates)


class Migration(migrations.Migration):

    dependencies = [
        ("operations", "0012_apiidempotencyrecord_externalproductmapping_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="excursion",
            name="price_eur",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=15),
        ),
        migrations.AddField(
            model_name="excursion",
            name="price_gbp",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=15),
        ),
        migrations.AddField(
            model_name="excursion",
            name="price_usd",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=15),
        ),
        migrations.AddField(
            model_name="excursion",
            name="product",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="legacy_excursion_records", to="operations.product"),
        ),
        migrations.AddField(
            model_name="package",
            name="price_eur",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=15),
        ),
        migrations.AddField(
            model_name="package",
            name="price_gbp",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=15),
        ),
        migrations.AddField(
            model_name="package",
            name="price_usd",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=15),
        ),
        migrations.AddField(
            model_name="package",
            name="product",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="legacy_package_records", to="operations.product"),
        ),
        migrations.RunPython(backfill_legacy_currency_fields, migrations.RunPython.noop),
    ]
