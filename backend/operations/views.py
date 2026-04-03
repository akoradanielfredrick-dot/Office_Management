from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import decorators, permissions, response, status, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter

from accounts.permissions import IsOperationsUser
from common.models import ActivityLog

from .filters import BookingFilter, ProductScheduleFilter, ReservationFilter
from .models import ApiIdempotencyRecord, Booking, Excursion, ExternalProductMapping, InboundBookingPayload, Package, Product, ProductSchedule, Reservation, Supplier
from .pagination import OperationsPageNumberPagination
from .serializers import (
    ApiIdempotencyRecordSerializer,
    BookingSerializer,
    ExcursionSerializer,
    ExternalProductMappingSerializer,
    InboundBookingPayloadProcessSerializer,
    InboundBookingPayloadSerializer,
    PackageSerializer,
    ProductScheduleSerializer,
    ProductSerializer,
    ReservationSerializer,
    SupplierSerializer,
)
from .services import amend_booking, cancel_booking, cancel_reservation, convert_reservation_to_booking, expire_stale_reservations


class PackageViewSet(viewsets.ModelViewSet):
    queryset = Package.objects.filter(is_deleted=False).select_related("product").order_by("name")
    serializer_class = PackageSerializer
    permission_classes = [IsOperationsUser]
    filterset_fields = ["id", "package_type"]
    search_fields = ["name", "product__name", "itinerary"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated()]
        return [IsOperationsUser()]

    def perform_create(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Created Package: {instance.name}",
            table_name="Package",
            record_id=instance.id,
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Updated Package: {instance.name}",
            table_name="Package",
            record_id=instance.id,
        )

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Soft Deleted Package: {instance.name}",
            table_name="Package",
            record_id=instance.id,
        )


class ExcursionViewSet(viewsets.ModelViewSet):
    queryset = Excursion.objects.filter(is_deleted=False).select_related("product").order_by("name")
    serializer_class = ExcursionSerializer
    permission_classes = [IsOperationsUser]
    filterset_fields = ["id", "location"]
    search_fields = ["name", "product__name", "location", "itinerary"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated()]
        return [IsOperationsUser()]

    def perform_create(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Created Excursion: {instance.name}",
            table_name="Excursion",
            record_id=instance.id,
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Updated Excursion: {instance.name}",
            table_name="Excursion",
            record_id=instance.id,
        )

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Soft Deleted Excursion: {instance.name}",
            table_name="Excursion",
            record_id=instance.id,
        )


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.prefetch_related("participant_categories", "prices", "external_mappings").order_by("name")
    serializer_class = ProductSerializer
    permission_classes = [IsOperationsUser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["id", "category", "is_active", "pricing_mode", "slug"]
    search_fields = ["name", "product_code", "destination", "slug", "description"]
    ordering_fields = ["name", "product_code", "created_at", "updated_at"]
    ordering = ["name"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated()]
        return [IsOperationsUser()]

    def perform_create(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Created Product: {instance.product_code}",
            table_name="Product",
            record_id=instance.id,
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Updated Product: {instance.product_code}",
            table_name="Product",
            record_id=instance.id,
        )


class ProductScheduleViewSet(viewsets.ModelViewSet):
    queryset = ProductSchedule.objects.select_related("product").prefetch_related("category_availability__participant_category").order_by("start_at", "created_at")
    serializer_class = ProductScheduleSerializer
    permission_classes = [IsOperationsUser]
    pagination_class = OperationsPageNumberPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProductScheduleFilter
    search_fields = ["schedule_code", "title", "product__name", "guide_assignment", "vehicle_assignment"]
    ordering_fields = ["start_at", "created_at", "remaining_capacity", "total_capacity"]
    ordering = ["start_at", "created_at"]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "availability"]:
            return [permissions.IsAuthenticated()]
        return [IsOperationsUser()]

    def perform_create(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Created Schedule: {instance.schedule_code}",
            table_name="ProductSchedule",
            record_id=instance.id,
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Updated Schedule: {instance.schedule_code}",
            table_name="ProductSchedule",
            record_id=instance.id,
        )

    @decorators.action(detail=True, methods=["get"])
    def availability(self, request, pk=None):
        schedule = self.get_object()
        expire_stale_reservations(schedule=schedule, user=request.user if request.user.is_authenticated else None)
        schedule.refresh_from_db()
        requested_quantity = int(request.query_params.get("quantity", "0") or 0)
        category_code = request.query_params.get("category_code")
        category_bucket = None
        if category_code:
            category_bucket = schedule.category_availability.filter(participant_category__code=category_code).first()

        can_sell = schedule.remaining_capacity > 0
        if requested_quantity > 0:
            can_sell = requested_quantity <= schedule.remaining_capacity
            if category_bucket:
                can_sell = can_sell and requested_quantity <= category_bucket.remaining_capacity

        return response.Response(
            {
                "schedule_id": str(schedule.id),
                "schedule_code": schedule.schedule_code,
                "product_id": str(schedule.product_id),
                "product_name": schedule.product.name,
                "status": schedule.status,
                "remaining_capacity": schedule.remaining_capacity,
                "reserved_count": schedule.reserved_count,
                "confirmed_count": schedule.confirmed_count,
                "cancelled_count": schedule.cancelled_count,
                "released_count": schedule.released_count,
                "is_available": schedule.status == ProductSchedule.Status.AVAILABLE and schedule.remaining_capacity > 0,
                "requested_quantity": requested_quantity,
                "can_sell_requested_quantity": can_sell,
                "category": None if not category_bucket else {
                    "code": category_bucket.participant_category.code,
                    "remaining_capacity": category_bucket.remaining_capacity,
                },
            }
        )


