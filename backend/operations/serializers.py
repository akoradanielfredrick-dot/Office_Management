from django.utils import timezone
from rest_framework import serializers

from .models import (
    ApiIdempotencyRecord,
    Booking,
    BookingAuditEntry,
    BookingParticipant,
    BookingTraveller,
    Excursion,
    ExternalProductMapping,
    InboundBookingPayload,
    Product,
    ProductParticipantCategory,
    ProductPrice,
    ProductSchedule,
    Reservation,
    ReservationParticipant,
    ScheduleCategoryAvailability,
    Supplier,
)
from .services import create_booking, create_reservation, mark_inbound_booking_payload_processed, register_inbound_booking_payload


class ExcursionSerializer(serializers.ModelSerializer):
    excursion_type_display = serializers.CharField(source="get_excursion_type_display", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = Excursion
        fields = [
            "id",
            "product",
            "product_name",
            "name",
            "location",
            "excursion_type",
            "excursion_type_display",
            "price",
            "price_usd",
            "price_eur",
            "price_gbp",
            "itinerary",
            "created_at",
            "updated_at",
        ]


class ProductParticipantCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductParticipantCategory
        fields = [
            "id",
            "code",
            "label",
            "min_age",
            "max_age",
            "uses_inventory",
            "is_active",
            "metadata",
        ]


class ProductPriceSerializer(serializers.ModelSerializer):
    participant_category_label = serializers.CharField(source="participant_category.label", read_only=True)

    class Meta:
        model = ProductPrice
        fields = [
            "id",
            "participant_category",
            "participant_category_label",
            "rate_name",
            "currency",
            "amount",
            "is_active",
            "metadata",
        ]


class ExternalProductMappingSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    participant_category_label = serializers.CharField(source="participant_category.label", read_only=True)

    class Meta:
        model = ExternalProductMapping
        fields = [
            "id",
            "provider",
            "product",
            "product_name",
            "participant_category",
            "participant_category_label",
            "external_product_id",
            "external_option_id",
            "external_rate_id",
            "external_category_code",
            "external_product_name",
            "external_option_name",
            "default_currency",
            "is_active",
            "is_default",
            "metadata",
            "raw_payload",
            "created_at",
            "updated_at",
        ]


class ProductSerializer(serializers.ModelSerializer):
    participant_categories = ProductParticipantCategorySerializer(many=True, required=False)
    prices = ProductPriceSerializer(many=True, required=False)
    external_mappings = ExternalProductMappingSerializer(many=True, read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    pricing_mode_display = serializers.CharField(source="get_pricing_mode_display", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "product_code",
            "name",
            "slug",
            "category",
            "category_display",
            "description",
            "destination",
            "duration_text",
            "duration_minutes",
            "inclusions",
            "exclusions",
            "cancellation_policy",
            "booking_cutoff_minutes",
            "is_active",
            "pricing_mode",
            "pricing_mode_display",
            "max_capacity",
            "default_currency",
            "default_timezone",
            "metadata",
            "legacy_excursion",
            "participant_categories",
            "prices",
            "external_mappings",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["product_code", "created_at", "updated_at"]

    def create(self, validated_data):
        categories_data = validated_data.pop("participant_categories", [])
        prices_data = validated_data.pop("prices", [])
        product = Product.objects.create(**validated_data)
        for category_data in categories_data:
            ProductParticipantCategory.objects.create(product=product, **category_data)
        for price_data in prices_data:
            ProductPrice.objects.create(product=product, **price_data)
        return product

    def update(self, instance, validated_data):
        categories_data = validated_data.pop("participant_categories", None)
        prices_data = validated_data.pop("prices", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if categories_data is not None:
            instance.participant_categories.all().delete()
            for category_data in categories_data:
                ProductParticipantCategory.objects.create(product=instance, **category_data)
        if prices_data is not None:
            instance.prices.all().delete()
            for price_data in prices_data:
                ProductPrice.objects.create(product=instance, **price_data)
        return instance


class ScheduleCategoryAvailabilitySerializer(serializers.ModelSerializer):
    participant_category = ProductParticipantCategorySerializer(read_only=True)
    participant_category_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = ScheduleCategoryAvailability
        fields = [
            "id",
            "participant_category",
            "participant_category_id",
            "total_capacity",
            "manual_blocked_count",
            "reserved_count",
            "confirmed_count",
            "cancelled_count",
            "released_count",
            "remaining_capacity",
        ]
        read_only_fields = ["reserved_count", "confirmed_count", "cancelled_count", "released_count", "remaining_capacity"]


class ProductScheduleSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    category_availability = ScheduleCategoryAvailabilitySerializer(many=True, required=False)

    class Meta:
        model = ProductSchedule
        fields = [
            "id",
            "schedule_code",
            "product",
            "product_name",
            "title",
            "schedule_type",
            "start_at",
            "end_at",
            "access_window_start",
            "access_window_end",
            "timezone",
            "recurrence_rule",
            "recurrence_days",
            "status",
            "status_display",
            "notes",
            "guide_assignment",
            "vehicle_assignment",
            "total_capacity",
            "manual_blocked_count",
            "reserved_count",
            "confirmed_count",
            "cancelled_count",
            "released_count",
            "remaining_capacity",
            "metadata",
            "category_availability",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "schedule_code",
            "reserved_count",
            "confirmed_count",
            "cancelled_count",
            "released_count",
            "remaining_capacity",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        category_data = validated_data.pop("category_availability", [])
        schedule = ProductSchedule.objects.create(**validated_data)
        for item in category_data:
            participant_category_id = item.pop("participant_category_id", None)
            category = None
            if participant_category_id:
                category = ProductParticipantCategory.objects.get(id=participant_category_id, product=schedule.product)
            ScheduleCategoryAvailability.objects.create(
                schedule=schedule,
                participant_category=category,
                **item,
            )
        return schedule

    def update(self, instance, validated_data):
        category_data = validated_data.pop("category_availability", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if category_data is not None:
            instance.category_availability.all().delete()
            for item in category_data:
                participant_category_id = item.pop("participant_category_id", None)
                category = ProductParticipantCategory.objects.get(id=participant_category_id, product=instance.product)
                ScheduleCategoryAvailability.objects.create(
                    schedule=instance,
                    participant_category=category,
                    **item,
                )
        return instance


class ReservationParticipantSerializer(serializers.ModelSerializer):
    participant_category = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = ReservationParticipant
        fields = [
            "id",
            "participant_category",
            "category_code",
            "category_label",
            "quantity",
            "unit_price",
            "total_price",
        ]
        read_only_fields = ["id", "total_price"]


class ReservationSerializer(serializers.ModelSerializer):
    participants = ReservationParticipantSerializer(many=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    schedule_code = serializers.CharField(source="schedule.schedule_code", read_only=True)
    is_active_hold = serializers.BooleanField(read_only=True)

    class Meta:
        model = Reservation
        fields = [
            "id",
            "reference_no",
            "client",
            "product",
            "product_name",
            "schedule",
            "schedule_code",
            "status",
            "customer_full_name",
            "customer_email",
            "customer_phone",
            "hold_expires_at",
            "notes",
            "internal_comments",
            "metadata",
            "audit_trail",
            "cancellation_reason",
            "cancelled_at",
            "cancelled_by_type",
            "participants",
            "is_active_hold",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "reference_no",
            "audit_trail",
            "cancellation_reason",
            "cancelled_at",
            "cancelled_by_type",
            "created_at",
            "updated_at",
        ]

    def validate_hold_expires_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Hold expiry must be in the future.")
        return value

    def create(self, validated_data):
        participants = validated_data.pop("participants", [])
        request = self.context.get("request")
        try:
            return create_reservation(data={**validated_data, "participants": participants}, user=request.user if request else None)
        except ValueError as exc:
            raise serializers.ValidationError({"detail": str(exc)}) from exc


class BookingParticipantSerializer(serializers.ModelSerializer):
    participant_category = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = BookingParticipant
        fields = [
            "id",
            "participant_category",
            "category_code",
            "category_label",
            "quantity",
            "unit_price",
            "total_price",
        ]
        read_only_fields = ["id", "total_price"]


class BookingTravellerSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingTraveller
        fields = ["id", "full_name", "passport_no", "dob", "nationality"]


class BookingAuditEntrySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", read_only=True)

    class Meta:
        model = BookingAuditEntry
        fields = ["id", "entity_type", "action", "actor_name", "notes", "payload", "created_at"]


class BookingSerializer(serializers.ModelSerializer):
    travellers = BookingTravellerSerializer(many=True, required=False)
    participant_quantities = BookingParticipantSerializer(many=True, required=False)
    audit_entries = BookingAuditEntrySerializer(many=True, read_only=True)
    client_name = serializers.ReadOnlyField(source="client.full_name")
    client_email = serializers.ReadOnlyField(source="client.email")
    client_phone = serializers.ReadOnlyField(source="client.phone")
    product_category_display = serializers.SerializerMethodField()
    product_name = serializers.CharField(source="product.name", read_only=True)
    schedule_code = serializers.CharField(source="schedule.schedule_code", read_only=True)
    reservation_reference = serializers.CharField(source="reservation.reference_no", read_only=True)
    payment_status_display = serializers.CharField(source="get_payment_status_display", read_only=True)
    source_display = serializers.CharField(source="get_source_display", read_only=True)
    integration_provider_display = serializers.CharField(source="get_integration_provider_display", read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "client",
            "client_name",
            "client_email",
            "client_phone",
            "product",
            "product_name",
            "schedule",
            "schedule_code",
            "reservation",
            "reservation_reference",
            "product_name_snapshot",
            "product_category_snapshot",
            "product_category_display",
            "reference_no",
            "status",
            "payment_status",
            "payment_status_display",
            "source",
            "source_display",
            "integration_provider",
            "integration_provider_display",
            "external_booking_reference",
            "product_destination_snapshot",
            "travel_date",
            "number_of_days",
            "num_adults",
            "price_per_adult",
            "num_children",
            "price_per_child",
            "extra_charges",
            "itinerary",
            "start_date",
            "end_date",
            "subtotal",
            "discount",
            "paid_amount",
            "total_cost",
            "currency",
            "customer_full_name",
            "customer_email",
            "customer_phone",
            "booking_validity",
            "deposit_terms",
            "payment_channels",
            "notes",
            "internal_notes",
            "supplier_notes",
            "voucher_data",
            "amendment_history",
            "metadata",
            "inventory_released_on_cancel",
            "cancellation_reason",
            "cancelled_at",
            "cancelled_by_type",
            "refund_status",
            "created_at",
            "updated_at",
            "travellers",
            "participant_quantities",
            "audit_entries",
        ]
        read_only_fields = [
            "reference_no",
            "subtotal",
            "paid_amount",
            "payment_status",
            "product_name_snapshot",
            "product_category_snapshot",
            "cancellation_reason",
            "cancelled_at",
            "cancelled_by_type",
            "created_at",
            "updated_at",
        ]

    def get_product_category_display(self, obj):
        if obj.product:
            return obj.product.get_category_display()
        return obj.product_category_snapshot.replace("_", " ").title() if obj.product_category_snapshot else ""

    def validate(self, attrs):
        schedule = attrs.get("schedule") or getattr(self.instance, "schedule", None)
        product = attrs.get("product") or getattr(self.instance, "product", None)
        if schedule and product and schedule.product_id != product.id:
            raise serializers.ValidationError({"schedule": "The selected schedule does not belong to the selected product."})
        return attrs

    def create(self, validated_data):
        travellers_data = validated_data.pop("travellers", [])
        participant_quantities = validated_data.pop("participant_quantities", [])
        request = self.context.get("request")
        if not validated_data.get("schedule"):
            raise serializers.ValidationError({"schedule": "A schedule is required for new bookings."})
        try:
            booking = create_booking(
                data={
                    **validated_data,
                    "participants": participant_quantities,
                },
                user=request.user if request else None,
            )
        except ValueError as exc:
            raise serializers.ValidationError({"detail": str(exc)}) from exc

        for traveller_data in travellers_data:
            BookingTraveller.objects.create(booking=booking, **traveller_data)

        return booking


class ApiIdempotencyRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApiIdempotencyRecord
        fields = [
            "id",
            "provider",
            "event_type",
            "idempotency_key",
            "request_hash",
            "processing_status",
            "hit_count",
            "response_snapshot",
            "last_error",
            "first_seen_at",
            "last_seen_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class InboundBookingPayloadSerializer(serializers.ModelSerializer):
    idempotency_record = ApiIdempotencyRecordSerializer(read_only=True)
    booking_reference = serializers.CharField(source="booking.reference_no", read_only=True)
    reservation_reference = serializers.CharField(source="reservation.reference_no", read_only=True)
    product_name = serializers.CharField(source="product_mapping.product.name", read_only=True)

    class Meta:
        model = InboundBookingPayload
        fields = [
            "id",
            "provider",
            "event_type",
            "idempotency_record",
            "product_mapping",
            "product_name",
            "booking",
            "booking_reference",
            "reservation",
            "reservation_reference",
            "external_booking_reference",
            "external_supplier_reference",
            "source_endpoint",
            "request_headers",
            "raw_payload",
            "normalized_payload",
            "payload_hash",
            "processing_status",
            "processing_notes",
            "error_message",
            "received_at",
            "processed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "idempotency_record",
            "payload_hash",
            "received_at",
            "processed_at",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        request_headers = validated_data.get("request_headers") or {}
        normalized_payload = validated_data.get("normalized_payload") or {}
        try:
            payload_record, _, _ = register_inbound_booking_payload(
                provider=validated_data["provider"],
                event_type=validated_data.get("event_type") or InboundBookingPayload._meta.get_field("event_type").default,
                raw_payload=validated_data.get("raw_payload") or {},
                idempotency_key=request_headers.get("Idempotency-Key")
                or normalized_payload.get("idempotency_key")
                or validated_data.get("external_booking_reference")
                or "",
                request_headers=request_headers,
                normalized_payload=normalized_payload,
                external_booking_reference=validated_data.get("external_booking_reference", ""),
                external_supplier_reference=validated_data.get("external_supplier_reference", ""),
                source_endpoint=validated_data.get("source_endpoint", ""),
                product_mapping=validated_data.get("product_mapping"),
            )
        except ValueError as exc:
            raise serializers.ValidationError({"detail": str(exc)}) from exc
        return payload_record


class InboundBookingPayloadProcessSerializer(serializers.Serializer):
    booking = serializers.UUIDField(required=False, allow_null=True)
    reservation = serializers.UUIDField(required=False, allow_null=True)
    processing_status = serializers.ChoiceField(choices=InboundBookingPayload.ProcessingStatus.choices)
    processing_notes = serializers.CharField(required=False, allow_blank=True)
    error_message = serializers.CharField(required=False, allow_blank=True)

    def save(self, **kwargs):
        payload = self.context["payload"]
        booking = None
        reservation = None
        if self.validated_data.get("booking"):
            booking = Booking.objects.filter(id=self.validated_data["booking"]).first()
        if self.validated_data.get("reservation"):
            reservation = Reservation.objects.filter(id=self.validated_data["reservation"]).first()
        return mark_inbound_booking_payload_processed(
            payload_id=payload.id,
            booking=booking,
            reservation=reservation,
            processing_status=self.validated_data["processing_status"],
            processing_notes=self.validated_data.get("processing_notes", ""),
            error_message=self.validated_data.get("error_message", ""),
            user=self.context.get("request").user if self.context.get("request") else None,
        )


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ["id", "name", "category", "contact_person", "email", "phone", "address", "notes", "created_at", "updated_at"]
