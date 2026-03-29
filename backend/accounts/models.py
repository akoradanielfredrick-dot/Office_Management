import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager

class Role(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

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
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    email = models.EmailField(unique=True)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    
    # Custom fields
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    objects = UserManager()

    def _apply_super_admin_role_flags(self):
        role_name = (self.role.name if self.role else "").strip().upper().replace("-", "_").replace(" ", "_")
        if role_name == "SUPER_ADMIN":
            self.is_staff = True
            self.is_superuser = True

    def save(self, *args, **kwargs):
        self._apply_super_admin_role_flags()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.email})"
