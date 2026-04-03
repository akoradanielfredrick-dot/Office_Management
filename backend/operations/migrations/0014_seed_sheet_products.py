from django.db import migrations


SHEET_PRODUCTS = [
    {
        "name": "1/2 Day Mombasa City Tour",
        "slug": "half-day-mombasa-city-tour",
        "category": "EXCURSION",
        "description": "Visit Old Town, Fort Jesus and Wood Carvers Village.",
        "destination": "Mombasa",
        "duration_text": "1/2 day",
        "metadata": {"sheet_label": "EXCURSIONS", "tour_type": "CITY_TOUR"},
        "prices": {"USD": 70, "EUR": 60, "GBP": 50},
    },
    {
        "name": "1 Day Mombasa City Tour",
        "slug": "one-day-mombasa-city-tour",
        "category": "EXCURSION",
        "description": "Old Town, Fort Jesus, Wood Carvers Village, Haller Park/Bamburi Nature Trail, lunch included.",
        "destination": "Mombasa",
        "duration_text": "1 day",
        "metadata": {"sheet_label": "EXCURSIONS", "tour_type": "CITY_TOUR"},
        "prices": {"USD": 120, "EUR": 110, "GBP": 95},
    },
    {
        "name": "Shimba Hills (1 Day)",
        "slug": "shimba-hills-1-day",
        "category": "EXCURSION",
        "description": "Visit tropical forest, see sable antelopes, elephants, Sheldrick Waterfalls, lunch at Shimba Hills Lodge.",
        "destination": "Shimba Hills",
        "duration_text": "1 day",
        "metadata": {"sheet_label": "EXCURSIONS", "tour_type": "NATURE_EXCURSION"},
        "prices": {"USD": 155, "EUR": 145, "GBP": 120},
    },
    {
        "name": "Tsavo East (1 Day)",
        "slug": "tsavo-east-1-day-road-safari",
        "category": "SAFARI",
        "description": "Game drive in Tsavo East, see red elephants, lions, buffalo, antelopes.",
        "destination": "Tsavo East",
        "duration_text": "1 day",
        "metadata": {"sheet_label": "ROAD SAFARI", "safari_type": "ROAD_SAFARI"},
        "prices": {"USD": 190, "EUR": 180, "GBP": 150},
    },
    {
        "name": "Tsavo East (2 Days)",
        "slug": "tsavo-east-2-days-road-safari",
        "category": "SAFARI",
        "description": "Visit Aruba Dam, see hippos, elephants, birds, overnight at lodge/camp.",
        "destination": "Tsavo East",
        "duration_text": "2 days",
        "metadata": {"sheet_label": "ROAD SAFARI", "safari_type": "ROAD_SAFARI"},
        "prices": {"USD": 380, "EUR": 350, "GBP": 295},
    },
    {
        "name": "Saltlick Special (2 Days)",
        "slug": "saltlick-special-2-days-road-safari",
        "category": "SAFARI",
        "description": "Game drives at Taita Hills Sanctuary, overnight at Saltlick Lodge.",
        "destination": "Taita Hills",
        "duration_text": "2 days",
        "metadata": {"sheet_label": "ROAD SAFARI", "safari_type": "ROAD_SAFARI"},
        "prices": {"USD": 420, "EUR": 390, "GBP": 330},
    },
    {
        "name": "Tsavo East & West (2 Days)",
        "slug": "tsavo-east-west-2-days-road-safari",
        "category": "SAFARI",
        "description": "Visit both parks, game drives, Ngulia Lodge overnight.",
        "destination": "Tsavo East & Tsavo West",
        "duration_text": "2 days",
        "metadata": {"sheet_label": "ROAD SAFARI", "safari_type": "ROAD_SAFARI"},
        "prices": {"USD": 470, "EUR": 440, "GBP": 370},
    },
    {
        "name": "Tsavo East - Taita Hills (2 Days)",
        "slug": "tsavo-east-taita-hills-2-days-road-safari",
        "category": "SAFARI",
        "description": "Game drive Tsavo East, afternoon game drive Taita Hills, overnight Saltlick.",
        "destination": "Tsavo East & Taita Hills",
        "duration_text": "2 days",
        "metadata": {"sheet_label": "ROAD SAFARI", "safari_type": "ROAD_SAFARI"},
        "prices": {"USD": 440, "EUR": 410, "GBP": 350},
    },
    {
        "name": "Ngutuni - Taita Hills (2 Days)",
        "slug": "ngutuni-taita-hills-2-days-road-safari",
        "category": "SAFARI",
        "description": "Ngutuni Sanctuary game drive, Taita Hills Sanctuary, overnight Saltlick.",
        "destination": "Ngutuni & Taita Hills",
        "duration_text": "2 days",
        "metadata": {"sheet_label": "ROAD SAFARI", "safari_type": "ROAD_SAFARI"},
        "prices": {"USD": 440, "EUR": 410, "GBP": 350},
    },
    {
        "name": "Tsavo East - Taita Hills (3 Days)",
        "slug": "tsavo-east-taita-hills-3-days-road-safari",
        "category": "SAFARI",
        "description": "Tsavo East game drives, Voi Wildlife Lodge, Taita Hills Sanctuary.",
        "destination": "Tsavo East & Taita Hills",
        "duration_text": "3 days",
        "metadata": {"sheet_label": "ROAD SAFARI", "safari_type": "ROAD_SAFARI"},
        "prices": {"USD": 660, "EUR": 610, "GBP": 510},
    },
    {
        "name": "Tsavo East & West (3 Days)",
        "slug": "tsavo-east-west-3-days-road-safari",
        "category": "SAFARI",
        "description": "Game drives Tsavo East & West, visit Mzima Springs and Rhino Sanctuary.",
        "destination": "Tsavo East & Tsavo West",
        "duration_text": "3 days",
        "metadata": {"sheet_label": "ROAD SAFARI", "safari_type": "ROAD_SAFARI"},
        "prices": {"USD": 660, "EUR": 610, "GBP": 510},
    },
    {
        "name": "Tsavo / Amboseli (3 Days)",
        "slug": "tsavo-amboseli-3-days-road-safari",
        "category": "SAFARI",
        "description": "Visit Tsavo and Amboseli, view Mount Kilimanjaro.",
        "destination": "Tsavo & Amboseli",
        "duration_text": "3 days",
        "metadata": {"sheet_label": "ROAD SAFARI", "safari_type": "ROAD_SAFARI"},
        "prices": {"USD": 700, "EUR": 650, "GBP": 540},
    },
    {
        "name": "Tsavo East - Amboseli - Tsavo West (4 Days)",
        "slug": "tsavo-east-amboseli-tsavo-west-4-days",
        "category": "SAFARI",
        "description": "Big Five Safari, Tsavo East, Amboseli, Tsavo West, Mzima Springs.",
        "destination": "Tsavo East, Amboseli & Tsavo West",
        "duration_text": "4 days",
        "metadata": {"sheet_label": "ROAD SAFARI", "safari_type": "ROAD_SAFARI"},
        "prices": {"USD": 990, "EUR": 920, "GBP": 770},
    },
    {
        "name": "Maasai Mara (2 Days - Air Safari)",
        "slug": "maasai-mara-2-days-air-safari",
        "category": "SAFARI",
        "description": "Fly to Maasai Mara, Big Five experience.",
        "destination": "Maasai Mara",
        "duration_text": "2 days",
        "metadata": {"sheet_label": "AIR SAFARI", "safari_type": "AIR_SAFARI"},
        "prices": {"USD": 1015, "EUR": 970, "GBP": 890},
    },
    {
        "name": "Maasai Mara (3 Days - Air Safari) - Mara Timbo/Royal Mara/Governors Camp",
        "slug": "maasai-mara-3-days-air-safari-mara-timbo-royal-mara-governors",
        "category": "SAFARI",
        "description": "Stay at Mara Timbo, Royal Mara, or Governors Camp.",
        "destination": "Maasai Mara",
        "duration_text": "3 days",
        "metadata": {"sheet_label": "AIR SAFARI", "safari_type": "AIR_SAFARI", "camp_set": "MARA_TIMBO_ROYAL_MARA_GOVERNORS"},
        "prices": {"USD": 1495, "EUR": 1430, "GBP": 1110},
    },
    {
        "name": "Maasai Mara (3 Days - Air Safari) - Tipilikwani/Oloshakii/Fig Tree Camp",
        "slug": "maasai-mara-3-days-air-safari-tipilikwani-oloshakii-fig-tree",
        "category": "SAFARI",
        "description": "Stay at Tipilikwani, Oloshakii, or Fig Tree Camp.",
        "destination": "Maasai Mara",
        "duration_text": "3 days",
        "metadata": {"sheet_label": "AIR SAFARI", "safari_type": "AIR_SAFARI", "camp_set": "TIPILIKWANI_OLOSHAKII_FIG_TREE"},
        "prices": {"USD": 1495, "EUR": 1430, "GBP": 1110},
    },
]


