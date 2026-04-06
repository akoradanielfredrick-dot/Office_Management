from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role, User
from clients.models import Client


class ClientApiTests(APITestCase):
    def setUp(self):
        self.role = Role.objects.create(name="DIRECTOR")
        self.user = User.objects.create_user(
            email="clients@example.com",
            password="testpass123",
            full_name="Client Manager",
            role=self.role,
            is_staff=True,
        )
        self.client.force_authenticate(user=self.user)

    def test_client_list_returns_saved_clients(self):
        saved_client = Client.objects.create(
            full_name="Jane Wanjiku",
            email="jane@example.com",
            phone="+254700000001",
        )

        response = self.client.get(reverse("client-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]["id"]), str(saved_client.id))
        self.assertEqual(response.data[0]["full_name"], "Jane Wanjiku")

    def test_client_create_persists_record(self):
        response = self.client.post(
            reverse("client-list"),
            {
                "full_name": "Acacia Holdings",
                "email": "accounts@acacia.test",
                "phone": "+254700000002",
                "address": "Diani Beach Road",
                "notes": "Corporate account",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Client.objects.filter(full_name="Acacia Holdings").exists())

    def test_client_search_filters_results(self):
        Client.objects.create(full_name="Jane Wanjiku", email="jane@example.com")
        Client.objects.create(full_name="Mark Otieno", email="mark@example.com")

        response = self.client.get(reverse("client-list"), {"search": "Jane"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["full_name"], "Jane Wanjiku")
