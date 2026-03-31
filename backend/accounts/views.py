from django.contrib.auth import authenticate, login, logout
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .forms import AdminAccessForm
from .middleware import ADMIN_REAUTH_SESSION_KEY
from .serializers import LoginSerializer


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        user = authenticate(request, email=email, password=password)

        if user is None:
            raise serializers.ValidationError({'detail': 'Invalid email or password. Please try again.'})

        if not user.is_active:
            raise serializers.ValidationError({'detail': 'This account is inactive.'})

        request.session.pop(ADMIN_REAUTH_SESSION_KEY, None)
        login(request, user)

        role_name = user.role.name if user.role else None
        return Response({
            'user': {
                'id': str(user.id),
                'email': user.email,
                'full_name': user.full_name,
                'role': role_name,
            }
        }, status=status.HTTP_200_OK)


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfCookieView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response(status=status.HTTP_204_NO_CONTENT)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.session.pop(ADMIN_REAUTH_SESSION_KEY, None)
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


def admin_access_confirm(request):
    if not request.user.is_authenticated:
        return redirect(f"{reverse('admin:login')}?next=/admin/confirm-access/?next=/admin/")

    role_name = (request.user.role.name if request.user.role else "").strip().upper().replace("-", "_").replace(" ", "_")
    if not request.user.is_staff or role_name != "SUPER_ADMIN":
        return redirect("admin:login")

    next_url = request.GET.get("next") or request.POST.get("next") or "/admin/"
    if not url_has_allowed_host_and_scheme(next_url, allowed_hosts={request.get_host()}, require_https=request.is_secure()):
        next_url = "/admin/"

    if request.method == "POST":
        form = AdminAccessForm(request.POST)
        if form.is_valid() and request.user.check_password(form.cleaned_data["password"]):
            request.session[ADMIN_REAUTH_SESSION_KEY] = True
            return redirect(next_url)
        form.add_error("password", "Incorrect password. Please try again.")
    else:
        form = AdminAccessForm()

    return render(
        request,
        "admin/confirm_access.html",
        {
            "form": form,
            "next_url": next_url,
        },
    )
