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


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def upload_estate_images_task(self, estate_id, files_data):
    import base64
    from django.core.files.base import ContentFile
    try:
        from .models import Estate, EstateImage
        estate = Estate.objects.get(pk=estate_id)
        for fd in files_data:
            content = base64.b64decode(fd['content'])
            img_file = ContentFile(content, name=fd['name'])
            EstateImage.objects.create(estate=estate, image=img_file)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def upload_room_images_task(self, room_category_id, files_data):
    import base64
    from django.core.files.base import ContentFile
    try:
        from .models import RoomCategory, RoomImage
        room_cat = RoomCategory.objects.get(pk=room_category_id)
        for fd in files_data:
            content = base64.b64decode(fd['content'])
            img_file = ContentFile(content, name=fd['name'])
            RoomImage.objects.create(room_category=room_cat, image=img_file)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_invoice_task(self, reservation_id):
    try:
        from .models import Reservation, Invoice
        from .bill_generator import generate_invoice_pdf
        
        reservation = (
            Reservation.objects
            .select_related('room_category__estate', 'user')
            .prefetch_related('room_category__equipment_set__equipment', 'room_category__estate__supplements_set')
            .get(id=reservation_id)
        )
        category = reservation.room_category
        price_per_month = float(category.price_per_month or category.price or 0)

        # Compute months
        check_in  = reservation.start_date or reservation.check_in
        check_out = reservation.end_date   or reservation.check_out
        months = 1
        if check_in and check_out:
            months = max(1, (check_out.year - check_in.year) * 12 + (check_out.month - check_in.month))

        total_amount = reservation.total_price or (price_per_month * months * (reservation.num_rooms or 1))

        # Create or retrieve Invoice record
        invoice, created = Invoice.objects.get_or_create(
            reservation=reservation,
            defaults={
                'total_amount': total_amount,
                'status': 'UNPAID',
            }
        )

        if not created and invoice.pdf_file:
            return

        success = generate_invoice_pdf(invoice)
        if not success:
            raise Exception("PDF generation failed")
    except Exception as exc:
        raise self.retry(exc=exc)

