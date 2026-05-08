# apps/estate_app/services.py
"""
Core business-logic service layer.

Key function: accept_reservation(reservation_id)
  - Runs inside a DB transaction with SELECT FOR UPDATE on RoomCategory
  - Decrements available_rooms atomically
  - Immediately returns with ACCEPTED status
  - Triggers PDF invoice generation in a background thread (returns to caller fast)
  - If PDF fails, the reservation is still accepted; bill_url will be None until retried

Concurrency guarantee:
  - select_for_update() acquires a row-level lock on the RoomCategory row.
  - Any concurrent call for the same category must wait for the lock to release.
  - After acquiring the lock, we re-check available_rooms, so two concurrent
    accepts for the last available room will have exactly one succeed and one
    raise a ValidationError.
"""

import threading
import logging

from django.db import transaction
from django.db.models import F
from rest_framework.exceptions import ValidationError

from .models import Reservation, Invoice, RoomCategory
from .bill_generator import build_reservation_snapshot, generate_invoice_pdf

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
#  Public entry points
# ──────────────────────────────────────────────────────────────────────────────

def accept_reservation(reservation_id: int) -> Reservation:
    """
    Concurrency-safe acceptance of a reservation.

    Algorithm:
    1. Open a transaction and lock the RoomCategory row with SELECT FOR UPDATE.
    2. Validate status == PENDING and available_rooms >= num_rooms.
    3. Decrement available_rooms by num_rooms using F() (atomic DB-side subtraction).
    4. Set reservation.status = ACCEPTED.
    5. Commit transaction (lock released here).
    6. Spawn a daemon thread to generate + save the PDF invoice (non-blocking).

    Returns the updated Reservation object.
    Raises ValidationError on business-rule violations.
    """
    with transaction.atomic():
        # ── 1. Lock the RoomCategory row ────────────────────────────────────
        try:
            reservation = (
                Reservation.objects
                .select_related('room_category__estate', 'user')
                .get(id=reservation_id)
            )
        except Reservation.DoesNotExist:
            raise ValidationError(f"Réservation #{reservation_id} introuvable.")

        # Lock the category row — any concurrent call blocks here until we commit
        category = (
            RoomCategory.objects
            .select_for_update()
            .get(pk=reservation.room_category_id)
        )

        # ── 2. Business-rule validation ─────────────────────────────────────
        if reservation.status != 'PENDING':
            raise ValidationError(
                f"Seules les réservations en attente peuvent être acceptées "
                f"(statut actuel: {reservation.status})."
            )

        num_rooms = reservation.num_rooms or 1
        if category.available_rooms < num_rooms:
            raise ValidationError(
                f"Chambres insuffisantes dans cette catégorie. "
                f"Disponibles: {category.available_rooms}, demandées: {num_rooms}."
            )

        # ── 3. Decrement available_rooms atomically ─────────────────────────
        # F() ensures the subtraction happens at the DB level, not in Python,
        # so even if two transactions read the same value, only one commit wins.
        category.available_rooms = F('available_rooms') - num_rooms
        category.save(update_fields=['available_rooms'])

        # Keep legacy fields in sync (read refreshed value first)
        category.refresh_from_db(fields=['available_rooms'])
        category.available_quantity = category.available_rooms
        category.quantity_available = category.available_rooms
        category.save(update_fields=['available_quantity', 'quantity_available'])

        # ── 4. Accept the reservation ───────────────────────────────────────
        reservation.status = 'ACCEPTED'
        reservation.save(update_fields=['status', 'updated_at'])

    # ── 5. Async PDF generation (outside transaction — file I/O is slow) ───
    thread = threading.Thread(
        target=_generate_invoice_background,
        args=(reservation.id,),
        daemon=True,        # daemon=True: thread won't block server shutdown
    )
    thread.start()

    return reservation


def reject_reservation(reservation_id: int) -> Reservation:
    """
    Reject a PENDING or ACCEPTED reservation.
    If it was ACCEPTED, restores available_rooms.
    """
    with transaction.atomic():
        try:
            reservation = Reservation.objects.select_related('room_category').get(id=reservation_id)
        except Reservation.DoesNotExist:
            raise ValidationError(f"Réservation #{reservation_id} introuvable.")

        was_accepted = reservation.status == 'ACCEPTED'
        reservation.status = 'REJECTED'
        reservation.save(update_fields=['status', 'updated_at'])

        if was_accepted:
            # Restore the rooms — lock the category row first
            category = RoomCategory.objects.select_for_update().get(pk=reservation.room_category_id)
            num_rooms = reservation.num_rooms or 1
            category.available_rooms = F('available_rooms') + num_rooms
            category.save(update_fields=['available_rooms'])
            category.refresh_from_db(fields=['available_rooms'])
            category.available_quantity = category.available_rooms
            category.quantity_available = category.available_rooms
            category.save(update_fields=['available_quantity', 'quantity_available'])

    return reservation


