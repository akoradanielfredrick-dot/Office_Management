import uuid
from datetime import timedelta

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from clients.models import Client


class IntegrationProvider(models.TextChoices):
    GET_YOUR_GUIDE = "GET_YOUR_GUIDE", "GetYourGuide"
    VIATOR = "VIATOR", "Viator"
    OTA_GENERIC = "OTA_GENERIC", "Generic OTA"
    API_GENERIC = "API_GENERIC", "Generic API"
    CUSTOM_PARTNER = "CUSTOM_PARTNER", "Custom partner"
    INTERNAL = "INTERNAL", "Internal"


class IntegrationEventType(models.TextChoices):
    BOOKING_CREATE = "BOOKING_CREATE", "Booking create"
    BOOKING_UPDATE = "BOOKING_UPDATE", "Booking update"
    BOOKING_CANCEL = "BOOKING_CANCEL", "Booking cancel"
    AVAILABILITY_SYNC = "AVAILABILITY_SYNC", "Availability sync"
    PRODUCT_SYNC = "PRODUCT_SYNC", "Product sync"
    UNKNOWN = "UNKNOWN", "Unknown"


class Excursion(models.Model):
    EXCURSION_TYPE_CHOICES = [
        ("AIR_SAFARI", "Air Safari"),
        ("ROAD_SAFARI", "Road Safari"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        "Product",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="legacy_excursion_records",
    )
    name = models.CharField(max_length=255, unique=True)
    location = models.CharField(max_length=255)
    excursion_type = models.CharField(max_length=20, choices=EXCURSION_TYPE_CHOICES, default="ROAD_SAFARI")
    price = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    price_usd = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    price_eur = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    price_gbp = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    itinerary = models.TextField(blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Excursion"
        verbose_name_plural = "Excursions"

    def __str__(self):
        return f"{self.name} - {self.location}"

    def save(self, *args, **kwargs):
        if self.product_id:
            if not self.name:
                self.name = self.product.name
            if not self.location:
                self.location = self.product.destination or self.product.name
            if not self.itinerary:
                self.itinerary = self.product.description
            safari_type = (self.product.metadata or {}).get("safari_type")
            if safari_type in dict(self.EXCURSION_TYPE_CHOICES):
                self.excursion_type = safari_type

            standard_prices = {
                price.currency: price.amount
                for price in self.product.prices.filter(participant_category__isnull=True, rate_name="STANDARD", is_active=True)
            }
            if self.price_usd == 0 and standard_prices.get(ProductPrice.Currency.USD) is not None:
                self.price_usd = standard_prices[ProductPrice.Currency.USD]
            if self.price_eur == 0 and standard_prices.get(ProductPrice.Currency.EUR) is not None:
                self.price_eur = standard_prices[ProductPrice.Currency.EUR]
            if self.price_gbp == 0 and standard_prices.get(ProductPrice.Currency.GBP) is not None:
                self.price_gbp = standard_prices[ProductPrice.Currency.GBP]

        if self.price == 0 and self.price_usd:
            self.price = self.price_usd

        super().save(*args, **kwargs)


class Supplier(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, null=True, blank=True)
    contact_person = models.CharField(max_length=255, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    notes = models.TextField(blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.category})"


class Product(models.Model):
    class Category(models.TextChoices):
        SAFARI = "SAFARI", "Safari"
        EXCURSION = "EXCURSION", "Excursion"
        TRANSFER = "TRANSFER", "Transfer"
        PACKAGE = "PACKAGE", "Tour"
        HOTEL_ADD_ON = "HOTEL_ADD_ON", "Hotel Add-on"
        ACTIVITY = "ACTIVITY", "Activity"
        OTHER = "OTHER", "Other"

    class PricingMode(models.TextChoices):
        PER_PERSON = "PER_PERSON", "Per person"
        PER_GROUP = "PER_GROUP", "Per group"
        COLLECTIVE_FIXED = "COLLECTIVE_FIXED", "Collective / fixed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product_code = models.CharField(max_length=50, unique=True, blank=True)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    category = models.CharField(max_length=30, choices=Category.choices, default=Category.OTHER)
    description = models.TextField(blank=True)
    destination = models.CharField(max_length=255, blank=True)
    duration_text = models.CharField(max_length=100, blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    inclusions = models.TextField(blank=True)
    exclusions = models.TextField(blank=True)
    cancellation_policy = models.TextField(blank=True)
    booking_cutoff_minutes = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    pricing_mode = models.CharField(max_length=30, choices=PricingMode.choices, default=PricingMode.PER_PERSON)
    max_capacity = models.PositiveIntegerField(null=True, blank=True)
    default_currency = models.CharField(max_length=3, default="KES")
    default_timezone = models.CharField(max_length=64, default=settings.TIME_ZONE)
    metadata = models.JSONField(default=dict, blank=True)
    legacy_excursion = models.ForeignKey(
        Excursion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mapped_products",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(booking_cutoff_minutes__gte=0),
                name="product_booking_cutoff_non_negative",
            ),
        ]

    def save(self, *args, **kwargs):
        from common.utils import generate_reference_number

        if not self.product_code:
            self.product_code = generate_reference_number(Product, "PRD", field_name="product_code")

        if not self.slug:
            base_slug = slugify(self.name) or str(self.id)
            slug_candidate = base_slug
            counter = 1
            while Product.objects.exclude(pk=self.pk).filter(slug=slug_candidate).exists():
                counter += 1
                slug_candidate = f"{base_slug}-{counter}"
            self.slug = slug_candidate

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product_code} - {self.name}"


class ProductParticipantCategory(models.Model):
    class Code(models.TextChoices):
        ADULT = "ADULT", "Adult"
        CHILD = "CHILD", "Child"
        INFANT = "INFANT", "Infant"
        SENIOR = "SENIOR", "Senior"
        STUDENT = "STUDENT", "Student"
        GROUP = "GROUP", "Group"
        COLLECTIVE = "COLLECTIVE", "Collective"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="participant_categories")
    code = models.CharField(max_length=20, choices=Code.choices)
    label = models.CharField(max_length=100)
    min_age = models.PositiveIntegerField(null=True, blank=True)
    max_age = models.PositiveIntegerField(null=True, blank=True)
    uses_inventory = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["product__name", "label"]
        constraints = [
            models.UniqueConstraint(fields=["product", "code"], name="product_category_unique_code"),
        ]

    def __str__(self):
        return f"{self.product.name} - {self.label}"


