import base64
from collections import defaultdict
from decimal import Decimal
import hashlib
import json
import uuid
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request

from django.db import transaction
from django.db import models
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from clients.models import Client
from common.models import ActivityLog

from .models import (
    ApiIdempotencyRecord,
    Booking,
    BookingAuditEntry,
    BookingParticipant,
    ExternalProductMapping,
    InboundBookingPayload,
    IntegrationProvider,
    IntegrationEventType,
    ProductParticipantCategory,
    ProductSchedule,
    Reservation,
    ReservationParticipant,
    ScheduleCategoryAvailability,
    Product,
    ProductPrice,
)


BOOKING_INVENTORY_STATUSES = [
    Booking.Status.PENDING,
    Booking.Status.CONFIRMED,
    Booking.Status.ONGOING,
    Booking.Status.AMENDED,
]


def _pk(value):
    return getattr(value, "id", value)


def _canonical_payload_hash(payload):
    serialized = json.dumps(payload or {}, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _append_audit_trail(existing_trail, action, user, extra=None):
    entry = {
        "action": action,
        "timestamp": timezone.now().isoformat(),
        "user_id": str(user.id) if user else None,
    }
    if extra:
        entry.update(extra)
    return [*existing_trail, entry]


def _participant_payload(rows):
    payload = []
    for row in rows:
        payload.append({
            "category_code": row["category_code"],
            "quantity": int(row["quantity"]),
            "unit_price": str(Decimal(row.get("unit_price") or 0)),
        })
    return payload


def _resolve_category(product, line):
    category_id = line.get("participant_category")
    category_code = line.get("category_code")

    category = None
    if category_id:
        category = ProductParticipantCategory.objects.get(id=category_id, product=product)
    elif category_code:
        category = ProductParticipantCategory.objects.filter(product=product, code=category_code).first()

    if not category and category_code:
        category = ProductParticipantCategory.objects.filter(product=product, code=category_code).first()

    if category:
        return category, category.code, category.label

    code = category_code or ProductParticipantCategory.Code.ADULT
    label = line.get("category_label") or code.replace("_", " ").title()
    return None, code, label


def expire_stale_reservations(schedule=None, user=None):
    now = timezone.now()
    queryset = Reservation.objects.filter(status=Reservation.Status.ACTIVE, hold_expires_at__lte=now)
    if schedule:
        queryset = queryset.filter(schedule=schedule)

    expired_ids = list(queryset.values_list("id", flat=True))
    if not expired_ids:
        return 0

    with transaction.atomic():
        stale_reservations = list(
            Reservation.objects.select_for_update().filter(id__in=expired_ids)
        )
        schedule_ids = {reservation.schedule_id for reservation in stale_reservations}
        ProductSchedule.objects.select_for_update().filter(id__in=schedule_ids)
        for reservation in stale_reservations:
            reservation.status = Reservation.Status.EXPIRED
            reservation.cancelled_at = now
            reservation.cancelled_by_type = Reservation.CancelledBy.SYSTEM
            reservation.cancellation_reason = reservation.cancellation_reason or "Reservation expired automatically."
            reservation.audit_trail = _append_audit_trail(
                reservation.audit_trail,
                "expired",
                user,
                {"reason": reservation.cancellation_reason},
            )
            reservation.save(
                update_fields=[
                    "status",
                    "cancelled_at",
                    "cancelled_by_type",
                    "cancellation_reason",
                    "audit_trail",
                    "updated_at",
                ]
            )
            BookingAuditEntry.objects.create(
                entity_type=BookingAuditEntry.EntityType.RESERVATION,
                schedule=reservation.schedule,
                reservation=reservation,
                action="expired",
                actor=user,
                notes=reservation.cancellation_reason,
            )
            ActivityLog.objects.create(
                user=user,
                action=f"Expired Reservation: {reservation.reference_no}",
                table_name="Reservation",
                record_id=reservation.id,
            )

        for schedule_id in schedule_ids:
            recalculate_schedule_inventory(schedule_id)

    return len(expired_ids)


def recalculate_schedule_inventory(schedule_id):
    schedule = ProductSchedule.objects.select_for_update().get(id=schedule_id)
    now = timezone.now()

    reserved_total = (
        ReservationParticipant.objects.filter(
            reservation__schedule=schedule,
            reservation__status=Reservation.Status.ACTIVE,
            reservation__hold_expires_at__gt=now,
        ).aggregate(total=Coalesce(Sum("quantity"), 0))["total"]
        or 0
    )
    confirmed_total = (
        BookingParticipant.objects.filter(
            booking__schedule=schedule,
            booking__status__in=BOOKING_INVENTORY_STATUSES,
        ).aggregate(total=Coalesce(Sum("quantity"), 0))["total"]
        or 0
    )
    cancelled_total = (
        BookingParticipant.objects.filter(
            booking__schedule=schedule,
            booking__status=Booking.Status.CANCELLED,
            booking__inventory_released_on_cancel=False,
        ).aggregate(total=Coalesce(Sum("quantity"), 0))["total"]
        or 0
    )
    released_total = (
        ReservationParticipant.objects.filter(
            reservation__schedule=schedule,
            reservation__status__in=[Reservation.Status.EXPIRED, Reservation.Status.CANCELLED],
        ).aggregate(total=Coalesce(Sum("quantity"), 0))["total"]
        or 0
    )
    released_total += (
        BookingParticipant.objects.filter(
            booking__schedule=schedule,
            booking__status=Booking.Status.CANCELLED,
            booking__inventory_released_on_cancel=True,
        ).aggregate(total=Coalesce(Sum("quantity"), 0))["total"]
        or 0
    )

    schedule.reserved_count = reserved_total
    schedule.confirmed_count = confirmed_total
    schedule.cancelled_count = cancelled_total
    schedule.released_count = released_total
    schedule.remaining_capacity = max(
        schedule.total_capacity
        - schedule.manual_blocked_count
        - schedule.reserved_count
        - schedule.confirmed_count,
        0,
    )
    if schedule.status not in [ProductSchedule.Status.CANCELLED, ProductSchedule.Status.PAUSED]:
        schedule.status = (
            ProductSchedule.Status.SOLD_OUT
            if schedule.remaining_capacity <= 0
            else ProductSchedule.Status.AVAILABLE
        )
    schedule.save(
        update_fields=[
            "reserved_count",
            "confirmed_count",
            "cancelled_count",
            "released_count",
            "remaining_capacity",
            "status",
            "updated_at",
        ]
    )

    category_reserved = defaultdict(int)
    for row in ReservationParticipant.objects.filter(
        reservation__schedule=schedule,
        reservation__status=Reservation.Status.ACTIVE,
        reservation__hold_expires_at__gt=now,
    ).values("category_code").annotate(total=Coalesce(Sum("quantity"), 0)):
        category_reserved[row["category_code"]] = int(row["total"] or 0)

    category_confirmed = defaultdict(int)
    for row in BookingParticipant.objects.filter(
        booking__schedule=schedule,
        booking__status__in=BOOKING_INVENTORY_STATUSES,
    ).values("category_code").annotate(total=Coalesce(Sum("quantity"), 0)):
        category_confirmed[row["category_code"]] = int(row["total"] or 0)

    category_cancelled = defaultdict(int)
    for row in BookingParticipant.objects.filter(
        booking__schedule=schedule,
        booking__status=Booking.Status.CANCELLED,
        booking__inventory_released_on_cancel=False,
    ).values("category_code").annotate(total=Coalesce(Sum("quantity"), 0)):
        category_cancelled[row["category_code"]] = int(row["total"] or 0)

    category_released = defaultdict(int)
    for row in ReservationParticipant.objects.filter(
        reservation__schedule=schedule,
        reservation__status__in=[Reservation.Status.EXPIRED, Reservation.Status.CANCELLED],
    ).values("category_code").annotate(total=Coalesce(Sum("quantity"), 0)):
        category_released[row["category_code"]] += int(row["total"] or 0)
    for row in BookingParticipant.objects.filter(
        booking__schedule=schedule,
        booking__status=Booking.Status.CANCELLED,
        booking__inventory_released_on_cancel=True,
    ).values("category_code").annotate(total=Coalesce(Sum("quantity"), 0)):
        category_released[row["category_code"]] += int(row["total"] or 0)

    for bucket in schedule.category_availability.select_for_update():
        bucket.reserved_count = category_reserved[bucket.participant_category.code]
        bucket.confirmed_count = category_confirmed[bucket.participant_category.code]
        bucket.cancelled_count = category_cancelled[bucket.participant_category.code]
        bucket.released_count = category_released[bucket.participant_category.code]
        bucket.remaining_capacity = max(
            bucket.total_capacity
            - bucket.manual_blocked_count
            - bucket.reserved_count
            - bucket.confirmed_count,
            0,
        )
        bucket.save(
            update_fields=[
                "reserved_count",
                "confirmed_count",
                "cancelled_count",
                "released_count",
                "remaining_capacity",
                "updated_at",
            ]
        )

    return schedule


def _validate_schedule_capacity(schedule, participant_rows):
    requested_total = sum(int(row["quantity"]) for row in participant_rows)
    if requested_total <= 0:
        raise ValueError("At least one participant is required.")

    if schedule.status in [ProductSchedule.Status.CANCELLED, ProductSchedule.Status.PAUSED]:
        raise ValueError("This schedule is not open for sale.")

    if requested_total > schedule.remaining_capacity:
        raise ValueError(f"Only {schedule.remaining_capacity} spaces remain on this schedule.")

    bucket_map = {
        bucket.participant_category.code: bucket
        for bucket in schedule.category_availability.select_for_update()
    }
    for row in participant_rows:
        bucket = bucket_map.get(row["category_code"])
        if bucket and int(row["quantity"]) > bucket.remaining_capacity:
            raise ValueError(
                f"Only {bucket.remaining_capacity} {row['category_code'].lower()} spaces remain."
            )


def _create_reservation_lines(reservation, participant_rows):
    created = []
    for row in participant_rows:
        category, category_code, category_label = _resolve_category(reservation.product, row)
        created.append(
            ReservationParticipant.objects.create(
                reservation=reservation,
                participant_category=category,
                category_code=category_code,
                category_label=category_label,
                quantity=int(row["quantity"]),
                unit_price=Decimal(row.get("unit_price") or 0),
            )
        )
    return created


def _create_booking_lines(booking, participant_rows):
    created = []
    for row in participant_rows:
        category, category_code, category_label = _resolve_category(booking.product, row)
        created.append(
            BookingParticipant.objects.create(
                booking=booking,
                participant_category=category,
                category_code=category_code,
                category_label=category_label,
                quantity=int(row["quantity"]),
                unit_price=Decimal(row.get("unit_price") or 0),
            )
        )
    return created


def _update_booking_legacy_counts(booking, participant_rows):
    booking.num_adults = sum(
        int(row["quantity"])
        for row in participant_rows
        if row["category_code"] == ProductParticipantCategory.Code.ADULT
    )
    booking.num_children = sum(
        int(row["quantity"])
        for row in participant_rows
        if row["category_code"] == ProductParticipantCategory.Code.CHILD
    )
    adult_prices = [Decimal(row.get("unit_price") or 0) for row in participant_rows if row["category_code"] == ProductParticipantCategory.Code.ADULT]
    child_prices = [Decimal(row.get("unit_price") or 0) for row in participant_rows if row["category_code"] == ProductParticipantCategory.Code.CHILD]
    booking.price_per_adult = adult_prices[0] if adult_prices else Decimal("0.00")
    booking.price_per_child = child_prices[0] if child_prices else Decimal("0.00")


def _reprice_booking_from_lines(booking, participant_rows):
    participant_total = sum(
        Decimal(row.get("unit_price") or 0) * Decimal(int(row["quantity"]))
        for row in participant_rows
    )
    booking.subtotal = participant_total + Decimal(booking.extra_charges or 0)
    booking.total_cost = max(booking.subtotal - Decimal(booking.discount or 0), Decimal("0.00"))
    booking.save(update_fields=["subtotal", "total_cost", "updated_at"])


def _is_inventory_consuming_status(status):
    return status in BOOKING_INVENTORY_STATUSES


def _booking_participant_rows(booking):
    return [
        {
            "participant_category": str(line.participant_category_id) if line.participant_category_id else None,
            "category_code": line.category_code,
            "category_label": line.category_label,
            "quantity": line.quantity,
            "unit_price": line.unit_price,
        }
        for line in booking.participant_quantities.all()
    ]


def _validate_schedule_capacity_for_amendment(schedule, participant_rows, current_booking=None):
    requested_total = sum(int(row["quantity"]) for row in participant_rows)
    if requested_total <= 0:
        raise ValueError("At least one participant is required.")

    if schedule.status in [ProductSchedule.Status.CANCELLED, ProductSchedule.Status.PAUSED]:
        raise ValueError("This schedule is not open for sale.")

    current_total = 0
    current_by_category = defaultdict(int)
    if current_booking and current_booking.schedule_id == schedule.id:
        for line in current_booking.participant_quantities.all():
            current_total += int(line.quantity)
            current_by_category[line.category_code] += int(line.quantity)

    available_total = int(schedule.remaining_capacity) + current_total
    if requested_total > available_total:
        raise ValueError(f"Only {available_total} spaces remain available for this amendment.")

    bucket_map = {
        bucket.participant_category.code: bucket
        for bucket in schedule.category_availability.select_for_update()
    }
    for row in participant_rows:
        bucket = bucket_map.get(row["category_code"])
        if bucket:
            available_for_category = int(bucket.remaining_capacity) + current_by_category[row["category_code"]]
            if int(row["quantity"]) > available_for_category:
                raise ValueError(
                    f"Only {available_for_category} {row['category_code'].lower()} spaces remain available for this amendment."
                )


def create_reservation(*, data, user):
    with transaction.atomic():
        schedule = ProductSchedule.objects.select_for_update().get(id=_pk(data["schedule"]))
        ProductSchedule.objects.select_for_update().filter(id=schedule.id)
        expire_stale_reservations(schedule=schedule, user=user)
        schedule.refresh_from_db()

        product = schedule.product
        participant_rows = _participant_payload(data.get("participants") or [])
        _validate_schedule_capacity(schedule, participant_rows)

        reservation = Reservation.objects.create(
            client_id=_pk(data.get("client")),
            product=product,
            schedule=schedule,
            customer_full_name=data["customer_full_name"],
            customer_email=data.get("customer_email"),
            customer_phone=data.get("customer_phone"),
            hold_expires_at=data["hold_expires_at"],
            notes=data.get("notes", ""),
            internal_comments=data.get("internal_comments", ""),
            metadata=data.get("metadata") or {},
            created_by_user=user,
            audit_trail=_append_audit_trail([], "created", user),
        )
        _create_reservation_lines(reservation, participant_rows)
        schedule = recalculate_schedule_inventory(schedule.id)

        BookingAuditEntry.objects.create(
            entity_type=BookingAuditEntry.EntityType.RESERVATION,
            schedule=schedule,
            reservation=reservation,
            action="created",
            actor=user,
            payload={"participants": participant_rows},
        )
        ActivityLog.objects.create(
            user=user,
            action=f"Created Reservation: {reservation.reference_no}",
            table_name="Reservation",
            record_id=reservation.id,
            details={"participants": participant_rows},
        )
        return reservation


def create_booking(*, data, user):
    with transaction.atomic():
        participant_rows = _participant_payload(data.get("participants") or [])
        schedule_id = _pk(data.get("schedule"))
        product_id = _pk(data.get("product"))
        schedule = None
        product = None

        if schedule_id:
            schedule = ProductSchedule.objects.select_for_update().get(id=schedule_id)
            expire_stale_reservations(schedule=schedule, user=user)
            schedule.refresh_from_db()
            _validate_schedule_capacity(schedule, participant_rows)
            product = schedule.product
        elif product_id:
            product = Product.objects.get(id=product_id)
        else:
            raise ValueError("A product is required when no schedule is selected.")

        booking = Booking.objects.create(
            client_id=_pk(data["client"]),
            product=product,
            schedule=schedule,
            status=data.get("status", Booking.Status.CONFIRMED),
            source=data.get("source", Booking.Source.MANUAL_OFFICE),
            integration_provider=data.get("integration_provider", ""),
            external_booking_reference=data.get("external_booking_reference", ""),
            currency=data.get("currency", product.default_currency if product else "KES"),
            customer_full_name=data.get("customer_full_name") or "",
            customer_email=data.get("customer_email"),
            customer_phone=data.get("customer_phone"),
            product_destination_snapshot=data.get("product_destination_snapshot", ""),
            number_of_days=int(data.get("number_of_days") or 1),
            travel_date=data.get("travel_date"),
            extra_charges=Decimal(data.get("extra_charges") or 0),
            discount=Decimal(data.get("discount") or 0),
            itinerary=data.get("itinerary", ""),
            booking_validity=data.get("booking_validity", ""),
            deposit_terms=data.get("deposit_terms", ""),
            payment_channels=data.get("payment_channels", ""),
            notes=data.get("notes", ""),
            internal_notes=data.get("internal_notes", ""),
            supplier_notes=data.get("supplier_notes", ""),
            metadata=data.get("metadata") or {},
        )
        _update_booking_legacy_counts(booking, participant_rows)
        booking.save()
        _create_booking_lines(booking, participant_rows)
        _reprice_booking_from_lines(booking, participant_rows)

        if schedule:
            schedule = recalculate_schedule_inventory(schedule.id)
        BookingAuditEntry.objects.create(
            entity_type=BookingAuditEntry.EntityType.BOOKING,
            schedule=schedule,
            booking=booking,
            action="created",
            actor=user,
            payload={"participants": participant_rows, "source": booking.source},
        )
        ActivityLog.objects.create(
            user=user,
            action=f"Created Booking: {booking.reference_no}",
            table_name="Booking",
            record_id=booking.id,
            details={"participants": participant_rows, "source": booking.source},
        )
        return booking


def convert_reservation_to_booking(*, reservation_id, booking_data, user):
    with transaction.atomic():
        reservation = Reservation.objects.select_for_update().get(id=reservation_id)
        schedule = ProductSchedule.objects.select_for_update().get(id=reservation.schedule_id)
        expire_stale_reservations(schedule=schedule, user=user)
        reservation.refresh_from_db()
        if reservation.status != Reservation.Status.ACTIVE or reservation.hold_expires_at <= timezone.now():
            raise ValueError("Only active reservations can be converted to bookings.")

        participant_rows = _participant_payload(
            [
                {
                    "participant_category": str(item.participant_category_id) if item.participant_category_id else None,
                    "category_code": item.category_code,
                    "category_label": item.category_label,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                }
                for item in reservation.participants.all()
            ]
        )

        booking = Booking.objects.create(
            client=reservation.client,
            product=reservation.product,
            schedule=schedule,
            reservation=reservation,
            status=booking_data.get("status", Booking.Status.CONFIRMED),
            source=booking_data.get("source", Booking.Source.ADMIN),
            integration_provider=booking_data.get("integration_provider", ""),
            external_booking_reference=booking_data.get("external_booking_reference", ""),
            currency=booking_data.get("currency", reservation.product.default_currency),
            customer_full_name=reservation.customer_full_name,
            customer_email=reservation.customer_email,
            customer_phone=reservation.customer_phone,
            product_destination_snapshot=booking_data.get("product_destination_snapshot", reservation.product.destination or reservation.product.name),
            number_of_days=int(booking_data.get("number_of_days") or 1),
            travel_date=booking_data.get("travel_date"),
            extra_charges=Decimal(booking_data.get("extra_charges") or 0),
            discount=Decimal(booking_data.get("discount") or 0),
            itinerary=booking_data.get("itinerary", reservation.product.description),
            booking_validity=booking_data.get("booking_validity", ""),
            deposit_terms=booking_data.get("deposit_terms", ""),
            payment_channels=booking_data.get("payment_channels", ""),
            notes=booking_data.get("notes", reservation.notes),
            internal_notes=booking_data.get("internal_notes", reservation.internal_comments),
            supplier_notes=booking_data.get("supplier_notes", ""),
            metadata=booking_data.get("metadata") or {},
        )
        _update_booking_legacy_counts(booking, participant_rows)
        booking.save()
        _create_booking_lines(booking, participant_rows)
        _reprice_booking_from_lines(booking, participant_rows)

        reservation.status = Reservation.Status.CONVERTED
        reservation.audit_trail = _append_audit_trail(
            reservation.audit_trail,
            "converted",
            user,
            {"booking_id": str(booking.id)},
        )
        reservation.save(update_fields=["status", "audit_trail", "updated_at"])

        schedule = recalculate_schedule_inventory(schedule.id)
        BookingAuditEntry.objects.create(
            entity_type=BookingAuditEntry.EntityType.RESERVATION,
            schedule=schedule,
            reservation=reservation,
            booking=booking,
            action="converted",
            actor=user,
            payload={"booking_id": str(booking.id)},
        )
        ActivityLog.objects.create(
            user=user,
            action=f"Converted Reservation {reservation.reference_no} to Booking {booking.reference_no}",
            table_name="Reservation",
            record_id=reservation.id,
            details={"booking_id": str(booking.id)},
        )
        return booking


def cancel_reservation(*, reservation_id, reason, cancelled_by_type, user):
    with transaction.atomic():
        reservation = Reservation.objects.select_for_update().get(id=reservation_id)
        if reservation.status in [Reservation.Status.CANCELLED, Reservation.Status.EXPIRED, Reservation.Status.CONVERTED]:
            raise ValueError("This reservation cannot be cancelled again.")

        ProductSchedule.objects.select_for_update().filter(id=reservation.schedule_id)
        reservation.status = Reservation.Status.CANCELLED
        reservation.cancellation_reason = reason
        reservation.cancelled_at = timezone.now()
        reservation.cancelled_by_type = cancelled_by_type
        reservation.cancelled_by_user = user if cancelled_by_type == Reservation.CancelledBy.ADMIN else None
        reservation.audit_trail = _append_audit_trail(
            reservation.audit_trail,
            "cancelled",
            user,
            {"reason": reason, "cancelled_by_type": cancelled_by_type},
        )
        reservation.save(
            update_fields=[
                "status",
                "cancellation_reason",
                "cancelled_at",
                "cancelled_by_type",
                "cancelled_by_user",
                "audit_trail",
                "updated_at",
            ]
        )
        schedule = recalculate_schedule_inventory(reservation.schedule_id)
        BookingAuditEntry.objects.create(
            entity_type=BookingAuditEntry.EntityType.RESERVATION,
            schedule=schedule,
            reservation=reservation,
            action="cancelled",
            actor=user,
            notes=reason,
        )
        ActivityLog.objects.create(
            user=user,
            action=f"Cancelled Reservation: {reservation.reference_no}",
            table_name="Reservation",
            record_id=reservation.id,
            details={"reason": reason},
        )
        return reservation


def cancel_booking(*, booking_id, reason, cancelled_by_type, refund_status=None, release_inventory=True, user=None):
    with transaction.atomic():
        booking = Booking.objects.select_for_update().get(id=booking_id)
        if booking.status == Booking.Status.CANCELLED:
            raise ValueError("This booking has already been cancelled.")

        if booking.schedule_id:
            ProductSchedule.objects.select_for_update().filter(id=booking.schedule_id)

        booking.status = Booking.Status.CANCELLED
        booking.cancellation_reason = reason
        booking.cancelled_at = timezone.now()
        booking.cancelled_by_type = cancelled_by_type
        booking.cancelled_by_user = user if cancelled_by_type == Booking.CancelledBy.ADMIN else None
        booking.inventory_released_on_cancel = bool(release_inventory)
        if refund_status:
            booking.refund_status = refund_status
        if reason:
            booking.amendment_history = [
                *booking.amendment_history,
                {"action": "cancelled", "timestamp": timezone.now().isoformat(), "reason": reason},
            ]
        booking.save()

        schedule = None
        if booking.schedule_id:
            schedule = recalculate_schedule_inventory(booking.schedule_id)

        BookingAuditEntry.objects.create(
            entity_type=BookingAuditEntry.EntityType.BOOKING,
            schedule=schedule,
            booking=booking,
            action="cancelled",
            actor=user,
            notes=reason,
            payload={"release_inventory": release_inventory, "refund_status": refund_status},
        )
        ActivityLog.objects.create(
            user=user,
            action=f"Cancelled Booking: {booking.reference_no}",
            table_name="Booking",
            record_id=booking.id,
            details={
                "reason": reason,
                "release_inventory": release_inventory,
                "refund_status": refund_status,
            },
        )
        return booking


def amend_booking(*, booking_id, data, user=None):
    with transaction.atomic():
        booking = (
            Booking.objects.select_for_update()
            .prefetch_related("participant_quantities")
            .get(id=booking_id)
        )
        if booking.status == Booking.Status.CANCELLED:
            raise ValueError("Cancelled bookings cannot be amended.")

        old_schedule = None
        if booking.schedule_id:
            old_schedule = ProductSchedule.objects.select_for_update().get(id=booking.schedule_id)
            expire_stale_reservations(schedule=old_schedule, user=user)
            old_schedule.refresh_from_db()

        target_schedule_id = _pk(data.get("schedule")) or booking.schedule_id
        target_schedule = old_schedule
        if target_schedule_id and (not old_schedule or target_schedule_id != old_schedule.id):
            target_schedule = ProductSchedule.objects.select_for_update().get(id=target_schedule_id)
            expire_stale_reservations(schedule=target_schedule, user=user)
            target_schedule.refresh_from_db()

        participant_rows = _participant_payload(data.get("participants") or _booking_participant_rows(booking))
        new_status = data.get("status", booking.status)

        if target_schedule and _is_inventory_consuming_status(new_status):
            _validate_schedule_capacity_for_amendment(target_schedule, participant_rows, current_booking=booking)

        previous_snapshot = {
            "schedule_id": str(booking.schedule_id) if booking.schedule_id else None,
            "status": booking.status,
            "travel_date": booking.travel_date.isoformat() if booking.travel_date else None,
            "number_of_days": booking.number_of_days,
            "extra_charges": str(booking.extra_charges),
            "discount": str(booking.discount),
            "notes": booking.notes,
            "internal_notes": booking.internal_notes,
            "participants": _participant_payload(_booking_participant_rows(booking)),
        }

        if target_schedule:
            booking.schedule = target_schedule
            booking.product = target_schedule.product
        if "status" in data:
            booking.status = new_status
        if "travel_date" in data:
            booking.travel_date = data.get("travel_date")
        if "number_of_days" in data:
            booking.number_of_days = int(data.get("number_of_days") or booking.number_of_days or 1)
        if "extra_charges" in data:
            booking.extra_charges = Decimal(data.get("extra_charges") or 0)
        if "discount" in data:
            booking.discount = Decimal(data.get("discount") or 0)
        if "notes" in data:
            booking.notes = data.get("notes") or ""
        if "internal_notes" in data:
            booking.internal_notes = data.get("internal_notes") or ""
        booking.amendment_history = [
            *booking.amendment_history,
            {
                "action": "amended",
                "timestamp": timezone.now().isoformat(),
                "before": previous_snapshot,
            },
        ]
        booking.save()

        booking.participant_quantities.all().delete()
        _create_booking_lines(booking, participant_rows)
        _update_booking_legacy_counts(booking, participant_rows)
        booking.save()
        _reprice_booking_from_lines(booking, participant_rows)

        affected_schedule_ids = {schedule_id for schedule_id in [booking.schedule_id, previous_snapshot["schedule_id"]] if schedule_id}
        for schedule_id in affected_schedule_ids:
            recalculate_schedule_inventory(schedule_id)

        BookingAuditEntry.objects.create(
            entity_type=BookingAuditEntry.EntityType.BOOKING,
            schedule=booking.schedule,
            booking=booking,
            action="amended",
            actor=user,
            payload={
                "before": previous_snapshot,
                "after": {
                    "schedule_id": str(booking.schedule_id) if booking.schedule_id else None,
                    "status": booking.status,
                    "participants": participant_rows,
                },
            },
        )
        ActivityLog.objects.create(
            user=user,
            action=f"Amended Booking: {booking.reference_no}",
            table_name="Booking",
            record_id=booking.id,
            details={
                "before": previous_snapshot,
                "after": {
                    "schedule_id": str(booking.schedule_id) if booking.schedule_id else None,
                    "status": booking.status,
                    "participants": participant_rows,
                },
            },
        )
        return booking


def register_inbound_booking_payload(
    *,
    provider,
    event_type,
    raw_payload,
    idempotency_key,
    request_headers=None,
    normalized_payload=None,
    external_booking_reference="",
    external_supplier_reference="",
    source_endpoint="",
    product_mapping=None,
):
    if not idempotency_key:
        raise ValueError("An idempotency key is required for inbound booking payloads.")

    payload_hash = _canonical_payload_hash(raw_payload)
    with transaction.atomic():
        idempotency_record, created = ApiIdempotencyRecord.objects.select_for_update().get_or_create(
            provider=provider,
            event_type=event_type,
            idempotency_key=idempotency_key,
            defaults={
                "request_hash": payload_hash,
                "processing_status": ApiIdempotencyRecord.ProcessingStatus.RECEIVED,
            },
        )

        if not created:
            idempotency_record.hit_count += 1
            idempotency_record.last_seen_at = timezone.now()
            if not idempotency_record.request_hash:
                idempotency_record.request_hash = payload_hash
            idempotency_record.save(update_fields=["hit_count", "last_seen_at", "request_hash", "updated_at"])

        mapping = None
        if product_mapping:
            mapping = product_mapping
        elif isinstance(raw_payload, dict):
            external_product_id = raw_payload.get("external_product_id") or raw_payload.get("product_id")
            external_option_id = raw_payload.get("external_option_id") or raw_payload.get("option_id") or ""
            external_rate_id = raw_payload.get("external_rate_id") or raw_payload.get("rate_id") or ""
            if external_product_id:
                mapping = ExternalProductMapping.objects.filter(
                    provider=provider,
                    external_product_id=str(external_product_id),
                    external_option_id=str(external_option_id),
                    external_rate_id=str(external_rate_id),
                    is_active=True,
                ).first()

        is_duplicate = idempotency_record.hit_count > 1
        payload_record = InboundBookingPayload.objects.create(
            provider=provider,
            event_type=event_type,
            idempotency_record=idempotency_record,
            product_mapping=mapping,
            external_booking_reference=external_booking_reference,
            external_supplier_reference=external_supplier_reference,
            source_endpoint=source_endpoint,
            request_headers=request_headers or {},
            raw_payload=raw_payload or {},
            normalized_payload=normalized_payload or {},
            payload_hash=payload_hash,
            processing_status=InboundBookingPayload.ProcessingStatus.DUPLICATE if is_duplicate else InboundBookingPayload.ProcessingStatus.RECEIVED,
            processing_notes="Duplicate payload received." if is_duplicate else "",
        )
        return payload_record, idempotency_record, is_duplicate


def mark_inbound_booking_payload_processed(
    *,
    payload_id,
    booking=None,
    reservation=None,
    processing_status=InboundBookingPayload.ProcessingStatus.PROCESSED,
    processing_notes="",
    error_message="",
    user=None,
):
    with transaction.atomic():
        payload_record = InboundBookingPayload.objects.select_for_update().get(id=payload_id)
        idempotency_record = ApiIdempotencyRecord.objects.select_for_update().get(id=payload_record.idempotency_record_id)

        payload_record.booking = booking or payload_record.booking
        payload_record.reservation = reservation or payload_record.reservation
        payload_record.processing_status = processing_status
        payload_record.processing_notes = processing_notes
        payload_record.error_message = error_message
        payload_record.processed_at = timezone.now()
        payload_record.save(
            update_fields=[
                "booking",
                "reservation",
                "processing_status",
                "processing_notes",
                "error_message",
                "processed_at",
                "updated_at",
            ]
        )

        idempotency_record.processing_status = (
            ApiIdempotencyRecord.ProcessingStatus.FAILED
            if processing_status == InboundBookingPayload.ProcessingStatus.FAILED
            else ApiIdempotencyRecord.ProcessingStatus.COMPLETED
        )
        idempotency_record.last_error = error_message
        idempotency_record.response_snapshot = {
            "payload_id": str(payload_record.id),
            "booking_id": str(booking.id) if booking else (str(payload_record.booking_id) if payload_record.booking_id else None),
            "reservation_id": str(reservation.id) if reservation else (str(payload_record.reservation_id) if payload_record.reservation_id else None),
            "processing_status": processing_status,
        }
        idempotency_record.last_seen_at = timezone.now()
        idempotency_record.save(
            update_fields=[
                "processing_status",
                "last_error",
                "response_snapshot",
                "last_seen_at",
                "updated_at",
            ]
        )

        if payload_record.booking_id:
            BookingAuditEntry.objects.create(
                entity_type=BookingAuditEntry.EntityType.BOOKING,
                schedule=payload_record.booking.schedule,
                booking=payload_record.booking,
                action="inbound_payload_processed",
                actor=user,
                notes=processing_notes,
                payload={
                    "provider": payload_record.provider,
                    "event_type": payload_record.event_type,
                    "payload_id": str(payload_record.id),
                    "status": processing_status,
                },
            )

        ActivityLog.objects.create(
            user=user,
            action=f"Inbound payload processed: {payload_record.provider} {payload_record.event_type}",
            table_name="InboundBookingPayload",
            record_id=payload_record.id,
            details={
                "status": processing_status,
                "booking_id": str(payload_record.booking_id) if payload_record.booking_id else None,
                "reservation_id": str(payload_record.reservation_id) if payload_record.reservation_id else None,
            },
        )
        return payload_record


def _coalesce_value(*values):
    for value in values:
        if value is None:
            continue
        if isinstance(value, str):
            if value.strip():
                return value.strip()
            continue
        return value
    return None


def _coerce_decimal(value, default="0.00"):
    if value in [None, ""]:
        return Decimal(default)
    return Decimal(str(value))


def _normalize_category_code(value):
    normalized = str(value or "").strip().upper().replace("-", "_").replace(" ", "_")
    allowed_codes = {choice for choice, _ in ProductParticipantCategory.Code.choices}
    if normalized in allowed_codes:
        return normalized
    if normalized in {"YOUTH", "KID", "KIDS"}:
        return ProductParticipantCategory.Code.CHILD
    if normalized in {"PAX", "PERSON", "PEOPLE"}:
        return ProductParticipantCategory.Code.ADULT
    return ProductParticipantCategory.Code.ADULT


def _normalize_integration_event_type(value):
    normalized = str(value or "").strip().upper().replace("-", "_").replace(" ", "_")
    if normalized in {"BOOKING_CREATE", "CREATE", "CREATED", "NEW_BOOKING"}:
        return IntegrationEventType.BOOKING_CREATE
    if normalized in {"BOOKING_UPDATE", "UPDATE", "UPDATED", "AMEND", "AMENDED"}:
        return IntegrationEventType.BOOKING_UPDATE
    if normalized in {"BOOKING_CANCEL", "CANCEL", "CANCELLED", "CANCELED"}:
        return IntegrationEventType.BOOKING_CANCEL
    return IntegrationEventType.BOOKING_CREATE


def _extract_participant_rows_from_payload(payload):
    participants = payload.get("participants")
    if not isinstance(participants, list):
        participants = payload.get("tickets")
    rows = []

    if isinstance(participants, list) and participants:
        for line in participants:
            if not isinstance(line, dict):
                continue
            quantity = int(line.get("quantity") or line.get("count") or 0)
            if quantity <= 0:
                continue
            category_code = _normalize_category_code(
                _coalesce_value(
                    line.get("category_code"),
                    line.get("participant_category"),
                    line.get("type"),
                    line.get("label"),
                    line.get("ticket_type"),
                )
            )
            rows.append(
                {
                    "category_code": category_code,
                    "category_label": line.get("category_label") or category_code.replace("_", " ").title(),
                    "quantity": quantity,
                    "unit_price": str(
                        _coerce_decimal(
                            _coalesce_value(
                                line.get("unit_price"),
                                line.get("price"),
                                line.get("amount"),
                            )
                        )
                    ),
                }
            )

    if rows:
        return rows

    fallback_counts = [
        ("ADULT", payload.get("adult_count") or payload.get("adults") or payload.get("number_of_adults")),
        ("CHILD", payload.get("child_count") or payload.get("children") or payload.get("number_of_children")),
        ("INFANT", payload.get("infant_count") or payload.get("infants") or payload.get("number_of_infants")),
    ]
    for category_code, quantity in fallback_counts:
        quantity_value = int(quantity or 0)
        if quantity_value > 0:
            rows.append(
                {
                    "category_code": category_code,
                    "category_label": category_code.title(),
                    "quantity": quantity_value,
                    "unit_price": "0.00",
                }
            )

    total_quantity = int(payload.get("quantity") or payload.get("participant_count") or 0)
    if not rows and total_quantity > 0:
        rows.append(
            {
                "category_code": ProductParticipantCategory.Code.ADULT,
                "category_label": "Adult",
                "quantity": total_quantity,
                "unit_price": "0.00",
            }
        )

    return rows


def _normalize_getyourguide_payload(payload):
    lead_customer = payload.get("customer") if isinstance(payload.get("customer"), dict) else {}
    if not lead_customer and isinstance(payload.get("lead_traveler"), dict):
        lead_customer = payload.get("lead_traveler")
    if not lead_customer and isinstance(payload.get("contact"), dict):
        lead_customer = payload.get("contact")

    booking_reference = _coalesce_value(
        payload.get("external_booking_reference"),
        payload.get("booking_reference"),
        payload.get("reference"),
        payload.get("booking_id"),
    )
    travel_date_raw = _coalesce_value(
        payload.get("travel_date"),
        payload.get("date"),
        payload.get("service_date"),
        payload.get("start_date"),
    )
    start_at_raw = _coalesce_value(
        payload.get("start_at"),
        payload.get("start_time"),
        payload.get("scheduled_at"),
        payload.get("datetime"),
    )
    parsed_travel_date = parse_date(str(travel_date_raw)) if travel_date_raw else None
    if not parsed_travel_date and start_at_raw:
        parsed_start = parse_datetime(str(start_at_raw))
        if parsed_start:
            parsed_travel_date = timezone.localtime(parsed_start).date() if timezone.is_aware(parsed_start) else parsed_start.date()

    return {
        "event_type": _normalize_integration_event_type(
            _coalesce_value(payload.get("event_type"), payload.get("action"), payload.get("type"))
        ),
        "booking_reference": booking_reference or "",
        "supplier_reference": _coalesce_value(
            payload.get("external_supplier_reference"),
            payload.get("supplier_reference"),
            payload.get("voucher_code"),
        ) or "",
        "external_product_id": _coalesce_value(
            payload.get("external_product_id"),
            payload.get("product_id"),
            payload.get("activity_id"),
        ) or "",
        "external_option_id": _coalesce_value(
            payload.get("external_option_id"),
            payload.get("option_id"),
            payload.get("package_id"),
        ) or "",
        "external_rate_id": _coalesce_value(
            payload.get("external_rate_id"),
            payload.get("rate_id"),
            payload.get("pricing_id"),
        ) or "",
        "travel_date": parsed_travel_date,
        "schedule_id": _coalesce_value(payload.get("schedule_id"), payload.get("internal_schedule_id")),
        "customer_full_name": _coalesce_value(
            payload.get("customer_full_name"),
            lead_customer.get("full_name"),
            " ".join(filter(None, [lead_customer.get("first_name"), lead_customer.get("last_name")])).strip(),
            payload.get("customer_name"),
        ) or "GetYourGuide Customer",
        "customer_email": _coalesce_value(payload.get("customer_email"), lead_customer.get("email")),
        "customer_phone": _coalesce_value(payload.get("customer_phone"), lead_customer.get("phone")),
        "currency": _coalesce_value(payload.get("currency"), payload.get("booking_currency")),
        "participants": _extract_participant_rows_from_payload(payload),
        "cancellation_reason": _coalesce_value(payload.get("cancellation_reason"), payload.get("reason"), payload.get("message")) or "",
    }


def _find_or_create_client_for_integration(*, full_name, email=None, phone=None):
    client = None
    if email:
        client = Client.objects.filter(email__iexact=email).first()
    if not client and phone:
        client = Client.objects.filter(phone=phone).first()
    if client:
        fields_to_update = []
        if full_name and client.full_name != full_name:
            client.full_name = full_name
            fields_to_update.append("full_name")
        if email and not client.email:
            client.email = email
            fields_to_update.append("email")
        if phone and not client.phone:
            client.phone = phone
            fields_to_update.append("phone")
        if fields_to_update:
            fields_to_update.append("updated_at")
            client.save(update_fields=fields_to_update)
        return client
    return Client.objects.create(full_name=full_name, email=email, phone=phone)


def _resolve_schedule_for_integration(*, mapping, normalized_payload):
    explicit_schedule_id = normalized_payload.get("schedule_id")
    if explicit_schedule_id:
        return ProductSchedule.objects.filter(id=explicit_schedule_id, product=mapping.product).first()

    travel_date = normalized_payload.get("travel_date")
    if travel_date:
        dated_schedule = (
            ProductSchedule.objects.filter(
                product=mapping.product,
                start_at__date=travel_date,
            )
            .exclude(status=ProductSchedule.Status.CANCELLED)
            .order_by("start_at", "created_at")
            .first()
        )
        if dated_schedule:
            return dated_schedule

    active_schedule = (
        ProductSchedule.objects.filter(product=mapping.product)
        .exclude(status=ProductSchedule.Status.CANCELLED)
        .order_by("start_at", "created_at")
    )
    if active_schedule.count() == 1:
        return active_schedule.first()
    return None


def process_getyourguide_booking_payload(*, payload, request_headers=None, source_endpoint="", user=None):
    normalized_payload = _normalize_getyourguide_payload(payload)
    if not normalized_payload["booking_reference"]:
        raise ValueError("GetYourGuide payload is missing a booking reference.")
    event_type = normalized_payload["event_type"]

    payload_record, _, is_duplicate = register_inbound_booking_payload(
        provider=IntegrationProvider.GET_YOUR_GUIDE,
        event_type=event_type,
        raw_payload={
            **(payload or {}),
            "external_product_id": normalized_payload["external_product_id"],
            "external_option_id": normalized_payload["external_option_id"],
            "external_rate_id": normalized_payload["external_rate_id"],
        },
        idempotency_key=(request_headers or {}).get("Idempotency-Key") or normalized_payload["booking_reference"],
        request_headers=request_headers or {},
        normalized_payload={
            **normalized_payload,
            "travel_date": normalized_payload["travel_date"].isoformat() if normalized_payload["travel_date"] else "",
        },
        external_booking_reference=normalized_payload["booking_reference"],
        external_supplier_reference=normalized_payload["supplier_reference"],
        source_endpoint=source_endpoint,
    )

    existing_booking = Booking.objects.filter(
        integration_provider=IntegrationProvider.GET_YOUR_GUIDE,
        external_booking_reference=normalized_payload["booking_reference"],
    ).first()
    if event_type == IntegrationEventType.BOOKING_CANCEL:
        if not existing_booking:
            processed_payload = mark_inbound_booking_payload_processed(
                payload_id=payload_record.id,
                processing_status=InboundBookingPayload.ProcessingStatus.FAILED,
                error_message="No existing GetYourGuide booking matched this cancellation payload.",
                user=user,
            )
            return {"status": "failed", "booking": None, "payload_record": processed_payload, "created": False}

        if existing_booking.status == Booking.Status.CANCELLED:
            processed_payload = mark_inbound_booking_payload_processed(
                payload_id=payload_record.id,
                booking=existing_booking,
                processing_status=InboundBookingPayload.ProcessingStatus.DUPLICATE if is_duplicate else InboundBookingPayload.ProcessingStatus.PROCESSED,
                processing_notes="GetYourGuide booking was already cancelled.",
                user=user,
            )
            return {"status": "duplicate" if is_duplicate else "processed", "booking": existing_booking, "payload_record": processed_payload, "created": False}

        cancelled_booking = cancel_booking(
            booking_id=existing_booking.id,
            reason=normalized_payload.get("cancellation_reason") or "Cancelled from GetYourGuide integration.",
            cancelled_by_type=Booking.CancelledBy.SYSTEM,
            refund_status=Booking.PaymentStatus.REFUND_PENDING if existing_booking.total_cost > 0 else Booking.PaymentStatus.NOT_APPLICABLE,
            release_inventory=True,
            user=user,
        )
        processed_payload = mark_inbound_booking_payload_processed(
            payload_id=payload_record.id,
            booking=cancelled_booking,
            processing_status=InboundBookingPayload.ProcessingStatus.DUPLICATE if is_duplicate else InboundBookingPayload.ProcessingStatus.PROCESSED,
            processing_notes="GetYourGuide booking cancellation processed successfully.",
            user=user,
        )
        return {"status": "duplicate" if is_duplicate else "processed", "booking": cancelled_booking, "payload_record": processed_payload, "created": False}

    mapping = payload_record.product_mapping
    schedule = None
    if mapping:
        schedule = _resolve_schedule_for_integration(mapping=mapping, normalized_payload=normalized_payload)

    participant_rows = normalized_payload["participants"]

    if event_type == IntegrationEventType.BOOKING_UPDATE and existing_booking:
        try:
            amended_booking = amend_booking(
                booking_id=existing_booking.id,
                data={
                    **({"schedule": schedule.id} if schedule else {}),
                    **({"travel_date": normalized_payload.get("travel_date")} if normalized_payload.get("travel_date") else {}),
                    **({"participants": participant_rows} if participant_rows else {}),
                    "status": Booking.Status.CONFIRMED,
                    "notes": f"Updated from GetYourGuide booking {normalized_payload['booking_reference']}.",
                },
                user=user,
            )
            if any([normalized_payload.get("customer_full_name"), normalized_payload.get("customer_email"), normalized_payload.get("customer_phone")]):
                client = _find_or_create_client_for_integration(
                    full_name=normalized_payload["customer_full_name"],
                    email=normalized_payload.get("customer_email"),
                    phone=normalized_payload.get("customer_phone"),
                )
                amended_booking.client = client
                amended_booking.customer_full_name = normalized_payload["customer_full_name"]
                amended_booking.customer_email = normalized_payload.get("customer_email")
                amended_booking.customer_phone = normalized_payload.get("customer_phone")
                amended_booking.metadata = {
                    **(amended_booking.metadata or {}),
                    "integration_source": "GET_YOUR_GUIDE",
                    "supplier_reference": normalized_payload.get("supplier_reference"),
                    "last_event_type": event_type,
                }
                amended_booking.save(update_fields=["client", "customer_full_name", "customer_email", "customer_phone", "metadata", "updated_at"])
        except ValueError as exc:
            processed_payload = mark_inbound_booking_payload_processed(
                payload_id=payload_record.id,
                booking=existing_booking,
                processing_status=InboundBookingPayload.ProcessingStatus.FAILED,
                error_message=str(exc),
                user=user,
            )
            return {"status": "failed", "booking": existing_booking, "payload_record": processed_payload, "created": False}

        processed_payload = mark_inbound_booking_payload_processed(
            payload_id=payload_record.id,
            booking=amended_booking,
            processing_status=InboundBookingPayload.ProcessingStatus.DUPLICATE if is_duplicate else InboundBookingPayload.ProcessingStatus.PROCESSED,
            processing_notes="GetYourGuide booking update processed successfully.",
            user=user,
        )
        return {"status": "duplicate" if is_duplicate else "processed", "booking": amended_booking, "payload_record": processed_payload, "created": False}

    if existing_booking:
        processed_payload = mark_inbound_booking_payload_processed(
            payload_id=payload_record.id,
            booking=existing_booking,
            processing_status=InboundBookingPayload.ProcessingStatus.DUPLICATE if is_duplicate else InboundBookingPayload.ProcessingStatus.PROCESSED,
            processing_notes="Existing GetYourGuide booking reference matched to a stored booking.",
            user=user,
        )
        return {"status": "duplicate" if is_duplicate else "matched", "booking": existing_booking, "payload_record": processed_payload, "created": False}

    if not mapping:
        processed_payload = mark_inbound_booking_payload_processed(
            payload_id=payload_record.id,
            processing_status=InboundBookingPayload.ProcessingStatus.FAILED,
            error_message="No active GetYourGuide product mapping matched this payload.",
            user=user,
        )
        return {"status": "failed", "booking": None, "payload_record": processed_payload, "created": False}

    if not schedule:
        processed_payload = mark_inbound_booking_payload_processed(
            payload_id=payload_record.id,
            processing_status=InboundBookingPayload.ProcessingStatus.FAILED,
            error_message="No matching schedule could be resolved for the mapped product.",
            user=user,
        )
        return {"status": "failed", "booking": None, "payload_record": processed_payload, "created": False}

    if not participant_rows:
        processed_payload = mark_inbound_booking_payload_processed(
            payload_id=payload_record.id,
            processing_status=InboundBookingPayload.ProcessingStatus.FAILED,
            error_message="No participant quantities were found in the GetYourGuide payload.",
            user=user,
        )
        return {"status": "failed", "booking": None, "payload_record": processed_payload, "created": False}

    client = _find_or_create_client_for_integration(
        full_name=normalized_payload["customer_full_name"],
        email=normalized_payload.get("customer_email"),
        phone=normalized_payload.get("customer_phone"),
    )
    try:
        booking = create_booking(
            data={
                "client": client.id,
                "schedule": schedule.id,
                "status": Booking.Status.CONFIRMED,
                "source": Booking.Source.OTA,
                "integration_provider": IntegrationProvider.GET_YOUR_GUIDE,
                "external_booking_reference": normalized_payload["booking_reference"],
                "currency": normalized_payload.get("currency") or mapping.default_currency or schedule.product.default_currency,
                "travel_date": normalized_payload.get("travel_date") or (timezone.localtime(schedule.start_at).date() if schedule.start_at else None),
                "customer_full_name": normalized_payload["customer_full_name"],
                "customer_email": normalized_payload.get("customer_email"),
                "customer_phone": normalized_payload.get("customer_phone"),
                "notes": f"Imported from GetYourGuide booking {normalized_payload['booking_reference']}.",
                "metadata": {
                    "integration_source": "GET_YOUR_GUIDE",
                    "supplier_reference": normalized_payload.get("supplier_reference"),
                    "last_event_type": event_type,
                },
                "participants": participant_rows,
            },
            user=user,
        )
    except ValueError as exc:
        processed_payload = mark_inbound_booking_payload_processed(
            payload_id=payload_record.id,
            processing_status=InboundBookingPayload.ProcessingStatus.FAILED,
            error_message=str(exc),
            user=user,
        )
        return {"status": "failed", "booking": None, "payload_record": processed_payload, "created": False}

    processed_payload = mark_inbound_booking_payload_processed(
        payload_id=payload_record.id,
        booking=booking,
        processing_status=InboundBookingPayload.ProcessingStatus.DUPLICATE if is_duplicate else InboundBookingPayload.ProcessingStatus.PROCESSED,
        processing_notes="GetYourGuide booking imported successfully.",
        user=user,
    )
    return {"status": "duplicate" if is_duplicate else "processed", "booking": booking, "payload_record": processed_payload, "created": True}


def build_getyourguide_product_list(*, provider=IntegrationProvider.GET_YOUR_GUIDE):
    products = (
        Product.objects.filter(is_active=True)
        .prefetch_related("external_mappings", "schedules")
        .order_by("name")
    )
    items = []
    for product in products:
        mappings = [mapping for mapping in product.external_mappings.all() if mapping.provider == provider and mapping.is_active]
        default_mapping = next((mapping for mapping in mappings if mapping.is_default), None)
        available_schedule_count = sum(1 for schedule in product.schedules.all() if schedule.status == ProductSchedule.Status.AVAILABLE)
        items.append(
            {
                "product_id": (default_mapping.external_product_id if default_mapping else product.product_code),
                "internal_product_id": product.id,
                "name": product.name,
                "destination": product.destination or "",
                "category": product.category,
                "default_currency": product.default_currency,
                "is_active": product.is_active,
                "has_default_mapping": bool(default_mapping),
                "available_schedule_count": available_schedule_count,
            }
        )
    return items


def build_getyourguide_product_detail(*, product_reference, supplier_id="", provider=IntegrationProvider.GET_YOUR_GUIDE):
    reference_filters = (
        models.Q(product_code=product_reference)
        | models.Q(slug=product_reference)
        | models.Q(external_mappings__provider=provider, external_mappings__external_product_id=product_reference)
    )
    try:
        reference_filters |= models.Q(id=uuid.UUID(str(product_reference)))
    except (ValueError, TypeError, AttributeError):
        pass

    product = (
        Product.objects.filter(is_active=True)
        .prefetch_related("participant_categories", "prices", "external_mappings", "schedules")
        .filter(reference_filters)
        .distinct()
        .first()
    )
    if not product:
        raise ValueError("No active product matched the requested GetYourGuide product reference.")

    mappings = [mapping for mapping in product.external_mappings.all() if mapping.provider == provider and mapping.is_active]
    default_mapping = next((mapping for mapping in mappings if mapping.is_default), None)
    option_seed = default_mapping.external_option_id if default_mapping and default_mapping.external_option_id else f"{product.product_code}-DEFAULT"

    option_rates = []
    for price in product.prices.all():
        category = price.participant_category
        option_rates.append(
            {
                "rate_id": (
                    next(
                        (
                            mapping.external_rate_id
                            for mapping in mappings
                            if mapping.participant_category_id == getattr(category, "id", None) and mapping.external_rate_id
                        ),
                        f"{option_seed}-{price.currency}-{getattr(category, 'code', 'STANDARD')}",
                    )
                ),
                "rate_name": price.rate_name,
                "category_code": getattr(category, "code", "STANDARD"),
                "category_label": getattr(category, "label", "Standard"),
                "currency": price.currency,
                "amount": price.amount,
            }
        )

    if not option_rates:
        option_rates.append(
            {
                "rate_id": f"{option_seed}-{product.default_currency}-STANDARD",
                "rate_name": "STANDARD",
                "category_code": "STANDARD",
                "category_label": "Standard",
                "currency": product.default_currency,
                "amount": Decimal("0.00"),
            }
        )

    schedules = [
        {
            "schedule_id": str(schedule.id),
            "schedule_code": schedule.schedule_code,
            "start_at": schedule.start_at.isoformat() if schedule.start_at else None,
            "end_at": schedule.end_at.isoformat() if schedule.end_at else None,
            "status": schedule.status,
            "remaining_capacity": schedule.remaining_capacity,
        }
        for schedule in product.schedules.all()
    ]

    return {
        "supplier_id": supplier_id or "",
        "product_id": default_mapping.external_product_id if default_mapping else product.product_code,
        "internal_product_id": product.id,
        "name": product.name,
        "description": product.description or "",
        "destination": product.destination or "",
        "category": product.category,
        "default_currency": product.default_currency,
        "duration_text": product.duration_text or "",
        "booking_cutoff_minutes": product.booking_cutoff_minutes,
        "options": [
            {
                "option_id": option_seed,
                "title": default_mapping.external_option_name if default_mapping and default_mapping.external_option_name else product.name,
                "is_default": True,
                "default_currency": default_mapping.default_currency if default_mapping else product.default_currency,
                "rates": option_rates,
            }
        ],
        "schedules": schedules,
    }


def bootstrap_getyourguide_mapping(*, product_id=None, external_product_id="", external_option_id="", default_currency="", user=None):
    product = Product.objects.get(id=product_id) if product_id else Product.objects.get(product_code=external_product_id)
    external_product_value = external_product_id or product.product_code
    option_value = external_option_id or f"{product.product_code}-DEFAULT"
    created_mappings = []

    with transaction.atomic():
        base_mapping, _ = ExternalProductMapping.objects.update_or_create(
            provider=IntegrationProvider.GET_YOUR_GUIDE,
            product=product,
            participant_category=None,
            external_product_id=external_product_value,
            external_option_id=option_value,
            external_rate_id="",
            external_category_code="",
            defaults={
                "external_product_name": product.name,
                "external_option_name": product.name,
                "default_currency": default_currency or product.default_currency,
                "is_active": True,
                "is_default": True,
                "metadata": {"bootstrap_source": "backend_sync"},
            },
        )
        created_mappings.append(base_mapping)

        for category in product.participant_categories.filter(is_active=True):
            category_price = (
                product.prices.filter(participant_category=category, is_active=True).order_by("currency", "rate_name").first()
            )
            mapping, _ = ExternalProductMapping.objects.update_or_create(
                provider=IntegrationProvider.GET_YOUR_GUIDE,
                product=product,
                participant_category=category,
                external_product_id=external_product_value,
                external_option_id=option_value,
                external_rate_id=(
                    f"{option_value}-{category_price.currency}-{category.code}" if category_price else f"{option_value}-{category.code}"
                ),
                external_category_code=category.code,
                defaults={
                    "external_product_name": product.name,
                    "external_option_name": product.name,
                    "default_currency": default_currency or product.default_currency,
                    "is_active": True,
                    "is_default": False,
                    "metadata": {"bootstrap_source": "backend_sync"},
                },
            )
            created_mappings.append(mapping)

    ActivityLog.objects.create(
        user=user,
        action=f"Bootstrapped GetYourGuide mapping: {product.product_code}",
        table_name="ExternalProductMapping",
        record_id=base_mapping.id,
        details={
            "product_id": str(product.id),
            "external_product_id": external_product_value,
            "mapping_count": len(created_mappings),
        },
    )
    return created_mappings


def run_getyourguide_sandbox_request(
    *,
    endpoint,
    method="POST",
    payload=None,
    query_params=None,
    path_suffix="",
    base_url="",
    basic_auth_username="",
    basic_auth_password="",
    user=None,
):
    if not base_url:
        raise ValueError("GetYourGuide sandbox base URL is not configured.")
    if not basic_auth_username or not basic_auth_password:
        raise ValueError("GetYourGuide Basic Auth credentials are not configured.")

    normalized_base = base_url.rstrip("/")
    normalized_path_suffix = str(path_suffix or "").strip().strip("/")
    endpoint_path = endpoint.strip("/")
    request_url = f"{normalized_base}/{endpoint_path}"
    if normalized_path_suffix:
        request_url = f"{request_url}/{normalized_path_suffix}"
    if query_params:
        request_url = f"{request_url}?{urllib_parse.urlencode(query_params)}"

    request_body = None
    if method in {"POST", "PUT", "PATCH"}:
        request_body = json.dumps(payload or {}).encode("utf-8")

    credentials = f"{basic_auth_username}:{basic_auth_password}".encode("utf-8")
    basic_auth_token = base64.b64encode(credentials).decode("ascii")
    request_object = urllib_request.Request(
        request_url,
        data=request_body,
        method=method,
        headers={
            "Authorization": f"Basic {basic_auth_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )

    try:
        with urllib_request.urlopen(request_object, timeout=30) as response:
            response_text = response.read().decode("utf-8")
            status_code = response.getcode()
            response_headers = {key: value for key, value in response.headers.items()}
    except urllib_error.HTTPError as exc:
        response_text = exc.read().decode("utf-8")
        status_code = exc.code
        response_headers = {key: value for key, value in exc.headers.items()}
    except urllib_error.URLError as exc:
        raise ValueError(f"GetYourGuide sandbox request failed: {exc.reason}") from exc

    try:
        response_body = json.loads(response_text) if response_text else None
    except json.JSONDecodeError:
        response_body = None

    ActivityLog.objects.create(
        user=user,
        action=f"Ran GetYourGuide sandbox request: {method} {endpoint}",
        table_name="GetYourGuideSandbox",
        record_id=None,
        details={
            "endpoint": endpoint,
            "method": method,
            "request_url": request_url,
            "status_code": status_code,
            "payload": payload or {},
            "query_params": query_params or {},
        },
    )

    return {
        "endpoint": endpoint,
        "method": method,
        "request_url": request_url,
        "status_code": status_code,
        "response_headers": response_headers,
        "response_body": response_body,
        "response_text": response_text,
    }
