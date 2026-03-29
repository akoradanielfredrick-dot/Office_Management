from django.contrib import admin
from .models import Quotation, QuotationItem

class QuotationItemInline(admin.TabularInline):
    model = QuotationItem
    extra = 1

@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ('reference_no', 'client', 'status', 'total_amount', 'currency', 'created_at')
    list_filter = ('status', 'currency', 'is_deleted')
    search_fields = ('reference_no', 'client__full_name')
    inlines = [QuotationItemInline]
    actions = ['soft_delete']

    @admin.action(description="Soft delete selected quotations")
    def soft_delete(self, request, queryset):
        queryset.update(is_deleted=True)

@admin.register(QuotationItem)
class QuotationItemAdmin(admin.ModelAdmin):
    list_display = ('description', 'quotation', 'quantity', 'unit_price', 'total_price')
    search_fields = ('description', 'quotation__reference_no')
