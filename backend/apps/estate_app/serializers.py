from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    User, Estate, EstateImage, Review, QuickOrder, ContactRequest,
    Conversation, Message, Notification,
    RoomCategory, RoomImage,
    Reservation, Invoice, Room, Equipment, RoomEquipment, Supplement,
    Characteristic, EstateCharacteristic,
)


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
        id_card = validated_data.pop('id_card', None)   # ← must pop this explicitly
        
        user_type        = 'owner' if role == 'Owner' else 'visitor'
        visitor_category = '1' if role == 'Student' else ('2' if role == 'Parent' else None)
        
        user = User.objects.create_user(
            **validated_data,
            user_type=user_type,
            contact=phone,
            address=address,
            visitor_category=visitor_category,
            is_verified=False,
            is_active=True,
        )
        if id_card:
            user.id_card = id_card
            user.save(update_fields=['id_card'])
        return user


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
            if url.startswith('http'):
                return url
            return request.build_absolute_uri(url) if request else url
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
            if url.startswith('http'):
                return url
            return request.build_absolute_uri(url) if request else url
        return None


# ── Room & Equipment Serializers ─────────────────────────────────────────────

class RoomImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model  = RoomImage
        fields = ['id', 'room_category', 'image', 'caption']

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image:
            url = obj.image.url
            if url.startswith('http'):
                return url
            return request.build_absolute_uri(url) if request else url
        return None


class EquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Equipment
        fields = ['id', 'part_name', 'removable']


class RoomEquipmentReadSerializer(serializers.ModelSerializer):
    """Read-only view of room equipment, used inside RoomCategorySerializer."""
    equipment_name = serializers.CharField(source='equipment.part_name', read_only=True)
    part           = serializers.CharField(source='equipment.part_name', read_only=True)

    class Meta:
        model  = RoomEquipment
        fields = ['id', 'equipment', 'equipment_name', 'part',
                  'quantity', 'surface_area_m2', 'condition', 'note']


class RoomEquipmentWriteSerializer(serializers.ModelSerializer):
    """
    Writable serializer. Accepts equipment FK id OR custom_name to create
    a new Equipment type on-the-fly.
    """
    custom_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model  = RoomEquipment
        fields = ['id', 'room_category', 'equipment', 'custom_name',
                  'quantity', 'surface_area_m2', 'condition', 'note']
        extra_kwargs = {'equipment': {'required': False, 'allow_null': True}}

    def validate(self, attrs):
        if not attrs.get('equipment') and not attrs.get('custom_name'):
            raise serializers.ValidationError(
                "Fournissez 'equipment' (id) ou 'custom_name'."
            )
        return attrs

    def create(self, validated_data):
        custom_name = validated_data.pop('custom_name', None)
        if not validated_data.get('equipment') and custom_name:
            eq, _ = Equipment.objects.get_or_create(
                part_name=custom_name, defaults={'removable': True}
            )
            validated_data['equipment'] = eq
        return super().create(validated_data)


class SupplementSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Supplement
        fields = ['id', 'estate', 'name', 'price', 'description',
                  'is_available', 'is_paid_service']
        read_only_fields = ['id']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


# ── Characteristics ──────────────────────────────────────────────────────────

class CharacteristicSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Characteristic
        fields = ['id', 'name', 'description']


class EstateCharacteristicSerializer(serializers.ModelSerializer):
    characteristic_name = serializers.CharField(
        source='characteristic.name', read_only=True
    )

    class Meta:
        model  = EstateCharacteristic
        fields = ['id', 'estate', 'characteristic', 'characteristic_name']


class RoomCategorySerializer(serializers.ModelSerializer):
    images    = RoomImageSerializer(many=True, read_only=True)
    equipment = RoomEquipmentReadSerializer(many=True, read_only=True)

    class Meta:
        model  = RoomCategory
        fields = [
            'id', 'estate', 'name', 'occupancy', 'price', 'price_per_month',
            'total_rooms', 'available_rooms', 'surface_area',
            'quantity_available', 'wifi', 'tv', 'fridge',
            'room_size', 'description', 'images', 'equipment',
        ]


# ── Estate Serializer ─────────────────────────────────────────────────────────

