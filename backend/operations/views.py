from django_filters.rest_framework import DjangoFilterBackend
import base64

from django.conf import settings
from rest_framework import decorators, permissions, response, status, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.views import APIView

from accounts.permissions import HasPortalModuleAccess
from common.models import ActivityLog

from .filters import BookingFilter, ProductScheduleFilter, ReservationFilter
from .models import ApiIdempotencyRecord, Booking, Excursion, ExternalProductMapping, InboundBookingPayload, Product, ProductSchedule, Reservation, Supplier
from .pagination import OperationsPageNumberPagination
from .serializers import (
    ApiIdempotencyRecordSerializer,
    BookingSerializer,
    ExcursionSerializer,
    ExternalProductMappingSerializer,
    GetYourGuideBootstrapMappingSerializer,
    GetYourGuideProductDetailSerializer,
    GetYourGuideProductListItemSerializer,
    GetYourGuideSandboxRequestSerializer,
    GetYourGuideSandboxResponseSerializer,
    InboundBookingPayloadProcessSerializer,
    InboundBookingPayloadSerializer,
    ProductScheduleSerializer,
    ProductSerializer,
    ReservationSerializer,
    SupplierSerializer,
)
from .services import (
    amend_booking,
    bootstrap_getyourguide_mapping,
    build_getyourguide_product_detail,
    build_getyourguide_product_list,
    cancel_booking,
    cancel_reservation,
    convert_reservation_to_booking,
    expire_stale_reservations,
    process_getyourguide_booking_payload,
    run_getyourguide_sandbox_request,
)


class ExcursionViewSet(viewsets.ModelViewSet):
    queryset = Excursion.objects.filter(is_deleted=False).select_related("product").order_by("name")
    serializer_class = ExcursionSerializer
    permission_classes = [permissions.IsAuthenticated, HasPortalModuleAccess]
    required_portal_modules = ("excursions", "catalog")
    filterset_fields = ["id", "location"]
    search_fields = ["name", "product__name", "location", "itinerary"]

    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasPortalModuleAccess()]

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
    permission_classes = [permissions.IsAuthenticated, HasPortalModuleAccess]
    required_portal_modules = ("products", "catalog", "excursions", "schedules", "bookings", "reservations", "integrations")
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["id", "category", "is_active", "pricing_mode", "slug"]
    search_fields = ["name", "product_code", "destination", "slug", "description"]
    ordering_fields = ["name", "product_code", "created_at", "updated_at"]
    ordering = ["name"]

    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasPortalModuleAccess()]

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
    permission_classes = [permissions.IsAuthenticated, HasPortalModuleAccess]
    required_portal_modules = ("schedules", "availability", "bookings", "reservations")
    pagination_class = OperationsPageNumberPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProductScheduleFilter
    search_fields = ["schedule_code", "title", "product__name", "guide_assignment", "vehicle_assignment"]
    ordering_fields = ["start_at", "created_at", "remaining_capacity", "total_capacity"]
    ordering = ["start_at", "created_at"]

    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasPortalModuleAccess()]

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
    permission_classes = [permissions.IsAuthenticated, HasPortalModuleAccess]
    required_portal_modules = ("reservations",)
    pagination_class = OperationsPageNumberPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ReservationFilter
    search_fields = ["reference_no", "customer_full_name", "customer_email", "customer_phone"]
    ordering_fields = ["created_at", "hold_expires_at"]
    ordering = ["-created_at"]

    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasPortalModuleAccess()]

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
    permission_classes = [permissions.IsAuthenticated, HasPortalModuleAccess]
    required_portal_modules = ("bookings", "payments", "expenses", "reservations")
    pagination_class = OperationsPageNumberPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = BookingFilter
    search_fields = ["reference_no", "client__full_name", "product_destination_snapshot", "product_name_snapshot", "customer_full_name"]
    ordering_fields = ["created_at", "travel_date", "start_date", "total_cost"]
    ordering = ["-created_at"]

    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasPortalModuleAccess()]

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
    permission_classes = [permissions.IsAuthenticated, HasPortalModuleAccess]
    required_portal_modules = ("integrations",)
    pagination_class = OperationsPageNumberPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["provider", "product", "participant_category", "is_active", "is_default"]
    search_fields = ["external_product_id", "external_option_id", "external_rate_id", "external_product_name", "product__name"]
    ordering_fields = ["provider", "external_product_id", "created_at", "updated_at"]
    ordering = ["provider", "external_product_id"]

    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasPortalModuleAccess()]


class ApiIdempotencyRecordViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ApiIdempotencyRecord.objects.order_by("-last_seen_at")
    serializer_class = ApiIdempotencyRecordSerializer
    permission_classes = [permissions.IsAuthenticated, HasPortalModuleAccess]
    required_portal_modules = ("integrations",)
    pagination_class = OperationsPageNumberPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["provider", "event_type", "processing_status"]
    search_fields = ["idempotency_key", "request_hash", "last_error"]
    ordering_fields = ["last_seen_at", "created_at", "hit_count"]
    ordering = ["-last_seen_at"]

    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasPortalModuleAccess()]


class InboundBookingPayloadViewSet(viewsets.ModelViewSet):
    queryset = (
        InboundBookingPayload.objects.select_related("idempotency_record", "product_mapping__product", "booking", "reservation")
        .order_by("-received_at")
    )
    serializer_class = InboundBookingPayloadSerializer
    permission_classes = [permissions.IsAuthenticated, HasPortalModuleAccess]
    required_portal_modules = ("integrations",)
    pagination_class = OperationsPageNumberPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["provider", "event_type", "processing_status", "product_mapping", "booking", "reservation"]
    search_fields = ["external_booking_reference", "external_supplier_reference", "idempotency_record__idempotency_key"]
    ordering_fields = ["received_at", "processed_at", "created_at"]
    ordering = ["-received_at"]

    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasPortalModuleAccess()]

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
    permission_classes = [permissions.IsAuthenticated, HasPortalModuleAccess]
    required_portal_modules = ("expenses",)
    filterset_fields = ["id", "category"]
    search_fields = ["name", "category", "contact_person", "email", "phone", "address"]

    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasPortalModuleAccess()]

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


