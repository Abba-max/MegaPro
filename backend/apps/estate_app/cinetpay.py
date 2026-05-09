# backend/apps/estate_app/cinetpay.py
import uuid
import requests
from django.conf import settings


CINETPAY_BASE_URL = "https://api-checkout.cinetpay.com/v2"


def generate_transaction_id():
    """Generate a unique transaction ID."""
    return f"EY-{uuid.uuid4().hex[:16].upper()}"


def initiate_payment(order, request=None):
    """
    Initiate a CinetPay payment for a QuickOrder.
    Returns a dict with 'payment_url' and 'transaction_id' on success,
    or raises an exception on failure.
    """
    transaction_id = generate_transaction_id()

    # Build return URLs
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://eyangestate.com:4200')
    return_url  = f"{frontend_url}/payment/return?transaction_id={transaction_id}"
    notify_url  = getattr(settings, 'CINETPAY_NOTIFY_URL',
                          f"{getattr(settings, 'BACKEND_URL', 'http://eyangestate.com:8000')}/api/payments/notify/")

    payload = {
        "apikey":         settings.CINETPAY_API_KEY,
        "site_id":        settings.CINETPAY_SITE_ID,
        "transaction_id": transaction_id,
        "amount":         200,                        # fixed 200 FCFA
        "currency":       "XAF",
        "description":    f"Réservation chambre – {order.estate.name}",
        "return_url":     return_url,
        "notify_url":     notify_url,
        "customer_name":  order.name,
        "customer_surname": "",
        "customer_phone_number": order.phone,
        "customer_email": order.user.email if order.user else "noreply@eyangestate.com",
        "customer_address": "",
        "customer_city":  "Yaoundé",
        "customer_country": "CM",
        "customer_state": "CM",
        "customer_zip_code": "00000",
        "channels":       "ALL",      # allows both Orange Money and MTN MoMo
        "lang":           "fr",
    }

    response = requests.post(
        f"{CINETPAY_BASE_URL}/payment",
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()

    if data.get("code") != "201":
        raise Exception(f"CinetPay initiation failed: {data.get('message', 'Unknown error')}")

    payment_url = data["data"]["payment_url"]
    return {
        "transaction_id": transaction_id,
        "payment_url":    payment_url,
    }


def verify_payment(transaction_id):
    """
    Verify a payment status with CinetPay.
    Returns the full response data dict.
    """
    payload = {
        "apikey":         settings.CINETPAY_API_KEY,
        "site_id":        settings.CINETPAY_SITE_ID,
        "transaction_id": transaction_id,
    }
    response = requests.post(
        f"{CINETPAY_BASE_URL}/payment/check",
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    return response.json()