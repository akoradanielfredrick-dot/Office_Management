from rest_framework import serializers

from .models import User


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class CurrentUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    portal_permissions = serializers.SerializerMethodField()
    portal_modules = serializers.SerializerMethodField()
    is_management = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "phone",
            "role",
            "status",
            "portal_permissions",
            "portal_modules",
            "is_management",
        )

    def get_role(self, obj):
        return obj.role_name or None

    def get_portal_permissions(self, obj):
        return obj.get_portal_permission_keys()

    def get_portal_modules(self, obj):
        return obj.get_portal_modules()

    def get_is_management(self, obj):
        return obj.is_management
