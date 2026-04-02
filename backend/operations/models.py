import uuid
from datetime import timedelta
from django.db import models
from clients.models import Client

class Package(models.Model):
    PACKAGE_TYPE_CHOICES = [
        ('AIR_SAFARI', 'Air Safari'),
        ('ROAD_SAFARI', 'Road Safari'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    package_type = models.CharField(max_length=20, choices=PACKAGE_TYPE_CHOICES)
    price = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    itinerary = models.TextField(blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Package"
        verbose_name_plural = "Packages"

    def __str__(self):
        return self.name

class Excursion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    location = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
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

class Supplier(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, null=True, blank=True) # HOTEL, TRANSPORT, GUIDE
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

class Booking(models.Model):
    STATUS_CHOICES = [
        ('CONFIRMED', 'Confirmed'),
        ('ONGOING', 'Ongoing'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(Client, on_delete=models.RESTRICT, related_name='bookings')
    package = models.ForeignKey(Package, on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')
    reference_no = models.CharField(max_length=50, unique=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='CONFIRMED')

    # Trip Details
    travel_date = models.DateField(null=True, blank=True)
    number_of_days = models.PositiveIntegerField(default=1)
    package_name = models.CharField(max_length=255, blank=True)
    package_type = models.CharField(max_length=20, choices=Package.PACKAGE_TYPE_CHOICES, blank=True)
    destination_package = models.CharField(max_length=255, blank=True)
    num_adults = models.PositiveIntegerField(default=0)
    num_children = models.PositiveIntegerField(default=0)
    price_per_adult = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    price_per_child = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    extra_charges = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    itinerary = models.TextField(blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    # Financials
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    discount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_cost = models.DecimalField(max_digits=15, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=3, default='KES')

    # Notes and terms
    notes = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)
    booking_validity = models.TextField(blank=True)
    deposit_terms = models.TextField(blank=True)
    payment_channels = models.TextField(blank=True)
    
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        from common.utils import generate_reference_number
        if not self.reference_no:
            self.reference_no = generate_reference_number(Booking, 'BKG')

        if self.package:
            self.package_name = self.package.name
            self.package_type = self.package.package_type
            if not self.destination_package:
                self.destination_package = self.package.name
            if not self.itinerary:
                self.itinerary = self.package.itinerary
            if self.price_per_adult == 0:
                self.price_per_adult = self.package.price

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
            self.total_cost = self.subtotal - self.discount

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference_no} ({self.client.full_name})"

class BookingTraveller(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='travellers')
    full_name = models.CharField(max_length=255)
    passport_no = models.CharField(max_length=100, null=True, blank=True)
    dob = models.DateField(null=True, blank=True)
    nationality = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} ({self.booking.reference_no})"

class Itinerary(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='itineraries')
    title = models.CharField(max_length=255)
    notes = models.TextField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.booking.reference_no})"

class ItineraryDay(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    itinerary = models.ForeignKey(Itinerary, on_delete=models.CASCADE, related_name='days')
    day_number = models.IntegerField()
    title = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    meals = models.CharField(max_length=100, null=True, blank=True) # e.g. "B, L, D"
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='itinerary_days')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['day_number']

    def __str__(self):
        return f"Day {self.day_number}: {self.title}"
class BookingItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='items')
    description = models.TextField()
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=15, decimal_places=2)
    total_price = models.DecimalField(max_digits=15, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.description} ({self.booking.reference_no})"
