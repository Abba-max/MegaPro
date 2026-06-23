import unittest
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.conf import settings
from apps.estate_app.models import Reservation, QuickOrder, User, Estate, RoomCategory
from apps.estate_app.sms_utils import (
    _format_phone_cm, _build_reservation_sms, _build_quickorder_sms, send_sms,
    send_reservation_confirmation_sms, send_quickorder_confirmation_sms
)
from apps.estate_app.email_utils import (
    _build_reservation_context, _build_quickorder_context,
    send_reservation_created_email, send_reservation_accepted_email,
    send_reservation_rejected_email, send_reservation_cancelled_email,
    send_quickorder_created_email, send_quickorder_accepted_email,
    send_quickorder_rejected_email
)
from apps.estate_app.services import (
    create_reservation_with_snapshot, accept_reservation, reject_reservation, cancel_reservation
)
import datetime

class TestSmsUtils(TestCase):

    def test_format_phone_no_prefix(self):
        self.assertEqual(_format_phone_cm('690123456'), '+237690123456')

    def test_format_phone_with_237_prefix(self):
        self.assertEqual(_format_phone_cm('237690123456'), '+237690123456')

    def test_format_phone_already_e164(self):
        self.assertEqual(_format_phone_cm('+237690123456'), '+237690123456')

    def test_format_phone_empty(self):
        self.assertEqual(_format_phone_cm(''), '')

    def test_format_phone_none(self):
        self.assertEqual(_format_phone_cm(None), '')

    def test_build_reservation_sms_under_160_chars(self):
        res = MagicMock()
        res.user.first_name = "Jean"
        res.check_in = "2026-09-01"
        res.check_out = "2027-06-30"
        res.reservation_details_json = {"estate": {"name": "Residence Long Name Here"}, "room_category": {"name": "Studio A"}}
        msg = _build_reservation_sms(res)
        self.assertLessEqual(len(msg), 160)

    def test_build_reservation_sms_contains_estate_name(self):
        res = MagicMock()
        res.user.first_name = "Jean"
        res.check_in = "2026-09-01"
        res.check_out = "2027-06-30"
        res.reservation_details_json = {"estate": {"name": "Residence Olembe"}}
        msg = _build_reservation_sms(res)
        self.assertIn("Residence Olembe", msg)

    def test_build_quickorder_sms_under_160_chars(self):
        order = MagicMock()
        order.name = "Paul"
        order.estate.name = "Residence Olembe"
        msg = _build_quickorder_sms(order)
        self.assertLessEqual(len(msg), 160)

    @patch('apps.estate_app.sms_utils.settings')
    @patch('apps.estate_app.sms_utils.africastalking')
    def test_send_sms_missing_credentials(self, mock_at, mock_settings):
        mock_settings.AT_API_KEY = ''
        result = send_sms('+237690123456', 'Hello')
        self.assertFalse(result)
        mock_at.initialize.assert_not_called()

    @patch('apps.estate_app.sms_utils.settings')
    @patch('apps.estate_app.sms_utils.africastalking')
    def test_send_sms_success(self, mock_at, mock_settings):
        mock_settings.AT_API_KEY = 'secret'
        mock_settings.AT_USERNAME = 'sandbox'
        mock_settings.AT_SENDER_ID = None
        mock_sms = MagicMock()
        mock_sms.send.return_value = {'SMSMessageData': {'Recipients': [{'status': 'Success', 'messageId': 'ATid123'}]}}
        mock_at.SMS = mock_sms
        result = send_sms('+237690123456', 'Hello')
        self.assertTrue(result)

    @patch('apps.estate_app.sms_utils.settings')
    @patch('apps.estate_app.sms_utils.africastalking')
    def test_send_sms_exception_returns_false(self, mock_at, mock_settings):
        mock_settings.AT_API_KEY = 'secret'
        mock_settings.AT_USERNAME = 'sandbox'
        mock_sms = MagicMock()
        mock_sms.send.side_effect = Exception('network error')
        mock_at.SMS = mock_sms
        result = send_sms('+237690123456', 'Hello')
        self.assertFalse(result)

    @patch('apps.estate_app.sms_utils.threading.Thread')
    def test_send_reservation_confirmation_no_phone(self, mock_thread):
        res = MagicMock()
        res.user.contact = ''
        send_reservation_confirmation_sms(res)
        mock_thread.assert_not_called()

    @patch('apps.estate_app.sms_utils.threading.Thread')
    def test_send_quickorder_confirmation_uses_order_phone(self, mock_thread):
        order = MagicMock()
        order.phone = '690123456'
        send_quickorder_confirmation_sms(order)
        mock_thread.assert_called_once()