class ProductPrice(models.Model):
    class Currency(models.TextChoices):
        USD = "USD", "US Dollar"
        EUR = "EUR", "Euro"
        GBP = "GBP", "Pound Sterling"
        KES = "KES", "Kenya Shilling"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="prices")
    participant_category = models.ForeignKey(
        ProductParticipantCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prices",
    )
    rate_name = models.CharField(max_length=100, default="STANDARD")
    currency = models.CharField(max_length=3, choices=Currency.choices)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["product__name", "currency", "rate_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "participant_category", "rate_name", "currency"],
                name="product_price_unique_rate_currency",
            ),
        ]

    def __str__(self):
        return f"{self.product.name} - {self.currency} {self.amount}"


class ExternalProductMapping(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.CharField(max_length=40, choices=IntegrationProvider.choices)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="external_mappings")
    participant_category = models.ForeignKey(
        ProductParticipantCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="external_mappings",
    )
    external_product_id = models.CharField(max_length=255)
    external_option_id = models.CharField(max_length=255, blank=True)
    external_rate_id = models.CharField(max_length=255, blank=True)
    external_category_code = models.CharField(max_length=100, blank=True)
    external_product_name = models.CharField(max_length=255, blank=True)
    external_option_name = models.CharField(max_length=255, blank=True)
    default_currency = models.CharField(max_length=3, blank=True)
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["provider", "product__name", "external_product_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "external_product_id", "external_option_id", "external_rate_id", "external_category_code"],
                name="external_product_mapping_provider_reference_unique",
            ),
            models.UniqueConstraint(
                fields=["provider", "product"],
                condition=models.Q(is_default=True),
                name="external_product_mapping_single_default_per_provider_product",
            ),
        ]

    def __str__(self):
        return f"{self.provider} - {self.external_product_id} -> {self.product.name}"


