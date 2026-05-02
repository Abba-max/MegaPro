from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes

def send_styled_email(subject, template_name, context, to_email):
    """
    Sends a professional HTML email using a template.
    """
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
