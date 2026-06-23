"""
Email utilities for Eyang Estate notifications.
"""
import logging
from django.conf import settings
from .utils import send_styled_email

logger = logging.getLogger(__name__)

def _build_reservation_context(reservation) -> dict:
    """Build the context dict for reservation emails."""
    details = {}
    if getattr(reservation, 'reservation_details_json', None):
        if isinstance(reservation.reservation_details_json, dict):
            details = reservation.reservation_details_json
        else:
            import json
            try:
                details = json.loads(reservation.reservation_details_json)
            except Exception:
                pass
                
    estate_name = details.get('estate', {}).get('name')
    if not estate_name and getattr(reservation, 'room_category', None):
        estate_name = reservation.room_category.estate.name if getattr(reservation.room_category, 'estate', None) else ''
        
    room_name = details.get('room_category', {}).get('name')
    if not room_name and getattr(reservation, 'room_category', None):
        room_name = reservation.room_category.name
        
    client_name = getattr(reservation.user, 'first_name', None)
    if not client_name:
        client_name = getattr(reservation.user, 'username', '')
    
    check_in_str = reservation.check_in.strftime('%d/%m/%Y') if hasattr(reservation.check_in, 'strftime') else str(reservation.check_in)
    check_out_str = reservation.check_out.strftime('%d/%m/%Y') if hasattr(reservation.check_out, 'strftime') else str(reservation.check_out)
    
    months = 0
    if hasattr(reservation.check_in, 'year') and hasattr(reservation.check_out, 'year'):
        months = (reservation.check_out.year - reservation.check_in.year) * 12 + (reservation.check_out.month - reservation.check_in.month)
        if months <= 0:
            months = 1
            
    # Format prices
    try:
        total_val = float(reservation.total_price)
        total_price = f"{int(total_val):,} FCFA".replace(',', ' ')
    except (ValueError, TypeError):
        total_price = str(reservation.total_price) + " FCFA"
        
    price_per_month = ""
    try:
        room_price = details.get('room_category', {}).get('price', 0)
        if not room_price and getattr(reservation, 'room_category', None):
            room_price = reservation.room_category.price
        price_per_month = f"{int(float(room_price)):,} FCFA".replace(',', ' ')
    except (ValueError, TypeError):
        pass
        
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://eyangestate.com')
    
    return {
        'client_name': client_name,
        'estate_name': estate_name,
        'room_name': room_name,
        'check_in': check_in_str,
        'check_out': check_out_str,
        'months': months,
        'price_per_month': price_per_month,
        'total_price': total_price,
        'dashboard_url': f"{frontend_url}/dashboard",
        'site_url': frontend_url,
        'reservation_id': getattr(reservation, 'id', ''),
    }

def send_reservation_created_email(reservation) -> None:
    """Send reservation created email."""
    try:
        if not getattr(reservation, 'user', None) or not getattr(reservation.user, 'email', None):
            return
        context = _build_reservation_context(reservation)
        send_styled_email(
            subject="Votre demande de réservation est en cours – Eyang Estate",
            template_name="reservation_created.html",
            context=context,
            to_email=reservation.user.email
        )
    except Exception as e:
        logger.warning(f"Failed to send reservation created email: {e}")

def send_reservation_accepted_email(reservation) -> None:
    """Send reservation accepted email."""
    try:
        if not getattr(reservation, 'user', None) or not getattr(reservation.user, 'email', None):
            return
        context = _build_reservation_context(reservation)
        estate_name = context.get('estate_name', '')
        send_styled_email(
            subject=f"🎉 Réservation acceptée – {estate_name} – Eyang Estate",
            template_name="reservation_accepted.html",
            context=context,
            to_email=reservation.user.email
        )
    except Exception as e:
        logger.warning(f"Failed to send reservation accepted email: {e}")

