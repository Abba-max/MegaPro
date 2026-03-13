
import os
import django
import json
from rest_framework import serializers

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from apps.estate_app.serializers import RegisterSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

def test_registration():
    data = {
        'username': 'test@example.com',
        'email': 'test@example.com',
        'password': 'password123!',
        'first_name': 'Test',
        'last_name': 'User',
        'phone': '123456789',
        'role': 'Student'
    }
    
    # Check if user already exists and delete for clean test
    User.objects.filter(username=data['username']).delete()
    User.objects.filter(email=data['email']).delete()
    
    serializer = RegisterSerializer(data=data)
    is_valid = serializer.is_valid()
    print(f"Is valid: {is_valid}")
    if not is_valid:
        print(f"Errors: {serializer.errors}")
    else:
        user = serializer.save()
        print(f"User created: {user.username}")
        print(f"User type: {user.user_type}")
        print(f"Visitor category: {user.visitor_category}")

if __name__ == "__main__":
    test_registration()
