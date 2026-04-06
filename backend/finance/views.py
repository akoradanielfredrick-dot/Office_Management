from rest_framework import viewsets, status, response, decorators, filters, permissions
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
from accounts.permissions import HasPortalModuleAccess
from .services import generate_receipt_pdf
from django_filters.rest_framework import DjangoFilterBackend


ALLOWED_ANALYTICS_CURRENCIES = ("USD", "EUR", "GBP", "KES")


def _empty_currency_totals():
    return {currency: decimal.Decimal(0) for currency in ALLOWED_ANALYTICS_CURRENCIES}


def _normalize_currency_totals(rows, currency_key='currency', total_key='total'):
    totals = _empty_currency_totals()
    for row in rows:
        currency = row.get(currency_key)
        if currency in totals:
            totals[currency] = row.get(total_key) or decimal.Decimal(0)
    return totals


def _serialize_currency_totals(totals):
    return {currency: totals.get(currency, decimal.Decimal(0)) for currency in ALLOWED_ANALYTICS_CURRENCIES}


def _positive_outstanding_queryset():
    return Booking.objects.filter(is_deleted=False, total_cost__gt=F('paid_amount'))


def _payment_amount_in_booking_currency(payment, booking):
    if payment.currency == booking.currency:
        return payment.amount
    return payment.amount * payment.exchange_rate


def _recalculate_booking_paid_amount(booking):
    active_payments = booking.payments.filter(is_deleted=False)
    recalculated_total = decimal.Decimal(0)
    for payment in active_payments:
        recalculated_total += _payment_amount_in_booking_currency(payment, booking)
    booking.paid_amount = recalculated_total
    booking.save(update_fields=['paid_amount', 'updated_at'])
    return booking

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.filter(is_deleted=False).select_related('booking', 'booking__client', 'received_by', 'receipt').order_by('-created_at')
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated, HasPortalModuleAccess]
    required_portal_modules = ("payments",)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['id', 'booking', 'method']
    search_fields = ['internal_reference', 'booking__reference_no', 'booking__client__full_name', 'txn_reference', 'receipt__receipt_no']

    def perform_create(self, serializer):
        with transaction.atomic():
            payment = serializer.save(received_by=self.request.user)

            Receipt.objects.create(
                payment=payment,
                narration=f"{payment.get_payment_type_display()} for Booking {payment.booking.reference_no}"
            )

            booking = _recalculate_booking_paid_amount(payment.booking)

            ActivityLog.objects.create(
                user=self.request.user,
                action=f"Recorded Payment {payment.internal_reference} ({payment.amount} {payment.currency}) for Booking {booking.reference_no}",
                table_name="Payment",
                record_id=payment.id
            )

    def perform_update(self, serializer):
        with transaction.atomic():
            original_booking = serializer.instance.booking
            payment = serializer.save()

            _recalculate_booking_paid_amount(original_booking)
            if payment.booking_id != original_booking.id:
                _recalculate_booking_paid_amount(payment.booking)
            else:
                _recalculate_booking_paid_amount(payment.booking)

            ActivityLog.objects.create(
                user=self.request.user,
                action=f"Updated Payment {payment.internal_reference} for Booking {payment.booking.reference_no}",
                table_name="Payment",
                record_id=payment.id
            )

    def perform_destroy(self, instance):
        with transaction.atomic():
            booking = instance.booking
            instance.is_deleted = True
            instance.save()

            _recalculate_booking_paid_amount(booking)

            ActivityLog.objects.create(
                user=self.request.user,
                action=f"Voided Payment {instance.internal_reference} for Booking {booking.reference_no}",
                table_name="Payment",
                record_id=instance.id
            )

class ReceiptViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Receipt.objects.all().order_by('-generated_at')
    serializer_class = ReceiptSerializer
    permission_classes = [permissions.IsAuthenticated, HasPortalModuleAccess]
    required_portal_modules = ("payments",)

    @decorators.action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        receipt = self.get_object()
        buffer = generate_receipt_pdf(receipt)
        return FileResponse(buffer, as_attachment=True, filename=f"Receipt_{receipt.receipt_no}.pdf")

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.filter(is_deleted=False).order_by('-expense_date', '-created_at')
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated, HasPortalModuleAccess]
    required_portal_modules = ("expenses",)
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
    permission_classes = [permissions.IsAuthenticated, HasPortalModuleAccess]
    required_portal_modules = ("analytics",)
    
    @decorators.action(detail=False, methods=['get'])
    def dashboard_summary(self, request):
        # 1. Total Revenue (Realized Cashflow)
        total_revenue = Payment.objects.filter(is_deleted=False).aggregate(
            total=Coalesce(Sum(F('amount') * F('exchange_rate'), output_field=DecimalField()), decimal.Decimal(0))
        )['total']
        revenue_by_currency = _normalize_currency_totals(
            Payment.objects.filter(is_deleted=False, currency__in=ALLOWED_ANALYTICS_CURRENCIES)
            .values('currency')
            .annotate(total=Coalesce(Sum('amount', output_field=DecimalField()), decimal.Decimal(0)))
        )

        # 2. Total Expenses (All categories)
        total_expenses = Expense.objects.filter(is_deleted=False).aggregate(
            total=Coalesce(Sum(F('amount') * F('exchange_rate'), output_field=DecimalField()), decimal.Decimal(0))
        )['total']
        expenses_by_currency = _normalize_currency_totals(
            Expense.objects.filter(is_deleted=False, currency__in=ALLOWED_ANALYTICS_CURRENCIES)
            .values('currency')
            .annotate(total=Coalesce(Sum('amount', output_field=DecimalField()), decimal.Decimal(0)))
        )

        # 3. Direct Costs (Tour-linked costs)
        direct_costs = Expense.objects.filter(is_deleted=False, booking__isnull=False).aggregate(
            total=Coalesce(Sum(F('amount') * F('exchange_rate'), output_field=DecimalField()), decimal.Decimal(0))
        )['total']
        direct_costs_by_currency = _normalize_currency_totals(
            Expense.objects.filter(is_deleted=False, booking__isnull=False, currency__in=ALLOWED_ANALYTICS_CURRENCIES)
            .values('currency')
            .annotate(total=Coalesce(Sum('amount', output_field=DecimalField()), decimal.Decimal(0)))
        )

        # 4. Total Outstanding (only positive receivables that are still owed)
        outstanding_bookings = _positive_outstanding_queryset()
        total_outstanding = outstanding_bookings.aggregate(
            total=Coalesce(Sum(F('total_cost') - F('paid_amount'), output_field=DecimalField()), decimal.Decimal(0))
        )['total']
        outstanding_by_currency = _normalize_currency_totals(
            outstanding_bookings.filter(currency__in=ALLOWED_ANALYTICS_CURRENCIES)
            .values('currency')
            .annotate(total=Coalesce(Sum(F('total_cost') - F('paid_amount'), output_field=DecimalField()), decimal.Decimal(0)))
        )
        net_cashflow_by_currency = {
            currency: revenue_by_currency[currency] - expenses_by_currency[currency]
            for currency in ALLOWED_ANALYTICS_CURRENCIES
        }

        return response.Response({
            'total_revenue': total_revenue,
            'total_expenses': total_expenses,
            'direct_costs': direct_costs,
            'net_cashflow': total_revenue - total_expenses,
            'total_outstanding': total_outstanding,
            'revenue_by_currency': _serialize_currency_totals(revenue_by_currency),
            'expenses_by_currency': _serialize_currency_totals(expenses_by_currency),
            'direct_costs_by_currency': _serialize_currency_totals(direct_costs_by_currency),
            'net_cashflow_by_currency': _serialize_currency_totals(net_cashflow_by_currency),
            'outstanding_by_currency': _serialize_currency_totals(outstanding_by_currency),
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
                'currency': b.currency,
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
        bookings = _positive_outstanding_queryset().order_by('-created_at')

        results = []
        for booking in bookings:
            due_date = booking.travel_date or booking.start_date or booking.created_at.date()
            days_overdue = max((today - due_date).days, 0) if due_date else 0
            last_payment = booking.payments.filter(is_deleted=False).order_by('-payment_date').first()

            results.append({
                'id': booking.id,
                'ref': booking.reference_no,
                'client': booking.client.full_name,
                'currency': booking.currency,
                'total_cost': booking.total_cost,
                'paid_amount': booking.paid_amount,
                'balance': booking.total_cost - booking.paid_amount,
                'last_payment': last_payment.payment_date.date() if last_payment else None,
                'days_overdue': days_overdue,
            })

        return response.Response(results)