def send_reservation_rejected_email(reservation) -> None:
    """Send reservation rejected email."""
    try:
        if not getattr(reservation, 'user', None) or not getattr(reservation.user, 'email', None):
            return
        context = _build_reservation_context(reservation)
        send_styled_email(
            subject="Mise à jour de votre réservation – Eyang Estate",
            template_name="reservation_rejected.html",
            context=context,
            to_email=reservation.user.email
        )
    except Exception as e:
        logger.warning(f"Failed to send reservation rejected email: {e}")

def send_reservation_cancelled_email(reservation) -> None:
    """Send reservation cancelled email."""
    try:
        if not getattr(reservation, 'user', None) or not getattr(reservation.user, 'email', None):
            return
        context = _build_reservation_context(reservation)
        send_styled_email(
            subject="Réservation annulée – Eyang Estate",
            template_name="reservation_cancelled.html",
            context=context,
            to_email=reservation.user.email
        )
    except Exception as e:
        logger.warning(f"Failed to send reservation cancelled email: {e}")

def _build_quickorder_context(order, recipient_type: str = 'client') -> dict:
    """Build context for quick order emails."""
    estate_name = order.estate.name if getattr(order, 'estate', None) else ''
    room_name = order.room_category.name if getattr(order, 'room_category', None) else ''
    client_name = getattr(order, 'name', '') or (getattr(order.user, 'username', '') if getattr(order, 'user', None) else '')
    client_phone = getattr(order, 'phone', '') or (getattr(order.user, 'contact', '') if getattr(order, 'user', None) else '')
    
    owner_name = ''
    if getattr(order, 'estate', None) and getattr(order.estate, 'owner', None):
        owner_name = getattr(order.estate.owner, 'first_name', None) or getattr(order.estate.owner, 'username', '')
        
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://eyangestate.com')
    
    return {
        'recipient_type': recipient_type,
        'client_name': client_name,
        'client_phone': client_phone,
        'owner_name': owner_name,
        'estate_name': estate_name,
        'room_name': room_name,
        'dashboard_url': f"{frontend_url}/dashboard",
        'site_url': frontend_url,
    }

def send_quickorder_created_email(order) -> None:
    """Send quickorder created emails to client and owner."""
    try:
        estate_name = order.estate.name if getattr(order, 'estate', None) else ''
        subject = f"Nouvelle réservation rapide – {estate_name} – Eyang Estate"
        
        # To Client
        if getattr(order, 'user', None) and getattr(order.user, 'email', None):
            context_client = _build_quickorder_context(order, recipient_type='client')
            send_styled_email(
                subject=subject,
                template_name="quickorder_created.html",
                context=context_client,
                to_email=order.user.email
            )
            
        # To Owner
        if getattr(order, 'estate', None) and getattr(order.estate, 'owner', None) and getattr(order.estate.owner, 'email', None):
            context_owner = _build_quickorder_context(order, recipient_type='owner')
            send_styled_email(
                subject=subject,
                template_name="quickorder_created.html",
                context=context_owner,
                to_email=order.estate.owner.email
            )
    except Exception as e:
        logger.warning(f"Failed to send quickorder created email: {e}")

def send_quickorder_accepted_email(order) -> None:
    """Send quickorder accepted email."""
    try:
        if not getattr(order, 'user', None) or not getattr(order.user, 'email', None):
            return
        context = _build_quickorder_context(order, recipient_type='client')
        estate_name = context.get('estate_name', '')
        send_styled_email(
            subject=f"✅ Réservation acceptée – {estate_name} – Eyang Estate",
            template_name="quickorder_accepted.html",
            context=context,
            to_email=order.user.email
        )
    except Exception as e:
        logger.warning(f"Failed to send quickorder accepted email: {e}")

def send_quickorder_rejected_email(order) -> None:
    """Send quickorder rejected email."""
    try:
        if not getattr(order, 'user', None) or not getattr(order.user, 'email', None):
            return
        context = _build_quickorder_context(order, recipient_type='client')
        send_styled_email(
            subject="Mise à jour de votre réservation rapide – Eyang Estate",
            template_name="quickorder_rejected.html",
            context=context,
            to_email=order.user.email
        )
    except Exception as e:
        logger.warning(f"Failed to send quickorder rejected email: {e}")
