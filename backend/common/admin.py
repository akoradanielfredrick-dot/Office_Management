from django.contrib import admin
from .models import ActivityLog, CompanySettings, InternalNote

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'table_name', 'record_id', 'created_at')
    list_filter = ('action', 'table_name', 'created_at')
    search_fields = ('user__full_name', 'action', 'table_name')
    readonly_fields = ('user', 'action', 'table_name', 'record_id', 'details', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

@admin.register(CompanySettings)
class CompanySettingsAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'tax_no', 'updated_at')
    search_fields = ('name', 'tax_no')

@admin.register(InternalNote)
class InternalNoteAdmin(admin.ModelAdmin):
    list_display = ('content_object', 'user', 'is_deleted', 'created_at')
    list_filter = ('is_deleted', 'created_at')
    search_fields = ('user__full_name', 'content')
    actions = ['soft_delete']

    @admin.action(description="Soft delete selected notes")
    def soft_delete(self, request, queryset):
        queryset.update(is_deleted=True)
