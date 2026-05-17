# apps/estate_app/tests/test_features.py

from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.estate_app.serializers import UserSerializer
from apps.estate_app.api_views import EstateViewSet
from apps.estate_app.permissions import IsOwnerOrAdmin
from apps.estate_app.models import Estate, RoomCategory
from apps.estate_app.tasks import optimize_image_task
from unittest.mock import patch, MagicMock
import os

User = get_user_model()

class UserSerializerUpdateTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@test.com', password='oldpassword'
        )

    def test_password_update_hashes_correctly(self):
        serializer = UserSerializer(self.user, data={'password': 'newpassword123'}, partial=True)
        self.assertTrue(serializer.is_valid())
        updated_user = serializer.save()
        self.assertTrue(updated_user.check_password('newpassword123'))
        
    def test_role_update_admin(self):
        serializer = UserSerializer(self.user, data={'role': 'Admin'}, partial=True)
        self.assertTrue(serializer.is_valid())
        updated_user = serializer.save()
        self.assertTrue(updated_user.is_staff)
        self.assertTrue(updated_user.is_superuser)
        self.assertEqual(updated_user.user_type, 'admin')

    def test_role_update_owner(self):
        serializer = UserSerializer(self.user, data={'role': 'Owner'}, partial=True)
        self.assertTrue(serializer.is_valid())
        updated_user = serializer.save()
        self.assertFalse(updated_user.is_staff)
        self.assertEqual(updated_user.user_type, 'owner')

    def test_role_update_student(self):
        serializer = UserSerializer(self.user, data={'role': 'Student'}, partial=True)
        self.assertTrue(serializer.is_valid())
        updated_user = serializer.save()
        self.assertFalse(updated_user.is_staff)
        self.assertEqual(updated_user.user_type, 'visitor')
        self.assertEqual(updated_user.visitor_category, '1')

class IsOwnerOrAdminPermissionTest(TestCase):
    def setUp(self):
        self.permission = IsOwnerOrAdmin()
        self.admin_user = User.objects.create_user(username='admin', is_staff=True)
        self.owner_user = User.objects.create_user(username='owner', user_type='owner')
        self.other_user = User.objects.create_user(username='other')
        self.estate = Estate.objects.create(name='Test Estate', owner=self.owner_user)

    def test_safe_methods_allowed(self):
        request = MagicMock(method='GET', user=self.other_user)
        self.assertTrue(self.permission.has_permission(request, None))
        self.assertTrue(self.permission.has_object_permission(request, None, self.estate))

    def test_write_methods_for_owner_and_admin(self):
        request_admin = MagicMock(method='PUT', user=self.admin_user)
        self.assertTrue(self.permission.has_object_permission(request_admin, None, self.estate))

        request_owner = MagicMock(method='PUT', user=self.owner_user)
        self.assertTrue(self.permission.has_object_permission(request_owner, None, self.estate))

        request_other = MagicMock(method='PUT', user=self.other_user)
        self.assertFalse(self.permission.has_object_permission(request_other, None, self.estate))

class EstateViewSetFilterTest(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username='owner', user_type='owner')
        self.estate_available = Estate.objects.create(name='Available', owner=self.owner)
        RoomCategory.objects.create(estate=self.estate_available, name='Single', available_rooms=1, total_rooms=1)
        
        self.estate_unavailable = Estate.objects.create(name='Unavailable', owner=self.owner)
        RoomCategory.objects.create(estate=self.estate_unavailable, name='Double', available_rooms=0, total_rooms=1)

    def test_available_rooms_filter(self):
        view = EstateViewSet()
        view.request = MagicMock()
        view.request.query_params = {'available': 'true'}
        view.request.user = MagicMock(is_authenticated=False)
        queryset = view.get_queryset()
        
        # Estate_available should be in the queryset, unavailable should not
        self.assertIn(self.estate_available, queryset)
        self.assertNotIn(self.estate_unavailable, queryset)

class OptimizeImageTaskTest(TestCase):
    @patch('apps.estate_app.tasks.Image')
    @patch('apps.estate_app.tasks.os.path.exists')
    def test_optimize_image_task(self, mock_exists, mock_image):
        mock_exists.return_value = True
        mock_img_instance = MagicMock()
        mock_img_instance.mode = 'RGBA'
        mock_img_instance.convert.return_value = mock_img_instance
        mock_image.open.return_value.__enter__.return_value = mock_img_instance

        optimize_image_task('fake/path.jpg')
        
        mock_img_instance.convert.assert_called_with('RGB')
        mock_img_instance.thumbnail.assert_called_with((1200, 1200))
        mock_img_instance.save.assert_called_with('fake/path.jpg', optimize=True, quality=80)
