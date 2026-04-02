from django.db import migrations


def remove_sales_role(apps, schema_editor):
    Role = apps.get_model('accounts', 'Role')
    Role.objects.filter(name='SALES').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(remove_sales_role, migrations.RunPython.noop),
    ]
