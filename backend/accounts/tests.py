from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse

from .forms import SuperAdminAdminAuthenticationForm
from .middleware import ADMIN_REAUTH_SESSION_KEY
from .models import Role


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
        self.assertEqual(response.status_code, 200)

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
        self.assertFalse(form.is_valid())
        self.assertIn("ONLY ACCESSIBLE BY SUPER ADMIN.", form.non_field_errors())

    def test_admin_login_page_shows_warning_for_non_super_admin(self):
        response = self.client.post(
            reverse("admin:login"),
            {"username": self.director.email, "password": self.director_password},
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "ONLY ACCESSIBLE BY SUPER ADMIN.")

    def test_admin_login_page_allows_super_admin(self):
        response = self.client.post(
            reverse("admin:login"),
            {"username": self.super_admin.email, "password": self.super_admin_password},
        )
        self.assertEqual(response.status_code, 302)

    def test_admin_index_redirects_non_super_admin_to_login(self):
        self.client.force_login(self.director)
        response = self.client.get("/admin/")
        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("admin:login"), response.url)
        session = self.client.session
        self.assertIsNone(session.get(ADMIN_REAUTH_SESSION_KEY))

    def test_invalid_password_keeps_admin_locked(self):
        self.client.force_login(self.super_admin)
        response = self.client.post(
            reverse("admin-access-confirm"),
            {"password": "wrong-password", "next": "/admin/"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Incorrect password")
