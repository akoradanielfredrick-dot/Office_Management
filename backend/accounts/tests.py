from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse

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
        session = self.client.session
        self.assertTrue(session.get(ADMIN_REAUTH_SESSION_KEY))

    def test_invalid_password_keeps_admin_locked(self):
        response = self.client.post(
            reverse("admin-access-confirm"),
            {"password": "wrong-password", "next": "/admin/"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Incorrect password")
