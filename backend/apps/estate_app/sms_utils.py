"""
SMS Utility module using Africa's Talking.
"""
import logging
import threading
import re
from django.conf import settings
import africastalking

logger = logging.getLogger(__name__)

def _format_phone_cm(phone: str) -> str:
    """Format phone number to E.164 standard for Cameroon."""
    if not phone:
        return ''
    
    cleaned = re.sub(r'[\s\-\(\)]+', '', str(phone))
    if not cleaned:
        return ''
        
    if cleaned.startswith('+'):
        return cleaned
        
    if cleaned.startswith('237') and len(cleaned) >= 12:
        return '+' + cleaned
        
    return '+237' + cleaned

def _build_reservation_sms(reservation) -> str:
    """Build SMS message for a Reservation."""
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
        
    first_name = reservation.user.first_name if getattr(reservation.user, 'first_name', None) else getattr(reservation.user, 'username', '')
    check_in = reservation.check_in.strftime('%d/%m/%Y') if hasattr(reservation.check_in, 'strftime') else str(reservation.check_in)
    check_out = reservation.check_out.strftime('%d/%m/%Y') if hasattr(reservation.check_out, 'strftime') else str(reservation.check_out)
    
    msg = f"Eyang Estate: Bonjour {first_name}, votre demande pour {estate_name} ({room_name}) du {check_in} au {check_out} est en cours. Suivi: eyangestate.com"
    if len(msg) > 160:
        msg = msg[:157] + "..."
    return msg

def _build_quickorder_sms(order) -> str:
    """Build SMS message for a QuickOrder."""
    name = order.name or ''
    estate_name = order.estate.name if getattr(order, 'estate', None) else ''
    msg = f"Eyang Estate: Bonjour {name}, votre demande pour {estate_name} est bien recue et en traitement. Suivi: eyangestate.com"
    if len(msg) > 160:
        msg = msg[:157] + "..."
    return msg

def send_sms(to_phone: str, message: str) -> bool:
    """Send an SMS using Africa's Talking API."""
    try:
        username = getattr(settings, 'AT_USERNAME', 'sandbox')
        api_key = getattr(settings, 'AT_API_KEY', '')
        sender_id = getattr(settings, 'AT_SENDER_ID', None)
        
        if not api_key:
            logger.warning("AT_API_KEY is not set. SMS sending aborted.")
            return False
            
        africastalking.initialize(username, api_key)
        sms = africastalking.SMS
        
        if sender_id:
            response = sms.send(message, [to_phone], sender_id)
        else:
            response = sms.send(message, [to_phone])
            
        recipients = response.get('SMSMessageData', {}).get('Recipients', [])
        if recipients:
            status = recipients[0].get('status')
            msg_id = recipients[0].get('messageId')
            logger.info(f"SMS sent to {to_phone}. Status: {status}, MessageId: {msg_id}")
            return status == "Success"
        return True
    except Exception as e:
        logger.warning(f"Failed to send SMS to {to_phone}: {e}")
        return False

def send_reservation_confirmation_sms(reservation) -> None:
    """Send confirmation SMS asynchronously for a Reservation."""
    try:
        raw_phone = getattr(reservation.user, 'contact', '') or ''
        phone = _format_phone_cm(raw_phone)
        if not phone:
            logger.info("No valid phone number for reservation confirmation SMS.")
            return
            
        message = _build_reservation_sms(reservation)
        threading.Thread(target=send_sms, args=(phone, message), daemon=True).start()
    except Exception as e:
        logger.warning(f"Error in send_reservation_confirmation_sms: {e}")

def send_quickorder_confirmation_sms(order) -> None:
    """Send confirmation SMS asynchronously for a QuickOrder."""
    try:
        raw_phone = getattr(order, 'phone', '') or ''
        if not raw_phone and getattr(order, 'user', None):
            raw_phone = getattr(order.user, 'contact', '') or ''
            
        phone = _format_phone_cm(raw_phone)
        if not phone:
            logger.info("No valid phone number for quick order confirmation SMS.")
            return
            
        message = _build_quickorder_sms(order)
        threading.Thread(target=send_sms, args=(phone, message), daemon=True).start()
    except Exception as e:
        logger.warning(f"Error in send_quickorder_confirmation_sms: {e}")
