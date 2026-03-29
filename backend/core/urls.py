from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from accounts.views import LoginView, LogoutView
from clients.views import ClientViewSet
from sales.views import QuotationViewSet
from operations.views import BookingViewSet, SupplierViewSet
from finance.views import PaymentViewSet, ReceiptViewSet, ExpenseViewSet, AnalyticsViewSet
from common.views import DashboardViewSet
from core.views import root, health

admin.site.site_header = 'Mranga Tours & Safaris Administration'
admin.site.site_title = 'Mranga Admin Portal'
admin.site.index_title = 'Office Management Administration'
admin.site.site_url = 'http://127.0.0.1:5173/'

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'clients', ClientViewSet, basename='client')
router.register(r'sales/quotations', QuotationViewSet, basename='quotation')
router.register(r'operations/bookings', BookingViewSet, basename='booking')
router.register(r'operations/suppliers', SupplierViewSet, basename='supplier')
router.register(r'finance/payments', PaymentViewSet, basename='payment')
router.register(r'finance/receipts', ReceiptViewSet, basename='receipt')
router.register(r'finance/expenses', ExpenseViewSet, basename='expense')
router.register(r'finance/analytics', AnalyticsViewSet, basename='finance-analytics')
router.register(r'dashboard', DashboardViewSet, basename='dashboard')

urlpatterns = [
    path('', root, name='root'),
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/health/', health, name='health'),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/auth/login/', LoginView.as_view(), name='api-login'),
    path('api/auth/logout/', LogoutView.as_view(), name='api-logout'),
    path('api/auth/', include('rest_framework.urls')),
]
