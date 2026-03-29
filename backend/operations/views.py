from rest_framework import viewsets, status, response, permissions
from .models import Booking, Supplier
from .serializers import BookingSerializer, SupplierSerializer
from common.models import ActivityLog

class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.filter(is_deleted=False).order_by('-created_at')
    serializer_class = BookingSerializer
    filterset_fields = ['id', 'quotation', 'client', 'status']
    search_fields = ['reference_no', 'client__full_name', 'destination_package']

    def perform_create(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Created Booking: {instance.reference_no}",
            table_name="Booking",
            record_id=instance.id
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Updated Booking: {instance.reference_no}",
            table_name="Booking",
            record_id=instance.id
        )


class SupplierViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Supplier.objects.filter(is_deleted=False).order_by('name')
    serializer_class = SupplierSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['id', 'category']
    search_fields = ['name', 'category', 'contact_person', 'email', 'phone']
