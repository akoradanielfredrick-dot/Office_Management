PORTAL_MODULE_CHOICES = [
    ("dashboard", "Dashboard"),
    ("bookings", "Bookings"),
    ("catalog", "Catalog"),
    ("products", "Products"),
    ("excursions", "Excursions"),
    ("schedules", "Schedules"),
    ("availability", "Availability"),
    ("integrations", "Integrations"),
    ("reservations", "Reservations"),
    ("payments", "Payments"),
    ("expenses", "Expenses"),
    ("analytics", "Analytics"),
    ("clients", "Clients"),
]

PORTAL_MODULE_LABELS = {key: label for key, label in PORTAL_MODULE_CHOICES}
PORTAL_PERMISSION_KEYS = [f"{key}.view" for key, _ in PORTAL_MODULE_CHOICES]
MANAGEMENT_ROLE_NAMES = {"SUPER_ADMIN", "DIRECTOR"}
FINANCE_ROLE_NAMES = {"SUPER_ADMIN", "DIRECTOR", "ACCOUNTS"}
OPERATIONS_ROLE_NAMES = {"SUPER_ADMIN", "DIRECTOR", "OPERATIONS"}


def normalize_role_name(role_name: str | None) -> str:
    return (role_name or "").strip().upper().replace("-", "_").replace(" ", "_")
