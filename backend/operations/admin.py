from django.contrib import admin

from .models import (
    ApiIdempotencyRecord,
    Booking,
    BookingAuditEntry,
    BookingParticipant,
    BookingTraveller,
    Excursion,
    ExternalProductMapping,
    InboundBookingPayload,
    Itinerary,
    ItineraryDay,
    Package,
    Product,
    ProductParticipantCategory,
    ProductPrice,
    ProductSchedule,
    Reservation,
    ReservationParticipant,
    ScheduleCategoryAvailability,
    Supplier,
)


@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ("name", "package_type", "price", "is_deleted", "updated_at")
    list_filter = ("package_type", "is_deleted", "created_at", "updated_at")
    search_fields = ("name", "itinerary")
    ordering = ("name",)
    actions = ["soft_delete"]

    @admin.action(description="Soft delete selected packages")
    def soft_delete(self, request, queryset):
        queryset.update(is_deleted=True)


@admin.register(Excursion)
class ExcursionAdmin(admin.ModelAdmin):
    list_display = ("name", "location", "excursion_type", "price", "is_deleted", "updated_at")
    list_filter = ("excursion_type", "location", "is_deleted", "created_at", "updated_at")
    search_fields = ("name", "location", "itinerary")
    ordering = ("name",)
    actions = ["soft_delete"]

    @admin.action(description="Soft delete selected excursions")
    def soft_delete(self, request, queryset):
        queryset.update(is_deleted=True)


class ProductParticipantCategoryInline(admin.TabularInline):
    model = ProductParticipantCategory
    extra = 1


class ProductPriceInline(admin.TabularInline):
    model = ProductPrice
    extra = 0


class ExternalProductMappingInline(admin.TabularInline):
    model = ExternalProductMapping
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("product_code", "name", "category", "pricing_mode", "destination", "is_active", "updated_at")
    list_filter = ("category", "pricing_mode", "is_active")
    search_fields = ("product_code", "name", "slug", "destination")
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ProductParticipantCategoryInline, ProductPriceInline, ExternalProductMappingInline]


class ScheduleCategoryAvailabilityInline(admin.TabularInline):
    model = ScheduleCategoryAvailability
    extra = 0


@admin.register(ProductSchedule)
class ProductScheduleAdmin(admin.ModelAdmin):
    list_display = (
        "schedule_code",
        "product",
        "schedule_type",
        "start_at",
        "status",
        "total_capacity",
        "remaining_capacity",
    )
    list_filter = ("status", "schedule_type", "timezone")
    search_fields = ("schedule_code", "title", "product__name", "guide_assignment", "vehicle_assignment")
    inlines = [ScheduleCategoryAvailabilityInline]
    readonly_fields = (
        "schedule_code",
        "reserved_count",
        "confirmed_count",
        "cancelled_count",
        "released_count",
        "remaining_capacity",
    )


class ReservationParticipantInline(admin.TabularInline):
    model = ReservationParticipant
    extra = 0


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = (
        "reference_no",
        "customer_full_name",
        "product",
        "schedule",
        "status",
        "hold_expires_at",
    )
    list_filter = ("status", "product", "schedule")
    search_fields = ("reference_no", "customer_full_name", "customer_email", "customer_phone")
    readonly_fields = ("reference_no", "cancelled_at")
    inlines = [ReservationParticipantInline]


class BookingTravellerInline(admin.TabularInline):
    model = BookingTraveller
    extra = 1


class BookingParticipantInline(admin.TabularInline):
    model = BookingParticipant
    extra = 0


