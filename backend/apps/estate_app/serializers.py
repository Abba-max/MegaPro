from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Estate, EstateImage, Review, QuickOrder, ContactRequest, Global_user

def _resolve_role(user) -> str:
    """Résout le rôle Angular à partir du modèle Django."""
    if user.is_staff or user.is_superuser:
        return 'Admin'
    try:
        gu = user.global_user
        # status '3' = Propriétaire dans Global_user
        if gu.status == '3':
            return 'Owner'
    except Global_user.DoesNotExist:
        pass
    return 'Student'


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Enrichit le payload JWT avec les données attendues par Angular :
      - username, email, first_name, last_name
      - role  : 'Admin' | 'Owner' | 'Student'
      - is_staff (pour compatibilité)
    """
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
        choices=['Student', 'Parent', 'Owner'],
        write_only=True, default='Student'
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

        user = User.objects.create_user(**validated_data)

        # Mapper role → Global_user.status
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
    owner  = UserSerializer(read_only=True)
    images = EstateImageSerializer(many=True, read_only=True)

    class Meta:
        model  = Estate
        fields = [
            'id', 'owner', 'name', 'location', 'capacity', 'free',
            'rating', 'price', 'distance', 'wifi', 'restaurant',
            'generator', 'room_size', 'forage', 'description',
            'publishedAt', 'status', 'images',
        ]



class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Review
        fields = ['id', 'estate', 'name', 'rating', 'comment', 'created_at', 'parent']


class QuickOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model  = QuickOrder
        fields = ['id', 'estate', 'name', 'phone', 'note', 'created_at']


class ContactRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model        = ContactRequest
        fields       = ['id', 'name', 'email', 'phone', 'message', 'submitted_at']
        read_only_fields = ['submitted_at']