class EstateSerializer(serializers.ModelSerializer):
    owner           = UserSerializer(read_only=True)
    images          = EstateImageSerializer(many=True, read_only=True)
    room_categories = RoomCategorySerializer(many=True, read_only=True)
    capacity        = serializers.SerializerMethodField()
    free            = serializers.SerializerMethodField()
    price           = serializers.SerializerMethodField()
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
            # ── New fields ────────────────────────────────────────────────────
            'etages', 'water_bills', 'electricity_bills', 'fence',
            'caretaker', 'security_guard', 'restaurant_on_site',
            'borehole_forage', 'generator_available', 'parking',
            'cctv', 'cleaning_service', 'Terrain_de_sport', 'playground',
            'allowed_gender', 'max_capacity',
            'characteristics', 'supplements',
            # ── Admin verification ────────────────────────────────────────────
            'is_verified',
        ]
        
    characteristics = EstateCharacteristicSerializer(source='characteristics_set', many=True, read_only=True)
    supplements = SupplementSerializer(source='supplements_set', many=True, read_only=True)

    def to_internal_value(self, data):
        # Handle QueryDict immutability if needed
        if hasattr(data, 'dict'):
            data = data.copy()

        # Convert boolean fields from frontend to the '1'/'0' expected by model legacy CharFields
        for field in ['restaurant', 'generator', 'forage']:
            if field in data:
                val = data[field]
                if isinstance(val, bool):
                    data[field] = '1' if val else '0'
                elif isinstance(val, str):
                    # Handle "true"/"false" strings
                    if val.lower() == 'true' or val == '1': data[field] = '1'
                    elif val.lower() == 'false' or val == '0': data[field] = '0'
        
        # Explicitly remove read-only and method fields to prevent validation issues
        read_only_data_fields = [
            'price', 'capacity', 'free', 'reviews_count', 'orders_count', 
            'average_rating', 'characteristics', 'supplements', 'owner', 'images', 'room_categories'
        ]
        for f in read_only_data_fields:
            if f in data:
                # If it's a dict/QueryDict, we can pop it
                if isinstance(data, dict):
                    data.pop(f)
                elif hasattr(data, 'pop'):
                    try: data.pop(f)
                    except: pass

        return super().to_internal_value(data)

    def get_average_rating(self, obj) -> dict:
        # Uses prefetched reviews in memory
        top_reviews = [r for r in obj.reviews.all() if r.parent_id is None]
        count = len(top_reviews)
        if count == 0:
            return {'value': 0.0, 'display': "0.0", 'count': 0, 'breakdown': {i: 0 for i in range(1, 6)}}

        total_rating = sum(r.rating for r in top_reviews)
        avg = total_rating / count
        
        breakdown = {i: 0 for i in range(1, 6)}
        for r in top_reviews:
            if 1 <= r.rating <= 5:
                breakdown[r.rating] += 1
                
        value = round(avg, 1)
        return {'value': value, 'display': f"{value:.1f}", 'count': count, 'breakdown': breakdown}

    def get_capacity(self, obj) -> int:
        # Uses prefetched room_categories in memory
        total = 0
        for rc in obj.room_categories.all():
            total += rc.available_rooms * {'single': 1, 'double': 2, 'shared': 4}.get(rc.occupancy, 1)
        return total

    def get_free(self, obj) -> int:
        # Uses prefetched room_categories in memory
        return sum(rc.available_rooms for rc in obj.room_categories.all())

    def get_price(self, obj) -> int:
        # Uses prefetched room_categories in memory
        prices = [rc.price for rc in obj.room_categories.all()]
        return min(prices) if prices else 0

    def get_reviews_count(self, obj) -> int:
        # Uses prefetched reviews in memory
        return len([r for r in obj.reviews.all() if r.parent_id is None])

    def get_orders_count(self, obj) -> int:
        # Note: quick_orders is not prefetched by default in get_queryset, 
        # but this is mostly used in detail views or admin views.
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
            if url.startswith('http'):
                return url
            return request.build_absolute_uri(url) if request else url
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
    estate_price       = serializers.SerializerMethodField()
    room_category_name = serializers.CharField(source='room_category.name', read_only=True, default=None)

    class Meta:
        model  = QuickOrder
        fields = ['id', 'estate', 'estate_name', 'estate_image', 'estate_location',
                  'room_category', 'estate_price', 'room_category_name',
                  'name', 'phone', 'note', 'status', 'receipt', 'is_payment_verified', 'created_at']

    def get_estate_image(self, obj):
        request     = self.context.get('request')
        first_image = obj.estate.images.first()
        if first_image:
            url = first_image.image.url
            if url.startswith('http'):
                return url
            return request.build_absolute_uri(url) if request else url
        return None

    def get_estate_price(self, obj) -> int:
        from django.db.models import Min
        return obj.estate.room_categories.aggregate(min_p=Min('price'))['min_p'] or 0

    def create(self, validated_data):
        room_category = validated_data.get('room_category')
        if room_category:
            # Check availability
            if room_category.occupied_count >= room_category.quantity_available:
                raise serializers.ValidationError({"room_category": "No more rooms available in this category."})
        
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
            if url.startswith('http'):
                return url
            return request.build_absolute_uri(url) if request else url
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


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['created_at']


