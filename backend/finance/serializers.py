from rest_framework import serializers
from .models import Payment, Receipt, Expense
from operations.models import Booking

class ReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = ['id', 'receipt_no', 'narration', 'generated_at']

class PaymentSerializer(serializers.ModelSerializer):
    receipt = ReceiptSerializer(read_only=True)
    booking_ref = serializers.CharField(source='booking.reference_no', read_only=True)
    recorder_name = serializers.CharField(source='received_by.full_name', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'booking', 'booking_ref', 'internal_reference', 
            'amount', 'currency', 'exchange_rate', 'method', 
            'payment_date', 'txn_reference', 'notes', 
            'recorder_name', 'receipt', 'created_at'
        ]
        read_only_fields = ['internal_reference', 'created_at']

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
