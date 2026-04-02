from django import forms
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from .models import User


class CustomUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("email", "full_name", "role", "phone")


class CustomUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        fields = ("email", "full_name", "role", "phone", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")


class AdminAccessForm(forms.Form):
    password = forms.CharField(
        label="Password",
        strip=False,
        widget=forms.PasswordInput(attrs={"autocomplete": "current-password"}),
    )


class SuperAdminAdminAuthenticationForm(AuthenticationForm):
    error_messages = {
        **AuthenticationForm.error_messages,
        "super_admin_only": "ONLY ACCESSIBLE BY SUPER ADMIN.",
    }

    def __init__(self, request=None, *args, **kwargs):
        super().__init__(request, *args, **kwargs)
        self.fields["username"].label = "Staff Email"
        self.fields["username"].widget.attrs.update(
            {
                "autocomplete": "username",
                "autocapitalize": "none",
                "placeholder": "name@mrangatours.com",
                "inputmode": "email",
            }
        )
        self.fields["password"].widget.attrs.update(
            {
                "autocomplete": "current-password",
                "placeholder": "Enter your password",
            }
        )

    def confirm_login_allowed(self, user):
        super().confirm_login_allowed(user)
        role_name = (user.role.name if user.role else "").strip().upper().replace("-", "_").replace(" ", "_")
        if role_name != "SUPER_ADMIN":
            raise forms.ValidationError(
                self.error_messages["super_admin_only"],
                code="super_admin_only",
            )
