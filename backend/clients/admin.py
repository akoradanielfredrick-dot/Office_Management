from django.contrib import admin
from .models import Client, ClientContact

class ClientContactInline(admin.TabularInline):
    model = ClientContact
    extra = 1

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'email', 'phone', 'is_deleted', 'created_at')
    list_filter = ('is_deleted',)
    search_fields = ('full_name', 'email', 'phone')
    inlines = [ClientContactInline]
    actions = ['soft_delete']

    @admin.action(description="Soft delete selected clients")
    def soft_delete(self, request, queryset):
        queryset.update(is_deleted=True)

@admin.register(ClientContact)
class ClientContactAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'client', 'email', 'phone')
    list_filter = ('role',)
    search_fields = ('name', 'email', 'client__full_name')
