from rest_framework import permissions, viewsets
from common.models import ActivityLog

from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.filter(is_deleted=False).order_by("-created_at")
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["id"]
    search_fields = ["full_name", "email", "phone"]

    def perform_create(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Created Client: {instance.full_name}",
            table_name="Client",
            record_id=instance.id,
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Updated Client: {instance.full_name}",
            table_name="Client",
            record_id=instance.id,
        )

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted", "updated_at"])
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Soft Deleted Client: {instance.full_name}",
            table_name="Client",
            record_id=instance.id,
        )