def seed_sheet_products(apps, schema_editor):
    Product = apps.get_model("operations", "Product")
    ProductParticipantCategory = apps.get_model("operations", "ProductParticipantCategory")
    ProductPrice = apps.get_model("operations", "ProductPrice")

    for index, item in enumerate(SHEET_PRODUCTS, start=1):
        product, _ = Product.objects.get_or_create(
            slug=item["slug"],
            defaults={
                "product_code": f"SHEET-PRD-{index:03d}",
                "name": item["name"],
                "category": item["category"],
                "description": item["description"],
                "destination": item["destination"],
                "duration_text": item["duration_text"],
                "pricing_mode": "PER_PERSON",
                "default_currency": "KES",
                "booking_cutoff_minutes": 180,
                "metadata": {"seeded": True, **item["metadata"]},
            },
        )
        Product.objects.filter(pk=product.pk).update(
            name=item["name"],
            category=item["category"],
            description=item["description"],
            destination=item["destination"],
            duration_text=item["duration_text"],
            pricing_mode="PER_PERSON",
            default_currency="KES",
            booking_cutoff_minutes=180,
            metadata={"seeded": True, **item["metadata"]},
        )

        for code, label in [("ADULT", "Adult"), ("CHILD", "Child"), ("INFANT", "Infant")]:
            ProductParticipantCategory.objects.get_or_create(
                product_id=product.pk,
                code=code,
                defaults={"label": label},
            )

        for currency, amount in item["prices"].items():
            ProductPrice.objects.update_or_create(
                product_id=product.pk,
                participant_category=None,
                rate_name="STANDARD",
                currency=currency,
                defaults={
                    "amount": amount,
                    "is_active": True,
                    "metadata": {"seeded": True, "source": "sheet_image"},
                },
            )


class Migration(migrations.Migration):

    dependencies = [
        ("operations", "0013_package_excursion_product_and_multi_currency"),
    ]

    operations = [
        migrations.RunPython(seed_sheet_products, migrations.RunPython.noop),
    ]
