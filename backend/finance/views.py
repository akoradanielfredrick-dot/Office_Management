from rest_framework import viewsets, status, response, decorators
from django.db import transaction
from django.shortcuts import get_object_or_404
from .models import Payment, Receipt, Expense
from .serializers import PaymentSerializer, ReceiptSerializer, ExpenseSerializer
from operations.models import Booking
from django.db.models import Sum, Count, F, Q, DecimalField, Max
from django.db.models.functions import Coalesce
from common.models import ActivityLog
import decimal
from django.utils import timezone

from django.http import FileResponse
from accounts.permissions import IsFinanceUser
from .services import generate_receipt_pdf

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.filter(is_deleted=False).order_by('-created_at')
    serializer_class = PaymentSerializer
    permission_classes = [IsFinanceUser]
    filterset_fields = ['id', 'booking', 'method']
    search_fields = ['internal_reference', 'booking__reference_no', 'booking__client__full_name', 'txn_reference']

    def perform_create(self, serializer):
        with transaction.atomic():
            # 1. Save the Payment
            payment = serializer.save(received_by=self.request.user)
            
            # 2. Automatically generate a Receipt
            Receipt.objects.create(
                payment=payment,
                narration=f"{payment.get_payment_type_display()} for Booking {payment.booking.reference_no}"
            )
            
            # 3. Update Booking Balance (Cached)
            booking = payment.booking
            # Convert payment amount to booking currency base using exchange_rate
            # (Assuming Booking.currency is the 'base' for that booking's debt)
            payment_in_base = payment.amount * payment.exchange_rate
            booking.paid_amount += payment_in_base
            booking.save()
            
            # 4. Log Activity
            ActivityLog.objects.create(
                user=self.request.user,
                action=f"Recorded Payment {payment.internal_reference} ({payment.amount} {payment.currency}) for Booking {booking.reference_no}",
                table_name="Payment",
                record_id=payment.id
            )

    def perform_destroy(self, instance):
        with transaction.atomic():
            # Reverse the balance update
            booking = instance.booking
            payment_in_base = instance.amount * instance.exchange_rate
            booking.paid_amount -= payment_in_base
            booking.save()
            
            # Soft delete
            instance.is_deleted = True
            instance.save()
            
            ActivityLog.objects.create(
                user=self.request.user,
                action=f"Voided Payment {instance.internal_reference} for Booking {booking.reference_no}",
                table_name="Payment",
                record_id=instance.id
            )

class ReceiptViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Receipt.objects.all().order_by('-generated_at')
    serializer_class = ReceiptSerializer
    permission_classes = [IsFinanceUser]

    @decorators.action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        receipt = self.get_object()
        buffer = generate_receipt_pdf(receipt)
        return FileResponse(buffer, as_attachment=True, filename=f"Receipt_{receipt.receipt_no}.pdf")

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.filter(is_deleted=False).order_by('-expense_date', '-created_at')
    serializer_class = ExpenseSerializer
    permission_classes = [IsFinanceUser]
    filterset_fields = ['id', 'booking', 'category', 'supplier']
    search_fields = ['internal_reference', 'description', 'booking__reference_no', 'supplier__name']

    def perform_create(self, serializer):
        expense = serializer.save(recorded_by=self.request.user)
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Recorded Expense {expense.internal_reference} for {expense.get_category_display()} ({expense.amount} {expense.currency})",
            table_name="Expense",
            record_id=expense.id
        )

    def perform_update(self, serializer):
        expense = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Updated Expense {expense.internal_reference}",
            table_name="Expense",
            record_id=expense.id
        )

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action=f"Soft Deleted Expense {instance.internal_reference}",
            table_name="Expense",
            record_id=instance.id
        )

