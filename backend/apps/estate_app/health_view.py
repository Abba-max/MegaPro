from django.http import JsonResponse
from django.db import connections
from django.db.utils import OperationalError

def health_check(request):
    """
    Simple health check endpoint that verifies the application is running
    and the database is reachable.
    """
    health_status = {
        "status": "ok",
        "database": "ok",
    }
    
    # Verify DB connection
    db_conn = connections['default']
    try:
        db_conn.cursor()
    except OperationalError:
        health_status["status"] = "error"
        health_status["database"] = "unreachable"
        return JsonResponse(health_status, status=503)
        
    return JsonResponse(health_status)