class TestEmailUtils(TestCase):

    @patch('apps.estate_app.email_utils.send_styled_email')
    def test_reservation_created_email_calls_send_styled(self, mock_send):
        res = MagicMock()
        res.user.email = 'client@example.com'
        res.check_in = datetime.date(2026, 9, 1)
        res.check_out = datetime.date(2027, 6, 30)
        res.total_price = 450000.0
        res.room_category.price = 50000.0
        send_reservation_created_email(res)
        mock_send.assert_called_once()
        self.assertEqual(mock_send.call_args[1]['template_name'], 'reservation_created.html')
        self.assertEqual(mock_send.call_args[1]['to_email'], 'client@example.com')

    @patch('apps.estate_app.email_utils.send_styled_email')
    def test_reservation_accepted_email_calls_send_styled(self, mock_send):
        res = MagicMock()
        res.user.email = 'client@example.com'
        res.check_in = datetime.date(2026, 9, 1)
        res.check_out = datetime.date(2027, 6, 30)
        res.total_price = 450000.0
        res.room_category.price = 50000.0
        send_reservation_accepted_email(res)
        mock_send.assert_called_once()
        self.assertEqual(mock_send.call_args[1]['template_name'], 'reservation_accepted.html')

    @patch('apps.estate_app.email_utils.send_styled_email')
    def test_reservation_rejected_email_calls_send_styled(self, mock_send):
        res = MagicMock()
        res.user.email = 'client@example.com'
        res.check_in = datetime.date(2026, 9, 1)
        res.check_out = datetime.date(2027, 6, 30)
        res.total_price = 450000.0
        res.room_category.price = 50000.0
        send_reservation_rejected_email(res)
        mock_send.assert_called_once()
        self.assertEqual(mock_send.call_args[1]['template_name'], 'reservation_rejected.html')

    @patch('apps.estate_app.email_utils.send_styled_email')
    def test_reservation_cancelled_email_calls_send_styled(self, mock_send):
        res = MagicMock()
        res.user.email = 'client@example.com'
        res.check_in = datetime.date(2026, 9, 1)
        res.check_out = datetime.date(2027, 6, 30)
        res.total_price = 450000.0
        res.room_category.price = 50000.0
        send_reservation_cancelled_email(res)
        mock_send.assert_called_once()
        self.assertEqual(mock_send.call_args[1]['template_name'], 'reservation_cancelled.html')

    @patch('apps.estate_app.email_utils.send_styled_email')
    def test_quickorder_created_email_sends_two_emails(self, mock_send):
        order = MagicMock()
        order.user.email = 'client@example.com'
        order.estate.owner.email = 'owner@example.com'
        send_quickorder_created_email(order)
        self.assertEqual(mock_send.call_count, 2)

    @patch('apps.estate_app.email_utils.send_styled_email')
    def test_quickorder_accepted_email_skips_if_no_user(self, mock_send):
        order = MagicMock()
        order.user = None
        send_quickorder_accepted_email(order)
        mock_send.assert_not_called()

    @patch('apps.estate_app.email_utils.send_styled_email')
    def test_email_utils_never_raises_on_exception(self, mock_send):
        mock_send.side_effect = Exception('SMTP Error')
        res = MagicMock()
        res.user.email = 'client@example.com'
        try:
            send_reservation_created_email(res)
        except Exception:
            self.fail("send_reservation_created_email raised an exception instead of catching it")

    def test_build_reservation_context_formats_price(self):
        res = MagicMock()
        res.total_price = 450000.0
        res.check_in = datetime.date(2026, 9, 1)
        res.check_out = datetime.date(2027, 6, 30)
        ctx = _build_reservation_context(res)
        self.assertEqual(ctx['total_price'], '450 000 FCFA')

    def test_build_reservation_context_computes_months(self):
        res = MagicMock()
        res.total_price = 450000.0
        res.check_in = datetime.date(2026, 9, 1)
        res.check_out = datetime.date(2027, 6, 30)
        ctx = _build_reservation_context(res)
        self.assertEqual(ctx['months'], 9)


class TestNotificationHooks(TestCase):

    def setUp(self):
        self.user = User.objects.create(username='client', email='client@example.com')
        self.owner = User.objects.create(username='owner', email='owner@example.com')
        self.estate = Estate.objects.create(name='Test Estate', owner=self.owner)
        self.category = RoomCategory.objects.create(estate=self.estate, name='Studio', price=50000, available_rooms=2)

    @patch('apps.estate_app.utils._run_task')
    def test_create_reservation_dispatches_sms_and_email(self, mock_run_task):
        data = {
            'room_category': self.category,
            'check_in': datetime.date(2026, 9, 1),
            'check_out': datetime.date(2027, 6, 30),
            'num_rooms': 1
        }
        res = create_reservation_with_snapshot(data, self.user)
        self.assertEqual(mock_run_task.call_count, 2)
        args_list = [call[0][0].__name__ for call in mock_run_task.call_args_list]
        self.assertIn('send_reservation_sms_task', args_list)
        self.assertIn('send_reservation_created_email_task', args_list)

    @patch('apps.estate_app.utils._run_task')
    def test_accept_reservation_dispatches_email(self, mock_run_task):
        res = Reservation.objects.create(
            user=self.user, room_category=self.category,
            check_in=datetime.date(2026, 9, 1), check_out=datetime.date(2027, 6, 30),
            status='PENDING', num_rooms=1
        )
        accept_reservation(res.id)
        args_list = [call[0][0].__name__ for call in mock_run_task.call_args_list]
        self.assertIn('send_reservation_accepted_email_task', args_list)

    @patch('apps.estate_app.utils._run_task')
    def test_reject_reservation_dispatches_email(self, mock_run_task):
        res = Reservation.objects.create(
            user=self.user, room_category=self.category,
            check_in=datetime.date(2026, 9, 1), check_out=datetime.date(2027, 6, 30),
            status='PENDING', num_rooms=1
        )
        reject_reservation(res.id)
        mock_run_task.assert_called_with(unittest.mock.ANY, res.id)
        self.assertEqual(mock_run_task.call_args[0][0].__name__, 'send_reservation_rejected_email_task')

    @patch('apps.estate_app.utils._run_task')
    def test_notification_failure_does_not_break_reservation(self, mock_run_task):
        mock_run_task.side_effect = Exception('Task failed')
        data = {
            'room_category': self.category,
            'check_in': datetime.date(2026, 9, 1),
            'check_out': datetime.date(2027, 6, 30),
            'num_rooms': 1
        }
        try:
            res = create_reservation_with_snapshot(data, self.user)
            self.assertIsInstance(res, Reservation)
        except Exception:
            self.fail("create_reservation_with_snapshot raised an exception on notification failure")