class AnalyticsViewSet(viewsets.ViewSet):
    """
    Financial Reporting & Aggregations Office Management System Phase 6.
    """
    permission_classes = [IsFinanceUser]
    
    @decorators.action(detail=False, methods=['get'])
    def dashboard_summary(self, request):
        # 1. Total Revenue (Realized Cashflow)
        total_revenue = Payment.objects.filter(is_deleted=False).aggregate(
            total=Coalesce(Sum(F('amount') * F('exchange_rate'), output_field=DecimalField()), decimal.Decimal(0))
        )['total']

        # 2. Total Expenses (All categories)
        total_expenses = Expense.objects.filter(is_deleted=False).aggregate(
            total=Coalesce(Sum(F('amount') * F('exchange_rate'), output_field=DecimalField()), decimal.Decimal(0))
        )['total']

        # 3. Direct Costs (Tour-linked costs)
        direct_costs = Expense.objects.filter(is_deleted=False, booking__isnull=False).aggregate(
            total=Coalesce(Sum(F('amount') * F('exchange_rate'), output_field=DecimalField()), decimal.Decimal(0))
        )['total']

        # 4. Total Outstanding (Difference between total cost and paid amount)
        total_outstanding = Booking.objects.filter(is_deleted=False).aggregate(
            total=Coalesce(Sum(F('total_cost') - F('paid_amount'), output_field=DecimalField()), decimal.Decimal(0))
        )['total']

        return response.Response({
            'total_revenue': total_revenue,
            'total_expenses': total_expenses,
            'direct_costs': direct_costs,
            'net_cashflow': total_revenue - total_expenses,
            'total_outstanding': total_outstanding
        })

    @decorators.action(detail=False, methods=['get'])
    def profitability(self, request):
        bookings = Booking.objects.filter(is_deleted=False).order_by('-created_at')[:50]
        report = []
        for b in bookings:
            expenses_sum = b.expenses.filter(is_deleted=False).aggregate(
                total=Coalesce(Sum(F('amount') * F('exchange_rate'), output_field=DecimalField()), decimal.Decimal(0))
            )['total']
            
            report.append({
                'id': b.id,
                'ref': b.reference_no,
                'client': b.client.full_name,
                'product': b.product_name_snapshot or b.product_destination_snapshot,
                'revenue': b.paid_amount,
                'costs': expenses_sum,
                'profit': b.paid_amount - expenses_sum,
                'margin': ((b.paid_amount - expenses_sum) / b.paid_amount * 100) if b.paid_amount > 0 else 0
            })
        return response.Response(report)

    @decorators.action(detail=False, methods=['get'])
    def supplier_spend(self, request):
        spend = Expense.objects.filter(is_deleted=False, supplier__isnull=False).values(
            'supplier',
            'supplier__name',
            'supplier__category',
        ).annotate(
            total_spend=Sum(F('amount') * F('exchange_rate'), output_field=DecimalField()),
            transactions=Count('id'),
            last_transaction=Max('expense_date')
        ).order_by('-total_spend')
        return response.Response([
            {
                'id': row['supplier'],
                'name': row['supplier__name'],
                'category': row['supplier__category'] or 'Uncategorized',
                'total_spend': row['total_spend'] or decimal.Decimal(0),
                'transactions': row['transactions'],
                'last_transaction': row['last_transaction'],
            }
            for row in spend
        ])

    @decorators.action(detail=False, methods=['get'])
    def outstanding(self, request):
        today = timezone.localdate()
        bookings = Booking.objects.filter(is_deleted=False).filter(total_cost__gt=F('paid_amount')).order_by('-created_at')

        results = []
        for booking in bookings:
            due_date = booking.travel_date or booking.start_date or booking.created_at.date()
            days_overdue = max((today - due_date).days, 0) if due_date else 0
            last_payment = booking.payments.filter(is_deleted=False).order_by('-payment_date').first()

            results.append({
                'id': booking.id,
                'ref': booking.reference_no,
                'client': booking.client.full_name,
                'total_cost': booking.total_cost,
                'paid_amount': booking.paid_amount,
                'balance': booking.total_cost - booking.paid_amount,
                'last_payment': last_payment.payment_date.date() if last_payment else None,
                'days_overdue': days_overdue,
            })

        return response.Response(results)
