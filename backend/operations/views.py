from rest_framework import permissions, viewsets
from .models import Booking, Excursion, Package, Supplier
from .serializers import BookingSerializer, ExcursionSerializer, PackageSerializer, SupplierSerializer
from common.models import ActivityLog
from accounts.permissions import IsOperationsUser

class PackageViewSet(viewsets.ModelViewSet):
    queryset = Package.objects.filter(is_deleted=False).order_by('name')
    serializer_class = PackageSerializer
    permission_classes = [IsOperationsUser]
    filterset_fields = ['id', 'package_type']
    search_fields = ['name', 'itinerary']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsOperationsUser()]

    def perform_create(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Created Package: {instance.name}",
            table_name="Package",
            record_id=instance.id
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Updated Package: {instance.name}",
            table_name="Package",
            record_id=instance.id
        )

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Soft Deleted Package: {instance.name}",
            table_name="Package",
            record_id=instance.id
        )

class ExcursionViewSet(viewsets.ModelViewSet):
    queryset = Excursion.objects.filter(is_deleted=False).order_by('name')
    serializer_class = ExcursionSerializer
    permission_classes = [IsOperationsUser]
    filterset_fields = ['id', 'location']
    search_fields = ['name', 'location', 'itinerary']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsOperationsUser()]

    def perform_create(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Created Excursion: {instance.name}",
            table_name="Excursion",
            record_id=instance.id
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Updated Excursion: {instance.name}",
            table_name="Excursion",
            record_id=instance.id
        )

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Soft Deleted Excursion: {instance.name}",
            table_name="Excursion",
            record_id=instance.id
        )

class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.filter(is_deleted=False).order_by('-created_at')
    serializer_class = BookingSerializer
    permission_classes = [IsOperationsUser]
    filterset_fields = ['id', 'client', 'status']
    search_fields = ['reference_no', 'client__full_name', 'destination_package', 'package_name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'create', 'update', 'partial_update']:
            return [permissions.IsAuthenticated()]
        return [IsOperationsUser()]

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


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.filter(is_deleted=False).order_by('name')
    serializer_class = SupplierSerializer
    permission_classes = [IsOperationsUser]
    filterset_fields = ['id', 'category']
    search_fields = ['name', 'category', 'contact_person', 'email', 'phone', 'address']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsOperationsUser()]

    def perform_create(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Created Supplier: {instance.name}",
            table_name="Supplier",
            record_id=instance.id
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Updated Supplier: {instance.name}",
            table_name="Supplier",
            record_id=instance.id
        )

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Soft Deleted Supplier: {instance.name}",
            table_name="Supplier",
            record_id=instance.id
        )
