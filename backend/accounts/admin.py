from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .forms import CustomUserChangeForm, CustomUserCreationForm
from .models import User, Role, PortalModule

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'created_at')
    search_fields = ('name',)


@admin.register(PortalModule)
class PortalModuleAdmin(admin.ModelAdmin):
    list_display = ('label', 'key', 'created_at')
    search_fields = ('label', 'key')
    ordering = ('label',)

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm
    list_display = ('email', 'full_name', 'role', 'status_badge', 'module_summary', 'is_staff', 'is_active')
    list_filter = ('role', 'status', 'is_staff', 'is_active')
    search_fields = ('email', 'full_name')
    ordering = ('email',)
    actions = ('block_users', 'unblock_users', 'revoke_users', 'restore_users')

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('full_name', 'phone', 'role')}),
        ('Access Control', {'fields': ('status', 'blocked_at', 'revoked_at', 'portal_modules')}),
        ('Permissions', {'fields': ('is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login',)}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'role', 'phone', 'status', 'portal_modules', 'password1', 'password2', 'is_staff', 'is_superuser'),
        }),
    )
    filter_horizontal = ('groups', 'user_permissions')
    readonly_fields = ('blocked_at', 'revoked_at')

    def save_model(self, request, obj, form, change):
        obj._apply_super_admin_role_flags()
        super().save_model(request, obj, form, change)

    @admin.display(description='Status')
    def status_badge(self, obj):
        return obj.get_status_display()

    @admin.display(description='Assigned Modules')
    def module_summary(self, obj):
        if obj.is_management:
            return 'All modules'
        labels = list(obj.portal_modules.order_by('label').values_list('label', flat=True))
        return ', '.join(labels) if labels else 'No modules assigned'

    @admin.action(description='Block selected users')
    def block_users(self, request, queryset):
        for user in queryset:
            user.status = User.Status.BLOCKED
            user.save(update_fields=['status', 'blocked_at', 'revoked_at', 'is_active'])

    @admin.action(description='Unblock selected users')
    def unblock_users(self, request, queryset):
        for user in queryset:
            user.status = User.Status.ACTIVE
            user.save(update_fields=['status', 'blocked_at', 'revoked_at', 'is_active'])

    @admin.action(description='Revoke selected users')
    def revoke_users(self, request, queryset):
        for user in queryset:
            user.status = User.Status.REVOKED
            user.save(update_fields=['status', 'blocked_at', 'revoked_at', 'is_active'])

    @admin.action(description='Restore selected users')
    def restore_users(self, request, queryset):
        for user in queryset:
            user.status = User.Status.ACTIVE
            user.save(update_fields=['status', 'blocked_at', 'revoked_at', 'is_active'])
