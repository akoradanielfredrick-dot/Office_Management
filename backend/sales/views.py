from rest_framework import viewsets, status, response
from rest_framework.decorators import action
from django.db import transaction
from .models import Quotation
from .serializers import QuotationSerializer
from operations.models import Booking
from common.models import ActivityLog

from accounts.permissions import IsSalesUser
from operations.models import Booking, BookingItem

class QuotationViewSet(viewsets.ModelViewSet):
    queryset = Quotation.objects.filter(is_deleted=False).order_by('-created_at')
    serializer_class = QuotationSerializer
    permission_classes = [IsSalesUser]
    filterset_fields = ['id', 'client', 'status']
    search_fields = ['reference_no', 'client__full_name', 'destination_package']

    def perform_create(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Created Quotation: {instance.reference_no}",
            table_name="Quotation",
            record_id=instance.id
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Updated Quotation: {instance.reference_no}",
            table_name="Quotation",
            record_id=instance.id
        )

    @action(detail=True, methods=['post'])
    def convert(self, request, pk=None):
        quotation = self.get_object()
        
        if quotation.status != 'ACCEPTED':
            return response.Response(
                {'error': 'Only ACCEPTED quotations can be converted to bookings.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if quotation.status == 'CONVERTED':
            return response.Response(
                {'error': 'This quotation has already been converted.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # 1. Create Booking Header
                booking = Booking.objects.create(
                    quotation=quotation,
                    client=quotation.client,
                    destination_package=quotation.destination_package,
                    num_adults=quotation.num_adults,
                    num_children=quotation.num_children,
                    start_date=quotation.start_date,
                    end_date=quotation.end_date,
                    subtotal=quotation.subtotal,
                    discount=quotation.discount,
                    total_cost=quotation.total_amount,
                    currency=quotation.currency,
                    notes=quotation.notes,
                    internal_notes=quotation.internal_notes,
                    status='CONFIRMED'
                )
                
                # 2. Clone Line Items from Quotation -> Booking for persistence
                for item in quotation.items.all():
                    BookingItem.objects.create(
                        booking=booking,
                        description=item.description,
                        quantity=item.quantity,
                        unit_price=item.unit_price,
                        total_price=item.total_price
                    )
                
                # 3. Mark Quotation as CONVERTED
                quotation.status = 'CONVERTED'
                quotation.save()
                
                # 4. Log Activity
                ActivityLog.objects.create(
                    user=request.user,
                    action=f"Converted Quotation {quotation.reference_no} to Booking {booking.reference_no} with {quotation.items.count()} items.",
                    table_name="Booking",
                    record_id=booking.id
                )
                
                return response.Response({
                    'message': 'Successfully converted to booking with items.',
                    'booking_id': str(booking.id),
                    'booking_ref': booking.reference_no
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return response.Response(
                {'error': f'Conversion failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
