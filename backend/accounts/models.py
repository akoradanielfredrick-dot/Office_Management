import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone

from .constants import MANAGEMENT_ROLE_NAMES, PORTAL_MODULE_CHOICES, PORTAL_MODULE_LABELS, normalize_role_name

class Role(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class PortalModule(models.Model):
    key = models.CharField(max_length=50, unique=True, choices=PORTAL_MODULE_CHOICES)
    label = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("label",)

    def save(self, *args, **kwargs):
        self.label = PORTAL_MODULE_LABELS.get(self.key, self.label or self.key.replace("_", " ").title())
        super().save(*args, **kwargs)

    def __str__(self):
        return self.label

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        BLOCKED = "blocked", "Blocked"
        REVOKED = "revoked", "Revoked"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    email = models.EmailField(unique=True)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    blocked_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    portal_modules = models.ManyToManyField(PortalModule, blank=True, related_name="users")
    
    # Custom fields
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    objects = UserManager()

    @property
    def role_name(self):
        return normalize_role_name(self.role.name if self.role else "")

    @property
    def is_management(self):
        return self.role_name in MANAGEMENT_ROLE_NAMES

    @property
    def is_access_active(self):
        return self.status == self.Status.ACTIVE

    def _apply_super_admin_role_flags(self):
        role_name = self.role_name
        if role_name in MANAGEMENT_ROLE_NAMES:
            self.is_staff = True
        if role_name == "SUPER_ADMIN":
            self.is_staff = True
            self.is_superuser = True
        elif self.is_superuser:
            self.is_staff = True

    def _sync_status_fields(self):
        now = timezone.now()

        if self.status == self.Status.BLOCKED:
            self.blocked_at = self.blocked_at or now
            self.revoked_at = None
        elif self.status == self.Status.REVOKED:
            self.revoked_at = self.revoked_at or now
            self.blocked_at = None
        else:
            self.blocked_at = None
            self.revoked_at = None

        self.is_active = self.status == self.Status.ACTIVE

    def has_portal_module(self, module_key: str) -> bool:
        if self.is_management:
            return True
        if not self.is_access_active:
            return False
        return self.portal_modules.filter(key=module_key).exists()

    def get_portal_modules(self) -> list[str]:
        if self.is_management:
            return [key for key, _ in PORTAL_MODULE_CHOICES]
        return list(self.portal_modules.order_by("label").values_list("key", flat=True))

    def get_portal_permission_keys(self) -> list[str]:
        return [f"{module_key}.view" for module_key in self.get_portal_modules()]

    def save(self, *args, **kwargs):
        self._apply_super_admin_role_flags()
        self._sync_status_fields()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.email})"
