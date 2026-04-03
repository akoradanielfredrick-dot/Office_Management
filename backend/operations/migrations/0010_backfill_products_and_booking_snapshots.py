from decimal import Decimal

from django.db import migrations
from django.utils.text import slugify


def unique_slug(Product, base_slug):
    slug = base_slug or "product"
    candidate = slug
    counter = 1
    while Product.objects.filter(slug=candidate).exists():
        counter += 1
        candidate = f"{slug}-{counter}"
    return candidate


def unique_product_code(Product, prefix, legacy_id):
    base_code = f"{prefix}-{str(legacy_id).replace('-', '')[:8].upper()}"
    candidate = base_code
    counter = 1
    while Product.objects.filter(product_code=candidate).exists():
        counter += 1
        candidate = f"{base_code}-{counter}"
    return candidate


def create_default_categories(ProductParticipantCategory, product):
    existing = set(
        ProductParticipantCategory.objects.filter(product=product).values_list("code", flat=True)
    )
    defaults = [
        ("ADULT", "Adult"),
        ("CHILD", "Child"),
    ]
    for code, label in defaults:
        if code not in existing:
            ProductParticipantCategory.objects.create(
                product=product,
                code=code,
                label=label,
            )


def forwards(apps, schema_editor):
    Package = apps.get_model("operations", "Package")
    Excursion = apps.get_model("operations", "Excursion")
    Product = apps.get_model("operations", "Product")
    ProductParticipantCategory = apps.get_model("operations", "ProductParticipantCategory")
    Booking = apps.get_model("operations", "Booking")

    package_product_map = {}
    for package in Package.objects.filter(is_deleted=False):
        product = Product.objects.filter(legacy_package=package).first()
        if not product:
            product = Product.objects.create(
                product_code=unique_product_code(Product, "PRD-PKG", package.id),
                name=package.name,
                slug=unique_slug(Product, slugify(package.name)),
                category="PACKAGE",
                description=package.itinerary or "",
                destination=package.name,
                duration_text="",
                booking_cutoff_minutes=0,
                pricing_mode="PER_PERSON",
                default_currency="KES",
                legacy_package=package,
                metadata={"legacy_source": "package"},
            )
        create_default_categories(ProductParticipantCategory, product)
        package_product_map[str(package.id)] = product

    for excursion in Excursion.objects.filter(is_deleted=False):
        product = Product.objects.filter(legacy_excursion=excursion).first()
        if not product:
            product = Product.objects.create(
                product_code=unique_product_code(Product, "PRD-EXC", excursion.id),
                name=excursion.name,
                slug=unique_slug(Product, slugify(f"{excursion.name}-{excursion.location}")),
                category="EXCURSION",
                description=excursion.itinerary or "",
                destination=excursion.location or excursion.name,
                duration_text="",
                booking_cutoff_minutes=0,
                pricing_mode="PER_PERSON",
                default_currency="KES",
                legacy_excursion=excursion,
                metadata={"legacy_source": "excursion"},
            )
        create_default_categories(ProductParticipantCategory, product)

    for booking in Booking.objects.select_related("client", "package").all():
        changed_fields = []
        if booking.package_id and not booking.product_id:
            product = package_product_map.get(str(booking.package_id))
            if product:
                booking.product_id = product.id
                changed_fields.append("product")
        if not booking.customer_full_name and booking.client_id:
            booking.customer_full_name = booking.client.full_name
            changed_fields.append("customer_full_name")
        if not booking.customer_email and booking.client_id:
            booking.customer_email = booking.client.email
            changed_fields.append("customer_email")
        if not booking.customer_phone and booking.client_id:
            booking.customer_phone = booking.client.phone
            changed_fields.append("customer_phone")
        if not booking.source:
            booking.source = "LEGACY"
            changed_fields.append("source")
        if booking.total_cost <= 0:
            booking.payment_status = "NOT_APPLICABLE"
            changed_fields.append("payment_status")
        elif booking.paid_amount <= 0:
            booking.payment_status = "UNPAID"
            changed_fields.append("payment_status")
        elif Decimal(booking.paid_amount) < Decimal(booking.total_cost):
            booking.payment_status = "PARTIAL"
            changed_fields.append("payment_status")
        else:
            booking.payment_status = "PAID"
            changed_fields.append("payment_status")
        if changed_fields:
            booking.save(update_fields=sorted(set(changed_fields)))


def backwards(apps, schema_editor):
    Product = apps.get_model("operations", "Product")
    ProductParticipantCategory = apps.get_model("operations", "ProductParticipantCategory")

    ProductParticipantCategory.objects.filter(
        product__metadata__legacy_source__in=["package", "excursion"]
    ).delete()
    Product.objects.filter(metadata__legacy_source__in=["package", "excursion"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("operations", "0009_reservationparticipant_schedulecategoryavailability_and_more"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
