# Generated manually for portal access controls.

from django.db import migrations, models
import django.db.models.deletion


PORTAL_MODULES = [
    ("dashboard", "Dashboard"),
    ("bookings", "Bookings"),
    ("catalog", "Catalog"),
    ("products", "Products"),
    ("excursions", "Excursions"),
    ("schedules", "Schedules"),
    ("availability", "Availability"),
    ("integrations", "Integrations"),
    ("reservations", "Reservations"),
    ("payments", "Payments"),
    ("expenses", "Expenses"),
    ("analytics", "Analytics"),
    ("clients", "Clients"),
]


def seed_portal_modules_and_user_access(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    User = apps.get_model("accounts", "User")
    PortalModule = apps.get_model("accounts", "PortalModule")

    module_map = {}
    for key, label in PORTAL_MODULES:
        module, _ = PortalModule.objects.get_or_create(key=key, defaults={"label": label})
        module.label = label
        module.save(update_fields=["label"])
        module_map[key] = module

    role_defaults = {
        "SUPER_ADMIN": [key for key, _ in PORTAL_MODULES],
        "DIRECTOR": [key for key, _ in PORTAL_MODULES],
        "OPERATIONS": [
            "dashboard",
            "bookings",
            "catalog",
            "products",
            "excursions",
            "schedules",
            "availability",
            "integrations",
            "reservations",
            "clients",
        ],
        "ACCOUNTS": [
            "dashboard",
            "payments",
            "expenses",
            "analytics",
            "clients",
        ],
    }

    user_role_ids = {str(role.id): role.name for role in Role.objects.all()}
    through_model = User.portal_modules.through

    for user in User.objects.all():
        role_name = user_role_ids.get(str(user.role_id), "") if user.role_id else ""
        default_modules = role_defaults.get(role_name, [])
        if default_modules:
            for module_key in default_modules:
                through_model.objects.get_or_create(user_id=user.id, portalmodule_id=module_map[module_key].id)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_remove_sales_role"),
    ]

    operations = [
        migrations.CreateModel(
            name="PortalModule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("key", models.CharField(choices=PORTAL_MODULES, max_length=50, unique=True)),
                ("label", models.CharField(max_length=100)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ("label",)},
        ),
        migrations.AddField(
            model_name="user",
            name="blocked_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="revoked_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="status",
            field=models.CharField(
                choices=[("active", "Active"), ("blocked", "Blocked"), ("revoked", "Revoked")],
                default="active",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="portal_modules",
            field=models.ManyToManyField(blank=True, related_name="users", to="accounts.portalmodule"),
        ),
        migrations.RunPython(seed_portal_modules_and_user_access, migrations.RunPython.noop),
    ]
