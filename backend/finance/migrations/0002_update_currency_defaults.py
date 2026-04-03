from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="payment",
            name="currency",
            field=models.CharField(default="USD", max_length=3),
        ),
        migrations.AlterField(
            model_name="expense",
            name="currency",
            field=models.CharField(default="USD", max_length=3),
        ),
    ]
