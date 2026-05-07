# apps/estate_app/tests/test_reservations.py
"""
Unit & concurrency tests for the reservation acceptance workflow.

Run with:
    python manage.py test apps.estate_app.tests.test_reservations -v 2
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, TransactionTestCase

from apps.estate_app.models import (
    Estate, RoomCategory, Equipment, RoomEquipment,
    Supplement, Reservation, Invoice,
)
from apps.estate_app.services import (
    accept_reservation, reject_reservation, cancel_reservation,
    create_reservation_with_snapshot,
)
from apps.estate_app.bill_generator import build_reservation_snapshot

User = get_user_model()


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_owner(username='owner1'):
    return User.objects.create_user(
        username=username, password='pass', email=f'{username}@test.com',
        user_type='owner', is_verified=True
    )

def make_client(username='client1'):
    return User.objects.create_user(
        username=username, password='pass', email=f'{username}@test.com',
        user_type='visitor',
    )

def make_estate(owner):
    return Estate.objects.create(
        name='Test Estate', owner=owner, location='Yaoundé',
        wifi=True, generator_available=True,
    )

def make_equipment():
    return Equipment.objects.create(part_name='Lit', removable=False)

def make_room_category(estate, total_rooms=5):
    rc = RoomCategory.objects.create(
        estate=estate,
        name='Single',
        total_rooms=total_rooms,
        available_rooms=total_rooms,
        price_per_month=Decimal('50000.00'),
    )
    return rc

def make_reservation(user, rc, num_rooms=1):
    from datetime import date
    return Reservation.objects.create(
        user=user,
        room_category=rc,
        check_in=date(2026, 9, 1),
        check_out=date(2027, 6, 30),
        num_rooms=num_rooms,
        status='PENDING',
        total_price=Decimal('50000.00') * num_rooms * 9,
    )


# ── Basic Tests ───────────────────────────────────────────────────────────────

class ReservationSnapshotTest(TestCase):
    """Verifies that the snapshot is built correctly at create time."""

    def setUp(self):
        self.owner  = make_owner()
        self.client = make_client()
        self.estate = make_estate(self.owner)
        eq = make_equipment()
        self.rc = make_room_category(self.estate)
        RoomEquipment.objects.create(
            room_category=self.rc, equipment=eq, quantity=2, condition='NEW'
        )
        Supplement.objects.create(
            estate=self.estate, name='Laundry', price=Decimal('5000'),
            is_available=True, is_paid_service=True,
        )

    def test_snapshot_contains_estate_info(self):
        snapshot = build_reservation_snapshot(self.rc)
        self.assertEqual(snapshot['estate']['name'], self.estate.name)
        self.assertEqual(snapshot['estate']['address'], self.estate.location)

    def test_snapshot_contains_room_category_info(self):
        snapshot = build_reservation_snapshot(self.rc)
        self.assertEqual(snapshot['room_category']['name'], self.rc.name)
        self.assertAlmostEqual(
            snapshot['room_category']['price_per_month'],
            float(self.rc.price_per_month)
        )

    def test_snapshot_contains_equipment(self):
        snapshot = build_reservation_snapshot(self.rc)
        self.assertEqual(len(snapshot['room_category']['equipment']), 1)
        self.assertEqual(snapshot['room_category']['equipment'][0]['name'], 'Lit')
        self.assertEqual(snapshot['room_category']['equipment'][0]['quantity'], 2)

    def test_snapshot_contains_supplements(self):
        snapshot = build_reservation_snapshot(self.rc)
        self.assertEqual(len(snapshot['supplements']), 1)
        self.assertEqual(snapshot['supplements'][0]['name'], 'Laundry')

    def test_create_reservation_stores_snapshot(self):
        from datetime import date
        data = {
            'room_category': self.rc,
            'check_in':  date(2026, 9, 1),
            'check_out': date(2027, 6, 30),
            'num_rooms': 1,
        }
        reservation = create_reservation_with_snapshot(data, self.client)
        self.assertIsNotNone(reservation.reservation_details_json)
        self.assertIn('estate', reservation.reservation_details_json)
        self.assertIn('room_category', reservation.reservation_details_json)
        self.assertEqual(reservation.status, 'PENDING')

    def test_create_reservation_computes_total_price(self):
        from datetime import date
        data = {
            'room_category': self.rc,
            'check_in':  date(2026, 9, 1),
            'check_out': date(2027, 6, 30),  # 9 months
            'num_rooms': 2,
        }
        reservation = create_reservation_with_snapshot(data, self.client)
        # 50000 * 2 rooms * 9 months = 900000
        self.assertEqual(reservation.total_price, Decimal('900000.00'))


class AcceptReservationTest(TestCase):
    """Tests for the accept_reservation service function."""

    def setUp(self):
        self.owner  = make_owner()
        self.client = make_client()
        self.estate = make_estate(self.owner)
        self.rc     = make_room_category(self.estate, total_rooms=3)

    def test_accept_decrements_available_rooms(self):
        res = make_reservation(self.client, self.rc, num_rooms=1)
        accept_reservation(res.id)
        self.rc.refresh_from_db()
        self.assertEqual(self.rc.available_rooms, 2)  # 3 - 1

    def test_accept_sets_status_accepted(self):
        res = make_reservation(self.client, self.rc, num_rooms=1)
        updated = accept_reservation(res.id)
        self.assertEqual(updated.status, 'ACCEPTED')

    def test_accept_multi_rooms_decrements_correctly(self):
        res = make_reservation(self.client, self.rc, num_rooms=3)
        accept_reservation(res.id)
        self.rc.refresh_from_db()
        self.assertEqual(self.rc.available_rooms, 0)

    def test_accept_fails_if_not_pending(self):
        from rest_framework.exceptions import ValidationError
        res = make_reservation(self.client, self.rc, num_rooms=1)
        res.status = 'ACCEPTED'
        res.save()
        with self.assertRaises(ValidationError):
            accept_reservation(res.id)

    def test_accept_fails_if_not_enough_rooms(self):
        from rest_framework.exceptions import ValidationError
        res = make_reservation(self.client, self.rc, num_rooms=10)  # only 3 available
        with self.assertRaises(ValidationError):
            accept_reservation(res.id)

    def test_reject_does_not_change_available_rooms(self):
        res = make_reservation(self.client, self.rc, num_rooms=1)
        reject_reservation(res.id)
        self.rc.refresh_from_db()
        self.assertEqual(self.rc.available_rooms, 3)  # unchanged

    def test_reject_accepted_restores_rooms(self):
        res = make_reservation(self.client, self.rc, num_rooms=2)
        accept_reservation(res.id)
        self.rc.refresh_from_db()
        self.assertEqual(self.rc.available_rooms, 1)
        reject_reservation(res.id)
        self.rc.refresh_from_db()
        self.assertEqual(self.rc.available_rooms, 3)  # restored

    def test_cancel_pending_does_not_change_rooms(self):
        res = make_reservation(self.client, self.rc, num_rooms=1)
        cancel_reservation(res.id, self.client)
        self.rc.refresh_from_db()
        self.assertEqual(self.rc.available_rooms, 3)


# ── Concurrency Test ──────────────────────────────────────────────────────────

class ConcurrentAcceptTest(TransactionTestCase):
    """
    Uses TransactionTestCase (real transactions, not wrapped) so that the
    SELECT FOR UPDATE lock actually works across threads sharing the same DB.
    """

    def setUp(self):
        self.owner  = make_owner('owner_conc')
        self.client = make_client('client_conc')
        self.estate = make_estate(self.owner)
        self.rc     = make_room_category(self.estate, total_rooms=1)

    def _do_accept(self, reservation_id):
        """Thread worker — attempts to accept a reservation."""
        try:
            accept_reservation(reservation_id)
            return ('ok', reservation_id)
        except Exception as exc:
            return ('error', reservation_id, str(exc))

    def test_only_one_of_two_concurrent_accepts_succeeds(self):
        """
        Two reservations compete for the last available room.
        Exactly one should succeed; the other must raise a ValidationError.
        available_rooms must never go below 0.
        """
        res1 = make_reservation(self.client, self.rc, num_rooms=1)
        res2 = make_reservation(self.client, self.rc, num_rooms=1)

        results = []
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [
                pool.submit(self._do_accept, res1.id),
                pool.submit(self._do_accept, res2.id),
            ]
            for future in as_completed(futures):
                results.append(future.result())

        self.rc.refresh_from_db()

        ok_count    = sum(1 for r in results if r[0] == 'ok')
        error_count = sum(1 for r in results if r[0] == 'error')

        self.assertEqual(ok_count, 1,    "Exactly one accept should succeed")
        self.assertEqual(error_count, 1, "Exactly one accept should fail")
        self.assertGreaterEqual(
            self.rc.available_rooms, 0,
            "available_rooms must never go negative"
        )


# ── Bill Generation Test ──────────────────────────────────────────────────────

class BillGenerationTest(TestCase):
    """Tests for the PDF invoice generation helper."""

    def setUp(self):
        self.owner  = make_owner('owner_bill')
        self.client = make_client('client_bill')
        self.estate = make_estate(self.owner)
        self.rc     = make_room_category(self.estate)
        self.res    = make_reservation(self.client, self.rc)
        # Populate the snapshot so the bill generator has data
        self.res.reservation_details_json = build_reservation_snapshot(self.rc)
        self.res.save()

    @patch('apps.estate_app.bill_generator._render_pdf_bytes', return_value=b'%PDF-fake')
    def test_bill_pdf_attached_to_invoice(self, mock_pdf):
        """After generation, invoice.pdf_file must be set."""
        from apps.estate_app.bill_generator import generate_invoice_pdf
        invoice = Invoice.objects.create(
            reservation=self.res,
            total_amount=self.res.total_price or Decimal('450000'),
            status='UNPAID',
        )
        result = generate_invoice_pdf(invoice)
        invoice.refresh_from_db()
        self.assertTrue(result, "generate_invoice_pdf should return True on success")
        self.assertTrue(bool(invoice.pdf_file), "invoice.pdf_file should be set")

    @patch('apps.estate_app.bill_generator._render_pdf_bytes', side_effect=RuntimeError('pdf error'))
    def test_bill_generation_failure_returns_false(self, mock_pdf):
        from apps.estate_app.bill_generator import generate_invoice_pdf
        invoice = Invoice.objects.create(
            reservation=self.res,
            total_amount=Decimal('450000'),
            status='UNPAID',
        )
        result = generate_invoice_pdf(invoice)
        self.assertFalse(result, "Should return False on failure without crashing")