class ApiIdempotencyRecord(models.Model):
    class ProcessingStatus(models.TextChoices):
        RECEIVED = "RECEIVED", "Received"
        PROCESSING = "PROCESSING", "Processing"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.CharField(max_length=40, choices=IntegrationProvider.choices)
    event_type = models.CharField(max_length=30, choices=IntegrationEventType.choices, default=IntegrationEventType.UNKNOWN)
    idempotency_key = models.CharField(max_length=255)
    request_hash = models.CharField(max_length=64, blank=True)
    processing_status = models.CharField(max_length=20, choices=ProcessingStatus.choices, default=ProcessingStatus.RECEIVED)
    hit_count = models.PositiveIntegerField(default=1)
    response_snapshot = models.JSONField(default=dict, blank=True)
    last_error = models.TextField(blank=True)
    first_seen_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-last_seen_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "event_type", "idempotency_key"],
                name="api_idempotency_provider_event_key_unique",
            ),
        ]

    def __str__(self):
        return f"{self.provider} {self.event_type} {self.idempotency_key}"


class ProductSchedule(models.Model):
    class ScheduleType(models.TextChoices):
        FIXED_DATE = "FIXED_DATE", "Fixed date departure"
        RECURRING = "RECURRING", "Recurring schedule"
        TIME_POINT = "TIME_POINT", "Time-point departure"
        TIME_PERIOD = "TIME_PERIOD", "Time-period access"

    class Status(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available"
        SOLD_OUT = "SOLD_OUT", "Sold out"
        CANCELLED = "CANCELLED", "Cancelled"
        PAUSED = "PAUSED", "Paused"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    schedule_code = models.CharField(max_length=50, unique=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="schedules")
    title = models.CharField(max_length=255, blank=True)
    schedule_type = models.CharField(max_length=20, choices=ScheduleType.choices, default=ScheduleType.FIXED_DATE)
    start_at = models.DateTimeField(null=True, blank=True)
    end_at = models.DateTimeField(null=True, blank=True)
    access_window_start = models.TimeField(null=True, blank=True)
    access_window_end = models.TimeField(null=True, blank=True)
    timezone = models.CharField(max_length=64, default=settings.TIME_ZONE)
    recurrence_rule = models.TextField(blank=True)
    recurrence_days = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    notes = models.TextField(blank=True)
    guide_assignment = models.CharField(max_length=255, blank=True)
    vehicle_assignment = models.CharField(max_length=255, blank=True)
    total_capacity = models.PositiveIntegerField(default=0)
    manual_blocked_count = models.PositiveIntegerField(default=0)
    reserved_count = models.PositiveIntegerField(default=0)
    confirmed_count = models.PositiveIntegerField(default=0)
    cancelled_count = models.PositiveIntegerField(default=0)
    released_count = models.PositiveIntegerField(default=0)
    remaining_capacity = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_at", "created_at"]
        constraints = [
            models.CheckConstraint(condition=models.Q(total_capacity__gte=0), name="schedule_total_capacity_non_negative"),
            models.CheckConstraint(condition=models.Q(manual_blocked_count__gte=0), name="schedule_blocked_non_negative"),
            models.CheckConstraint(condition=models.Q(reserved_count__gte=0), name="schedule_reserved_non_negative"),
            models.CheckConstraint(condition=models.Q(confirmed_count__gte=0), name="schedule_confirmed_non_negative"),
            models.CheckConstraint(condition=models.Q(cancelled_count__gte=0), name="schedule_cancelled_non_negative"),
            models.CheckConstraint(condition=models.Q(released_count__gte=0), name="schedule_released_non_negative"),
            models.CheckConstraint(condition=models.Q(remaining_capacity__gte=0), name="schedule_remaining_non_negative"),
        ]

    def save(self, *args, **kwargs):
        from common.utils import generate_reference_number

        if not self.schedule_code:
            self.schedule_code = generate_reference_number(ProductSchedule, "SCH", field_name="schedule_code")

        if self.total_capacity and not self.remaining_capacity and self.status == self.Status.AVAILABLE:
            self.remaining_capacity = max(self.total_capacity - self.manual_blocked_count, 0)

        super().save(*args, **kwargs)

    @property
    def is_open_for_sale(self):
        return self.status == self.Status.AVAILABLE and self.remaining_capacity > 0

    def __str__(self):
        label = self.title or self.product.name
        return f"{self.schedule_code} - {label}"


class ScheduleCategoryAvailability(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    schedule = models.ForeignKey(ProductSchedule, on_delete=models.CASCADE, related_name="category_availability")
    participant_category = models.ForeignKey(
        ProductParticipantCategory,
        on_delete=models.CASCADE,
        related_name="schedule_availability",
    )
    total_capacity = models.PositiveIntegerField(default=0)
    manual_blocked_count = models.PositiveIntegerField(default=0)
    reserved_count = models.PositiveIntegerField(default=0)
    confirmed_count = models.PositiveIntegerField(default=0)
    cancelled_count = models.PositiveIntegerField(default=0)
    released_count = models.PositiveIntegerField(default=0)
    remaining_capacity = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["participant_category__label"]
        constraints = [
            models.UniqueConstraint(
                fields=["schedule", "participant_category"],
                name="schedule_participant_category_unique",
            ),
        ]

    def __str__(self):
        return f"{self.schedule.schedule_code} - {self.participant_category.label}"


class Reservation(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        EXPIRED = "EXPIRED", "Expired"
        CANCELLED = "CANCELLED", "Cancelled"
        CONVERTED = "CONVERTED", "Converted"

    class CancelledBy(models.TextChoices):
        USER = "USER", "User"
        ADMIN = "ADMIN", "Admin"
        SYSTEM = "SYSTEM", "System"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_no = models.CharField(max_length=50, unique=True, blank=True)
    client = models.ForeignKey(Client, on_delete=models.SET_NULL, null=True, blank=True, related_name="reservations")
    product = models.ForeignKey(Product, on_delete=models.RESTRICT, related_name="reservations")
    schedule = models.ForeignKey(ProductSchedule, on_delete=models.RESTRICT, related_name="reservations")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    customer_full_name = models.CharField(max_length=255)
    customer_email = models.EmailField(null=True, blank=True)
    customer_phone = models.CharField(max_length=50, null=True, blank=True)
    hold_expires_at = models.DateTimeField()
    notes = models.TextField(blank=True)
    internal_comments = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    audit_trail = models.JSONField(default=list, blank=True)
    cancellation_reason = models.TextField(blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by_type = models.CharField(max_length=20, choices=CancelledBy.choices, blank=True)
    cancelled_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_reservations",
    )
    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_reservations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(condition=models.Q(hold_expires_at__isnull=False), name="reservation_hold_required"),
        ]

    @property
    def total_quantity(self):
        return sum(item.quantity for item in self.participants.all())

    @property
    def is_active_hold(self):
        return self.status == self.Status.ACTIVE and self.hold_expires_at > timezone.now()

    def save(self, *args, **kwargs):
        from common.utils import generate_reference_number

        if not self.reference_no:
            self.reference_no = generate_reference_number(Reservation, "RSV")

        if self.client and not self.customer_full_name:
            self.customer_full_name = self.client.full_name

        if self.client and not self.customer_email:
            self.customer_email = self.client.email

        if self.client and not self.customer_phone:
            self.customer_phone = self.client.phone

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference_no} ({self.customer_full_name})"


class ReservationParticipant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reservation = models.ForeignKey(Reservation, on_delete=models.CASCADE, related_name="participants")
    participant_category = models.ForeignKey(
        ProductParticipantCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reservation_lines",
    )
    category_code = models.CharField(max_length=20)
    category_label = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_price = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["reservation", "category_code"],
                name="reservation_category_unique",
            ),
        ]

    def save(self, *args, **kwargs):
        self.total_price = self.unit_price * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.category_label} x {self.quantity} ({self.reservation.reference_no})"


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        ONGOING = "ONGOING", "Ongoing"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"
        FAILED = "FAILED", "Failed"
        AMENDED = "AMENDED", "Amended"

    class PaymentStatus(models.TextChoices):
        UNPAID = "UNPAID", "Unpaid"
        PARTIAL = "PARTIAL", "Partially paid"
        PAID = "PAID", "Paid"
        REFUND_PENDING = "REFUND_PENDING", "Refund pending"
        REFUNDED = "REFUNDED", "Refunded"
        NOT_APPLICABLE = "NOT_APPLICABLE", "Not applicable"

    class Source(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        WEBSITE = "WEBSITE", "Website"
        OTA = "OTA", "OTA"
        API = "API", "API"
        MANUAL_OFFICE = "MANUAL_OFFICE", "Manual office entry"
        LEGACY = "LEGACY", "Legacy"

    class CancelledBy(models.TextChoices):
        USER = "USER", "User"
        ADMIN = "ADMIN", "Admin"
        SYSTEM = "SYSTEM", "System"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(Client, on_delete=models.RESTRICT, related_name="bookings")
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings")
    schedule = models.ForeignKey(
        ProductSchedule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bookings",
    )
    reservation = models.OneToOneField(
        Reservation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="converted_booking",
    )
    reference_no = models.CharField(max_length=50, unique=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CONFIRMED)
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.UNPAID,
    )
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.MANUAL_OFFICE)
    integration_provider = models.CharField(max_length=40, choices=IntegrationProvider.choices, blank=True)
    external_booking_reference = models.CharField(max_length=255, blank=True, db_index=True)

    travel_date = models.DateField(null=True, blank=True)
    number_of_days = models.PositiveIntegerField(default=1)
    product_name_snapshot = models.CharField(max_length=255, blank=True, db_column="package_name")
    product_category_snapshot = models.CharField(max_length=50, blank=True, db_column="package_type")
    product_destination_snapshot = models.CharField(max_length=255, blank=True, db_column="destination_package")
    num_adults = models.PositiveIntegerField(default=0)
    num_children = models.PositiveIntegerField(default=0)
    price_per_adult = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    price_per_child = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    extra_charges = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    itinerary = models.TextField(blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    discount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=3, default="KES")

    customer_full_name = models.CharField(max_length=255, blank=True)
    customer_email = models.EmailField(null=True, blank=True)
    customer_phone = models.CharField(max_length=50, null=True, blank=True)
    notes = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)
    supplier_notes = models.TextField(blank=True)
    booking_validity = models.TextField(blank=True)
    deposit_terms = models.TextField(blank=True)
    payment_channels = models.TextField(blank=True)
    voucher_data = models.JSONField(default=dict, blank=True)
    amendment_history = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    inventory_released_on_cancel = models.BooleanField(default=True)
    cancellation_reason = models.TextField(blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by_type = models.CharField(max_length=20, choices=CancelledBy.choices, blank=True)
    cancelled_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_bookings",
    )
    refund_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.NOT_APPLICABLE,
    )

    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(condition=models.Q(number_of_days__gte=1), name="booking_days_at_least_one"),
            models.CheckConstraint(condition=models.Q(num_adults__gte=0), name="booking_adults_non_negative"),
            models.CheckConstraint(condition=models.Q(num_children__gte=0), name="booking_children_non_negative"),
            models.UniqueConstraint(
                fields=["integration_provider", "external_booking_reference"],
                condition=(~models.Q(integration_provider="") & ~models.Q(external_booking_reference="")),
                name="booking_external_reference_unique",
            ),
        ]

    def save(self, *args, **kwargs):
        from common.utils import generate_reference_number

        if not self.reference_no:
            self.reference_no = generate_reference_number(Booking, "BKG")

        if self.client and not self.customer_full_name:
            self.customer_full_name = self.client.full_name
        if self.client and not self.customer_email:
            self.customer_email = self.client.email
        if self.client and not self.customer_phone:
            self.customer_phone = self.client.phone

        if self.product:
            self.product_name_snapshot = self.product.name
            self.product_category_snapshot = self.product.category
            if not self.product_destination_snapshot:
                self.product_destination_snapshot = self.product.destination or self.product.name
            if not self.currency:
                self.currency = self.product.default_currency

        if self.schedule and self.schedule.start_at and not self.travel_date:
            local_start = timezone.localtime(self.schedule.start_at)
            self.travel_date = local_start.date()

        if self.travel_date and not self.start_date:
            self.start_date = self.travel_date
        elif self.start_date and not self.travel_date:
            self.travel_date = self.start_date

        if self.start_date and self.number_of_days:
            self.end_date = self.start_date + timedelta(days=max(self.number_of_days - 1, 0))

        computed_subtotal = (
            (self.num_adults * self.price_per_adult) +
            (self.num_children * self.price_per_child)
        )

        if computed_subtotal > 0 or self.extra_charges or self.discount:
            self.subtotal = computed_subtotal + self.extra_charges
            self.total_cost = max(self.subtotal - self.discount, 0)

        if self.total_cost <= 0:
            self.payment_status = self.PaymentStatus.NOT_APPLICABLE
        elif self.paid_amount <= 0:
            self.payment_status = self.PaymentStatus.UNPAID
        elif self.paid_amount < self.total_cost:
            self.payment_status = self.PaymentStatus.PARTIAL
        else:
            self.payment_status = self.PaymentStatus.PAID

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference_no} ({self.client.full_name})"


