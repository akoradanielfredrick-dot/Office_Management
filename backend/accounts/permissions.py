from rest_framework import permissions

class IsSuperAdminOrDirector(permissions.BasePermission):
    """
    Full system access for management.
    """
    def has_permission(self, request, view):
        return request.user.role and request.user.role.name in ['SUPER_ADMIN', 'DIRECTOR']

class IsFinanceUser(permissions.BasePermission):
    """
    Access to payments, receipts, and expenses.
    """
    def has_permission(self, request, view):
        if not request.user.role:
            return False
        return request.user.role.name in ['SUPER_ADMIN', 'DIRECTOR', 'ACCOUNTS']


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

        return user.role.name in ['SUPER_ADMIN', 'DIRECTOR', 'ACCOUNTS']

class IsOperationsUser(permissions.BasePermission):
    """
    Access to bookings, itineraries, and suppliers.
    """
    def has_permission(self, request, view):
        if not request.user.role:
            return False
        return request.user.role.name in ['SUPER_ADMIN', 'DIRECTOR', 'OPERATIONS']
