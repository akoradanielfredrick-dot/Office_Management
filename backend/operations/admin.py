from django.contrib import admin
from .models import Booking, BookingTraveller, Excursion, Itinerary, ItineraryDay, Package, Supplier

@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ("name", "package_type", "price", "is_deleted", "updated_at")
    list_filter = ("package_type", "is_deleted", "created_at", "updated_at")
    search_fields = ("name", "itinerary")
    ordering = ("name",)
    actions = ["soft_delete"]

    @admin.action(description="Soft delete selected packages")
    def soft_delete(self, request, queryset):
        queryset.update(is_deleted=True)

@admin.register(Excursion)
class ExcursionAdmin(admin.ModelAdmin):
    list_display = ("name", "location", "excursion_type", "price", "is_deleted", "updated_at")
    list_filter = ("excursion_type", "location", "is_deleted", "created_at", "updated_at")
    search_fields = ("name", "location", "itinerary")
    ordering = ("name",)
    actions = ["soft_delete"]

    @admin.action(description="Soft delete selected excursions")
    def soft_delete(self, request, queryset):
        queryset.update(is_deleted=True)

class BookingTravellerInline(admin.TabularInline):
    model = BookingTraveller
    extra = 1

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'contact_person', 'phone', 'email', 'is_deleted')
    list_filter = ('category', 'is_deleted')
    search_fields = ('name', 'contact_person', 'email', 'phone', 'address')

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('reference_no', 'client', 'package_name', 'travel_date', 'number_of_days', 'status', 'total_cost')
    list_filter = ('status', 'is_deleted')
    search_fields = ('reference_no', 'client__full_name', 'package_name', 'destination_package')
    inlines = [BookingTravellerInline]
    actions = ['soft_delete']
    fieldsets = (
        ('Booking header', {
            'fields': ('client', 'package', 'reference_no', 'status')
        }),
        ('Trip details', {
            'fields': (
                'travel_date', 'number_of_days', 'package_name', 'package_type',
                'destination_package', 'itinerary'
            )
        }),
        ('Traveller pricing', {
            'fields': (
                ('num_adults', 'price_per_adult'),
                ('num_children', 'price_per_child'),
                ('extra_charges', 'discount'),
                ('subtotal', 'total_cost', 'paid_amount', 'currency'),
            )
        }),
        ('Terms and payment', {
            'fields': ('booking_validity', 'deposit_terms', 'payment_channels')
        }),
        ('Internal notes', {
            'fields': ('notes', 'internal_notes', 'is_deleted')
        }),
        ('Derived dates', {
            'fields': ('start_date', 'end_date')
        }),
    )
    readonly_fields = ('reference_no',)

    @admin.action(description="Soft delete selected bookings")
    def soft_delete(self, request, queryset):
        queryset.update(is_deleted=True)
