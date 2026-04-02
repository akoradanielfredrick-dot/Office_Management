from rest_framework import serializers
from .models import Booking, BookingTraveller, Excursion, Package, Supplier

class PackageSerializer(serializers.ModelSerializer):
    package_type_display = serializers.CharField(source='get_package_type_display', read_only=True)

    class Meta:
        model = Package
        fields = ['id', 'name', 'package_type', 'package_type_display', 'price', 'itinerary', 'created_at', 'updated_at']

class ExcursionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Excursion
        fields = ['id', 'name', 'location', 'price', 'itinerary', 'created_at', 'updated_at']

class BookingTravellerSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingTraveller
        fields = ['id', 'full_name', 'passport_no', 'dob', 'nationality']

class BookingSerializer(serializers.ModelSerializer):
    travellers = BookingTravellerSerializer(many=True, required=False)
    client_name = serializers.ReadOnlyField(source='client.full_name')
    client_email = serializers.ReadOnlyField(source='client.email')
    client_phone = serializers.ReadOnlyField(source='client.phone')
    package_name = serializers.ReadOnlyField()
    package_type_display = serializers.CharField(source='get_package_type_display', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'quotation', 'client', 'client_name', 'client_email', 'client_phone',
            'package', 'package_name', 'package_type', 'package_type_display', 'reference_no',
            'status', 'destination_package', 'travel_date', 'number_of_days', 'num_adults',
            'price_per_adult', 'num_children', 'price_per_child', 'extra_charges',
            'itinerary', 'start_date', 'end_date', 'subtotal', 'discount', 'paid_amount',
            'total_cost', 'currency', 'booking_validity', 'deposit_terms', 'payment_channels',
            'notes', 'internal_notes',
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
        fields = ['id', 'name', 'category', 'contact_person', 'email', 'phone', 'address', 'notes', 'created_at', 'updated_at']
