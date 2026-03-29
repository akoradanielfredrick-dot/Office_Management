from django.contrib import admin
from .models import Booking, BookingTraveller, Itinerary, ItineraryDay, Supplier

class BookingTravellerInline(admin.TabularInline):
    model = BookingTraveller
    extra = 1

class ItineraryDayInline(admin.TabularInline):
    model = ItineraryDay
    extra = 1

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'contact_person', 'phone', 'is_deleted')
    list_filter = ('category', 'is_deleted')
    search_fields = ('name', 'contact_person')

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('reference_no', 'client', 'status', 'start_date', 'end_date', 'total_cost')
    list_filter = ('status', 'is_deleted')
    search_fields = ('reference_no', 'client__full_name')
    inlines = [BookingTravellerInline]
    actions = ['soft_delete']

    @admin.action(description="Soft delete selected bookings")
    def soft_delete(self, request, queryset):
        queryset.update(is_deleted=True)

@admin.register(BookingTraveller)
class BookingTravellerAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'booking', 'passport_no', 'nationality')
    search_fields = ('full_name', 'booking__reference_no', 'passport_no')

@admin.register(Itinerary)
class ItineraryAdmin(admin.ModelAdmin):
    list_display = ('title', 'booking', 'created_at')
    search_fields = ('title', 'booking__reference_no')
    inlines = [ItineraryDayInline]

@admin.register(ItineraryDay)
class ItineraryDayAdmin(admin.ModelAdmin):
    list_display = ('itinerary', 'day_number', 'title', 'meals', 'supplier')
    list_filter = ('meals',)
    search_fields = ('title', 'itinerary__title', 'itinerary__booking__reference_no')
