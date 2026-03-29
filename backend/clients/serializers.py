from rest_framework import serializers

from .models import Client, ClientContact


class ClientContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientContact
        fields = ["id", "name", "role", "phone", "email", "created_at"]


class ClientSerializer(serializers.ModelSerializer):
    contacts = ClientContactSerializer(many=True, read_only=True)

    class Meta:
        model = Client
        fields = [
            "id",
            "full_name",
            "email",
            "phone",
            "address",
            "notes",
            "created_at",
            "updated_at",
            "contacts",
        ]