class GetYourGuideBookingIngestView(APIView):
    permission_classes = [permissions.AllowAny]

    def _basic_auth_valid(self, request):
        configured_username = (settings.GETYOURGUIDE_BASIC_AUTH_USERNAME or "").strip()
        configured_password = settings.GETYOURGUIDE_BASIC_AUTH_PASSWORD or ""
        authorization = request.headers.get("Authorization", "")
        if not configured_username or not configured_password or not authorization.startswith("Basic "):
            return False

        try:
            encoded_credentials = authorization.split(" ", 1)[1].strip()
            decoded_credentials = base64.b64decode(encoded_credentials).decode("utf-8")
            username, password = decoded_credentials.split(":", 1)
        except (ValueError, UnicodeDecodeError, base64.binascii.Error):
            return False

        return username == configured_username and password == configured_password

    def post(self, request):
        token = (request.headers.get("X-Integration-Key") or "").strip()
        configured_token = (settings.GETYOURGUIDE_INGEST_TOKEN or "").strip()
        is_authenticated_staff = bool(request.user and request.user.is_authenticated)
        token_valid = bool(configured_token and token == configured_token)
        basic_auth_valid = self._basic_auth_valid(request)

        if not is_authenticated_staff and not token_valid and not basic_auth_valid:
            return response.Response(
                {"detail": "A valid integration key, HTTP Basic Auth credential, or authenticated session is required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not isinstance(request.data, dict):
            return response.Response(
                {"detail": "Expected a JSON object payload."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = process_getyourguide_booking_payload(
                payload=request.data,
                request_headers=dict(request.headers),
                source_endpoint=request.path,
                user=request.user if is_authenticated_staff else None,
            )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        payload_record = result["payload_record"]
        booking = result["booking"]
        response_status = status.HTTP_201_CREATED if result["created"] and result["status"] == "processed" else (
            status.HTTP_202_ACCEPTED if result["status"] == "failed" else status.HTTP_200_OK
        )
        return response.Response(
            {
                "status": result["status"],
                "booking_id": str(booking.id) if booking else None,
                "booking_reference": booking.reference_no if booking else None,
                "payload_id": str(payload_record.id),
                "payload_status": payload_record.processing_status,
                "message": payload_record.error_message or payload_record.processing_notes or "GetYourGuide payload received.",
            },
            status=response_status,
        )


class GetYourGuideSupplierAuthMixin:
    def _basic_auth_valid(self, request):
        configured_username = (settings.GETYOURGUIDE_BASIC_AUTH_USERNAME or "").strip()
        configured_password = settings.GETYOURGUIDE_BASIC_AUTH_PASSWORD or ""
        authorization = request.headers.get("Authorization", "")
        if not configured_username or not configured_password or not authorization.startswith("Basic "):
            return False

        try:
            encoded_credentials = authorization.split(" ", 1)[1].strip()
            decoded_credentials = base64.b64decode(encoded_credentials).decode("utf-8")
            username, password = decoded_credentials.split(":", 1)
        except (ValueError, UnicodeDecodeError, base64.binascii.Error):
            return False

        return username == configured_username and password == configured_password

    def is_supplier_request_authorized(self, request):
        configured_token = (settings.GETYOURGUIDE_SUPPLIER_TOKEN or "").strip()
        request_token = (
            request.headers.get("X-Integration-Key")
            or request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        )
        if request.user and request.user.is_authenticated:
            return True
        if self._basic_auth_valid(request):
            return True
        return bool(configured_token and request_token and request_token == configured_token)

    def ensure_supplier_authorized(self, request):
        if self.is_supplier_request_authorized(request):
            return None
        return response.Response(
            {"detail": "A valid GetYourGuide supplier token, HTTP Basic Auth credential, or authenticated session is required."},
            status=status.HTTP_403_FORBIDDEN,
        )


class GetYourGuideProductListView(GetYourGuideSupplierAuthMixin, APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        unauthorized = self.ensure_supplier_authorized(request)
        if unauthorized:
            return unauthorized

        payload = build_getyourguide_product_list()
        serializer = GetYourGuideProductListItemSerializer(payload, many=True)
        return response.Response({"results": serializer.data, "count": len(serializer.data)})


class GetYourGuideProductDetailView(GetYourGuideSupplierAuthMixin, APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, product_reference):
        unauthorized = self.ensure_supplier_authorized(request)
        if unauthorized:
            return unauthorized

        try:
            payload = build_getyourguide_product_detail(
                product_reference=product_reference,
                supplier_id=settings.GETYOURGUIDE_SUPPLIER_ID,
            )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)

        serializer = GetYourGuideProductDetailSerializer(payload)
        return response.Response(serializer.data)


class GetYourGuideBootstrapMappingsView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasPortalModuleAccess]
    required_portal_modules = ("integrations",)

    def post(self, request):
        serializer = GetYourGuideBootstrapMappingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            mappings = bootstrap_getyourguide_mapping(
                product_id=serializer.validated_data.get("product_id"),
                external_product_id=serializer.validated_data.get("external_product_id", ""),
                external_option_id=serializer.validated_data.get("external_option_id", ""),
                default_currency=serializer.validated_data.get("default_currency", ""),
                user=request.user,
            )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        output = ExternalProductMappingSerializer(mappings, many=True, context={"request": request})
        return response.Response({"count": len(output.data), "results": output.data}, status=status.HTTP_201_CREATED)


class GetYourGuideSandboxRunView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasPortalModuleAccess]
    required_portal_modules = ("integrations",)

    def post(self, request):
        serializer = GetYourGuideSandboxRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = run_getyourguide_sandbox_request(
                endpoint=serializer.validated_data["endpoint"],
                method=serializer.validated_data.get("method", "POST"),
                payload=serializer.validated_data.get("payload") or {},
                query_params=serializer.validated_data.get("query_params") or {},
                path_suffix=serializer.validated_data.get("path_suffix", ""),
                base_url=settings.GETYOURGUIDE_SANDBOX_BASE_URL,
                basic_auth_username=settings.GETYOURGUIDE_BASIC_AUTH_USERNAME,
                basic_auth_password=settings.GETYOURGUIDE_BASIC_AUTH_PASSWORD,
                user=request.user,
            )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        output = GetYourGuideSandboxResponseSerializer(result)
        return response.Response(output.data, status=status.HTTP_200_OK)