class BookingAuditEntryInline(admin.TabularInline):
    model = BookingAuditEntry
    fk_name = "booking"
    extra = 0
    readonly_fields = ("entity_type", "action", "actor", "notes", "payload", "created_at")
    can_delete = False


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "contact_person", "phone", "email", "is_deleted")
    list_filter = ("category", "is_deleted")
    search_fields = ("name", "contact_person", "email", "phone", "address")


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "reference_no",
        "client",
        "product",
        "schedule",
        "travel_date",
        "status",
        "payment_status",
        "source",
        "total_cost",
    )
    list_filter = ("status", "payment_status", "source", "is_deleted")
    search_fields = ("reference_no", "client__full_name", "package_name", "destination_package", "customer_full_name")
    inlines = [BookingParticipantInline, BookingTravellerInline, BookingAuditEntryInline]
    actions = ["soft_delete"]
    fieldsets = (
        ("Booking header", {
            "fields": (
                "client",
                "product",
                "schedule",
                "reservation",
                "reference_no",
                "status",
                "payment_status",
                "source",
                "integration_provider",
                "external_booking_reference",
            )
        }),
        ("Legacy linkage", {
            "fields": ("package", "package_name", "package_type", "destination_package")
        }),
        ("Customer snapshot", {
            "fields": ("customer_full_name", "customer_email", "customer_phone")
        }),
        ("Trip details", {
            "fields": ("travel_date", "number_of_days", "start_date", "end_date", "itinerary")
        }),
        ("Traveller pricing", {
            "fields": (
                ("num_adults", "price_per_adult"),
                ("num_children", "price_per_child"),
                ("extra_charges", "discount"),
                ("subtotal", "total_cost", "paid_amount", "currency"),
            )
        }),
        ("Terms and notes", {
            "fields": (
                "booking_validity",
                "deposit_terms",
                "payment_channels",
                "notes",
                "internal_notes",
                "supplier_notes",
            )
        }),
        ("Fulfilment and audit", {
            "fields": (
                "voucher_data",
                "amendment_history",
                "metadata",
                "inventory_released_on_cancel",
                "refund_status",
                "cancellation_reason",
                "cancelled_at",
                "cancelled_by_type",
                "cancelled_by_user",
                "is_deleted",
            )
        }),
    )
    readonly_fields = ("reference_no", "subtotal", "paid_amount", "cancelled_at")

    @admin.action(description="Soft delete selected bookings")
    def soft_delete(self, request, queryset):
        queryset.update(is_deleted=True)


@admin.register(BookingAuditEntry)
class BookingAuditEntryAdmin(admin.ModelAdmin):
    list_display = ("entity_type", "action", "actor", "created_at")
    list_filter = ("entity_type", "action")
    search_fields = ("notes",)
    readonly_fields = ("created_at",)


@admin.register(ExternalProductMapping)
class ExternalProductMappingAdmin(admin.ModelAdmin):
    list_display = ("provider", "external_product_id", "product", "participant_category", "is_active", "is_default", "updated_at")
    list_filter = ("provider", "is_active", "is_default", "default_currency")
    search_fields = ("external_product_id", "external_option_id", "external_rate_id", "external_product_name", "product__name")


@admin.register(ApiIdempotencyRecord)
class ApiIdempotencyRecordAdmin(admin.ModelAdmin):
    list_display = ("provider", "event_type", "idempotency_key", "processing_status", "hit_count", "last_seen_at")
    list_filter = ("provider", "event_type", "processing_status")
    search_fields = ("idempotency_key", "request_hash", "last_error")
    readonly_fields = ("request_hash", "hit_count", "first_seen_at", "last_seen_at", "created_at", "updated_at")


@admin.register(InboundBookingPayload)
class InboundBookingPayloadAdmin(admin.ModelAdmin):
    list_display = (
        "provider",
        "event_type",
        "external_booking_reference",
        "product_mapping",
        "booking",
        "processing_status",
        "received_at",
    )
    list_filter = ("provider", "event_type", "processing_status")
    search_fields = ("external_booking_reference", "external_supplier_reference", "idempotency_record__idempotency_key")
    readonly_fields = ("payload_hash", "received_at", "processed_at", "created_at", "updated_at")


@admin.register(Itinerary)
class ItineraryAdmin(admin.ModelAdmin):
    list_display = ("title", "booking", "is_deleted", "created_at")
    list_filter = ("is_deleted",)
    search_fields = ("title", "booking__reference_no")


@admin.register(ItineraryDay)
class ItineraryDayAdmin(admin.ModelAdmin):
    list_display = ("itinerary", "day_number", "title", "supplier")
    list_filter = ("supplier",)
    search_fields = ("title", "description", "itinerary__booking__reference_no")