# ── Invoice & Reservation Serializers ────────────────────────────────────────

class InvoiceSerializer(serializers.ModelSerializer):
    pdf_download_url = serializers.SerializerMethodField()

    class Meta:
        model  = Invoice
        fields = ['id', 'reservation', 'invoice_id', 'total_amount',
                  'status', 'created_at', 'pdf_download_url']

    def get_pdf_download_url(self, obj):
        request = self.context.get('request')
        if obj.pdf_file:
            url = obj.pdf_file.url
            if url.startswith('http'):
                return url
            return request.build_absolute_uri(url) if request else url
        return None


class ReservationSerializer(serializers.ModelSerializer):
    """
    Full read/write serializer for Reservation.
    - Read:  returns snapshot JSON, bill_url, estate/room names, invoice.
    - Write: delegates to create_reservation_with_snapshot() service so the
             snapshot is built and total_price computed before saving.
    """
    invoice             = InvoiceSerializer(read_only=True)
    estate_name         = serializers.CharField(source='room_category.estate.name', read_only=True)
    room_category_name  = serializers.CharField(source='room_category.name', read_only=True)
    client_name         = serializers.CharField(source='user.get_full_name', read_only=True)
    client_phone        = serializers.CharField(source='user.contact', read_only=True)
    client_email        = serializers.EmailField(source='user.email', read_only=True)
    note                = serializers.CharField(read_only=True, default='', allow_blank=True)
    estate_location     = serializers.CharField(source='room_category.estate.location', read_only=True)
    estate_image        = serializers.SerializerMethodField()
    bill_url            = serializers.SerializerMethodField()
    selected_supplements = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Supplement.objects.all(), required=False
    )
    # Expose start_date/end_date as aliases for check_in/check_out
    start_date = serializers.DateField(source='check_in', required=False)
    end_date   = serializers.DateField(source='check_out', required=False)

    class Meta:
        model  = Reservation
        fields = [
            'id', 'user', 'room_category', 'estate_name', 'room_category_name',
            'client_name', 'client_phone', 'client_email', 'estate_image', 'estate_location',
            'check_in', 'check_out', 'start_date', 'end_date',
            'num_rooms', 'total_price', 'status', 'note',
            'reservation_details_json',
            'selected_supplements',
            'bill_url', 'invoice',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'status', 'user', 'created_at', 'updated_at', 'invoice',
            'total_price', 'reservation_details_json', 'bill_url',
            'estate_name', 'room_category_name', 'client_name', 'client_phone', 'client_email', 'estate_image', 'estate_location', 'note',
        ]

    def get_estate_image(self, obj):
        request     = self.context.get('request')
        first_image = obj.room_category.estate.images.first()
        if first_image:
            url = first_image.image.url
            if url.startswith('http'):
                return url
            return request.build_absolute_uri(url) if request else url
        return None

    def get_bill_url(self, obj):
        """Returns PDF URL from the Invoice linked to this reservation."""
        request = self.context.get('request')
        try:
            inv = obj.invoice
            if inv and inv.pdf_file:
                url = inv.pdf_file.url
                return url if url.startswith('http') else (
                    request.build_absolute_uri(url) if request else url
                )
        except Exception:
            pass
        return None

    def create(self, validated_data):
        from .services import create_reservation_with_snapshot
        request = self.context.get('request')
        user = request.user if (request and request.user.is_authenticated) else None
        if user is None:
            raise serializers.ValidationError("Authentification requise.")
        return create_reservation_with_snapshot(validated_data, user)
