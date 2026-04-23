from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Estate, EstateImage, Review, QuickOrder, ContactRequest, Conversation, Message


def _resolve_role(user) -> str:
    if user.is_staff or user.is_superuser:
        return 'Admin'
    if user.user_type == 'owner':
        return 'Owner'
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
    password = serializers.CharField(write_only=True)
    phone    = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    address  = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    role     = serializers.ChoiceField(
        choices=['Student', 'Parent', 'Owner'], write_only=True, default='Student'
    )
    id_card  = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model  = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name',
                  'phone', 'address', 'role', 'id_card']

    def validate_password(self, value):
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Un compte avec cet email existe déjà.")
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def create(self, validated_data):
        phone   = validated_data.pop('phone', '')
        address = validated_data.pop('address', '')
        role    = validated_data.pop('role', 'Student')
        user_type        = 'owner' if role == 'Owner' else 'visitor'
        visitor_category = '1' if role == 'Student' else ('2' if role == 'Parent' else None)
        return User.objects.create_user(
            **validated_data,
            user_type=user_type,
            contact=phone,
            address=address,
            visitor_category=visitor_category,
            is_verified=False
        )


class UserSerializer(serializers.ModelSerializer):
    id_card = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'user_type', 'contact', 'address', 'is_verified', 'id_card']

    def get_id_card(self, obj):
        request = self.context.get('request')
        if obj.id_card:
            url = obj.id_card.url
            return request.build_absolute_uri(url) if request else f"http://localhost:8000{url}"
        return None


class EstateImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model  = EstateImage
        fields = ['id', 'image']

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image:
            url = obj.image.url
            return request.build_absolute_uri(url) if request else f"http://localhost:8000{url}"
        return None


# ── Room Serializers ──────────────────────────────────────────────────────────

from .models import RoomCategory, RoomImage


class RoomImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model  = RoomImage
        fields = ['id', 'room_category', 'image', 'caption']

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image:
            url = obj.image.url
            return request.build_absolute_uri(url) if request else f"http://localhost:8000{url}"
        return None


class RoomCategorySerializer(serializers.ModelSerializer):
    images = RoomImageSerializer(many=True, read_only=True)

    class Meta:
        model  = RoomCategory
        fields = ['id', 'estate', 'name', 'occupancy', 'price',
                  'quantity_available', 'wifi', 'tv', 'fridge',
                  'room_size', 'description', 'images']


# ── Estate Serializer ─────────────────────────────────────────────────────────

class EstateSerializer(serializers.ModelSerializer):
    owner           = UserSerializer(read_only=True)
    images          = EstateImageSerializer(many=True, read_only=True)
    room_categories = RoomCategorySerializer(many=True, read_only=True)
    capacity        = serializers.SerializerMethodField()
    free            = serializers.SerializerMethodField()
    price           = serializers.SerializerMethodField()
    wifi            = serializers.SerializerMethodField()
    tv              = serializers.SerializerMethodField()
    fridge          = serializers.SerializerMethodField()
    reviews_count   = serializers.SerializerMethodField()
    orders_count    = serializers.SerializerMethodField()
    average_rating  = serializers.SerializerMethodField()

    class Meta:
        model  = Estate
        fields = [
            'id', 'owner', 'name', 'location',
            'rating', 'average_rating',
            'distance', 'restaurant', 'generator', 'forage',
            'description', 'publishedAt', 'status',
            'images', 'room_categories',
            'capacity', 'free', 'price',
            'wifi', 'tv', 'fridge',
            'reviews_count', 'orders_count',
            'lat', 'lng',
            # ── Admin verification ────────────────────────────────────────────
            'is_verified',
        ]

    def get_average_rating(self, obj) -> dict:
        from django.db.models import Avg, Count
        top = obj.reviews.filter(parent__isnull=True)
        agg = top.aggregate(avg=Avg('rating'), count=Count('id'))
        avg   = agg['avg']
        count = agg['count'] or 0
        breakdown = {i: 0 for i in range(1, 6)}
        for row in top.values('rating').annotate(n=Count('id')):
            if 1 <= row['rating'] <= 5:
                breakdown[row['rating']] = row['n']
        value = round(avg, 1) if avg is not None else 0.0
        return {'value': value, 'display': f"{value:.1f}", 'count': count, 'breakdown': breakdown}

    def get_capacity(self, obj) -> int:
        total = 0
        for rc in obj.room_categories.all():
            total += rc.quantity_available * {'single':1,'double':2,'shared':4}.get(rc.occupancy, 1)
        return total

    def get_free(self, obj) -> int:
        from django.db.models import Sum
        return obj.room_categories.aggregate(total=Sum('quantity_available'))['total'] or 0

    def get_price(self, obj) -> int:
        from django.db.models import Min
        return obj.room_categories.aggregate(min_p=Min('price'))['min_p'] or 0

    def get_wifi(self, obj) -> str:
        return '1' if obj.room_categories.filter(wifi='1').exists() else '0'

    def get_tv(self, obj) -> str:
        return '1' if obj.room_categories.filter(tv='1').exists() else '0'

    def get_fridge(self, obj) -> str:
        return '1' if obj.room_categories.filter(fridge='1').exists() else '0'

    def get_reviews_count(self, obj) -> int:
        return obj.reviews.filter(parent__isnull=True).count()

    def get_orders_count(self, obj) -> int:
        return obj.quick_orders.count()


# ── Review Serializer ─────────────────────────────────────────────────────────

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
        request     = self.context.get('request')
        first_image = obj.estate.images.first()
        if first_image:
            url = first_image.image.url
            return request.build_absolute_uri(url) if request else f"http://localhost:8000{url}"
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


# ── QuickOrder Serializer ─────────────────────────────────────────────────────

class QuickOrderSerializer(serializers.ModelSerializer):
    estate_name        = serializers.CharField(source='estate.name', read_only=True)
    estate_image       = serializers.SerializerMethodField()
    estate_location    = serializers.CharField(source='estate.location', read_only=True)
    estate_price       = serializers.IntegerField(source='estate.price', read_only=True)
    room_category_name = serializers.CharField(source='room_category.name', read_only=True, default=None)

    class Meta:
        model  = QuickOrder
        fields = ['id', 'estate', 'estate_name', 'estate_image', 'estate_location',
                  'room_category', 'estate_price', 'room_category_name',
                  'name', 'phone', 'note', 'status', 'created_at']

    def get_estate_image(self, obj):
        request     = self.context.get('request')
        first_image = obj.estate.images.first()
        if first_image:
            url = first_image.image.url
            return request.build_absolute_uri(url) if request else f"http://localhost:8000{url}"
        return None

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        return super().create(validated_data)


# ── ContactRequest Serializer ─────────────────────────────────────────────────

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


# ── Messaging Serializers ─────────────────────────────────────────────────────

class MessageSerializer(serializers.ModelSerializer):
    sender_name     = serializers.CharField(source='sender.get_full_name', read_only=True)
    sender_username = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model  = Message
        fields = ['id', 'conversation', 'sender', 'sender_name', 'sender_username',
                  'text', 'read', 'created_at']
        read_only_fields = ['sender', 'read', 'created_at']

    def create(self, validated_data):
        validated_data['sender'] = self.context['request'].user
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
        request     = self.context.get('request')
        first_image = obj.estate.images.first()
        if first_image:
            url = first_image.image.url
            return request.build_absolute_uri(url) if request else f"http://localhost:8000{url}"
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
        return 0