from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("operations", "0014_seed_sheet_products"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="product",
            name="legacy_package",
        ),
        migrations.RemoveField(
            model_name="booking",
            name="package",
        ),
        migrations.RenameField(
            model_name="booking",
            old_name="package_name",
            new_name="product_name_snapshot",
        ),
        migrations.RenameField(
            model_name="booking",
            old_name="package_type",
            new_name="product_category_snapshot",
        ),
        migrations.RenameField(
            model_name="booking",
            old_name="destination_package",
            new_name="product_destination_snapshot",
        ),
        migrations.DeleteModel(
            name="Package",
        ),
    ]
