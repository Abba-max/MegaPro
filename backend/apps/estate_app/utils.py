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
    def _send():
        try:
            client = reservation.user
            owner = reservation.room_category.estate.owner
            estate_name = reservation.room_category.estate.name
            
            # Context for the email template
            context = {
                'estate_name': estate_name,
                'invoice_id': invoice.invoice_id,
                'room_name': reservation.room_category.name,
                'start_date': reservation.start_date.strftime('%d/%m/%Y') if reservation.start_date else reservation.check_in.strftime('%d/%m/%Y'),
                'end_date': reservation.end_date.strftime('%d/%m/%Y') if reservation.end_date else reservation.check_out.strftime('%d/%m/%Y'),
                'total_amount': f"{invoice.total_amount:,.0f}".replace(',', ' '),
                'dashboard_url': getattr(settings, 'FRONTEND_URL', 'https://www.eyangestate.com') + '/dashboard'
            }
            
            subject = f"Facture Eyang Estate - {invoice.invoice_id} - {estate_name}"
            html_content = render_to_string('emails/bill_notification.html', context)
            text_content = strip_tags(html_content)
            
            # Recipients: client and owner
            recipients = [client.email]
            if owner.email and owner.email != client.email:
                recipients.append(owner.email)
            
            msg = EmailMultiAlternatives(
                subject,
                text_content,
                settings.DEFAULT_FROM_EMAIL,
                recipients
            )
            msg.attach_alternative(html_content, "text/html")
            
            # Attach the PDF file
            if invoice.pdf_file:
                # Read the file content. If it's on Cloudinary, we need to handle it.
                # Usually .file.read() works even with remote storages.
                try:
                    pdf_content = invoice.pdf_file.read()
                    msg.attach(f"Facture_{invoice.invoice_id}.pdf", pdf_content, "application/pdf")
                except Exception as e:
                    logger.error(f"Could not attach PDF for invoice {invoice.invoice_id}: {e}")
            
            msg.send()
            logger.info(f"Bill email sent to {recipients} for invoice {invoice.invoice_id}")
            
        except Exception as e:
            logger.error(f"Error sending bill email: {e}")

    # Launch in a separate thread
    thread = threading.Thread(target=_send)
    thread.daemon = True
    thread.start()


