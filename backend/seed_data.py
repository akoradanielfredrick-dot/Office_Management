import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from accounts.models import Role, User

def seed_data():
    print("Seeding initial roles...")
    roles = [
        {'name': 'SUPER_ADMIN', 'description': 'Full access to all modules and system settings.'},
        {'name': 'DIRECTOR', 'description': 'Full operational and financial access.'},
        {'name': 'OPERATIONS', 'description': 'Manage bookings, itineraries, and suppliers.'},
        {'name': 'ACCOUNTS', 'description': 'Manage payments, receipts, expenses, and financial reports.'},
        {'name': 'SALES', 'description': 'Manage leads, quotations, and clients.'},
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
    
    admin_user = User.objects.filter(email=admin_email).first()
    if admin_user is None:
        User.objects.create_superuser(
            email=admin_email,
            password=admin_pass,
            full_name='System Administrator',
            role=role_objs['SUPER_ADMIN']
        )
        print(f"Created Super Admin: {admin_email} / {admin_pass}")
    else:
        admin_user.full_name = 'System Administrator'
        admin_user.role = role_objs['SUPER_ADMIN']
        admin_user.is_active = True
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.set_password(admin_pass)
        admin_user.save()
        print(f"Updated Super Admin credentials for: {admin_email}")

    print("\nSeeding complete!")

if __name__ == "__main__":
    seed_data()
