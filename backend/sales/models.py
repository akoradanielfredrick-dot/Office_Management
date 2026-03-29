import uuid
from django.db import models
from clients.models import Client

class Quotation(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SENT', 'Sent'),
        ('UNDER_REVIEW', 'Under Review'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('EXPIRED', 'Expired'),
        ('CONVERTED', 'Converted'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(Client, on_delete=models.RESTRICT, related_name='quotations')
    reference_no = models.CharField(max_length=50, unique=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    
    # Trip Details
    destination_package = models.CharField(max_length=255, blank=True)
    num_adults = models.PositiveIntegerField(default=0)
    num_children = models.PositiveIntegerField(default=0)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    # Financials
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    discount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=3, default='KES')
    
    # Notes & Dates
    notes = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)
    valid_until = models.DateField(null=True, blank=True)
    
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        from common.utils import generate_reference_number
        if not self.reference_no:
            self.reference_no = generate_reference_number(Quotation, 'QTN')
        
        # Calculate total
        self.total_amount = self.subtotal - self.discount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference_no} ({self.client.full_name})"

class QuotationItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='items')
    description = models.TextField()
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=15, decimal_places=2)
    total_price = models.DecimalField(max_digits=15, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.description} ({self.quotation.reference_no})"
