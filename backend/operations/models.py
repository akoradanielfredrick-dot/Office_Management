import uuid
from django.db import models
from clients.models import Client
from sales.models import Quotation

class Supplier(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, null=True, blank=True) # HOTEL, TRANSPORT, GUIDE
    contact_person = models.CharField(max_length=255, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

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
    quotation = models.ForeignKey(Quotation, on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')
    client = models.ForeignKey(Client, on_delete=models.RESTRICT, related_name='bookings')
    reference_no = models.CharField(max_length=50, unique=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='CONFIRMED')
    
    # Trip Details (Copied from Quotation/Editable)
    destination_package = models.CharField(max_length=255, blank=True)
    num_adults = models.PositiveIntegerField(default=0)
    num_children = models.PositiveIntegerField(default=0)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    # Financials (Fixed from Quotation)
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    discount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_cost = models.DecimalField(max_digits=15, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=3, default='KES')
    
    # Notes
    notes = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)
    
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        from common.utils import generate_reference_number
        if not self.reference_no:
            self.reference_no = generate_reference_number(Booking, 'BKG')
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
