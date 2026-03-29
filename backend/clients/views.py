from rest_framework import permissions, viewsets

from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Client.objects.filter(is_deleted=False).order_by("-created_at")
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["id"]
    search_fields = ["full_name", "email", "phone"]
