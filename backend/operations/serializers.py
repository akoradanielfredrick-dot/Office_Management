from rest_framework import serializers
from .models import Booking, BookingTraveller, Supplier
from clients.models import Client
from sales.serializers import QuotationSerializer

class BookingTravellerSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingTraveller
        fields = ['id', 'full_name', 'passport_no', 'dob', 'nationality']

class BookingSerializer(serializers.ModelSerializer):
    travellers = BookingTravellerSerializer(many=True, required=False)
    client_name = serializers.ReadOnlyField(source='client.full_name')

    class Meta:
        model = Booking
        fields = [
            'id', 'quotation', 'client', 'client_name', 'reference_no', 
            'status', 'destination_package', 'num_adults', 'num_children', 
            'start_date', 'end_date', 'subtotal', 'discount', 'paid_amount',
            'total_cost', 'currency', 'notes', 'internal_notes', 
            'created_at', 'updated_at', 'travellers'
        ]
        read_only_fields = ['reference_no', 'created_at', 'updated_at']

    def create(self, validated_data):
        travellers_data = validated_data.pop('travellers', [])
        booking = Booking.objects.create(**validated_data)
        
        for traveller_data in travellers_data:
            BookingTraveller.objects.create(booking=booking, **traveller_data)
            
        return booking


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ['id', 'name', 'category', 'contact_person', 'email', 'phone', 'created_at']
