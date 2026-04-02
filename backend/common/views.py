from django.db.models import Sum, F, Count
from django.utils import timezone
from rest_framework import viewsets, response, decorators
from clients.models import Client
from operations.models import Booking
from finance.models import Payment, Expense
import decimal
from django.db.models.functions import Coalesce
from django.db.models import DecimalField

class DashboardViewSet(viewsets.ViewSet):
    """
    General Dashboard statistics for the landing page.
    """
    
    @decorators.action(detail=False, methods=['get'])
    def summary(self, request):
        # 1. KPI Counts
        total_clients = Client.objects.filter(is_deleted=False).count()
        active_bookings = Booking.objects.filter(is_deleted=False, status='CONFIRMED').count()
        pending_payments = Payment.objects.filter(is_deleted=False).count() # Simplified, could filter by status if it existed
        
        # 2. Monthly Expenses
        now = timezone.now()
        expenses_this_month = Expense.objects.filter(
            is_deleted=False, 
            expense_date__month=now.month,
            expense_date__year=now.year
        ).aggregate(
            total=Coalesce(Sum(F('amount') * F('exchange_rate'), output_field=DecimalField()), decimal.Decimal(0))
        )['total']

        # 3. Recent Activity (Latest 5 items combined)
        # We'll fetch 5 of each and take the most recent 5 total
        recent_bookings = Booking.objects.filter(is_deleted=False).order_by('-created_at')[:5]
        recent_payments = Payment.objects.filter(is_deleted=False).order_by('-created_at')[:5]
        
        activity = []
        for b in recent_bookings:
            activity.append({
                'type': 'BOOKING',
                'id': b.id,
                'title': f"Booking {b.reference_no}",
                'subtitle': b.client.full_name,
                'date': b.created_at,
                'status': b.status,
                'amount': b.total_cost
            })
        for p in recent_payments:
            activity.append({
                'type': 'PAYMENT',
                'id': p.id,
                'title': f"Payment {p.internal_reference}",
                'subtitle': p.booking.client.full_name if p.booking else "Unknown",
                'date': p.created_at,
                'status': 'RECEIVED',
                'amount': p.amount
            })
            
        # Sort combined activity and take top 5
        activity.sort(key=lambda x: x['date'], reverse=True)
        recent_activity = activity[:5]

        return response.Response({
            'stats': {
                'total_clients': total_clients,
                'active_bookings': active_bookings,
                'pending_payments': pending_payments,
                'expenses_this_month': expenses_this_month
            },
            'recent_activity': recent_activity
        })
