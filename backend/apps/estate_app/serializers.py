from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Estate, EstateImage, Review, QuickOrder, ContactRequest, Global_user, Conversation, Message


def _resolve_role(user) -> str:
    if user.is_staff or user.is_superuser:
        return 'Admin'
    try:
        gu = user.global_user
        if gu.status == '3':
            return 'Owner'
    except Global_user.DoesNotExist:
        pass
    return 'Student'


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        first = user.first_name or ''
        last  = user.last_name  or ''
        name  = f"{first} {last}".strip() or user.username
        token['username']   = user.username
        token['email']      = user.email
        token['first_name'] = first
        token['last_name']  = last
        token['is_staff']   = user.is_staff
        token['role']       = _resolve_role(user)
        return token


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    phone    = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    role     = serializers.ChoiceField(
        choices=['Student', 'Parent', 'Owner'], write_only=True, default='Student'
    )

    class Meta:
        model  = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'phone', 'role']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Un compte avec cet email existe déjà.")
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def create(self, validated_data):
        phone = validated_data.pop('phone', '')
        role  = validated_data.pop('role', 'Student')
        user  = User.objects.create_user(**validated_data)
        status_map = {'Student': '1', 'Parent': '2', 'Owner': '3'}
        Global_user.objects.create(
            user=user,
            first_name=user.first_name,
            last_name=user.last_name,
            contact=phone,
            status=status_map.get(role, '1'),
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class EstateImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model  = EstateImage
        fields = ['id', 'image']

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class EstateSerializer(serializers.ModelSerializer):
    owner          = UserSerializer(read_only=True)
    images         = EstateImageSerializer(many=True, read_only=True)
    occupied_count = serializers.SerializerMethodField()
    reviews_count  = serializers.SerializerMethodField()
    orders_count   = serializers.SerializerMethodField()

    class Meta:
        model  = Estate
        fields = [
            'id', 'owner', 'name', 'location', 'capacity', 'free',
            'rating', 'price', 'distance', 'wifi', 'restaurant',
            'generator', 'room_size', 'forage', 'tv', 'fridge',
            'description', 'publishedAt', 'status', 'images',
            'occupied_count', 'reviews_count', 'orders_count',
        ]

    def get_occupied_count(self, obj) -> int:
        return max(0, obj.capacity - obj.free)

    def get_reviews_count(self, obj) -> int:
        return obj.reviews.count()

    def get_orders_count(self, obj) -> int:
        return obj.quick_orders.count()


class ReviewSerializer(serializers.ModelSerializer):
    estate_name  = serializers.CharField(source='estate.name', read_only=True)
    estate_image = serializers.SerializerMethodField()
    likes_count  = serializers.SerializerMethodField()
    liked_by_me  = serializers.SerializerMethodField()

    class Meta:
        model  = Review
        fields = ['id', 'estate', 'estate_name', 'estate_image', 'name', 'rating',
                  'comment', 'created_at', 'parent', 'likes_count', 'liked_by_me']

    def get_estate_image(self, obj):
        request = self.context.get('request')
        first_image = obj.estate.images.first()
        if first_image and request:
            return request.build_absolute_uri(first_image.image.url)
        return None

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_liked_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(pk=request.user.pk).exists()
        return False

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        return super().create(validated_data)


class QuickOrderSerializer(serializers.ModelSerializer):
    estate_name  = serializers.CharField(source='estate.name', read_only=True)
    estate_image = serializers.SerializerMethodField()
    # Expose estate location for client dashboard
    estate_location = serializers.CharField(source='estate.location', read_only=True)
    estate_price    = serializers.IntegerField(source='estate.price', read_only=True)

    class Meta:
        model  = QuickOrder
        fields = ['id', 'estate', 'estate_name', 'estate_image', 'estate_location',
                  'estate_price', 'name', 'phone', 'note', 'created_at']

    def get_estate_image(self, obj):
        request = self.context.get('request')
        first_image = obj.estate.images.first()
        if first_image and request:
            return request.build_absolute_uri(first_image.image.url)
        return None

    def create(self, validated_data):
        # Attach authenticated user if available
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        return super().create(validated_data)


class ContactRequestSerializer(serializers.ModelSerializer):
    estate_name = serializers.CharField(source='estate.name', read_only=True)

    class Meta:
        model        = ContactRequest
        fields       = ['id', 'estate', 'estate_name', 'name', 'email', 'phone', 'message', 'submitted_at']
        read_only_fields = ['submitted_at']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        return super().create(validated_data)


# ── Messaging ────────────────────────────────────────────────

class MessageSerializer(serializers.ModelSerializer):
    sender_name     = serializers.CharField(source='sender.get_full_name', read_only=True)
    sender_username = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model  = Message
        fields = ['id', 'conversation', 'sender', 'sender_name', 'sender_username', 'text', 'read', 'created_at']
        read_only_fields = ['sender', 'read', 'created_at']

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['sender'] = request.user
        return super().create(validated_data)


class ConversationSerializer(serializers.ModelSerializer):
    client       = UserSerializer(read_only=True)
    owner        = UserSerializer(read_only=True)
    estate_name  = serializers.CharField(source='estate.name', read_only=True)
    estate_image = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    messages     = MessageSerializer(many=True, read_only=True)

    class Meta:
        model  = Conversation
        fields = ['id', 'client', 'owner', 'estate', 'estate_name', 'estate_image',
                  'last_message', 'unread_count', 'messages', 'created_at', 'updated_at']

    def get_estate_image(self, obj):
        request = self.context.get('request')
        first_image = obj.estate.images.first()
        if first_image and request:
            return request.build_absolute_uri(first_image.image.url)
        return None

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if msg:
            return {'text': msg.text, 'created_at': msg.created_at.isoformat(), 'sender_id': msg.sender_id}
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.messages.filter(read=False).exclude(sender=request.user).count()
        return