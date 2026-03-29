import uuid
from django.db import models
from django.conf import settings
from operations.models import Booking, Supplier

class Payment(models.Model):
    METHOD_CHOICES = [
        ('MPESA', 'MPesa'),
        ('BANK', 'Bank Transfer'),
        ('CASH', 'Cash'),
        ('CARD', 'Credit/Debit Card'),
        ('CHEQUE', 'Cheque'),
        ('OTHER', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.RESTRICT, related_name='payments')
    internal_reference = models.CharField(max_length=50, unique=True, blank=True)
    
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='KES')
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=4, default=1.0000)
    
    method = models.CharField(max_length=50, choices=METHOD_CHOICES)
    payment_date = models.DateTimeField()
    txn_reference = models.CharField(max_length=100, null=True, blank=True, help_text="Transaction ID from the payment provider")
    
    notes = models.TextField(blank=True)
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='payment_records')
    
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        from common.utils import generate_reference_number
        if not self.internal_reference:
            self.internal_reference = generate_reference_number(Payment, 'PAY', field_name='internal_reference')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.internal_reference} ({self.amount} {self.currency})"

class Receipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.OneToOneField(Payment, on_delete=models.RESTRICT, related_name='receipt')
    receipt_no = models.CharField(max_length=50, unique=True, blank=True)
    narration = models.CharField(max_length=255, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        from common.utils import generate_reference_number
        if not self.receipt_no:
            self.receipt_no = generate_reference_number(Receipt, 'RCT', field_name='receipt_no')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Receipt {self.receipt_no} ({self.payment.internal_reference})"

class Expense(models.Model):
    CATEGORY_CHOICES = [
        ('ACCOMMODATION', 'Accommodation'),
        ('TRANSPORT', 'Transport / Vehicle Hire'),
        ('FUEL', 'Fuel'),
        ('GUIDE_FEE', 'Guide Fees / Allowances'),
        ('PARK_FEE', 'Park Entry Fees'),
        ('MEAL', 'Meals & Drinks'),
        ('OFFICE', 'Office Operations'),
        ('MARKETING', 'Marketing'),
        ('COMMISSION', 'Commission'),
        ('UTILITY', 'Utilities (Rent, Water, Power)'),
        ('SALARY', 'Salaries & Allowances'),
        ('REFUND', 'Client Refunds'),
        ('OTHER', 'Miscellaneous'),
    ]
    
    METHOD_CHOICES = [
        ('MPESA', 'MPesa'),
        ('BANK', 'Bank Transfer'),
        ('CASH', 'Cash'),
        ('CARD', 'Credit/Debit Card'),
        ('CHEQUE', 'Cheque'),
        ('OTHER', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    
    internal_reference = models.CharField(max_length=50, unique=True, blank=True)
    expense_date = models.DateField()
    category = models.CharField(max_length=100, choices=CATEGORY_CHOICES)
    description = models.TextField(null=True, blank=True)
    
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='KES')
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=4, default=1.0000)
    
    payment_method = models.CharField(max_length=50, choices=METHOD_CHOICES, default='CASH')
    invoice_ref = models.CharField(max_length=100, null=True, blank=True, help_text="Supplier's Invoice or Receipt Number")
    
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='recorded_expenses')
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        from common.utils import generate_reference_number
        if not self.internal_reference:
            self.internal_reference = generate_reference_number(Expense, 'EXP', field_name='internal_reference')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.internal_reference} - {self.amount} {self.currency} ({self.category})"
