from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Estate, EstateImage, Review, QuickOrder

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class EstateImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstateImage
        fields = ['id', 'image']

class EstateSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    images = EstateImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Estate
        fields = [
            'id', 'owner', 'name', 'location', 'capacity', 'free', 
            'rating', 'price', 'distance', 'wifi', 'restaurant', 
            'generator', 'room_size', 'forage', 'description', 
            'publishedAt', 'status', 'images'
        ]

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['id', 'estate', 'name', 'rating', 'comment', 'created_at', 'parent']

class QuickOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuickOrder
        fields = ['id', 'estate', 'name', 'phone', 'note', 'created_at']