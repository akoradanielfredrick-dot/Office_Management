from django import forms
from django.contrib import admin
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from .constants import MANAGEMENT_ROLE_NAMES, PORTAL_MODULE_CHOICES, normalize_role_name
from .models import PortalModule, User


class CustomUserCreationForm(UserCreationForm):
    portal_modules = forms.ModelMultipleChoiceField(
        queryset=PortalModule.objects.none(),
        required=False,
        widget=admin.widgets.FilteredSelectMultiple("Assigned modules", is_stacked=False),
    )

    status = forms.ChoiceField(choices=User.Status.choices, initial=User.Status.ACTIVE)

    class Media:
        css = {"all": ("admin/css/widgets.css",)}
        js = ("admin/js/core.js", "admin/js/SelectBox.js", "admin/js/SelectFilter2.js")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["portal_modules"].queryset = PortalModule.objects.order_by("label")
        self.fields["password1"].widget = forms.TextInput(
            attrs={"autocomplete": "new-password", "spellcheck": "false"}
        )
        self.fields["password2"].widget = forms.TextInput(
            attrs={"autocomplete": "new-password", "spellcheck": "false"}
        )
        self.fields["password1"].help_text = "Visible to the administrator while creating the user and shown once again after save."
        self.fields["password2"].help_text = "Repeat the same password to confirm."

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("email", "full_name", "role", "phone", "status", "portal_modules")

    def save(self, commit=True):
        user = super().save(commit=False)
        user.status = self.cleaned_data["status"]
        user._admin_plaintext_password = self.cleaned_data.get("password1", "")
        if commit:
            user.save()
            self.save_m2m()
            user.portal_modules.set(self.cleaned_data["portal_modules"])
        return user


class CustomUserChangeForm(UserChangeForm):
    portal_modules = forms.ModelMultipleChoiceField(
        queryset=PortalModule.objects.none(),
        required=False,
        widget=admin.widgets.FilteredSelectMultiple("Assigned modules", is_stacked=False),
    )
    new_password1 = forms.CharField(
        label="New password",
        required=False,
        widget=forms.TextInput(attrs={"autocomplete": "new-password", "spellcheck": "false"}),
        help_text="Leave blank to keep the current password. This value is visible to the administrator while editing.",
    )
    new_password2 = forms.CharField(
        label="Confirm new password",
        required=False,
        widget=forms.TextInput(attrs={"autocomplete": "new-password", "spellcheck": "false"}),
        help_text="Repeat the new password exactly.",
    )

    class Media:
        css = {"all": ("admin/css/widgets.css",)}
        js = ("admin/js/core.js", "admin/js/SelectBox.js", "admin/js/SelectFilter2.js")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["portal_modules"].queryset = PortalModule.objects.order_by("label")
        if self.instance.pk:
            self.fields["portal_modules"].initial = self.instance.portal_modules.all()

    class Meta(UserChangeForm.Meta):
        model = User
        fields = (
            "email",
            "full_name",
            "role",
            "phone",
            "status",
            "blocked_at",
            "revoked_at",
            "portal_modules",
            "is_staff",
            "is_superuser",
            "groups",
            "user_permissions",
        )

    def clean(self):
        cleaned_data = super().clean()
        new_password1 = cleaned_data.get("new_password1")
        new_password2 = cleaned_data.get("new_password2")

        if new_password1 or new_password2:
            if new_password1 != new_password2:
                self.add_error("new_password2", "The two password fields didn't match.")
            elif len(new_password1 or "") < 8:
                self.add_error("new_password1", "Password must be at least 8 characters long.")

        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)
        new_password = self.cleaned_data.get("new_password1")
        if new_password:
            user.set_password(new_password)
            user._admin_plaintext_password = new_password
        if commit:
            user.save()
            self.save_m2m()
            user.portal_modules.set(self.cleaned_data["portal_modules"])
        return user


class AdminAccessForm(forms.Form):
    password = forms.CharField(
        label="Password",
        strip=False,
        widget=forms.PasswordInput(attrs={"autocomplete": "current-password"}),
    )


class SuperAdminAdminAuthenticationForm(AuthenticationForm):
    error_messages = {
        **AuthenticationForm.error_messages,
        "management_only": "ONLY ACCESSIBLE BY SUPER ADMIN OR DIRECTOR.",
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
        role_name = normalize_role_name(user.role.name if user.role else "")
        if user.status == User.Status.BLOCKED:
            raise forms.ValidationError("THIS ACCOUNT HAS BEEN BLOCKED BY AN ADMINISTRATOR.", code="blocked")
        if user.status == User.Status.REVOKED:
            raise forms.ValidationError("THIS ACCOUNT HAS BEEN REVOKED AND CANNOT ACCESS THE PORTAL.", code="revoked")
        if role_name not in MANAGEMENT_ROLE_NAMES:
            raise forms.ValidationError(
                self.error_messages["management_only"],
                code="management_only",
            )
