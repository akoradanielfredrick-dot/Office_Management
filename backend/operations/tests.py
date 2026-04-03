from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Role
from clients.models import Client

from .models import ExternalProductMapping, InboundBookingPayload, IntegrationEventType, IntegrationProvider, Product, ProductParticipantCategory, ProductSchedule, Reservation
from .services import (
    amend_booking,
    cancel_booking,
    cancel_reservation,
    convert_reservation_to_booking,
    create_booking,
    create_reservation,
    mark_inbound_booking_payload_processed,
    register_inbound_booking_payload,
)


class InventoryFlowTests(TestCase):
    def setUp(self):
        role = Role.objects.create(name="OPERATIONS", description="Operations")
        self.user = get_user_model().objects.create_user(
            email="ops@example.com",
            password="StrongPass123!",
            full_name="Ops User",
            role=role,
        )
        self.client_record = Client.objects.create(
            full_name="Jane Traveller",
            email="jane@example.com",
            phone="+254700000000",
        )
        self.product = Product.objects.create(
            name="Mombasa City Tour",
            slug="mombasa-city-tour",
            category=Product.Category.EXCURSION,
            pricing_mode=Product.PricingMode.PER_PERSON,
            destination="Mombasa",
            default_currency="KES",
        )
        self.adult_category = ProductParticipantCategory.objects.create(
            product=self.product,
            code=ProductParticipantCategory.Code.ADULT,
            label="Adult",
        )
        self.child_category = ProductParticipantCategory.objects.create(
            product=self.product,
            code=ProductParticipantCategory.Code.CHILD,
            label="Child",
        )
        self.schedule = ProductSchedule.objects.create(
            product=self.product,
            schedule_type=ProductSchedule.ScheduleType.TIME_POINT,
            start_at=timezone.now() + timedelta(days=3),
            end_at=timezone.now() + timedelta(days=3, hours=4),
            total_capacity=10,
            remaining_capacity=10,
        )
        self.schedule.category_availability.create(
            participant_category=self.adult_category,
            total_capacity=8,
            remaining_capacity=8,
        )
        self.schedule.category_availability.create(
            participant_category=self.child_category,
            total_capacity=4,
            remaining_capacity=4,
        )
        self.second_schedule = ProductSchedule.objects.create(
            product=self.product,
            schedule_type=ProductSchedule.ScheduleType.TIME_POINT,
            start_at=timezone.now() + timedelta(days=5),
            end_at=timezone.now() + timedelta(days=5, hours=4),
            total_capacity=6,
            remaining_capacity=6,
        )
        self.second_schedule.category_availability.create(
            participant_category=self.adult_category,
            total_capacity=6,
            remaining_capacity=6,
        )
        self.second_schedule.category_availability.create(
            participant_category=self.child_category,
            total_capacity=3,
            remaining_capacity=3,
        )
        self.mapping = ExternalProductMapping.objects.create(
            provider=IntegrationProvider.GET_YOUR_GUIDE,
            product=self.product,
            participant_category=self.adult_category,
            external_product_id="gyg-product-100",
            external_option_id="gyg-option-1",
            external_rate_id="adult-standard",
            external_category_code="ADULT",
            external_product_name="Mombasa City Tour",
            is_default=True,
        )
        self.api_client = APIClient()
        self.api_client.force_authenticate(user=self.user)

    def test_active_reservation_reduces_and_cancel_releases_inventory(self):
        reservation = create_reservation(
            data={
                "client": self.client_record.id,
                "schedule": self.schedule.id,
                "customer_full_name": self.client_record.full_name,
                "customer_email": self.client_record.email,
                "customer_phone": self.client_record.phone,
                "hold_expires_at": timezone.now() + timedelta(minutes=30),
                "participants": [
                    {
                        "participant_category": self.adult_category.id,
                        "category_code": "ADULT",
                        "category_label": "Adult",
                        "quantity": 3,
                        "unit_price": "5000.00",
                    }
                ],
            },
            user=self.user,
        )

        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.reserved_count, 3)
        self.assertEqual(self.schedule.remaining_capacity, 7)

        cancel_reservation(
            reservation_id=reservation.id,
            reason="Client changed plans",
            cancelled_by_type=Reservation.CancelledBy.ADMIN,
            user=self.user,
        )

        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.reserved_count, 0)
        self.assertEqual(self.schedule.remaining_capacity, 10)

    def test_reservation_conversion_moves_inventory_from_hold_to_booking(self):
        reservation = create_reservation(
            data={
                "client": self.client_record.id,
                "schedule": self.schedule.id,
                "customer_full_name": self.client_record.full_name,
                "customer_email": self.client_record.email,
                "customer_phone": self.client_record.phone,
                "hold_expires_at": timezone.now() + timedelta(minutes=45),
                "participants": [
                    {
                        "participant_category": self.adult_category.id,
                        "category_code": "ADULT",
                        "category_label": "Adult",
                        "quantity": 2,
                        "unit_price": "5000.00",
                    },
                    {
                        "participant_category": self.child_category.id,
                        "category_code": "CHILD",
                        "category_label": "Child",
                        "quantity": 1,
                        "unit_price": "2500.00",
                    },
                ],
            },
            user=self.user,
        )

        booking = convert_reservation_to_booking(
            reservation_id=reservation.id,
            booking_data={
                "status": "CONFIRMED",
                "source": "ADMIN",
                "currency": "KES",
                "number_of_days": 1,
                "travel_date": self.schedule.start_at.date(),
            },
            user=self.user,
        )

        reservation.refresh_from_db()
        self.schedule.refresh_from_db()
        self.assertEqual(reservation.status, Reservation.Status.CONVERTED)
        self.assertEqual(booking.status, "CONFIRMED")
        self.assertEqual(self.schedule.reserved_count, 0)
        self.assertEqual(self.schedule.confirmed_count, 3)
        self.assertEqual(self.schedule.remaining_capacity, 7)

    def test_booking_cancellation_can_restore_inventory(self):
        booking = create_booking(
            data={
                "client": self.client_record.id,
                "schedule": self.schedule.id,
                "status": "CONFIRMED",
                "source": "MANUAL_OFFICE",
                "currency": "KES",
                "number_of_days": 1,
                "travel_date": self.schedule.start_at.date(),
                "participants": [
                    {
                        "participant_category": self.adult_category.id,
                        "category_code": "ADULT",
                        "category_label": "Adult",
                        "quantity": 4,
                        "unit_price": "5000.00",
                    }
                ],
            },
            user=self.user,
        )

        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.confirmed_count, 4)
        self.assertEqual(self.schedule.remaining_capacity, 6)

        cancel_booking(
            booking_id=booking.id,
            reason="Supplier vehicle unavailable",
            cancelled_by_type="ADMIN",
            refund_status="REFUND_PENDING",
            release_inventory=True,
            user=self.user,
        )

        self.schedule.refresh_from_db()
        booking.refresh_from_db()
        self.assertEqual(booking.status, "CANCELLED")
        self.assertTrue(booking.inventory_released_on_cancel)
        self.assertEqual(self.schedule.confirmed_count, 0)
        self.assertEqual(self.schedule.remaining_capacity, 10)

    def test_booking_amendment_reallocates_inventory_between_schedules(self):
        booking = create_booking(
            data={
                "client": self.client_record.id,
                "schedule": self.schedule.id,
                "status": "CONFIRMED",
                "source": "MANUAL_OFFICE",
                "currency": "KES",
                "number_of_days": 1,
                "travel_date": self.schedule.start_at.date(),
                "participants": [
                    {
                        "participant_category": self.adult_category.id,
                        "category_code": "ADULT",
                        "category_label": "Adult",
                        "quantity": 2,
                        "unit_price": "5000.00",
                    }
                ],
            },
            user=self.user,
        )

        amend_booking(
            booking_id=booking.id,
            data={
                "schedule": self.second_schedule.id,
                "status": "AMENDED",
                "participants": [
                    {
                        "participant_category": self.adult_category.id,
                        "category_code": "ADULT",
                        "category_label": "Adult",
                        "quantity": 3,
                        "unit_price": "5000.00",
                    }
                ],
            },
            user=self.user,
        )

        booking.refresh_from_db()
        self.schedule.refresh_from_db()
        self.second_schedule.refresh_from_db()
        self.assertEqual(booking.status, "AMENDED")
        self.assertEqual(str(booking.schedule_id), str(self.second_schedule.id))
        self.assertEqual(self.schedule.confirmed_count, 0)
        self.assertEqual(self.schedule.remaining_capacity, 10)
        self.assertEqual(self.second_schedule.confirmed_count, 3)
        self.assertEqual(self.second_schedule.remaining_capacity, 3)

    def test_booking_list_supports_server_side_filters_and_pagination(self):
        create_booking(
            data={
                "client": self.client_record.id,
                "schedule": self.schedule.id,
                "status": "CONFIRMED",
                "source": "MANUAL_OFFICE",
                "currency": "KES",
                "number_of_days": 1,
                "travel_date": timezone.localdate() + timedelta(days=2),
                "participants": [
                    {
                        "participant_category": self.adult_category.id,
                        "category_code": "ADULT",
                        "category_label": "Adult",
                        "quantity": 2,
                        "unit_price": "5000.00",
                    }
                ],
            },
            user=self.user,
        )
        cancelled_booking = create_booking(
            data={
                "client": self.client_record.id,
                "schedule": self.second_schedule.id,
                "status": "CONFIRMED",
                "source": "OTA",
                "currency": "KES",
                "number_of_days": 1,
                "travel_date": timezone.localdate() - timedelta(days=1),
                "participants": [
                    {
                        "participant_category": self.adult_category.id,
                        "category_code": "ADULT",
                        "category_label": "Adult",
                        "quantity": 1,
                        "unit_price": "5000.00",
                    }
                ],
            },
            user=self.user,
        )
        cancel_booking(
            booking_id=cancelled_booking.id,
            reason="No-show",
            cancelled_by_type="ADMIN",
            refund_status="PENDING",
            release_inventory=True,
            user=self.user,
        )

        response = self.api_client.get(
            "/api/operations/bookings/",
            {
                "status": "CANCELLED",
                "refund_status": "PENDING",
                "travel_window": "PAST",
                "page": 1,
                "page_size": 10,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("results", response.data)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["status"], "CANCELLED")
        self.assertEqual(response.data["results"][0]["refund_status"], "PENDING")

    def test_reservation_list_supports_server_side_filters_and_pagination(self):
        create_reservation(
            data={
                "client": self.client_record.id,
                "schedule": self.schedule.id,
                "customer_full_name": self.client_record.full_name,
                "customer_email": self.client_record.email,
                "customer_phone": self.client_record.phone,
                "hold_expires_at": timezone.now() + timedelta(hours=8),
                "participants": [
                    {
                        "participant_category": self.adult_category.id,
                        "category_code": "ADULT",
                        "category_label": "Adult",
                        "quantity": 2,
                        "unit_price": "5000.00",
                    }
                ],
            },
            user=self.user,
        )
        expired_reservation = create_reservation(
            data={
                "client": self.client_record.id,
                "schedule": self.second_schedule.id,
                "customer_full_name": self.client_record.full_name,
                "customer_email": self.client_record.email,
                "customer_phone": self.client_record.phone,
                "hold_expires_at": timezone.now() + timedelta(hours=12),
                "participants": [
                    {
                        "participant_category": self.adult_category.id,
                        "category_code": "ADULT",
                        "category_label": "Adult",
                        "quantity": 1,
                        "unit_price": "5000.00",
                    }
                ],
            },
            user=self.user,
        )
        expired_reservation.hold_expires_at = timezone.now() - timedelta(hours=1)
        expired_reservation.status = Reservation.Status.EXPIRED
        expired_reservation.save(update_fields=["hold_expires_at", "status"])

        response = self.api_client.get(
            "/api/operations/reservations/",
            {
                "status": "EXPIRED",
                "hold_window": "EXPIRED",
                "page": 1,
                "page_size": 10,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("results", response.data)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["status"], "EXPIRED")

    def test_schedule_list_supports_server_side_filters_and_pagination(self):
        ProductSchedule.objects.create(
            product=self.product,
            schedule_type=ProductSchedule.ScheduleType.TIME_PERIOD,
            start_at=timezone.now() + timedelta(days=10),
            end_at=timezone.now() + timedelta(days=10, hours=6),
            total_capacity=0,
            remaining_capacity=0,
            status=ProductSchedule.Status.SOLD_OUT,
        )

        response = self.api_client.get(
            "/api/operations/schedules/",
            {
                "status": "AVAILABLE",
                "available_only": True,
                "page": 1,
                "page_size": 10,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("results", response.data)
        self.assertEqual(response.data["count"], 2)
        self.assertTrue(all(item["status"] == "AVAILABLE" for item in response.data["results"]))

    def test_register_inbound_payload_tracks_idempotency_and_duplicates(self):
        first_payload, first_record, first_duplicate = register_inbound_booking_payload(
            provider=IntegrationProvider.GET_YOUR_GUIDE,
            event_type=IntegrationEventType.BOOKING_CREATE,
            raw_payload={
                "external_product_id": "gyg-product-100",
                "external_option_id": "gyg-option-1",
                "external_rate_id": "adult-standard",
                "booking_reference": "GYG-REF-100",
            },
            idempotency_key="gyg-create-100",
            request_headers={"Idempotency-Key": "gyg-create-100"},
            external_booking_reference="GYG-REF-100",
        )
        duplicate_payload, duplicate_record, second_duplicate = register_inbound_booking_payload(
            provider=IntegrationProvider.GET_YOUR_GUIDE,
            event_type=IntegrationEventType.BOOKING_CREATE,
            raw_payload={
                "external_product_id": "gyg-product-100",
                "external_option_id": "gyg-option-1",
                "external_rate_id": "adult-standard",
                "booking_reference": "GYG-REF-100",
            },
            idempotency_key="gyg-create-100",
            request_headers={"Idempotency-Key": "gyg-create-100"},
            external_booking_reference="GYG-REF-100",
        )

        self.assertFalse(first_duplicate)
        self.assertTrue(second_duplicate)
        self.assertEqual(first_record.id, duplicate_record.id)
        self.assertEqual(duplicate_record.hit_count, 2)
        self.assertEqual(first_payload.product_mapping_id, self.mapping.id)
        self.assertEqual(duplicate_payload.processing_status, InboundBookingPayload.ProcessingStatus.DUPLICATE)

    def test_mark_inbound_payload_processed_links_booking_and_completes_record(self):
        payload, _, _ = register_inbound_booking_payload(
            provider=IntegrationProvider.GET_YOUR_GUIDE,
            event_type=IntegrationEventType.BOOKING_CREATE,
            raw_payload={"external_product_id": "gyg-product-100"},
            idempotency_key="gyg-create-200",
            request_headers={"Idempotency-Key": "gyg-create-200"},
            external_booking_reference="GYG-REF-200",
        )
        booking = create_booking(
            data={
                "client": self.client_record.id,
                "schedule": self.schedule.id,
                "status": "CONFIRMED",
                "source": "OTA",
                "integration_provider": IntegrationProvider.GET_YOUR_GUIDE,
                "external_booking_reference": "GYG-REF-200",
                "currency": "KES",
                "number_of_days": 1,
                "travel_date": self.schedule.start_at.date(),
                "participants": [
                    {
                        "participant_category": self.adult_category.id,
                        "category_code": "ADULT",
                        "category_label": "Adult",
                        "quantity": 1,
                        "unit_price": "5000.00",
                    }
                ],
            },
            user=self.user,
        )

        processed_payload = mark_inbound_booking_payload_processed(
            payload_id=payload.id,
            booking=booking,
            processing_notes="Inbound booking matched and stored.",
            user=self.user,
        )

        processed_payload.refresh_from_db()
        self.assertEqual(processed_payload.booking_id, booking.id)
        self.assertEqual(processed_payload.processing_status, InboundBookingPayload.ProcessingStatus.PROCESSED)
        self.assertIsNotNone(processed_payload.processed_at)
        self.assertEqual(processed_payload.idempotency_record.processing_status, "COMPLETED")
