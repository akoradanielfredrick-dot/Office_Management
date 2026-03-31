from django.shortcuts import redirect
from django.urls import reverse


ADMIN_REAUTH_SESSION_KEY = "admin_access_confirmed"


class AdminReauthenticationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        admin_path = reverse("admin:index")
        confirm_path = reverse("admin-access-confirm")
        login_path = reverse("admin:login")
        logout_path = reverse("admin:logout")

        if request.path.startswith(admin_path):
            is_exempt_path = (
                request.path.startswith(confirm_path)
                or request.path.startswith(login_path)
                or request.path.startswith(logout_path)
            )

            if request.user.is_authenticated and request.user.is_staff and not is_exempt_path:
                if not request.session.get(ADMIN_REAUTH_SESSION_KEY):
                    next_url = request.get_full_path()
                    return redirect(f"{confirm_path}?next={next_url}")

        return self.get_response(request)