class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.select_related("product", "schedule", "client").prefetch_related("participants").order_by("-created_at")
    serializer_class = ReservationSerializer
    permission_classes = [IsOperationsUser]
    pagination_class = OperationsPageNumberPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ReservationFilter
    search_fields = ["reference_no", "customer_full_name", "customer_email", "customer_phone"]
    ordering_fields = ["created_at", "hold_expires_at"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "create", "convert_to_booking", "cancel"]:
            return [permissions.IsAuthenticated()]
        return [IsOperationsUser()]

    @decorators.action(detail=True, methods=["post"])
    def convert_to_booking(self, request, pk=None):
        try:
            booking = convert_reservation_to_booking(
                reservation_id=pk,
                booking_data=request.data,
                user=request.user,
            )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return response.Response(BookingSerializer(booking, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @decorators.action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        try:
            reservation = cancel_reservation(
                reservation_id=pk,
                reason=request.data.get("reason", ""),
                cancelled_by_type=request.data.get("cancelled_by_type", Reservation.CancelledBy.ADMIN),
                user=request.user,
            )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return response.Response(self.get_serializer(reservation).data)


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.filter(is_deleted=False).select_related("client", "product", "schedule", "reservation").prefetch_related("travellers", "participant_quantities", "audit_entries").order_by("-created_at")
    serializer_class = BookingSerializer
    permission_classes = [IsOperationsUser]
    pagination_class = OperationsPageNumberPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = BookingFilter
    search_fields = ["reference_no", "client__full_name", "destination_package", "package_name", "customer_full_name"]
    ordering_fields = ["created_at", "travel_date", "start_date", "total_cost"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "create", "update", "partial_update", "cancel", "amend"]:
            return [permissions.IsAuthenticated()]
        return [IsOperationsUser()]

    def perform_update(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Updated Booking: {instance.reference_no}",
            table_name="Booking",
            record_id=instance.id,
        )

    @decorators.action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        try:
            booking = cancel_booking(
                booking_id=pk,
                reason=request.data.get("reason", ""),
                cancelled_by_type=request.data.get("cancelled_by_type", Booking.CancelledBy.ADMIN),
                refund_status=request.data.get("refund_status"),
                release_inventory=bool(request.data.get("release_inventory", True)),
                user=request.user,
            )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return response.Response(self.get_serializer(booking).data)

    @decorators.action(detail=True, methods=["post"])
    def amend(self, request, pk=None):
        try:
            booking = amend_booking(
                booking_id=pk,
                data=request.data,
                user=request.user,
            )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return response.Response(self.get_serializer(booking).data)


class ExternalProductMappingViewSet(viewsets.ModelViewSet):
    queryset = ExternalProductMapping.objects.select_related("product", "participant_category").order_by("provider", "external_product_id")
    serializer_class = ExternalProductMappingSerializer
    permission_classes = [IsOperationsUser]
    filterset_fields = ["provider", "product", "participant_category", "is_active", "is_default"]
    search_fields = ["external_product_id", "external_option_id", "external_rate_id", "external_product_name", "product__name"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated()]
        return [IsOperationsUser()]


class ApiIdempotencyRecordViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ApiIdempotencyRecord.objects.order_by("-last_seen_at")
    serializer_class = ApiIdempotencyRecordSerializer
    permission_classes = [IsOperationsUser]
    pagination_class = OperationsPageNumberPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["provider", "event_type", "processing_status"]
    search_fields = ["idempotency_key", "request_hash", "last_error"]
    ordering_fields = ["last_seen_at", "created_at", "hit_count"]
    ordering = ["-last_seen_at"]

    def get_permissions(self):
        return [permissions.IsAuthenticated()]


class InboundBookingPayloadViewSet(viewsets.ModelViewSet):
    queryset = (
        InboundBookingPayload.objects.select_related("idempotency_record", "product_mapping__product", "booking", "reservation")
        .order_by("-received_at")
    )
    serializer_class = InboundBookingPayloadSerializer
    permission_classes = [IsOperationsUser]
    pagination_class = OperationsPageNumberPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["provider", "event_type", "processing_status", "product_mapping", "booking", "reservation"]
    search_fields = ["external_booking_reference", "external_supplier_reference", "idempotency_record__idempotency_key"]
    ordering_fields = ["received_at", "processed_at", "created_at"]
    ordering = ["-received_at"]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "create", "process"]:
            return [permissions.IsAuthenticated()]
        return [IsOperationsUser()]

    @decorators.action(detail=True, methods=["post"])
    def process(self, request, pk=None):
        payload = self.get_object()
        serializer = InboundBookingPayloadProcessSerializer(data=request.data, context={"request": request, "payload": payload})
        serializer.is_valid(raise_exception=True)
        payload = serializer.save()
        return response.Response(self.get_serializer(payload).data)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.filter(is_deleted=False).order_by("name")
    serializer_class = SupplierSerializer
    permission_classes = [IsOperationsUser]
    filterset_fields = ["id", "category"]
    search_fields = ["name", "category", "contact_person", "email", "phone", "address"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated()]
        return [IsOperationsUser()]

    def perform_create(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Created Supplier: {instance.name}",
            table_name="Supplier",
            record_id=instance.id,
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Updated Supplier: {instance.name}",
            table_name="Supplier",
            record_id=instance.id,
        )

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Soft Deleted Supplier: {instance.name}",
            table_name="Supplier",
            record_id=instance.id,
        )
