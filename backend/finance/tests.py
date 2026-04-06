from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role, User
from clients.models import Client
from operations.models import Booking
from finance.models import Payment


class AnalyticsViewSetTests(APITestCase):
    def setUp(self):
        self.role = Role.objects.create(name='ACCOUNTS')
        self.user = User.objects.create_user(
            email='finance@example.com',
            password='testpass123',
            full_name='Finance User',
            role=self.role,
        )
        self.client.force_authenticate(user=self.user)
        self.customer = Client.objects.create(
            full_name='Test Client',
            email='client@example.com',
            phone='+254700000000',
        )

    def test_dashboard_summary_only_counts_positive_outstanding_balances(self):
        Booking.objects.create(
            client=self.customer,
            total_cost=Decimal('100.00'),
            paid_amount=Decimal('40.00'),
            currency='USD',
        )
        Booking.objects.create(
            client=self.customer,
            total_cost=Decimal('100.00'),
            paid_amount=Decimal('125.00'),
            currency='USD',
        )

        response = self.client.get(reverse('finance-analytics-dashboard-summary'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['total_outstanding']), Decimal('60.00'))
        self.assertEqual(Decimal(response.data['outstanding_by_currency']['USD']), Decimal('60.00'))
        self.assertEqual(Decimal(response.data['outstanding_by_currency']['EUR']), Decimal('0'))
        self.assertEqual(Decimal(response.data['outstanding_by_currency']['GBP']), Decimal('0'))
        self.assertEqual(Decimal(response.data['outstanding_by_currency']['KES']), Decimal('0'))

    def test_outstanding_endpoint_excludes_fully_paid_and_overpaid_bookings(self):
        owed_booking = Booking.objects.create(
            client=self.customer,
            total_cost=Decimal('250.00'),
            paid_amount=Decimal('100.00'),
            currency='USD',
        )
        Booking.objects.create(
            client=self.customer,
            total_cost=Decimal('250.00'),
            paid_amount=Decimal('250.00'),
            currency='USD',
        )
        Booking.objects.create(
            client=self.customer,
            total_cost=Decimal('250.00'),
            paid_amount=Decimal('300.00'),
            currency='USD',
        )

        response = self.client.get(reverse('finance-analytics-outstanding'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]['id']), str(owed_booking.id))
        self.assertEqual(Decimal(response.data[0]['balance']), Decimal('150.00'))


class PaymentWorkflowTests(APITestCase):
    def setUp(self):
        self.role = Role.objects.create(name='ACCOUNTS')
        self.user = User.objects.create_user(
            email='payments@example.com',
            password='testpass123',
            full_name='Payments User',
            role=self.role,
        )
        self.client.force_authenticate(user=self.user)
        self.customer = Client.objects.create(
            full_name='Finance Test Client',
            email='finance-client@example.com',
            phone='+254700111222',
        )
        self.booking = Booking.objects.create(
            client=self.customer,
            total_cost=Decimal('1000.00'),
            paid_amount=Decimal('0.00'),
            currency='USD',
        )

    def _payment_payload(self, **overrides):
        payload = {
            'booking': str(self.booking.id),
            'amount': '500.00',
            'currency': 'USD',
            'exchange_rate': '1.0000',
            'payment_type': 'DEPOSIT',
            'method': 'MPESA',
            'payment_date': '2026-04-04T00:00:00Z',
            'txn_reference': 'TXN-001',
            'notes': 'Test payment',
        }
        payload.update(overrides)
        return payload

    def test_creating_payment_updates_booking_paid_amount(self):
        response = self.client.post(reverse('payment-list'), self._payment_payload(), format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.paid_amount, Decimal('500.00'))

    def test_updating_payment_recalculates_booking_paid_amount(self):
        create_response = self.client.post(reverse('payment-list'), self._payment_payload(), format='json')
        payment_id = create_response.data['id']

        update_response = self.client.patch(
            reverse('payment-detail', args=[payment_id]),
            {'amount': '650.00', 'exchange_rate': '1.0000'},
            format='json',
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.paid_amount, Decimal('650.00'))

    def test_voiding_payment_recalculates_booking_paid_amount(self):
        create_response = self.client.post(reverse('payment-list'), self._payment_payload(), format='json')
        payment_id = create_response.data['id']

        delete_response = self.client.delete(reverse('payment-detail', args=[payment_id]))

        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.paid_amount, Decimal('0.00'))
        self.assertTrue(Payment.objects.get(id=payment_id).is_deleted)

    def test_deposit_payment_can_be_less_than_half_of_booking_total(self):
        response = self.client.post(
            reverse('payment-list'),
            self._payment_payload(amount='100.00', payment_type='DEPOSIT', txn_reference='TXN-003'),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.paid_amount, Decimal('100.00'))

    def test_payment_cannot_exceed_remaining_balance(self):
        self.client.post(
            reverse('payment-list'),
            self._payment_payload(amount='900.00', payment_type='FULL', txn_reference='TXN-004'),
            format='json',
        )

        response = self.client.post(
            reverse('payment-list'),
            self._payment_payload(amount='200.00', payment_type='BALANCE', txn_reference='TXN-005'),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('amount', response.data)

    def test_kes_payment_is_allowed_and_updates_booking(self):
        self.booking.currency = 'KES'
        self.booking.total_cost = Decimal('10000.00')
        self.booking.save(update_fields=['currency', 'total_cost', 'updated_at'])

        response = self.client.post(
            reverse('payment-list'),
            self._payment_payload(
                amount='5000.00',
                currency='KES',
                payment_type='DEPOSIT',
                exchange_rate='1.0000',
                txn_reference='TXN-KES-001',
            ),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.paid_amount, Decimal('5000.00'))

    def test_payment_list_includes_booking_context_even_without_receipt(self):
        payment = Payment.objects.create(
            booking=self.booking,
            amount=Decimal('120.00'),
            currency='USD',
            exchange_rate=Decimal('1.0000'),
            payment_type='DEPOSIT',
            method='MPESA',
            payment_date='2026-04-06T00:00:00Z',
            txn_reference='TXN-NO-RECEIPT',
            notes='Legacy imported payment',
            received_by=self.user,
        )

        response = self.client.get(reverse('payment-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]['id']), str(payment.id))
        self.assertEqual(response.data[0]['booking_ref'], self.booking.reference_no)
        self.assertEqual(response.data[0]['client_name'], self.customer.full_name)
        self.assertIsNone(response.data[0]['receipt'])
        self.assertIsNone(response.data[0]['receipt_no'])
