from django.contrib import admin
from .models import Payment, Receipt, Expense

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('internal_reference', 'booking', 'payment_type', 'amount', 'currency', 'method', 'txn_reference', 'payment_date', 'is_deleted')
    list_filter = ('payment_type', 'method', 'currency', 'is_deleted')
    search_fields = ('internal_reference', 'booking__reference_no', 'txn_reference')
    actions = ['soft_delete']

    @admin.action(description="Soft delete selected payments")
    def soft_delete(self, request, queryset):
        queryset.update(is_deleted=True)

@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ('receipt_no', 'payment', 'generated_at')
    search_fields = ('receipt_no', 'payment__booking__reference_no')

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('category', 'amount', 'currency', 'expense_date', 'booking', 'supplier', 'is_deleted')
    list_filter = ('category', 'currency', 'is_deleted')
    search_fields = ('category', 'description', 'booking__reference_no', 'supplier__name')
    actions = ['soft_delete']

    @admin.action(description="Soft delete selected expenses")
    def soft_delete(self, request, queryset):
        queryset.update(is_deleted=True)
