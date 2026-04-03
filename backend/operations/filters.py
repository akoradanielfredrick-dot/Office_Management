from datetime import timedelta

import django_filters
from django.db.models import Q
from django.utils import timezone

from .models import Booking, ProductSchedule, Reservation


class BookingFilter(django_filters.FilterSet):
    refund_status = django_filters.CharFilter(field_name="refund_status")
    departure_from = django_filters.DateFilter(method="filter_departure_from")
    departure_to = django_filters.DateFilter(method="filter_departure_to")
    travel_window = django_filters.CharFilter(method="filter_travel_window")

    class Meta:
        model = Booking
        fields = ["client", "status", "product", "schedule", "source", "payment_status", "refund_status"]

    def filter_departure_from(self, queryset, name, value):
        return queryset.filter(Q(travel_date__gte=value) | Q(start_date__gte=value))

    def filter_departure_to(self, queryset, name, value):
        return queryset.filter(Q(travel_date__lte=value) | Q(start_date__lte=value))

    def filter_travel_window(self, queryset, name, value):
        today = timezone.localdate()
        normalized = (value or "").strip().upper()

        if normalized == "TODAY":
            return queryset.filter(Q(travel_date=today) | Q(start_date=today))
        if normalized == "NEXT_7_DAYS":
            end_date = today + timedelta(days=7)
            return queryset.filter(
                Q(travel_date__gte=today, travel_date__lte=end_date)
                | Q(start_date__gte=today, start_date__lte=end_date)
            )
        if normalized == "NEXT_30_DAYS":
            end_date = today + timedelta(days=30)
            return queryset.filter(
                Q(travel_date__gte=today, travel_date__lte=end_date)
                | Q(start_date__gte=today, start_date__lte=end_date)
            )
        if normalized == "PAST":
            return queryset.filter(Q(travel_date__lt=today) | Q(start_date__lt=today))

        return queryset


class ReservationFilter(django_filters.FilterSet):
    hold_expires_from = django_filters.DateTimeFilter(field_name="hold_expires_at", lookup_expr="gte")
    hold_expires_to = django_filters.DateTimeFilter(field_name="hold_expires_at", lookup_expr="lte")
    hold_window = django_filters.CharFilter(method="filter_hold_window")

    class Meta:
        model = Reservation
        fields = ["client", "product", "schedule", "status"]

    def filter_hold_window(self, queryset, name, value):
        now = timezone.now()
        normalized = (value or "").strip().upper()

        if normalized == "EXPIRING_24_HOURS":
            end_at = now + timedelta(hours=24)
            return queryset.filter(hold_expires_at__gte=now, hold_expires_at__lte=end_at)
        if normalized == "EXPIRED":
            return queryset.filter(hold_expires_at__lt=now)
        if normalized == "ACTIVE_FUTURE":
            return queryset.filter(hold_expires_at__gte=now)

        return queryset


class ProductScheduleFilter(django_filters.FilterSet):
    start_from = django_filters.DateTimeFilter(field_name="start_at", lookup_expr="gte")
    start_to = django_filters.DateTimeFilter(field_name="start_at", lookup_expr="lte")
    available_only = django_filters.BooleanFilter(method="filter_available_only")

    class Meta:
        model = ProductSchedule
        fields = ["product", "status", "schedule_type", "timezone"]

    def filter_available_only(self, queryset, name, value):
        if value:
            return queryset.filter(status=ProductSchedule.Status.AVAILABLE, remaining_capacity__gt=0)
        return queryset
