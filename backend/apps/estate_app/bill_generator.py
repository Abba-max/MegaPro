# apps/estate_app/bill_generator.py
"""
Bill (Invoice) PDF generator using xhtml2pdf (pure-Python, no system deps).
Generates the PDF from an HTML template and saves it to the Invoice's pdf_file
field, which routes to Cloudinary when CLOUDINARY_CLOUD_NAME is configured.
"""

import io
import logging
from django.template.loader import render_to_string
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)


def _render_pdf_bytes(html_string: str) -> bytes:
    """Convert an HTML string to PDF bytes using xhtml2pdf."""
    try:
        from xhtml2pdf import pisa
    except ImportError:
        raise RuntimeError(
            "xhtml2pdf is not installed. Run: pip install xhtml2pdf"
        )

    result_buf = io.BytesIO()
    pisa_status = pisa.CreatePDF(
        src=io.StringIO(html_string),
        dest=result_buf,
        encoding='utf-8',
    )
    if pisa_status.err:
        raise RuntimeError(f"xhtml2pdf error: {pisa_status.err}")
    return result_buf.getvalue()


def build_reservation_snapshot(room_category) -> dict:
    """
    Build a JSON-serialisable snapshot of the estate + room-category state
    at the time the reservation is created.  Stored in
    Reservation.reservation_details_json so the client always sees the
    details as they were when they booked, even if the owner edits later.
    """
    estate = room_category.estate

    # Characteristics
    chars = {
        'floors':             getattr(estate, 'etages', 1),
        'water_bills':        'free' if not estate.water_bills else 'paid',
        'electricity_bills':  'free' if not estate.electricity_bills else 'paid',
        'fence':              estate.fence,
        'caretaker':          estate.caretaker,
        'security_guard':     estate.security_guard,
        'restaurant':         estate.restaurant_on_site,
        'forage':             estate.borehole_forage,
        'generator':          estate.generator_available,
        'wifi':               estate.wifi,
        'parking':            estate.parking,
        'laundry_service':    estate.cleaning_service,
        'cctv':               getattr(estate, 'cctv', False),
        'allowed_gender':     getattr(estate, 'allowed_gender', 'all'),
        'terrain_de_sport':   getattr(estate, 'Terrain_de_sport', False),
        'max_capacity':       getattr(estate, 'max_capacity', None),
    }

    # Equipment list
    equipment_list = []
    for eq in room_category.equipment_set.select_related('equipment').all():
        equipment_list.append({
            'name':         eq.equipment.part_name,
            'quantity':     eq.quantity,
            'surface_area': float(eq.surface_area_m2) if eq.surface_area_m2 else None,
            'condition':    eq.condition,
        })

    # Supplements
    supplements_list = []
    for sup in estate.supplements_set.filter(is_available=True):
        supplements_list.append({
            'id':          sup.id,
            'name':        sup.name,
            'price':       float(sup.price),
            'description': sup.description,
        })

    return {
        'estate': {
            'id':              estate.id,
            'name':            estate.name,
            'address':         estate.location,
            'owner_email':     estate.owner.email if estate.owner else '',
            'owner_phone':     estate.owner.contact if estate.owner else '',
            'characteristics': chars,
        },
        'room_category': {
            'id':             room_category.id,
            'name':           room_category.name,
            'surface_area':   float(room_category.dimensions or room_category.surface_area or 0),
            'price_per_month': float(room_category.price_per_month or room_category.price),
            'occupancy':      room_category.occupancy,
            'room_size':      room_category.get_room_size_display() if hasattr(room_category, 'get_room_size_display') else room_category.room_size,
            'wifi':           room_category.wifi == '1',
            'tv':             room_category.tv == '1',
            'fridge':         room_category.fridge == '1',
            'description':    room_category.description,
            'equipment':      equipment_list,
        },
        'supplements': supplements_list,
    }


def generate_invoice_pdf(invoice) -> bool:
    """
    Render the bill HTML template and save the resulting PDF to invoice.pdf_file.
    Returns True on success, False on failure (so callers can log without crashing).

    The invoice's reservation must already have reservation_details_json populated.
    """
    try:
        reservation = invoice.reservation
        snapshot = reservation.reservation_details_json or {}

        # Calculate months between check_in and check_out
        from datetime import date
        start: date = reservation.check_in
        end: date   = reservation.check_out
        months = max(1, (end.year - start.year) * 12 + (end.month - start.month))

        price_per_month = float(
            snapshot.get('room_category', {}).get('price_per_month', 0) or
            reservation.room_category.price_per_month or
            reservation.room_category.price
        )
        subtotal = price_per_month * months

        context = {
            'invoice':       invoice,
            'reservation':   reservation,
            'snapshot':      snapshot,
            'user':          reservation.user,
            'estate_snap':   snapshot.get('estate', {}),
            'room_snap':     snapshot.get('room_category', {}),
            'supplements':   snapshot.get('supplements', []),
            'months':        months,
            'price_per_month': price_per_month,
            'subtotal':      subtotal,
            'total_amount':  float(invoice.total_amount),
            'chars':         snapshot.get('estate', {}).get('characteristics', {}),
        }

        html_string = render_to_string('bills/bill_template.html', context)
        pdf_bytes   = _render_pdf_bytes(html_string)

        filename = f"bills/invoice_{invoice.invoice_id}.pdf"
        invoice.pdf_file.save(filename, ContentFile(pdf_bytes), save=True)
        logger.info("Bill PDF generated: %s", filename)

        # Trigger email notification
        from .utils import send_bill_email
        send_bill_email(reservation, invoice)
        
        return True

    except Exception as exc:
        logger.error("Bill generation failed for invoice %s: %s", getattr(invoice, 'invoice_id', '?'), exc, exc_info=True)
        return False
