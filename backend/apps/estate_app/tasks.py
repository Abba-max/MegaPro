from celery import shared_task
from django.contrib.auth import get_user_model
from .utils import send_verification_email, send_welcome_email

User = get_user_model()

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_verification_email_task(self, user_id):
    try:
        user = User.objects.get(pk=user_id)
        send_verification_email(user)
    except Exception as exc:
        raise self.retry(exc=exc)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_email_task(self, user_id):
    try:
        user = User.objects.get(pk=user_id)
        send_welcome_email(user)
    except Exception as exc:
        raise self.retry(exc=exc)
