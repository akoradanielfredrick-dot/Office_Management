from django.http import JsonResponse


def root(request):
    return JsonResponse(
        {
            "service": "office-management-backend",
            "status": "ok",
            "message": "Backend is running.",
            "endpoints": {
                "admin": "/admin/",
                "api": "/api/",
                "health": "/api/health/",
                "schema": "/api/schema/",
                "docs": "/api/docs/",
            },
        }
    )


def health(request):
    return JsonResponse({"status": "ok"})
