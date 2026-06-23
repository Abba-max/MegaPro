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


# ── SMS Tasks ──────────────────────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=120)
def send_reservation_sms_task(self, reservation_id):
    """Send SMS confirmation after a Reservation is created."""
    try:
        from .models import Reservation
        from .sms_utils import _format_phone_cm, _build_reservation_sms, send_sms
        reservation = Reservation.objects.select_related(
            'user', 'room_category__estate'
        ).get(id=reservation_id)
        phone = _format_phone_cm(getattr(reservation.user, 'contact', '') or '')
        if not phone:
            return
        message = _build_reservation_sms(reservation)
        if not send_sms(phone, message):
            raise Exception("send_sms returned False")
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=120)
def send_quickorder_sms_task(self, order_id):
    """Send SMS confirmation after a QuickOrder is created."""
    try:
        from .models import QuickOrder
        from .sms_utils import _format_phone_cm, _build_quickorder_sms, send_sms
        order = QuickOrder.objects.select_related(
            'estate', 'room_category', 'user'
        ).get(id=order_id)
        raw_phone = order.phone or (
            getattr(order.user, 'contact', '') if order.user else ''
        )
        phone = _format_phone_cm(raw_phone)
        if not phone:
            return
        message = _build_quickorder_sms(order)
        if not send_sms(phone, message):
            raise Exception("send_sms returned False")
    except Exception as exc:
        raise self.retry(exc=exc)


# ── Email Tasks ─────────────────────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_reservation_created_email_task(self, reservation_id):
    """Email client after Reservation creation."""
    try:
        from .models import Reservation
        from .email_utils import send_reservation_created_email
        reservation = Reservation.objects.select_related(
            'user', 'room_category__estate__owner'
        ).get(id=reservation_id)
        send_reservation_created_email(reservation)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_reservation_accepted_email_task(self, reservation_id):
    """Email client after Reservation is accepted."""
    try:
        from .models import Reservation
        from .email_utils import send_reservation_accepted_email
        reservation = Reservation.objects.select_related(
            'user', 'room_category__estate__owner'
        ).get(id=reservation_id)
        send_reservation_accepted_email(reservation)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_reservation_rejected_email_task(self, reservation_id):
    """Email client after Reservation is rejected."""
    try:
        from .models import Reservation
        from .email_utils import send_reservation_rejected_email
        reservation = Reservation.objects.select_related(
            'user', 'room_category__estate__owner'
        ).get(id=reservation_id)
        send_reservation_rejected_email(reservation)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_reservation_cancelled_email_task(self, reservation_id):
    """Email client after Reservation is cancelled."""
    try:
        from .models import Reservation
        from .email_utils import send_reservation_cancelled_email
        reservation = Reservation.objects.select_related(
            'user', 'room_category__estate__owner'
        ).get(id=reservation_id)
        send_reservation_cancelled_email(reservation)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_quickorder_created_email_task(self, order_id):
    """Email client and owner after QuickOrder creation."""
    try:
        from .models import QuickOrder
        from .email_utils import send_quickorder_created_email
        order = QuickOrder.objects.select_related(
            'estate__owner', 'room_category', 'user'
        ).get(id=order_id)
        send_quickorder_created_email(order)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_quickorder_accepted_email_task(self, order_id):
    """Email client after QuickOrder is accepted."""
    try:
        from .models import QuickOrder
        from .email_utils import send_quickorder_accepted_email
        order = QuickOrder.objects.select_related(
            'estate__owner', 'room_category', 'user'
        ).get(id=order_id)
        send_quickorder_accepted_email(order)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_quickorder_rejected_email_task(self, order_id):
    """Email client after QuickOrder is rejected."""
    try:
        from .models import QuickOrder
        from .email_utils import send_quickorder_rejected_email
        order = QuickOrder.objects.select_related(
            'estate__owner', 'room_category', 'user'
        ).get(id=order_id)
        send_quickorder_rejected_email(order)
    except Exception as exc:
        raise self.retry(exc=exc)
