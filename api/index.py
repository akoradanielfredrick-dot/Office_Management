import os
import sys
from pathlib import Path
import threading


ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
_BOOTSTRAP_LOCK = threading.Lock()
_BOOTSTRAP_COMPLETE = False

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
os.environ.setdefault("DJANGO_STATIC_ROOT", "/tmp/django-static")


def _should_prepare_runtime() -> bool:
    return os.environ.get("AUTO_PREPARE_DJANGO", "").strip().lower() in {"1", "true", "yes", "on"}


def _prepare_runtime() -> None:
    global _BOOTSTRAP_COMPLETE

    if _BOOTSTRAP_COMPLETE or not _should_prepare_runtime():
        return

    with _BOOTSTRAP_LOCK:
        if _BOOTSTRAP_COMPLETE:
            return

        import django
        from django.core.management import call_command

        django.setup()
        call_command("migrate", interactive=False, run_syncdb=True, verbosity=0)
        call_command("collectstatic", interactive=False, clear=False, verbosity=0)
        _BOOTSTRAP_COMPLETE = True


_prepare_runtime()

from core.wsgi import application as app
