from collections import defaultdict
from decimal import Decimal
import hashlib
import json

from django.db import transaction
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

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
        schedule = ProductSchedule.objects.select_for_update().get(id=_pk(data["schedule"]))
        expire_stale_reservations(schedule=schedule, user=user)
        schedule.refresh_from_db()
        participant_rows = _participant_payload(data.get("participants") or [])
        _validate_schedule_capacity(schedule, participant_rows)

        booking = Booking.objects.create(
            client_id=_pk(data["client"]),
            product=schedule.product,
            schedule=schedule,
            status=data.get("status", Booking.Status.CONFIRMED),
            source=data.get("source", Booking.Source.MANUAL_OFFICE),
            integration_provider=data.get("integration_provider", ""),
            external_booking_reference=data.get("external_booking_reference", ""),
            currency=data.get("currency", schedule.product.default_currency),
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
        reservation = Reservation.objects.select_for_update().select_related("schedule", "product", "client").get(id=reservation_id)
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
        reservation = Reservation.objects.select_for_update().select_related("schedule").get(id=reservation_id)
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
        booking = Booking.objects.select_for_update().select_related("schedule").get(id=booking_id)
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
            .select_related("schedule", "product", "client")
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
        payload_record = (
            InboundBookingPayload.objects.select_for_update()
            .select_related("idempotency_record", "product_mapping", "booking", "reservation")
            .get(id=payload_id)
        )
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
