from rest_framework.test import APITestCase, APIClient
from .models import User, Estate, RoomCategory, QuickOrder
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
import json

class RecommendationAndPaymentTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        # Create Owner
        self.owner = User.objects.create_user(username='owner', password='password', user_type='owner', is_verified=True)
        
        # Create Estate 1 (Target)
        self.estate1 = Estate.objects.create(name="Estate 1", owner=self.owner, location="Eyang", status='published', is_verified=True)
        self.room1 = RoomCategory.objects.create(estate=self.estate1, name="Room 1", total_rooms=0, available_rooms=0, quantity_available=0) # FULL
        
        # Create Estate 2 (Recommendation)
        self.estate2 = Estate.objects.create(name="Estate 2", owner=self.owner, location="Eyang", status='published', is_verified=True)
        self.room2 = RoomCategory.objects.create(estate=self.estate2, name="Room 2", total_rooms=5, available_rooms=5, quantity_available=5) # AVAILABLE
        
        # Create Users
        self.student = User.objects.create_user(username='student', password='password', user_type='visitor')
        self.admin = User.objects.create_superuser(username='admin', password='password', email='admin@test.com')
        self.other_user = User.objects.create_user(username='other', password='password', user_type='visitor')

    def test_room_full_recommendations(self):
        """Test that booking a full room returns recommendations."""
        self.client.force_authenticate(user=self.student)
        url = '/api/orders/' 
        data = {
            "estate": self.estate1.id,
            "room_category": self.room1.id,
            "name": "Test Student",
            "phone": "123456789"
        }
        response = self.client.post(url, data=json.dumps(data), content_type='application/json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        res_data = response.json()
        self.assertEqual(res_data['error'], 'FULL')
        self.assertTrue(len(res_data['recommendations']) > 0)
        self.assertEqual(res_data['recommendations'][0]['name'], "Estate 2")

    def test_manual_payment_flow(self):
        """Test full cycle: order -> upload receipt -> admin verify"""
        self.client.force_authenticate(user=self.student)
        # Create order (will be status pending_payment by default)
        # We need a room that is NOT full for this test
        self.room1.total_rooms = 10
        self.room1.available_rooms = 10
        self.room1.quantity_available = 10
        self.room1.save()

        order_data = {'estate': self.estate1.id, 'room_category': self.room1.id, 'name': 'Tester', 'phone': '600000000'}
        resp = self.client.post('/api/orders/', order_data)
        self.assertEqual(resp.status_code, 201)
        order_id = resp.data['id']

        # 1. Upload receipt
        receipt_file = SimpleUploadedFile("receipt.jpg", b"fake_image_content", content_type="image/jpeg")
        resp = self.client.post(f'/api/orders/{order_id}/upload-receipt/', {'receipt': receipt_file}, format='multipart')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'paid')
        self.assertTrue(resp.data['receipt'] is not None)
        self.assertIn('receipt', resp.data['receipt'])

        # 2. Admin Verify
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/orders/{order_id}/verify-payment/', {'action': 'approve'})
        self.assertEqual(resp.status_code, 200)
        
        # Reload order
        order = QuickOrder.objects.get(id=order_id)
        self.assertTrue(order.is_payment_verified)
        self.assertEqual(order.status, 'pending')

    def test_unauthorized_verification(self):
        """Ensure non-admins cannot verify payments"""
        self.client.force_authenticate(user=self.student)
        order = QuickOrder.objects.create(
            user=self.student, estate=self.estate1, room_category=self.room1,
            name='Test', phone='123', status='paid'
        )
        
        resp = self.client.post(f'/api/orders/{order.id}/verify-payment/', {'action': 'approve'})
        self.assertEqual(resp.status_code, 403)

    def test_no_recommendations_available(self):
        """Test that empty recommendations are returned if no other estates fit"""
        # Make the only other estate full too
        self.room1.total_rooms = 0
        self.room1.available_rooms = 0
        self.room1.quantity_available = 0
        self.room1.save()
        self.room2.total_rooms = 0
        self.room2.available_rooms = 0
        self.room2.quantity_available = 0
        self.room2.save()
        
        self.client.force_authenticate(user=self.student)
        order_data = {'estate': self.estate1.id, 'room_category': self.room1.id, 'name': 'Tester', 'phone': '600000000'}
        resp = self.client.post('/api/orders/', order_data)
        
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(len(resp.data['recommendations']), 0)
        self.assertEqual(resp.data['detail'], "Plus de chambres disponibles dans cette catégorie.")

    def test_rejection_flow(self):
        """Test admin rejecting a payment"""
        order = QuickOrder.objects.create(
            user=self.student, estate=self.estate1, room_category=self.room1,
            name='Test', phone='123', status='paid'
        )
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/orders/{order.id}/verify-payment/', {'action': 'reject'})
        self.assertEqual(resp.status_code, 200)
        
        order.refresh_from_db()
        self.assertFalse(order.is_payment_verified)
        self.assertEqual(order.status, 'payment_failed')
