import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from accounts.models import Role, User
from operations.models import Product, ProductParticipantCategory, ProductPrice, ProductSchedule
from django.utils import timezone
from datetime import timedelta

def seed_data():
    print("Seeding initial roles...")
    roles = [
        {'name': 'SUPER_ADMIN', 'description': 'Full access to all modules and system settings.'},
        {'name': 'DIRECTOR', 'description': 'Full operational and financial access.'},
        {'name': 'OPERATIONS', 'description': 'Manage bookings, itineraries, and suppliers.'},
        {'name': 'ACCOUNTS', 'description': 'Manage payments, receipts, expenses, and financial reports.'},
    ]

    role_objs = {}
    for role_data in roles:
        role, created = Role.objects.get_or_create(
            name=role_data['name'],
            defaults={'description': role_data['description']}
        )
        role_objs[role.name] = role
        if created:
            print(f"Created role: {role.name}")
        else:
            print(f"Role already exists: {role.name}")

    print("\nSeeding initial users...")
    admin_email = 'admin@company.com'
    admin_pass = 'AdminPass123!'
    
    if not User.objects.filter(email=admin_email).exists():
        User.objects.create_superuser(
            email=admin_email,
            password=admin_pass,
            full_name='System Administrator',
            role=role_objs['SUPER_ADMIN']
        )
        print(f"Created Super Admin: {admin_email} / {admin_pass}")
    else:
        print(f"Super Admin already exists: {admin_email}")

    print("\nSeeding structured products, prices, and schedules...")
    demo_products = [
        {
            'name': '1/2 Day Mombasa City Tour',
            'slug': 'half-day-mombasa-city-tour',
            'category': Product.Category.EXCURSION,
            'description': 'Visit Old Town, Fort Jesus and Wood Carvers Village.',
            'destination': 'Mombasa',
            'duration_text': '1/2 day',
            'pricing_mode': Product.PricingMode.PER_PERSON,
            'metadata': {'sheet_label': 'EXCURSIONS', 'tour_type': 'CITY_TOUR'},
            'prices': {'USD': 70, 'EUR': 60, 'GBP': 50},
        },
        {
            'name': '1 Day Mombasa City Tour',
            'slug': 'one-day-mombasa-city-tour',
            'category': Product.Category.EXCURSION,
            'description': 'Old Town, Fort Jesus, Wood Carvers Village, Haller Park/Bamburi Nature Trail, lunch included.',
            'destination': 'Mombasa',
            'duration_text': '1 day',
            'pricing_mode': Product.PricingMode.PER_PERSON,
            'metadata': {'sheet_label': 'EXCURSIONS', 'tour_type': 'CITY_TOUR'},
            'prices': {'USD': 120, 'EUR': 110, 'GBP': 95},
        },
        {
            'name': 'Shimba Hills (1 Day)',
            'slug': 'shimba-hills-1-day',
            'category': Product.Category.EXCURSION,
            'description': 'Visit tropical forest, see sable antelopes, elephants, Sheldrick Waterfalls, lunch at Shimba Hills Lodge.',
            'destination': 'Shimba Hills',
            'duration_text': '1 day',
            'pricing_mode': Product.PricingMode.PER_PERSON,
            'metadata': {'sheet_label': 'EXCURSIONS', 'tour_type': 'NATURE_EXCURSION'},
            'prices': {'USD': 155, 'EUR': 145, 'GBP': 120},
        },
        {
            'name': 'Tsavo East (1 Day)',
            'slug': 'tsavo-east-1-day-road-safari',
            'category': Product.Category.SAFARI,
            'description': 'Game drive in Tsavo East, see red elephants, lions, buffalo, antelopes.',
            'destination': 'Tsavo East',
            'duration_text': '1 day',
            'pricing_mode': Product.PricingMode.PER_PERSON,
            'metadata': {'sheet_label': 'ROAD SAFARI', 'safari_type': 'ROAD_SAFARI'},
            'prices': {'USD': 190, 'EUR': 180, 'GBP': 150},
        },
        {
            'name': 'Tsavo East (2 Days)',
            'slug': 'tsavo-east-2-days-road-safari',
            'category': Product.Category.SAFARI,
            'description': 'Visit Aruba Dam, see hippos, elephants, birds, overnight at lodge/camp.',
            'destination': 'Tsavo East',
            'duration_text': '2 days',
            'pricing_mode': Product.PricingMode.PER_PERSON,
            'metadata': {'sheet_label': 'ROAD SAFARI', 'safari_type': 'ROAD_SAFARI'},
            'prices': {'USD': 380, 'EUR': 350, 'GBP': 295},
        },
        {
            'name': 'Saltlick Special (2 Days)',
            'slug': 'saltlick-special-2-days-road-safari',
            'category': Product.Category.SAFARI,
            'description': 'Game drives at Taita Hills Sanctuary, overnight at Saltlick Lodge.',
            'destination': 'Taita Hills',
            'duration_text': '2 days',
            'pricing_mode': Product.PricingMode.PER_PERSON,
            'metadata': {'sheet_label': 'ROAD SAFARI', 'safari_type': 'ROAD_SAFARI'},
            'prices': {'USD': 420, 'EUR': 390, 'GBP': 330},
        },
        {
            'name': 'Tsavo East & West (2 Days)',
            'slug': 'tsavo-east-west-2-days-road-safari',
            'category': Product.Category.SAFARI,
            'description': 'Visit both parks, game drives, Ngulia Lodge overnight.',
            'destination': 'Tsavo East & Tsavo West',
            'duration_text': '2 days',
            'pricing_mode': Product.PricingMode.PER_PERSON,
            'metadata': {'sheet_label': 'ROAD SAFARI', 'safari_type': 'ROAD_SAFARI'},
            'prices': {'USD': 470, 'EUR': 440, 'GBP': 370},
        },
        {
            'name': 'Tsavo East - Taita Hills (2 Days)',
            'slug': 'tsavo-east-taita-hills-2-days-road-safari',
            'category': Product.Category.SAFARI,
            'description': 'Game drive Tsavo East, afternoon game drive Taita Hills, overnight Saltlick.',
            'destination': 'Tsavo East & Taita Hills',
            'duration_text': '2 days',
            'pricing_mode': Product.PricingMode.PER_PERSON,
            'metadata': {'sheet_label': 'ROAD SAFARI', 'safari_type': 'ROAD_SAFARI'},
            'prices': {'USD': 440, 'EUR': 410, 'GBP': 350},
        },
        {
            'name': 'Ngutuni - Taita Hills (2 Days)',
            'slug': 'ngutuni-taita-hills-2-days-road-safari',
            'category': Product.Category.SAFARI,
            'description': 'Ngutuni Sanctuary game drive, Taita Hills Sanctuary, overnight Saltlick.',
            'destination': 'Ngutuni & Taita Hills',
            'duration_text': '2 days',
            'pricing_mode': Product.PricingMode.PER_PERSON,
            'metadata': {'sheet_label': 'ROAD SAFARI', 'safari_type': 'ROAD_SAFARI'},
            'prices': {'USD': 440, 'EUR': 410, 'GBP': 350},
        },
        {
            'name': 'Tsavo East - Taita Hills (3 Days)',
            'slug': 'tsavo-east-taita-hills-3-days-road-safari',
            'category': Product.Category.SAFARI,
            'description': 'Tsavo East game drives, Voi Wildlife Lodge, Taita Hills Sanctuary.',
            'destination': 'Tsavo East & Taita Hills',
            'duration_text': '3 days',
            'pricing_mode': Product.PricingMode.PER_PERSON,
            'metadata': {'sheet_label': 'ROAD SAFARI', 'safari_type': 'ROAD_SAFARI'},
            'prices': {'USD': 660, 'EUR': 610, 'GBP': 510},
        },
        {
            'name': 'Tsavo East & West (3 Days)',
            'slug': 'tsavo-east-west-3-days-road-safari',
            'category': Product.Category.SAFARI,
            'description': 'Game drives Tsavo East & West, visit Mzima Springs and Rhino Sanctuary.',
            'destination': 'Tsavo East & Tsavo West',
            'duration_text': '3 days',
            'pricing_mode': Product.PricingMode.PER_PERSON,
            'metadata': {'sheet_label': 'ROAD SAFARI', 'safari_type': 'ROAD_SAFARI'},
            'prices': {'USD': 660, 'EUR': 610, 'GBP': 510},
        },
        {
            'name': 'Tsavo / Amboseli (3 Days)',
            'slug': 'tsavo-amboseli-3-days-road-safari',
            'category': Product.Category.SAFARI,
            'description': 'Visit Tsavo and Amboseli, view Mount Kilimanjaro.',
            'destination': 'Tsavo & Amboseli',
            'duration_text': '3 days',
            'pricing_mode': Product.PricingMode.PER_PERSON,
            'metadata': {'sheet_label': 'ROAD SAFARI', 'safari_type': 'ROAD_SAFARI'},
            'prices': {'USD': 700, 'EUR': 650, 'GBP': 540},
        },
        {
            'name': 'Tsavo East - Amboseli - Tsavo West (4 Days)',
            'slug': 'tsavo-east-amboseli-tsavo-west-4-days',
            'category': Product.Category.SAFARI,
            'description': 'Big Five Safari, Tsavo East, Amboseli, Tsavo West, Mzima Springs.',
            'destination': 'Tsavo East, Amboseli & Tsavo West',
            'duration_text': '4 days',
            'pricing_mode': Product.PricingMode.PER_PERSON,
            'metadata': {'sheet_label': 'ROAD SAFARI', 'safari_type': 'ROAD_SAFARI'},
            'prices': {'USD': 990, 'EUR': 920, 'GBP': 770},
        },
        {
            'name': 'Maasai Mara (2 Days - Air Safari)',
            'slug': 'maasai-mara-2-days-air-safari',
            'category': Product.Category.SAFARI,
            'description': 'Fly to Maasai Mara, Big Five experience.',
            'destination': 'Maasai Mara',
            'duration_text': '2 days',
            'pricing_mode': Product.PricingMode.PER_PERSON,
            'metadata': {'sheet_label': 'AIR SAFARI', 'safari_type': 'AIR_SAFARI'},
            'prices': {'USD': 1015, 'EUR': 970, 'GBP': 890},
        },
        {
            'name': 'Maasai Mara (3 Days - Air Safari) - Mara Timbo/Royal Mara/Governors Camp',
            'slug': 'maasai-mara-3-days-air-safari-mara-timbo-royal-mara-governors',
            'category': Product.Category.SAFARI,
            'description': 'Stay at Mara Timbo, Royal Mara, or Governors Camp.',
            'destination': 'Maasai Mara',
            'duration_text': '3 days',
            'pricing_mode': Product.PricingMode.PER_PERSON,
            'metadata': {'sheet_label': 'AIR SAFARI', 'safari_type': 'AIR_SAFARI', 'camp_set': 'MARA_TIMBO_ROYAL_MARA_GOVERNORS'},
            'prices': {'USD': 1495, 'EUR': 1430, 'GBP': 1110},
        },
        {
            'name': 'Maasai Mara (3 Days - Air Safari) - Tipilikwani/Oloshakii/Fig Tree Camp',
            'slug': 'maasai-mara-3-days-air-safari-tipilikwani-oloshakii-fig-tree',
            'category': Product.Category.SAFARI,
            'description': 'Stay at Tipilikwani, Oloshakii, or Fig Tree Camp.',
            'destination': 'Maasai Mara',
            'duration_text': '3 days',
            'pricing_mode': Product.PricingMode.PER_PERSON,
            'metadata': {'sheet_label': 'AIR SAFARI', 'safari_type': 'AIR_SAFARI', 'camp_set': 'TIPILIKWANI_OLOSHAKII_FIG_TREE'},
            'prices': {'USD': 1495, 'EUR': 1430, 'GBP': 1110},
        },
    ]

    for item in demo_products:
        product, _ = Product.objects.get_or_create(
            slug=item['slug'],
            defaults={
                'name': item['name'],
                'category': item['category'],
                'description': item['description'],
                'destination': item['destination'],
                'duration_text': item['duration_text'],
                'pricing_mode': item.get('pricing_mode', Product.PricingMode.PER_PERSON),
                'default_currency': 'KES',
                'booking_cutoff_minutes': 180,
                'metadata': {'seeded': True, **item.get('metadata', {})},
            }
        )
        product.description = item['description']
        product.destination = item['destination']
        product.duration_text = item['duration_text']
        product.category = item['category']
        product.pricing_mode = item.get('pricing_mode', Product.PricingMode.PER_PERSON)
        product.metadata = {'seeded': True, **item.get('metadata', {})}
        product.save()
        for code, label in [
            (ProductParticipantCategory.Code.ADULT, 'Adult'),
            (ProductParticipantCategory.Code.CHILD, 'Child'),
            (ProductParticipantCategory.Code.INFANT, 'Infant'),
        ]:
            ProductParticipantCategory.objects.get_or_create(
                product=product,
                code=code,
                defaults={'label': label},
            )

        for currency, amount in item.get('prices', {}).items():
            ProductPrice.objects.update_or_create(
                product=product,
                participant_category=None,
                rate_name='STANDARD',
                currency=currency,
                defaults={
                    'amount': amount,
                    'is_active': True,
                    'metadata': {'seeded': True, 'source': 'package_sheet'},
                }
            )

        if not product.schedules.exists():
            start_at = timezone.now() + timedelta(days=7 if 'Safari' in product.name or 'Tsavo' in product.name or 'Mara' in product.name else 3)
            schedule = ProductSchedule.objects.create(
                product=product,
                title=f"{product.name} Demo Departure",
                schedule_type=ProductSchedule.ScheduleType.TIME_POINT,
                start_at=start_at,
                end_at=start_at + timedelta(hours=10 if item['category'] == Product.Category.SAFARI else 4),
                timezone='Africa/Nairobi',
                total_capacity=12,
                remaining_capacity=12,
                metadata={'seeded': True},
            )
            for category in product.participant_categories.all():
                schedule.category_availability.get_or_create(
                    participant_category=category,
                    defaults={
                        'total_capacity': 12 if category.code != ProductParticipantCategory.Code.INFANT else 4,
                        'remaining_capacity': 12 if category.code != ProductParticipantCategory.Code.INFANT else 4,
                    }
                )

    print("\nSeeding complete!")

if __name__ == "__main__":
    seed_data()