class BookingParticipant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="participant_quantities")
    participant_category = models.ForeignKey(
        ProductParticipantCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking_lines",
    )
    category_code = models.CharField(max_length=20)
    category_label = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_price = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["booking", "category_code"], name="booking_category_unique"),
        ]

    def save(self, *args, **kwargs):
        self.total_price = self.unit_price * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.category_label} x {self.quantity} ({self.booking.reference_no})"


class BookingTraveller(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="travellers")
    full_name = models.CharField(max_length=255)
    passport_no = models.CharField(max_length=100, null=True, blank=True)
    dob = models.DateField(null=True, blank=True)
    nationality = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} ({self.booking.reference_no})"


class Itinerary(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="itineraries")
    title = models.CharField(max_length=255)
    notes = models.TextField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.booking.reference_no})"


class ItineraryDay(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    itinerary = models.ForeignKey(Itinerary, on_delete=models.CASCADE, related_name="days")
    day_number = models.IntegerField()
    title = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    meals = models.CharField(max_length=100, null=True, blank=True)
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="itinerary_days",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["day_number"]

    def __str__(self):
        return f"Day {self.day_number}: {self.title}"


class BookingItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="items")
    description = models.TextField()
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=15, decimal_places=2)
    total_price = models.DecimalField(max_digits=15, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.description} ({self.booking.reference_no})"


