from rest_framework import serializers
from .models import Payment, Receipt, Expense
from operations.models import Booking
from decimal import Decimal

ALLOWED_FINANCE_CURRENCIES = {"USD", "EUR", "GBP"}

class ReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = ['id', 'receipt_no', 'narration', 'generated_at']

class PaymentSerializer(serializers.ModelSerializer):
    receipt = ReceiptSerializer(read_only=True)
    booking_ref = serializers.CharField(source='booking.reference_no', read_only=True)
    recorder_name = serializers.CharField(source='received_by.full_name', read_only=True)
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'booking', 'booking_ref', 'internal_reference', 
            'amount', 'currency', 'exchange_rate', 'payment_type', 'payment_type_display', 'method', 
            'payment_date', 'txn_reference', 'notes', 
            'recorder_name', 'receipt', 'created_at'
        ]
        read_only_fields = ['internal_reference', 'created_at']

    def validate(self, attrs):
        booking = attrs.get('booking') or getattr(self.instance, 'booking', None)
        amount = attrs.get('amount')
        exchange_rate = attrs.get('exchange_rate')
        payment_type = attrs.get('payment_type') or getattr(self.instance, 'payment_type', 'DEPOSIT')
        currency = attrs.get('currency') or getattr(self.instance, 'currency', '')

        if currency and currency not in ALLOWED_FINANCE_CURRENCIES:
            raise serializers.ValidationError({
                'currency': "Only USD, EUR, and GBP are allowed for payments."
            })

        if not booking or amount is None or exchange_rate is None:
            return attrs

        amount_in_booking_currency = Decimal(amount)
        if currency != booking.currency:
            amount_in_booking_currency = Decimal(amount) * Decimal(exchange_rate)

        if payment_type == 'DEPOSIT':
            minimum_deposit = Decimal(booking.total_cost) * Decimal('0.50')
            if amount_in_booking_currency < minimum_deposit:
                raise serializers.ValidationError({
                    'amount': f"Deposit payments must be at least 50% of the booking total ({booking.currency} {minimum_deposit:,.2f})."
                })

        return attrs

class ExpenseSerializer(serializers.ModelSerializer):
    booking_ref = serializers.CharField(source='booking.reference_no', read_only=True, allow_null=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True, allow_null=True)
    recorded_by_name = serializers.CharField(source='recorded_by.full_name', read_only=True, allow_null=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', 'internal_reference', 'expense_date', 'category', 
            'category_display', 'description', 'amount', 'currency', 'exchange_rate', 
            'payment_method', 'invoice_ref', 'booking', 'booking_ref', 
            'supplier', 'supplier_name', 'recorded_by_name', 'created_at'
        ]
        read_only_fields = ['internal_reference', 'created_at']

    def validate_currency(self, value):
        if value not in ALLOWED_FINANCE_CURRENCIES:
            raise serializers.ValidationError("Only USD, EUR, and GBP are allowed for expenses.")
        return value
