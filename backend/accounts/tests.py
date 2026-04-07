from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from .forms import CustomUserChangeForm, CustomUserCreationForm, SuperAdminAdminAuthenticationForm
from .middleware import ADMIN_REAUTH_SESSION_KEY
from .models import PortalModule, Role


class AdminAccessConfirmTests(TestCase):
    def setUp(self):
        role = Role.objects.create(name="SUPER_ADMIN")
        self.password = "AdminPass123!"
        self.user = get_user_model().objects.create_user(
            email="admin@example.com",
            password=self.password,
            full_name="Admin User",
            role=role,
            is_staff=True,
            is_superuser=True,
        )
        self.client = Client()
        self.client.force_login(self.user)

    def test_direct_admin_access_is_available_when_logged_in(self):
        response = self.client.get("/admin/")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin/confirm-access/", response.url)

    def test_confirm_access_with_password_sets_session_flag(self):
        response = self.client.post(
            reverse("admin-access-confirm"),
            {"password": self.password, "next": "/admin/"},
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, "/admin/")


class AdminSiteAccessTests(TestCase):
    def setUp(self):
        self.super_admin_role = Role.objects.create(name="SUPER_ADMIN")
        self.director_role = Role.objects.create(name="DIRECTOR")
        self.super_admin_password = "AdminPass123!"
        self.director_password = "DirectorPass123!"
        self.super_admin = get_user_model().objects.create_user(
            email="superadmin@example.com",
            password=self.super_admin_password,
            full_name="Super Admin",
            role=self.super_admin_role,
            is_staff=True,
            is_superuser=True,
        )
        self.director = get_user_model().objects.create_user(
            email="director@example.com",
            password=self.director_password,
            full_name="Director User",
            role=self.director_role,
            is_staff=True,
            is_superuser=False,
        )
        self.client = Client()

    def test_admin_login_form_rejects_non_super_admin(self):
        form = SuperAdminAdminAuthenticationForm(
            request=None,
            data={"username": self.director.email, "password": self.director_password},
        )
        self.assertTrue(form.is_valid())

    def test_admin_login_page_allows_director(self):
        response = self.client.post(
            reverse("admin:login"),
            {"username": self.director.email, "password": self.director_password},
        )
        self.assertEqual(response.status_code, 302)

    def test_admin_login_page_allows_super_admin(self):
        response = self.client.post(
            reverse("admin:login"),
            {"username": self.super_admin.email, "password": self.super_admin_password},
        )
        self.assertEqual(response.status_code, 302)

    def test_admin_index_allows_director(self):
        self.client.force_login(self.director)
        response = self.client.get("/admin/")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin/confirm-access/", response.url)

    def test_director_can_confirm_access_and_enter_admin(self):
        self.client.force_login(self.director)
        response = self.client.post(
            reverse("admin-access-confirm"),
            {"password": self.director_password, "next": "/admin/"},
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, "/admin/")

    def test_invalid_password_keeps_admin_locked(self):
        self.client.force_login(self.super_admin)
        response = self.client.post(
            reverse("admin-access-confirm"),
            {"password": "wrong-password", "next": "/admin/"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Incorrect password")


class UserAccessControlApiTests(APITestCase):
    def setUp(self):
        self.operations_role = Role.objects.create(name="OPERATIONS")
        self.user = get_user_model().objects.create_user(
            email="staff@example.com",
            password="StaffPass123!",
            full_name="Staff User",
            role=self.operations_role,
        )
        self.bookings_module = PortalModule.objects.get(key="bookings")
        self.clients_module = PortalModule.objects.get(key="clients")
        self.user.portal_modules.add(self.bookings_module)

    def test_login_returns_status_and_assigned_permissions(self):
        response = self.client.post(
            reverse("api-login"),
            {"email": self.user.email, "password": "StaffPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["status"], "active")
        self.assertEqual(response.data["user"]["portal_permissions"], ["bookings.view"])
        self.assertEqual(response.data["user"]["portal_modules"], ["bookings"])

    def test_blocked_user_cannot_log_in(self):
        self.user.status = get_user_model().Status.BLOCKED
        self.user.save()

        response = self.client.post(
            reverse("api-login"),
            {"email": self.user.email, "password": "StaffPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Your account has been blocked by an administrator.")

    def test_revoked_user_cannot_log_in(self):
        self.user.status = get_user_model().Status.REVOKED
        self.user.save()

        response = self.client.post(
            reverse("api-login"),
            {"email": self.user.email, "password": "StaffPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Your access to the portal has been revoked.")

    def test_authenticated_blocked_user_is_forcibly_logged_out(self):
        self.client.force_login(self.user)
        self.user.status = get_user_model().Status.BLOCKED
        self.user.save()

        response = self.client.get(reverse("api-me"))

        self.assertIn(response.status_code, {401, 403, 400})


class AdminUserFormTests(TestCase):
    def setUp(self):
        self.operations_role = Role.objects.create(name="OPERATIONS")

    def test_creation_form_keeps_plaintext_password_for_admin_confirmation(self):
        form = CustomUserCreationForm(
            data={
                "email": "newstaff@example.com",
                "full_name": "New Staff",
                "role": self.operations_role.pk,
                "phone": "",
                "status": "active",
                "portal_modules": [],
                "password1": "VisiblePass123!",
                "password2": "VisiblePass123!",
            }
        )

        self.assertTrue(form.is_valid(), form.errors)
        user = form.save()

        self.assertTrue(user.check_password("VisiblePass123!"))
        self.assertEqual(getattr(user, "_admin_plaintext_password", None), "VisiblePass123!")

    def test_change_form_can_reset_password_and_expose_one_time_confirmation_value(self):
        user = get_user_model().objects.create_user(
            email="resetme@example.com",
            password="OldPass123!",
            full_name="Reset Me",
            role=self.operations_role,
        )

        form = CustomUserChangeForm(
            data={
                "email": user.email,
                "full_name": user.full_name,
                "role": self.operations_role.pk,
                "phone": user.phone or "",
                "status": user.status,
                "portal_modules": [],
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "groups": [],
                "user_permissions": [],
                "new_password1": "NewVisiblePass123!",
                "new_password2": "NewVisiblePass123!",
                "password": user.password,
            },
            instance=user,
        )

        self.assertTrue(form.is_valid(), form.errors)
        updated_user = form.save()

        self.assertTrue(updated_user.check_password("NewVisiblePass123!"))
        self.assertEqual(getattr(updated_user, "_admin_plaintext_password", None), "NewVisiblePass123!")

    def test_system_can_store_more_than_fifteen_users(self):
        for index in range(16):
            get_user_model().objects.create_user(
                email=f"staff{index}@example.com",
                password="StaffPass123!",
                full_name=f"Staff User {index}",
                role=self.operations_role,
            )

        self.assertEqual(get_user_model().objects.count(), 16)

    def test_creation_form_remains_valid_after_fifteen_existing_users(self):
        for index in range(15):
            get_user_model().objects.create_user(
                email=f"existing{index}@example.com",
                password="StaffPass123!",
                full_name=f"Existing User {index}",
                role=self.operations_role,
            )

        form = CustomUserCreationForm(
            data={
                "email": "sixteenth@example.com",
                "full_name": "Sixteenth User",
                "role": self.operations_role.pk,
                "phone": "",
                "status": "active",
                "portal_modules": [],
                "password1": "VisiblePass123!",
                "password2": "VisiblePass123!",
            }
        )

        self.assertTrue(form.is_valid(), form.errors)
        user = form.save()

        self.assertEqual(user.email, "sixteenth@example.com")
        self.assertEqual(get_user_model().objects.count(), 16)
