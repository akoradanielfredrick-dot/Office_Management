from rest_framework import serializers
from .models import Quotation, QuotationItem
from clients.models import Client

class QuotationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotationItem
        fields = ['id', 'description', 'quantity', 'unit_price', 'total_price']
        read_only_fields = ['total_price']

class QuotationSerializer(serializers.ModelSerializer):
    items = QuotationItemSerializer(many=True, required=False)
    client_name = serializers.ReadOnlyField(source='client.full_name')

    class Meta:
        model = Quotation
        fields = [
            'id', 'client', 'client_name', 'reference_no', 'status', 
            'destination_package', 'num_adults', 'num_children', 
            'start_date', 'end_date', 'subtotal', 'discount', 
            'total_amount', 'currency', 'notes', 'internal_notes', 
            'valid_until', 'created_at', 'updated_at', 'items'
        ]
        read_only_fields = ['reference_no', 'total_amount', 'created_at', 'updated_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        quotation = Quotation.objects.create(**validated_data)
        
        for item_data in items_data:
            item_data['total_price'] = item_data['quantity'] * item_data['unit_price']
            QuotationItem.objects.create(quotation=quotation, **item_data)
            
        # Recalculate total if not done in save
        return quotation

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        instance = super().update(instance, validated_data)
        
        if items_data is not None:
            # Simple approach: clear and recreate items on update
            instance.items.all().delete()
            for item_data in items_data:
                item_data['total_price'] = item_data['quantity'] * item_data['unit_price']
                QuotationItem.objects.create(quotation=instance, **item_data)
                
        return instance
