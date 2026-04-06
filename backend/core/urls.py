from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from types import MethodType
from rest_framework.routers import DefaultRouter
from accounts.forms import SuperAdminAdminAuthenticationForm
from accounts.views import CsrfCookieView, LoginView, LogoutView, admin_access_confirm
from clients.views import ClientViewSet
from operations.views import (
    ApiIdempotencyRecordViewSet,
    BookingViewSet,
    ExcursionViewSet,
    ExternalProductMappingViewSet,
    GetYourGuideBookingIngestView,
    GetYourGuideBootstrapMappingsView,
    GetYourGuideProductDetailView,
    GetYourGuideProductListView,
    GetYourGuideSandboxRunView,
    InboundBookingPayloadViewSet,
    ProductScheduleViewSet,
    ProductViewSet,
    ReservationViewSet,
    SupplierViewSet,
)
from finance.views import PaymentViewSet, ReceiptViewSet, ExpenseViewSet, AnalyticsViewSet
from common.views import DashboardViewSet

admin.site.site_header = 'Mranga Tours & Safaris Administration'
admin.site.site_title = 'Mranga Admin Portal'
admin.site.index_title = 'System Administration'
admin.site.site_url = '/'
admin.site.login_form = SuperAdminAdminAuthenticationForm


def _super_admin_has_permission(self, request):
    if not request.user.is_authenticated or not request.user.is_active:
        return False

    role_name = (request.user.role.name if request.user.role else "").strip().upper().replace("-", "_").replace(" ", "_")
    return request.user.is_staff and role_name == "SUPER_ADMIN"


admin.site.has_permission = MethodType(_super_admin_has_permission, admin.site)

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'clients', ClientViewSet, basename='client')
router.register(r'operations/excursions', ExcursionViewSet, basename='excursion')
router.register(r'operations/products', ProductViewSet, basename='product')
router.register(r'operations/product-mappings', ExternalProductMappingViewSet, basename='external-product-mapping')
router.register(r'operations/schedules', ProductScheduleViewSet, basename='product-schedule')
router.register(r'operations/reservations', ReservationViewSet, basename='reservation')
router.register(r'operations/bookings', BookingViewSet, basename='booking')
router.register(r'operations/inbound-booking-payloads', InboundBookingPayloadViewSet, basename='inbound-booking-payload')
router.register(r'operations/idempotency-keys', ApiIdempotencyRecordViewSet, basename='api-idempotency-record')
router.register(r'operations/suppliers', SupplierViewSet, basename='supplier')
router.register(r'finance/payments', PaymentViewSet, basename='payment')
router.register(r'finance/receipts', ReceiptViewSet, basename='receipt')
router.register(r'finance/expenses', ExpenseViewSet, basename='expense')
router.register(r'finance/analytics', AnalyticsViewSet, basename='finance-analytics')
router.register(r'dashboard', DashboardViewSet, basename='dashboard')

urlpatterns = [
    path('', RedirectView.as_view(url='/admin/', permanent=False)),
    path('admin/confirm-access/', admin_access_confirm, name='admin-access-confirm'),
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/operations/integrations/get-your-guide/bookings/ingest/', GetYourGuideBookingIngestView.as_view(), name='getyourguide-booking-ingest'),
    path('api/operations/integrations/get-your-guide/products/', GetYourGuideProductListView.as_view(), name='getyourguide-product-list'),
    path('api/operations/integrations/get-your-guide/products/<str:product_reference>/', GetYourGuideProductDetailView.as_view(), name='getyourguide-product-detail'),
    path('api/operations/integrations/get-your-guide/mappings/bootstrap/', GetYourGuideBootstrapMappingsView.as_view(), name='getyourguide-bootstrap-mappings'),
    path('api/operations/integrations/get-your-guide/sandbox/run/', GetYourGuideSandboxRunView.as_view(), name='getyourguide-sandbox-run'),
    path('api/auth/csrf/', CsrfCookieView.as_view(), name='api-csrf'),
    path('api/auth/login/', LoginView.as_view(), name='api-login'),
    path('api/auth/logout/', LogoutView.as_view(), name='api-logout'),
    path('api/auth/', include('rest_framework.urls')),
]
