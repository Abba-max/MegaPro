from celery import shared_task
from django.contrib.auth import get_user_model
from .utils import send_verification_email, send_welcome_email
import os
from PIL import Image

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

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def optimize_image_task(self, image_path):
    try:
        if not os.path.exists(image_path):
            return
        with Image.open(image_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img.thumbnail((1200, 1200))
            img.save(image_path, optimize=True, quality=80)
    except Exception as exc:
        raise self.retry(exc=exc)
