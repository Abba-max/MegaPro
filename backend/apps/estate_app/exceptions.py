from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Custom exception handler to prevent leaking internal error details.
    If it's an internal server error (500), return a generic message.
    """
    # Call standard DRF exception handler first
    response = exception_handler(exc, context)

    # If response is None, it means DRF didn't handle this exception (e.g. database error)
    if response is None:
        # Log the actual exception for internal debugging (server logs)
        logger.error(f"Unhandled Exception: {exc}", exc_info=True)
        
        import traceback
        from .models import SystemLog
        try:
            tb_str = traceback.format_exc()
            SystemLog.objects.create(
                level='ERROR',
                category='server',
                message=str(exc),
                traceback=tb_str
            )
        except Exception as log_err:
            logger.error(f"Failed to log exception to DB: {log_err}")

        return Response(
            {
                'error': 'internal_server_error',
                'detail': 'Une erreur interne est survenue. Veuillez réessayer plus tard.'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # For handled exceptions, we can still mask some details if needed
    # But usually 4xx errors are fine to return as-is (validation, auth, etc.)
    
    return response