class BookingAuditEntry(models.Model):
    class EntityType(models.TextChoices):
        SCHEDULE = "SCHEDULE", "Schedule"
        RESERVATION = "RESERVATION", "Reservation"
        BOOKING = "BOOKING", "Booking"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entity_type = models.CharField(max_length=20, choices=EntityType.choices)
    schedule = models.ForeignKey(
        ProductSchedule,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="audit_entries",
    )
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="audit_entries",
    )
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="audit_entries",
    )
    action = models.CharField(max_length=100)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking_audit_entries",
    )
    notes = models.TextField(blank=True)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.entity_type} - {self.action}"


class InboundBookingPayload(models.Model):
    class ProcessingStatus(models.TextChoices):
        RECEIVED = "RECEIVED", "Received"
        DUPLICATE = "DUPLICATE", "Duplicate"
        PROCESSED = "PROCESSED", "Processed"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.CharField(max_length=40, choices=IntegrationProvider.choices)
    event_type = models.CharField(max_length=30, choices=IntegrationEventType.choices, default=IntegrationEventType.BOOKING_CREATE)
    idempotency_record = models.ForeignKey(
        ApiIdempotencyRecord,
        on_delete=models.PROTECT,
        related_name="payloads",
    )
    product_mapping = models.ForeignKey(
        ExternalProductMapping,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inbound_payloads",
    )
    booking = models.ForeignKey(
        Booking,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inbound_payloads",
    )
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inbound_payloads",
    )
    external_booking_reference = models.CharField(max_length=255, blank=True, db_index=True)
    external_supplier_reference = models.CharField(max_length=255, blank=True)
    source_endpoint = models.CharField(max_length=255, blank=True)
    request_headers = models.JSONField(default=dict, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    normalized_payload = models.JSONField(default=dict, blank=True)
    payload_hash = models.CharField(max_length=64, blank=True)
    processing_status = models.CharField(max_length=20, choices=ProcessingStatus.choices, default=ProcessingStatus.RECEIVED)
    processing_notes = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    received_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-received_at"]
        indexes = [
            models.Index(fields=["provider", "external_booking_reference"], name="inb_pay_provider_ref_idx"),
        ]

    def __str__(self):
        reference = self.external_booking_reference or self.idempotency_record.idempotency_key
        return f"{self.provider} payload {reference}"
