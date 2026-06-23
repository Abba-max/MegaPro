from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
import logging
import threading

logger = logging.getLogger(__name__)

def send_styled_email(subject, template_name, context, to_email):
    """
    Sends a professional HTML email using a template in a background thread.
    """
    def _send():
        try:
            html_content = render_to_string(f'emails/{template_name}', context)
            text_content = strip_tags(html_content)
            
            msg = EmailMultiAlternatives(
                subject,
                text_content,
                settings.DEFAULT_FROM_EMAIL,
                [to_email]
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send()
        except Exception as e:
            # Since this is in a thread, we just log the error
            print(f"Background email error for {to_email}: {e}")

    # Launch in a separate thread to avoid blocking the main request
    thread = threading.Thread(target=_send)
    thread.daemon = True
    thread.start()

def send_verification_email(user, request=None):
    """
    Generates a verification token and sends the verification email.
    """
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    
    # In a real app, this would be your frontend URL
    # For dev, we might use a setting or request.build_absolute_uri
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.eyangestate.com:4200')
    verification_url = f"{frontend_url}/verify?uid={uid}&token={token}"
    
    context = {
        'name': f"{user.first_name} {user.last_name}".strip() or user.username,
        'verification_url': verification_url,
        'site_url': frontend_url
    }
    
    send_styled_email(
        "Vérifiez votre compte Eyang Estate",
        "verification.html",
        context,
        user.email
    )

def send_password_reset_email(user):
    """
    Generates a password reset token and sends the password reset email.
    """
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://eyangestate.com')
    reset_url = f"{frontend_url}/reset-password?uid={uid}&token={token}"
    
    context = {
        'name': f"{user.first_name} {user.last_name}".strip() or user.username,
        'reset_url': reset_url,
        'site_url': frontend_url
    }
    
    send_styled_email(
        "Réinitialisation de votre mot de passe – Eyang Estate",
        "password_reset.html",
        context,
        user.email
    )

def send_welcome_email(user):
    """
    Sends a welcome email after successful verification.
    """
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.eyangestate.com')
    context = {
        'name': f"{user.first_name} {user.last_name}".strip() or user.username,
        'site_url': frontend_url
    }
    
    send_styled_email(
        "Bienvenue chez Eyang Estate !",
        "welcome.html",
        context,
        user.email
    )


def send_bill_email(reservation, invoice):
    """
    Sends the bill (invoice) as a PDF attachment to both the client and the owner.
    """
    try:
        # Pre-fetch all fields in main thread to avoid lazy-loading SQLite locks in background thread
        client_email = reservation.user.email
        owner_email = reservation.room_category.estate.owner.email
        estate_name = reservation.room_category.estate.name
        room_name = reservation.room_category.name
        
        start_date = reservation.start_date or reservation.check_in
        start_date_str = start_date.strftime('%d/%m/%Y') if start_date else ''
        
        end_date = reservation.end_date or reservation.check_out
        end_date_str = end_date.strftime('%d/%m/%Y') if end_date else ''
        
        invoice_id = invoice.invoice_id
        total_amount_str = f"{invoice.total_amount:,.0f}".replace(',', ' ')
        
        pdf_content = None
        if invoice.pdf_file:
            try:
                pdf_content = invoice.pdf_file.read()
            except Exception as e:
                logger.error(f"Could not read PDF for invoice {invoice_id}: {e}")
    except Exception as prefetch_err:
        logger.error(f"Error prefetching bill email data: {prefetch_err}")
        return

    def _send():
        try:
            # Context for the email template
            context = {
                'estate_name': estate_name,
                'invoice_id': invoice_id,
                'room_name': room_name,
                'start_date': start_date_str,
                'end_date': end_date_str,
                'total_amount': total_amount_str,
                'dashboard_url': getattr(settings, 'FRONTEND_URL', 'https://www.eyangestate.com') + '/dashboard'
            }
            
            subject = f"Facture Eyang Estate - {invoice_id} - {estate_name}"
            html_content = render_to_string('emails/bill_notification.html', context)
            text_content = strip_tags(html_content)
            
            # Recipients: client and owner
            recipients = [client_email]
            if owner_email and owner_email != client_email:
                recipients.append(owner_email)
            
            msg = EmailMultiAlternatives(
                subject,
                text_content,
                settings.DEFAULT_FROM_EMAIL,
                recipients
            )
            msg.attach_alternative(html_content, "text/html")
            
            # Attach the PDF file
            if pdf_content:
                msg.attach(f"Facture_{invoice_id}.pdf", pdf_content, "application/pdf")
            
            msg.send()
            logger.info(f"Bill email sent to {recipients} for invoice {invoice_id}")
            
        except Exception as e:
            logger.error(f"Error sending bill email: {e}")

    # Launch in a separate thread
    thread = threading.Thread(target=_send)
    thread.daemon = True
    thread.start()


def _run_task(task_fn, *args, **kwargs):
    """
    Attempts to run the task asynchronously via Celery (task_fn.delay).
    Falls back to executing the task synchronously inline if Celery is unavailable
    or raises any exception.
    """
    try:
        task_fn.delay(*args, **kwargs)
    except Exception as exc:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning("Celery task dispatch failed, executing synchronously: %s", exc)
        # Execute the task synchronously, catching exceptions so they don't crash the main flow
        try:
            if hasattr(task_fn, 'run'):
                # If the task has bind=True, pass the task itself as the first argument (self)
                if hasattr(task_fn, 'bind') and task_fn.bind:
                    task_fn.run(task_fn, *args, **kwargs)
                else:
                    task_fn.run(*args, **kwargs)
            else:
                task_fn(*args, **kwargs)
        except Exception as task_exc:
            logger.error("Synchronous fallback execution of task failed: %s", task_exc, exc_info=True)


def log_audit(user, action, request=None, result='SUCCESS', details=''):
    """
    Creates an AuditLog entry.
    Extracts IP address from request if provided.
    """
    from .models import AuditLog
    ip = None
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')

    try:
        AuditLog.objects.create(
            user=user if user and user.is_authenticated else None,
            action=action,
            ip_address=ip,
            result=result,
            details=details
        )
    except Exception as e:
        logger.error(f"Failed to write audit log: {e}")


def log_system(level, category, message, traceback_str=''):
    """
    Creates a SystemLog entry.
    """
    from .models import SystemLog
    try:
        SystemLog.objects.create(
            level=level,
            category=category,
            message=message,
            traceback=traceback_str
        )
    except Exception as e:
        logger.error(f"Failed to write system log: {e}")