def cancel_reservation(reservation_id: int, requesting_user) -> Reservation:
    """
    Cancel a PENDING reservation (client-side). Only the owning user can cancel.
    If it was already ACCEPTED, restores rooms.
    """
    with transaction.atomic():
        try:
            reservation = Reservation.objects.select_related('room_category', 'user').get(id=reservation_id)
        except Reservation.DoesNotExist:
            raise ValidationError(f"Réservation #{reservation_id} introuvable.")

        if reservation.user_id != requesting_user.id and not requesting_user.is_staff:
            raise ValidationError("Vous ne pouvez annuler que vos propres réservations.")

        if reservation.status == 'CANCELLED':
            raise ValidationError("Cette réservation est déjà annulée.")

        was_accepted = reservation.status == 'ACCEPTED'
        reservation.status = 'CANCELLED'
        reservation.save(update_fields=['status', 'updated_at'])

        if was_accepted:
            category = RoomCategory.objects.select_for_update().get(pk=reservation.room_category_id)
            num_rooms = reservation.num_rooms or 1
            category.available_rooms = F('available_rooms') + num_rooms
            category.save(update_fields=['available_rooms'])
            category.refresh_from_db(fields=['available_rooms'])
            category.available_quantity = category.available_rooms
            category.quantity_available = category.available_rooms
            category.save(update_fields=['available_quantity', 'quantity_available'])

    return reservation


def create_reservation_with_snapshot(validated_data: dict, user) -> Reservation:
    """
    Create a Reservation with:
    - status=PENDING (no room decrement yet)
    - reservation_details_json snapshot of current estate/room state
    - total_price computed from price_per_month × months × num_rooms
    """
    supplements = validated_data.pop('selected_supplements', [])
    room_category = validated_data['room_category']
    check_in  = validated_data.get('check_in') or validated_data.get('start_date')
    check_out = validated_data.get('check_out') or validated_data.get('end_date')
    num_rooms = validated_data.get('num_rooms', 1)

    # Compute months duration
    months = 1
    if check_in and check_out:
        months = max(1, (check_out.year - check_in.year) * 12 + (check_out.month - check_in.month))

    price_per_month = float(room_category.price_per_month or room_category.price or 0)
    total_price = price_per_month * months * num_rooms

    # Build snapshot BEFORE saving so it captures current state
    try:
        snapshot = build_reservation_snapshot(room_category)
    except Exception as exc:
        logger.warning("Could not build snapshot: %s", exc)
        snapshot = {}

    # Normalise date fields
    if check_in:
        validated_data.setdefault('check_in', check_in)
        validated_data['start_date'] = check_in
    if check_out:
        validated_data.setdefault('check_out', check_out)
        validated_data['end_date'] = check_out

    reservation = Reservation.objects.create(
        **{k: v for k, v in validated_data.items() if k not in ('selected_supplements',)},
        user=user,
        status='PENDING',
        total_price=total_price,
        reservation_details_json=snapshot,
    )
    if supplements:
        reservation.selected_supplements.set(supplements)

    return reservation


# ──────────────────────────────────────────────────────────────────────────────
#  Internal helpers
# ──────────────────────────────────────────────────────────────────────────────

def _generate_invoice_background(reservation_id: int) -> None:
    """
    Background thread: builds the Invoice record and generates the PDF.
    Runs OUTSIDE the accept transaction, so the DB transaction is committed
    before we start slow file I/O (Cloudinary upload).
    """
    try:
        reservation = (
            Reservation.objects
            .select_related('room_category__estate', 'user')
            .prefetch_related('room_category__equipment_set__equipment', 'room_category__estate__supplements_set')
            .get(id=reservation_id)
        )
    except Reservation.DoesNotExist:
        logger.error("Invoice generation: reservation %d not found.", reservation_id)
        return

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
        logger.info("Invoice %s already has a PDF — skipping regeneration.", invoice.invoice_id)
        return

    # Generate PDF and upload to Cloudinary (or local media)
    try:
        success = generate_invoice_pdf(invoice)
        if success:
            logger.info("Invoice PDF ready: %s", invoice.invoice_id)
        else:
            logger.warning("PDF generation failed for invoice %s. Will retry next accept.", invoice.invoice_id)
    except Exception:
        import traceback
        logger.error("Invoice generation crashed:\n%s", traceback.format_exc())
