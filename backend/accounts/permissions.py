from rest_framework import permissions

from .constants import FINANCE_ROLE_NAMES, MANAGEMENT_ROLE_NAMES, OPERATIONS_ROLE_NAMES, normalize_role_name

class IsSuperAdminOrDirector(permissions.BasePermission):
    """
    Full system access for management.
    """
    def has_permission(self, request, view):
        return bool(request.user.role and normalize_role_name(request.user.role.name) in MANAGEMENT_ROLE_NAMES)

class IsFinanceUser(permissions.BasePermission):
    """
    Access to payments, receipts, and expenses.
    """
    def has_permission(self, request, view):
        if not request.user.role:
            return False
        return normalize_role_name(request.user.role.name) in FINANCE_ROLE_NAMES


class IsAuthenticatedReadOnlyOrFinanceWrite(permissions.BasePermission):
    """
    Allow any signed-in user to view finance records, while keeping write actions
    restricted to finance-authorized roles.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        if not user.role:
            return False

        return normalize_role_name(user.role.name) in FINANCE_ROLE_NAMES

class IsOperationsUser(permissions.BasePermission):
    """
    Access to bookings, itineraries, and suppliers.
    """
    def has_permission(self, request, view):
        if not request.user.role:
            return False
        return normalize_role_name(request.user.role.name) in OPERATIONS_ROLE_NAMES


class HasPortalModuleAccess(permissions.BasePermission):
    message = "You do not have access to this module."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if getattr(user, "is_management", False):
            return True

        required_modules = getattr(view, "required_portal_modules", None) or ()
        if not required_modules:
            return True

        return any(user.has_portal_module(module_key) for module_key in required_modules)
