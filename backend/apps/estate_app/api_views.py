from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.views import TokenObtainPairView
import uuid as _uuid
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import Payment
from .cinetpay import initiate_payment, verify_payment

from .models import (
    Estate, EstateImage, Review, QuickOrder, ContactRequest,
    Conversation, Message, User, RoomCategory, RoomImage,
    Reservation, Invoice, Equipment, RoomEquipment, Supplement,
    Characteristic, EstateCharacteristic,
    BannedWord, SystemLog, AuditLog,
)
from .serializers import (
    EstateSerializer, EstateImageSerializer, ReviewSerializer, QuickOrderSerializer,
    ContactRequestSerializer, RegisterSerializer,
    MyTokenObtainPairSerializer, UserSerializer,
    ConversationSerializer, ConversationDetailSerializer, MessageSerializer,
    RoomCategorySerializer, RoomImageSerializer,
    ReservationSerializer, InvoiceSerializer,
    EquipmentSerializer, RoomEquipmentWriteSerializer, RoomEquipmentReadSerializer,
    SupplementSerializer,
    CharacteristicSerializer, EstateCharacteristicSerializer,
)
from .permissions import IsVerifiedOwner, IsEyangAdmin, IsOwnerOrAdmin
from django.utils import timezone
from django.db.models import Sum, Avg
from .utils import send_verification_email, send_welcome_email
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str

try:
    from .tasks import send_verification_email_task, send_welcome_email_task
    CELERY_AVAILABLE = True
except Exception:
    CELERY_AVAILABLE = False


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            username = request.data.get('username')
            if username:
                try:
                    user = User.objects.get(username=username)
                    from django.contrib.auth.signals import user_logged_in
                    user_logged_in.send(sender=user.__class__, request=request, user=user)
                except User.DoesNotExist:
                    pass
        return response


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def register_view(request):
    serializer = RegisterSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    try:
        user = serializer.save()
        print(f"Registration successful: Created user {user.username} (ID: {user.id})")
        from .utils import log_audit
        log_audit(user=user, action="INSCRIPTION", request=request, result="SUCCESS", details=f"Inscription de l'utilisateur : {user.username} (Rôle: {user.user_type})")
    except Exception as e:
        print(f"Registration FAILED during save: {e}")
        return Response({'detail': f"Registration persistence error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        if CELERY_AVAILABLE:
            send_verification_email_task.delay(user.id)
        else:
            send_verification_email(user)
    except Exception as e:
        print(f"Failed to send verification email: {e}")

    refresh = MyTokenObtainPairSerializer.get_token(user)
    return Response({'access': str(refresh.access_token), 'refresh': str(refresh)},
                    status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def verify_email_view(request):
    uid_b64 = request.data.get('uid')
    token = request.data.get('token')

    if not uid_b64 or not token:
        return Response({'error': 'UID and token are required.'}, status=400)

    try:
        uid = force_str(urlsafe_base64_decode(uid_b64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({'error': 'Invalid user.'}, status=400)

    if default_token_generator.check_token(user, token):
        user.is_verified = True
        user.save()
        try:
            if CELERY_AVAILABLE:
                send_welcome_email_task.delay(user.id)
            else:
                send_welcome_email(user)
        except Exception as e:
            print(f"Failed to send welcome email: {e}")
        return Response({'message': 'Email verified successfully.'})
    else:
        return Response({'error': 'Invalid or expired token.'}, status=400)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def password_reset_request_view(request):
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email is required.'}, status=400)

    try:
        user = User.objects.get(email=email)
        # Create a ContactRequest for the admin
        ContactRequest.objects.create(
            user=user,
            name="Password Reset Request",
            email=user.email,
            phone=user.contact or "N/A",
            message=f"L'utilisateur {user.username} ({user.email}) a demandé la réinitialisation de son mot de passe. Veuillez le contacter ou modifier son mot de passe depuis la gestion des utilisateurs."
        )
    except User.DoesNotExist:
        # Don't reveal that the user does not exist
        pass

    return Response({'message': 'Demande envoyée. Un administrateur vous contactera.'})



@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me_view(request):
    user = request.user
    data = UserSerializer(user, context={'request': request}).data
    if user.is_staff or user.is_superuser:
        data['role'] = 'Admin'
    elif user.user_type == 'owner':
        data['role'] = 'Owner'
    else:
        role_map = {'1': 'Student', '2': 'Parent', '3': 'Local resident', '4': 'Visitor'}
        data['role'] = role_map.get(user.visitor_category, 'Student')
    data['phone'] = user.contact or ''
    data['address'] = user.address or ''
    full_name = f"{user.first_name} {user.last_name}".strip() or user.username
    data['name'] = full_name
    data['initials'] = ''.join(w[0].upper() for w in full_name.split()[:2]) or '??'
    return Response(data)


class EstateViewSet(viewsets.ModelViewSet):
    queryset = Estate.objects.all().prefetch_related('images')
    serializer_class = EstateSerializer
    permission_classes = [IsOwnerOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = Estate.objects.all().select_related('owner').prefetch_related(
            'images',
            'characteristics_set',
            'room_categories',
            'room_categories__images',
            'reviews'
        )
        if self.request.method in permissions.SAFE_METHODS:
            p = self.request.query_params
            if loc := p.get('location'): qs = qs.filter(location__icontains=loc)
            if st  := p.get('status'):   qs = qs.filter(status=st)
            
            # ── Boolean / Char features ──────────────────────────────────────────
            if gen := p.get('generator'):
                val = (gen.lower() == 'true' or gen == '1')
                qs = qs.filter(generator=('1' if val else '0'))
            if fog := p.get('forage'):
                val = (fog.lower() == 'true' or fog == '1')
                qs = qs.filter(forage=('1' if val else '0'))
            if rst := p.get('restaurant'):
                val = (rst.lower() == 'true' or rst == '1')
                qs = qs.filter(restaurant=('1' if val else '0'))
            
            if wifi := p.get('wifi'):      qs = qs.filter(wifi=(wifi.lower() == 'true' or wifi == '1'))
            if tv   := p.get('tv'):        qs = qs.filter(tv=(tv.lower() == 'true' or tv == '1'))
            if frid := p.get('fridge'):    qs = qs.filter(fridge=(frid.lower() == 'true' or frid == '1'))
            if ply  := p.get('playground'): qs = qs.filter(playground=(ply.lower() == 'true' or ply == '1'))
            if park := p.get('parking'):    qs = qs.filter(parking=(park.lower() == 'true' or park == '1'))
            if cctv := p.get('cctv'):       qs = qs.filter(cctv=(cctv.lower() == 'true' or cctv == '1'))
            if cln  := p.get('cleaning'):   qs = qs.filter(cleaning_service=(cln.lower() == 'true' or cln == '1'))
            if sport := p.get('sport'):     qs = qs.filter(Terrain_de_sport=(sport.lower() == 'true' or sport == '1'))
            
            # ── Numeric filters ──────────────────────────────────────────────────
            if mxd := p.get('max_dist'):   qs = qs.filter(distance__lte=mxd)
            if minp := p.get('min_price'): qs = qs.filter(price__gte=minp)
            if maxp := p.get('max_price'): qs = qs.filter(price__lte=maxp)
            
            # ── Nested filters ───────────────────────────────────────────────────
            if rsz := p.get('room_size'):
                qs = qs.filter(room_categories__room_size=rsz).distinct()
                
            if p.get('available') == 'true':
                qs = qs.filter(room_categories__available_rooms__gte=1).distinct()

            if p.get('mine') == '1' and self.request.user.is_authenticated:
                qs = qs.filter(owner=self.request.user)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print(f"DEBUG: Estate creation failed. Errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        try:
            user = self.request.user
            if not user.is_authenticated:
                from rest_framework.exceptions import NotAuthenticated
                raise NotAuthenticated("Authentification requise.")

            # Default owner to current user
            owner = user
            is_verified = False

            # Staff can override owner and auto-verify
            if user.is_staff or user.is_superuser or user.user_type == 'admin':
                is_verified = True
                owner_id = self.request.data.get('owner_id')
                if owner_id:
                    try:
                        owner = User.objects.get(pk=owner_id)
                    except (User.DoesNotExist, ValueError, TypeError):
                        pass

            if not owner:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"owner": "Un propriétaire est requis."})

            serializer.save(owner=owner, is_verified=is_verified)
            from .utils import log_audit
            log_audit(user=user, action="CRÉATION_RÉSIDENCE", request=self.request, result="SUCCESS", details=f"Résidence créée : {serializer.instance.name} (ID: {serializer.instance.id})")
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            raise e

    def perform_update(self, serializer):
        user = self.request.user
        kwargs = {}
        if user.is_staff or user.is_superuser:
            owner_id = self.request.data.get('owner_id')
            if owner_id:
                try:
                    owner = User.objects.get(pk=owner_id)
                    kwargs['owner'] = owner
                except (User.DoesNotExist, ValueError, TypeError):
                    pass
        else:
            kwargs['is_verified'] = False

        serializer.save(**kwargs)
        from .utils import log_audit
        log_audit(user=user, action="MODIFICATION_RÉSIDENCE", request=self.request, result="SUCCESS", details=f"Résidence modifiée : {serializer.instance.name} (ID: {serializer.instance.id})")

    @action(detail=True, methods=['post'], url_path='images',
            permission_classes=[permissions.IsAuthenticated],
            parser_classes=[MultiPartParser, FormParser])
    def upload_images(self, request, pk=None):
        estate = self.get_object()
        if estate.owner != request.user and not request.user.is_staff:
            return Response({'error': 'Non autorise.'}, status=403)
        files = request.FILES.getlist('images')
        if not files:
            return Response({'error': 'Aucune image fournie.'}, status=400)
        
        import base64
        files_data = []
        for f in files:
            content = f.read()
            encoded = base64.b64encode(content).decode('utf-8')
            files_data.append({
                'name': f.name,
                'content': encoded
            })
        
        from .utils import _run_task
        from .tasks import upload_estate_images_task
        _run_task(upload_estate_images_task, estate.id, files_data)
        return Response({'message': 'Images en cours de traitement en arrière-plan.'}, status=202)

    @action(detail=True, methods=['delete'], url_path=r'images/(?P<image_id>\d+)',
            permission_classes=[permissions.IsAuthenticated])
    def delete_image(self, request, pk=None, image_id=None):
        estate = self.get_object()
        if estate.owner != request.user and not request.user.is_staff:
            return Response({'error': 'Non autorise.'}, status=403)
        try:
            img = EstateImage.objects.get(pk=image_id, estate=estate)
        except EstateImage.DoesNotExist:
            return Response({'error': 'Image introuvable.'}, status=404)
        img.image.delete(save=False)
        img.delete()
        return Response(status=204)

    @action(detail=True, methods=['post'], url_path='verify',
            permission_classes=[permissions.IsAdminUser])
    def verify(self, request, pk=None):
        estate = self.get_object()
        act = request.data.get('action', '').strip()
        if act == 'approve':
            estate.is_verified = True
            estate.save(update_fields=['is_verified'])
            return Response(EstateSerializer(estate, context={'request': request}).data)
        elif act == 'reject':
            estate.is_verified = False
            estate.save(update_fields=['is_verified'])
            return Response(EstateSerializer(estate, context={'request': request}).data)
        return Response({'error': 'Action invalide. Utilisez "approve" ou "reject".'}, status=400)

    @action(detail=True, methods=['post'], url_path='transfer-ownership',
            permission_classes=[permissions.IsAdminUser])
    def transfer_ownership(self, request, pk=None):
        estate = self.get_object()
        new_owner_id = request.data.get('new_owner_id')
        if not new_owner_id:
            return Response({'error': 'new_owner_id est requis.'}, status=400)
        try:
            new_owner = User.objects.get(pk=new_owner_id)
            estate.owner = new_owner
            estate.save(update_fields=['owner'])
            return Response(EstateSerializer(estate, context={'request': request}).data)
        except User.DoesNotExist:
            return Response({'error': 'Nouveau proprietaire introuvable.'}, status=404)

    @action(detail=True, methods=['get', 'post'], url_path='supplements',
            permission_classes=[permissions.IsAuthenticatedOrReadOnly])
    def supplements(self, request, pk=None):
        """GET: list supplements for estate. POST: add a supplement (owner/admin)."""
        estate = self.get_object()
        if request.method == 'GET':
            sups = estate.supplements_set.filter(is_available=True)
            return Response(SupplementSerializer(sups, many=True, context={'request': request}).data)
        # POST
        if estate.owner != request.user and not request.user.is_staff:
            return Response({'error': 'Non autorisé.'}, status=403)
        serializer = SupplementSerializer(
            data={**request.data, 'estate': estate.id},
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)

    @action(detail=True, methods=['get', 'post', 'delete'], 
            url_path=r'characteristics(?:/(?P<char_id>\d+))?',
            permission_classes=[permissions.IsAuthenticatedOrReadOnly])
    def characteristics(self, request, pk=None, char_id=None):
        """
        GET: list characteristics for estate. 
        POST: link a characteristic (body: {characteristic: id}).
        DELETE: unlink a characteristic (path: /characteristics/{char_id}/).
        """
        estate = self.get_object()
        
        if request.method == 'GET':
            chars = estate.characteristics_set.select_related('characteristic').all()
            return Response(EstateCharacteristicSerializer(chars, many=True).data)
            
        # POST / DELETE — only owner or admin
        if estate.owner != request.user and not request.user.is_staff:
            return Response({'error': 'Non autorisé.'}, status=403)
            
        if request.method == 'DELETE':
            if not char_id:
                return Response({'error': 'char_id requis dans l\'URL pour la suppression.'}, status=400)
            try:
                ec = estate.characteristics_set.filter(characteristic_id=char_id).first()
                if not ec:
                    return Response({'error': 'Association introuvable.'}, status=404)
                ec.delete()
                return Response(status=204)
            except Exception as e:
                return Response({'error': str(e)}, status=400)
                
        # POST
        char_id_body = request.data.get('characteristic')
        if not char_id_body:
            return Response({'error': 'characteristic ID requis.'}, status=400)
        
        if estate.characteristics_set.filter(characteristic_id=char_id_body).exists():
            return Response({'error': 'Cette caractéristique est déjà associée.'}, status=400)
            
        from .models import EstateCharacteristic
        ec = EstateCharacteristic.objects.create(estate=estate, characteristic_id=char_id_body)
        return Response(EstateCharacteristicSerializer(ec).data, status=201)


class RoomCategoryViewSet(viewsets.ModelViewSet):
    queryset = RoomCategory.objects.all().prefetch_related('images', 'equipment_set__equipment')
    serializer_class = RoomCategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = RoomCategory.objects.all().prefetch_related('images', 'equipment_set__equipment')
        eid = self.request.query_params.get('estate')
        if eid:
            qs = qs.filter(estate_id=eid)
        return qs

    def perform_create(self, serializer):
        """Auto-set available_rooms = total_rooms on creation."""
        total_val = self.request.data.get('total_rooms')
        try:
            total = int(total_val) if total_val is not None and str(total_val).strip() != '' else 1
        except (ValueError, TypeError):
            total = 1
        serializer.save(available_rooms=total)
        from .utils import log_audit
        log_audit(
            user=self.request.user,
            action="CRÉATION_CHAMBRE",
            request=self.request,
            result="SUCCESS",
            details=f"Création de la catégorie de chambre {serializer.instance.name} à {serializer.instance.estate.name} (Prix: {serializer.instance.price} FCFA)"
        )

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_price = old_instance.price
        serializer.save()
        new_instance = serializer.instance
        if old_price != new_instance.price:
            from .utils import log_audit
            log_audit(
                user=self.request.user,
                action="MODIFICATION_PRIX",
                request=self.request,
                result="SUCCESS",
                details=f"Changement de prix pour la catégorie {new_instance.name} à {new_instance.estate.name} : {old_price} -> {new_instance.price} FCFA"
            )

    @action(detail=True, methods=['post'], url_path='images',
            parser_classes=[MultiPartParser, FormParser])
    def upload_images(self, request, pk=None):
        room_cat = self.get_object()
        files = request.FILES.getlist('images')
        if not files:
            return Response({'error': 'Aucune image fournie.'}, status=400)
            
        import base64
        files_data = []
        for f in files:
            content = f.read()
            encoded = base64.b64encode(content).decode('utf-8')
            files_data.append({
                'name': f.name,
                'content': encoded
            })
            
        from .utils import _run_task
        from .tasks import upload_room_images_task
        _run_task(upload_room_images_task, room_cat.id, files_data)
        return Response({'message': 'Images en cours de traitement en arrière-plan.'}, status=202)

    @action(detail=True, methods=['delete'], url_path=r'images/(?P<image_id>\d+)',
            permission_classes=[permissions.IsAuthenticated])
    def delete_image(self, request, pk=None, image_id=None):
        room_cat = self.get_object()
        if room_cat.estate.owner != request.user and not request.user.is_staff:
            return Response({'error': 'Non autorisé.'}, status=403)
        try:
            img = RoomImage.objects.get(pk=image_id, room_category=room_cat)
        except RoomImage.DoesNotExist:
            return Response({'error': 'Image introuvable.'}, status=404)
        img.image.delete(save=False)
        img.delete()
        return Response(status=204)


    @action(detail=True, methods=['get', 'post'], url_path='equipment',
            permission_classes=[permissions.IsAuthenticatedOrReadOnly])
    def equipment(self, request, pk=None):
        """GET: list equipment. POST: add equipment item (owner/admin)."""
        room_cat = self.get_object()
        if request.method == 'GET':
            items = room_cat.equipment_set.select_related('equipment').all()
            return Response(RoomEquipmentReadSerializer(items, many=True).data)
        # POST — only owner or admin
        if room_cat.estate.owner != request.user and not request.user.is_staff:
            return Response({'error': 'Non autorisé.'}, status=403)
        serializer = RoomEquipmentWriteSerializer(
            data={**request.data, 'room_category': room_cat.id},
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            RoomEquipmentReadSerializer(serializer.instance).data, status=201
        )


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def get_queryset(self):
        qs = Review.objects.all().select_related('estate', 'user').prefetch_related('likes')
        p = self.request.query_params
        if eid := p.get('estate'): qs = qs.filter(estate_id=eid)
        if p.get('mine') == '1' and self.request.user.is_authenticated:
            qs = qs.filter(estate__owner=self.request.user)
        if p.get('client') == '1' and self.request.user.is_authenticated:
            qs = qs.filter(user=self.request.user)
        return qs

    @action(detail=True, methods=['post'], url_path='like',
            permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        review = self.get_object()
        user = request.user
        if review.likes.filter(pk=user.pk).exists():
            review.likes.remove(user)
            liked = False
        else:
            review.likes.add(user)
            liked = True
        return Response({'liked': liked, 'likes_count': review.likes.count()})


def get_recommendations(estate, room_category=None):
    """
    Finds available estates in the same location as 'estate'.
    """
    qs = Estate.objects.filter(
        location=estate.location,
        status='published',
        is_verified=True
    ).exclude(id=estate.id).prefetch_related('images', 'room_categories')

    recommendations = []
    for suggested in qs:
        # Check if it has any free room
        total_qty = suggested.room_categories.aggregate(Sum('quantity_available'))['quantity_available__sum'] or 0
        total_occ = suggested.room_categories.aggregate(Sum('occupied_count'))['occupied_count__sum'] or 0
        if total_qty > total_occ:
            recommendations.append(suggested)
        if len(recommendations) >= 3:
            break
    return recommendations


class QuickOrderViewSet(viewsets.ModelViewSet):
    queryset = QuickOrder.objects.all()
    serializer_class = QuickOrderSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        room_category = serializer.validated_data.get('room_category')
        estate        = serializer.validated_data.get('estate')

        from django.db import transaction
        with transaction.atomic():
            if room_category:
                # Concurrency Row Lock
                rc = RoomCategory.objects.select_for_update().get(pk=room_category.id)
                if rc.available_rooms <= 0:
                    recs = get_recommendations(estate, room_category)
                    recs_data = EstateSerializer(recs, many=True, context={'request': request}).data
                    return Response(
                        {
                            "error": "FULL",
                            "detail": "Plus de chambres disponibles dans cette catégorie.",
                            "recommendations": recs_data
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # Atomic inventory decrement safely inside lock
                rc.occupied_count += 1
                rc.available_rooms = max(0, rc.available_rooms - 1)
                rc.available_quantity = rc.available_rooms
                rc.quantity_available = rc.available_rooms
                rc.save(update_fields=['occupied_count', 'available_rooms', 'available_quantity', 'quantity_available'])

            if request.user.is_authenticated:
                serializer.validated_data['user'] = request.user

            # ── Direct Order: Skip payment verification ──
            serializer.validated_data['status'] = 'accepted'
            serializer.validated_data['is_payment_verified'] = True
            
            instance = serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def get_queryset(self):
        qs = QuickOrder.objects.all().select_related('estate', 'room_category', 'user').order_by('-created_at')
        p = self.request.query_params
        if p.get('mine') == '1' and self.request.user.is_authenticated:
            qs = qs.filter(estate__owner=self.request.user)
        if p.get('client') == '1' and self.request.user.is_authenticated:
            qs = qs.filter(user=self.request.user)
        return qs

    @action(detail=True, methods=['patch'], url_path='accept',
            permission_classes=[permissions.IsAuthenticated])
    def accept(self, request, pk=None):
        order = self.get_object()
        if order.estate.owner != request.user and not request.user.is_staff:
            return Response({'error': 'error.not_authorized'}, status=403)

        if order.status != 'accepted' and order.room_category:
            from django.db import transaction
            try:
                with transaction.atomic():
                    rc = RoomCategory.objects.select_for_update().get(pk=order.room_category_id)
                    if rc.available_rooms <= 0:
                        return Response({'error': 'error.no_availability'}, status=400)
                    rc.occupied_count += 1
                    rc.available_rooms = max(0, rc.available_rooms - 1)
                    rc.save(update_fields=['occupied_count', 'available_rooms', 'available_quantity', 'quantity_available'])
                    order.status = 'accepted'
                    order.save(update_fields=['status'])
            except Exception:
                return Response({'error': 'error.internal_server_error'}, status=500)
        else:
            order.status = 'accepted'
            order.save(update_fields=['status'])

        return Response(QuickOrderSerializer(order, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='reject',
            permission_classes=[permissions.IsAuthenticated])
    def reject(self, request, pk=None):
        order = self.get_object()
        if order.estate.owner != request.user and not request.user.is_staff:
            return Response({'error': 'error.not_authorized'}, status=403)

        if order.status == 'accepted' and order.room_category:
            from django.db import transaction
            with transaction.atomic():
                rc = RoomCategory.objects.select_for_update().get(pk=order.room_category_id)
                rc.occupied_count = max(0, rc.occupied_count - 1)
                rc.available_rooms = min(rc.total_rooms, rc.available_rooms + 1)
                rc.save(update_fields=['occupied_count', 'available_rooms', 'available_quantity', 'quantity_available'])

        order.status = 'rejected'
        order.save(update_fields=['status'])
        return Response(QuickOrderSerializer(order, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='upload-receipt',
            permission_classes=[permissions.IsAuthenticated],
            parser_classes=[MultiPartParser, FormParser])
    def upload_receipt(self, request, pk=None):
        order = self.get_object()
        if order.user != request.user:
            return Response({'error': 'Non autorisé.'}, status=403)
        
        file = request.FILES.get('receipt')
        if not file:
            return Response({'error': 'Aucun fichier fourni.'}, status=400)
        
        order.receipt = file
        order.status  = 'paid' # Moves to 'paid' but awaiting admin validation
        order.save(update_fields=['receipt', 'status'])
        
        return Response(QuickOrderSerializer(order, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='verify-payment',
            permission_classes=[permissions.IsAdminUser])
    def verify_payment(self, request, pk=None):
        order = self.get_object()
        action_type = request.data.get('action') # 'approve' or 'reject'
        
        if action_type == 'approve':
            order.is_payment_verified = True
            order.status = 'pending' # Now awaiting owner approval
            order.save(update_fields=['is_payment_verified', 'status'])
            
            # Notify Student
            from .notifications_utils import notify_user
            try:
                notify_user(
                    user=order.user,
                    n_type='info',
                    title_key='notification.payment_verified_title',
                    body_key='notification.payment_verified_body',
                    body_params={'estate': order.estate.name},
                    link='/dashboard',
                )
            except: pass
            
            # Notify Owner
            try:
                notify_user(
                    user=order.estate.owner,
                    n_type='new_booking',
                    title_key='notification.new_booking_title',
                    body_key='notification.new_booking_body',
                    body_params={'estate': order.estate.name, 'client': order.name},
                    link='/dashboard',
                )
            except: pass
            
            return Response({'message': 'Paiement vérifié avec succès.'})
            
        elif action_type == 'reject':
            order.is_payment_verified = False
            order.status = 'payment_failed'
            order.save(update_fields=['is_payment_verified', 'status'])
            return Response({'message': 'Paiement rejeté.'})
            
        return Response({'error': 'Action invalide.'}, status=400)


class ContactRequestViewSet(viewsets.ModelViewSet):
    queryset = ContactRequest.objects.all()
    serializer_class = ContactRequestSerializer
    permission_classes = [permissions.AllowAny]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def get_queryset(self):
        qs = ContactRequest.objects.all().order_by('-submitted_at')
        p = self.request.query_params
        if p.get('client') == '1' and self.request.user.is_authenticated:
            qs = qs.filter(user=self.request.user)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({"message": "Message envoye avec succes.", "data": serializer.data},
                        status=status.HTTP_201_CREATED)


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ConversationDetailSerializer
        return ConversationSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def get_queryset(self):
        user = self.request.user
        return Conversation.objects.filter(
            Q(client=user) | Q(owner=user)
        ).select_related('client', 'owner', 'estate').prefetch_related(
            'messages', 'estate__images'
        ).order_by('-updated_at')

    def create(self, request, *args, **kwargs):
        estate_id = request.data.get('estate_id')
        owner_id = request.data.get('owner_id')
        if not estate_id or not owner_id:
            return Response({'error': 'estate_id and owner_id are required.'}, status=400)
        try:
            estate = Estate.objects.get(pk=estate_id)
            owner = User.objects.get(pk=owner_id)
        except (Estate.DoesNotExist, User.DoesNotExist):
            return Response({'error': 'Estate or owner not found.'}, status=404)
        conv, created = Conversation.objects.get_or_create(client=request.user, owner=owner, estate=estate)
        serializer = self.get_serializer(conv)
        return Response(serializer.data,
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='messages')
    def send_message(self, request, pk=None):
        conv = self.get_object()
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'error': 'Message text is required.'}, status=400)

        # ── Banned word filter ──────────────────────────────────────────────
        text_lower = text.lower()
        banned_words = BannedWord.objects.values_list('word', flat=True)
        for word in banned_words:
            if word.lower() in text_lower:
                return Response(
                    {
                        'error': 'BANNED_WORD',
                        'message': (
                            '⛔ Votre message a été bloqué car il contient un terme interdit. '
                            'Le message n\'a pas été envoyé. C\'est interdit ici.'
                        ),
                    },
                    status=400,
                )

        msg = Message.objects.create(conversation=conv, sender=request.user, text=text)
        conv.save()
        conv.messages.filter(read=False).exclude(sender=request.user).update(read=True)
        return Response(MessageSerializer(msg, context={'request': request}).data, status=201)

    @action(detail=True, methods=['post'], url_path='read')
    def mark_read(self, request, pk=None):
        conv = self.get_object()
        conv.messages.filter(read=False).exclude(sender=request.user).update(read=True)
        return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def stats_view(request):
    return Response({
        'estates': Estate.objects.filter(status='published').count(),
        'users': User.objects.filter(is_active=True).count(),
        'students': User.objects.filter(user_type='visitor', visitor_category='1').count(),
        'reviews': Review.objects.count(),
        'campuses': Estate.objects.filter(status='published').values('location').distinct().count(),
        'orders': QuickOrder.objects.count(),
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def owner_stats_view(request):
    estates = Estate.objects.filter(owner=request.user)
    # Count both legacy and new bookings
    orders = QuickOrder.objects.filter(estate__owner=request.user)
    reservations = Reservation.objects.filter(room_category__estate__owner=request.user)
    
    room_stats = RoomCategory.objects.filter(estate__owner=request.user).aggregate(
        total_qty=Sum('quantity_available'), avg_price=Avg('price'))
    total_cap = room_stats['total_qty'] or 0
    
    # Simple occupancy heuristic: total confirmed/pending bookings vs total rooms
    occupied = min(total_cap, orders.count() + reservations.count())
    occ_pct = round((occupied / total_cap) * 100) if total_cap > 0 else 0
    
    ratings = [float(e.rating) for e in estates if e.rating and float(e.rating) > 0]
    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else 0
    
    return Response({
        'total_estates': estates.count(),
        'occupancy_pct': occ_pct,
        'pending_orders': orders.filter(status='pending').count() + reservations.filter(status='PENDING').count(),
        'avg_rating': avg_rating,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def client_stats_view(request):
    user = request.user
    # Count both legacy QuickOrders and new Reservations
    total_orders = QuickOrder.objects.filter(user=user).count()
    total_res    = Reservation.objects.filter(user=user).count()
    
    return Response({
        'total_reservations': total_orders + total_res,
        'total_reviews': Review.objects.filter(user=user).count(),
        'total_messages': Message.objects.filter(sender=user).count(),
        'total_contacts': ContactRequest.objects.filter(user=user).count(),
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def online_users_view(request):
    try:
        from .consumers import ONLINE_USERS
        return Response({'online_user_ids': list(ONLINE_USERS)})
    except Exception:
        return Response({'online_user_ids': []})


@api_view(['GET'])
@permission_classes([IsEyangAdmin])
def admin_stats_view(request):
    from django.db.models import Count
    from django.db.models.functions import TruncMonth
    from datetime import timedelta

    total_users = User.objects.filter(is_active=True).count()
    total_estates = Estate.objects.count()
    
    # Combined counts
    total_orders = QuickOrder.objects.count() + Reservation.objects.count()
    total_reviews = Review.objects.count()
    pending_verifications = Estate.objects.filter(status='published', is_verified=False).count()

    recent_orders = QuickOrder.objects.select_related('estate').order_by('-created_at')[:5]
    recent_reservations = Reservation.objects.select_related('room_category__estate').order_by('-created_at')[:5]
    recent_reviews = Review.objects.select_related('estate').order_by('-created_at')[:5]

    activities = []
    for o in recent_orders:
        activities.append({'type': 'order', 'title': f"Reservation : {o.estate.name}",
                           'subtitle': o.name, 'created_at': o.created_at.isoformat()})
    for r in recent_reservations:
        activities.append({'type': 'order', 'title': f"Reservation : {r.room_category.estate.name}",
                           'subtitle': r.user.get_full_name() or r.user.username, 'created_at': r.created_at.isoformat()})
    for rev in recent_reviews:
        activities.append({'type': 'review', 'title': f"Avis sur : {rev.estate.name}",
                           'subtitle': rev.name, 'created_at': rev.created_at.isoformat()})
    
    activities.sort(key=lambda x: x['created_at'], reverse=True)

    six_months_ago = timezone.now() - timedelta(days=180)
    
    # Monthly combined
    monthly_orders = (QuickOrder.objects.filter(created_at__gte=six_months_ago)
                .annotate(month=TruncMonth('created_at'))
                .values('month').annotate(count=Count('id')))
    monthly_res = (Reservation.objects.filter(created_at__gte=six_months_ago)
                .annotate(month=TruncMonth('created_at'))
                .values('month').annotate(count=Count('id')))
    
    # Merge monthly stats
    stats_map = {}
    for m in monthly_orders:
        stats_map[m['month']] = m['count']
    for m in monthly_res:
        stats_map[m['month']] = stats_map.get(m['month'], 0) + m['count']
        
    sorted_months = sorted(stats_map.keys())
    monthly_data = [{'month': m.strftime('%b'), 'value': stats_map[m]} for m in sorted_months]

    pending_payments = QuickOrder.objects.filter(status='paid', is_payment_verified=False).count()

    return Response({
        'total_users': total_users, 'total_estates': total_estates,
        'total_orders': total_orders, 'total_reviews': total_reviews,
        'pending_verifications': pending_verifications,
        'pending_payments': pending_payments,
        'recent_activities': activities[:8],
        'monthly_orders': monthly_data,
    })


@api_view(['GET', 'DELETE'])
@permission_classes([IsEyangAdmin])
def admin_bookings_view(request):
    if request.method == 'DELETE':
        bid = request.query_params.get('id')
        try:
            QuickOrder.objects.get(pk=bid).delete()
            return Response({'deleted': True})
        except QuickOrder.DoesNotExist:
            return Response({'error': 'Reservation introuvable.'}, status=404)
    orders = QuickOrder.objects.select_related('estate', 'user').order_by('-created_at')
    result = []
    for o in orders:
        result.append({
            'id': o.id, 'estate': o.estate_id, 'estate_name': o.estate.name,
            'name': o.name, 'phone': o.phone, 'note': o.note,
            'status': o.status, 'created_at': o.created_at.isoformat(),
            'user_email': o.user.email if o.user else None,
            'is_payment_verified': o.is_payment_verified,
            'receipt': request.build_absolute_uri(o.receipt.url) if o.receipt else None
        })
    return Response(result)


@api_view(['GET', 'DELETE'])
@permission_classes([IsEyangAdmin])
def admin_reviews_view(request):
    if request.method == 'DELETE':
        rid = request.query_params.get('id')
        try:
            Review.objects.get(pk=rid).delete()
            return Response({'deleted': True})
        except Review.DoesNotExist:
            return Response({'error': 'Avis introuvable.'}, status=404)
    reviews = Review.objects.select_related('estate', 'user').order_by('-created_at')
    result = []
    for r in reviews:
        result.append({'id': r.id, 'estate': r.estate_id, 'estate_name': r.estate.name,
                       'name': r.name, 'rating': r.rating, 'comment': r.comment,
                       'created_at': r.created_at.isoformat(),
                       'user_email': r.user.email if r.user else None})
    return Response(result)


@api_view(['GET', 'DELETE'])
@permission_classes([IsEyangAdmin])
def admin_contacts_view(request):
    if request.method == 'DELETE':
        cid = request.query_params.get('id')
        try:
            ContactRequest.objects.get(pk=cid).delete()
            return Response({'deleted': True})
        except ContactRequest.DoesNotExist:
            return Response({'error': 'Contact introuvable.'}, status=404)
    contacts = ContactRequest.objects.select_related('estate').order_by('-submitted_at')
    result = []
    for c in contacts:
        result.append({'id': c.id, 'estate': c.estate_id,
                       'estate_name': c.estate.name if c.estate else None,
                       'name': c.name, 'email': c.email, 'phone': c.phone,
                       'message': c.message, 'submitted_at': c.submitted_at.isoformat()})
    return Response(result)


@api_view(['GET'])
@permission_classes([IsEyangAdmin])
def admin_users_view(request):
    users = User.objects.all().order_by('-date_joined')
    if request.query_params.get('pending_only') == '1':
        users = users.filter(user_type='owner', is_verified=False).exclude(id_card='')
    color_map = {'Student': '#3B82F6', 'Parent': '#8B5CF6', 'Owner': '#10B981', 'Admin': '#EF4444', 'Resident': '#64748B', 'Visitor': '#64748B'}
    result = []
    for u in users:
        if u.is_staff or u.is_superuser or u.user_type == 'admin':
            role = 'Admin'
        elif u.user_type == 'owner':
            role = 'Owner'
        else:
            role_map = {'1': 'Student', '2': 'Parent', '3': 'Resident', '4': 'Visitor'}
            role = role_map.get(u.visitor_category, 'Student')
        name = f"{u.first_name} {u.last_name}".strip() or u.username
        initials = ''.join(w[0].upper() for w in name.split()[:2]) or '??'
        result.append({'id': u.id, 'name': name, 'email': u.email or u.username,
                       'username': u.username,
                       'type': role, 'active': u.is_active, 'initials': initials,
                       'color': color_map.get(role, '#64748B'),
                       'joined': u.date_joined.isoformat(),
                       'is_verified': u.is_verified,
                       'id_card': request.build_absolute_uri(u.id_card.url) if u.id_card else None,
                       'phone': u.contact})
    return Response(result)


@api_view(['POST'])
@permission_classes([IsEyangAdmin])
def admin_verify_owner_view(request, user_id):
    try:
        user = User.objects.get(pk=user_id, user_type='owner')
    except User.DoesNotExist:
        return Response({'error': 'Compte bailleur introuvable.'}, status=404)
    act = request.data.get('action')
    if act == 'approve':
        user.is_verified = True
        user.save(update_fields=['is_verified'])
        return Response({'id': user.id, 'is_verified': True})
    elif act == 'reject':
        user.is_verified = False
        if user.id_card:
            user.id_card.delete(save=False)
        user.save(update_fields=['is_verified', 'id_card'])
        return Response({'id': user.id, 'is_verified': False, 'rejected': True})
    return Response({'error': 'Action invalide.'}, status=400)


@api_view(['PATCH'])
@permission_classes([IsEyangAdmin])
def admin_toggle_user_view(request, user_id):
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable.'}, status=404)
    user.is_active = not user.is_active
    user.save()
    return Response({'id': user.id, 'active': user.is_active})


@api_view(['PATCH'])
@permission_classes([IsEyangAdmin])
def admin_update_user_view(request, user_id):
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable.'}, status=404)
    if 'first_name' in request.data: user.first_name = request.data['first_name']
    if 'last_name' in request.data: user.last_name = request.data['last_name']
    if 'email' in request.data: user.email = request.data['email']
    if 'password' in request.data and request.data['password']:
        user.password = make_password(request.data['password'])
    
    if 'role' in request.data:
        role = request.data['role']
        if role in ('Admin', 'admin'):
            user.is_staff = True
            user.is_superuser = True
            user.user_type = 'admin'
        elif role in ('Owner', 'owner', 'Proprietaire'):
            user.is_staff = False
            user.is_superuser = False
            user.user_type = 'owner'
        elif role in ('Student', 'student', 'Etudiant'):
            user.is_staff = False
            user.is_superuser = False
            user.user_type = 'visitor'
            user.visitor_category = '1'
        elif role in ('Parent', 'parent'):
            user.is_staff = False
            user.is_superuser = False
            user.user_type = 'visitor'
            user.visitor_category = '2'
        elif role in ('Resident', 'resident'):
            user.is_staff = False
            user.is_superuser = False
            user.user_type = 'visitor'
            user.visitor_category = '3'
        elif role in ('Visiteur', 'visiteur', 'Visitor', 'visitor'):
            user.is_staff = False
            user.is_superuser = False
            user.user_type = 'visitor'
            user.visitor_category = '4'

    user.save()
    return Response({'id': user.id, 'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                     'email': user.email, 'is_active': user.is_active})



@api_view(['DELETE'])
@permission_classes([IsEyangAdmin])
def admin_delete_user_view(request, user_id):
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable.'}, status=404)
    if user == request.user:
        return Response({'error': 'Vous ne pouvez pas supprimer votre propre compte.'}, status=400)
    user.delete()
    return Response({'deleted': True, 'id': user_id})


from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, read=False).update(read=True)
        return Response({'status': 'ok'})

    @action(detail=True, methods=['post'], url_path='read')
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.read = True
        notif.save(update_fields=['read'])
        return Response({'status': 'ok'})


# ── New Architecture ViewSets ─────────────────────────────────────────────────────
from .services import accept_reservation, reject_reservation, cancel_reservation


class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class   = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def get_queryset(self):
        user = self.request.user
        qs = (
            Reservation.objects
            .select_related('room_category__estate__owner', 'user')
            .prefetch_related(
                'room_category__equipment_set__equipment',
                'room_category__estate__supplements_set',
                'selected_supplements',
                'invoice',
            )
        )
        if user.is_staff or user.is_superuser or user.user_type == 'admin':
            return qs.order_by('-created_at')
        if user.user_type == 'owner':
            return qs.filter(room_category__estate__owner=user).order_by('-created_at')
        return qs.filter(user=user).order_by('-created_at')

    def _get_unscoped_reservation(self, pk):
        """
        Fetch a reservation by PK without applying the user-scoped get_queryset filter.
        Used by @action endpoints that do their own authorization checks.
        """
        from django.shortcuts import get_object_or_404
        return get_object_or_404(
            Reservation.objects.select_related(
                'room_category__estate__owner', 'user'
            ).prefetch_related('invoice'),
            pk=pk
        )

    @action(detail=True, methods=['post'], url_path='accept',
            permission_classes=[permissions.IsAuthenticated])
    def accept(self, request, pk=None):
        reservation = self._get_unscoped_reservation(pk)
        user = request.user
        if reservation.room_category.estate.owner != user and not user.is_staff and user.user_type != 'admin':
            return Response({'error': 'Non autorisé.'}, status=403)

        try:
            updated = accept_reservation(reservation.id)
            updated.refresh_from_db()
            return Response(
                ReservationSerializer(updated, context={'request': request}).data
            )
        except Exception as exc:
            return Response({'error': str(exc)}, status=400)

    @action(detail=True, methods=['post'], url_path='reject',
            permission_classes=[permissions.IsAuthenticated])
    def reject(self, request, pk=None):
        reservation = self._get_unscoped_reservation(pk)
        user = request.user
        if reservation.room_category.estate.owner != user and not user.is_staff and user.user_type != 'admin':
            return Response({'error': 'Non autorisé.'}, status=403)
        try:
            updated = reject_reservation(reservation.id)
            return Response(
                ReservationSerializer(updated, context={'request': request}).data
            )
        except Exception as exc:
            return Response({'error': str(exc)}, status=400)

    @action(detail=True, methods=['post'], url_path='cancel',
            permission_classes=[permissions.IsAuthenticated])
    def cancel(self, request, pk=None):
        reservation = self._get_unscoped_reservation(pk)
        try:
            updated = cancel_reservation(reservation.id, request.user)
            return Response(
                ReservationSerializer(updated, context={'request': request}).data
            )
        except Exception as exc:
            return Response({'error': str(exc)}, status=400)

    @action(detail=True, methods=['get'], url_path='bill',
            permission_classes=[permissions.IsAuthenticated])
    def download_bill(self, request, pk=None):
        reservation = self._get_unscoped_reservation(pk)
        user = request.user
        if reservation.user != user and reservation.room_category.estate.owner != user and not user.is_staff and user.user_type != 'admin':
            return Response({'error': 'Non autorisé.'}, status=403)
        try:
            inv = reservation.invoice
            if inv and inv.pdf_file:
                url = inv.pdf_file.url
                if not url.startswith('http'):
                    url = request.build_absolute_uri(url)
                return Response({'bill_url': url, 'invoice_id': inv.invoice_id})
        except Exception:
            pass
        return Response({'bill_url': None, 'message': 'Facture non encore générée.'}, status=202)



class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def get_queryset(self):
        user = self.request.user
        qs = Invoice.objects.all().select_related('reservation__room_category__estate', 'reservation__user')
        if user.is_staff or user.is_superuser or user.user_type == 'admin':
            return qs
        if user.user_type == 'owner':
            return qs.filter(reservation__room_category__estate__owner=user)
        return qs.filter(reservation__user=user)


class EquipmentViewSet(viewsets.ModelViewSet):
    queryset           = Equipment.objects.all().order_by('part_name')
    serializer_class   = EquipmentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def create(self, request, *args, **kwargs):
        name = request.data.get('part_name')
        if name:
            existing = Equipment.objects.filter(part_name__iexact=name).first()
            if existing:
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save()


class SupplementViewSet(viewsets.ModelViewSet):
    queryset           = Supplement.objects.all().select_related('estate')
    serializer_class   = SupplementSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def get_queryset(self):
        qs = Supplement.objects.all().select_related('estate')
        eid = self.request.query_params.get('estate')
        if eid:
            qs = qs.filter(estate_id=eid)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class RoomEquipmentViewSet(viewsets.ModelViewSet):
    queryset           = RoomEquipment.objects.all().select_related('room_category', 'equipment')
    serializer_class   = RoomEquipmentWriteSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class CharacteristicViewSet(viewsets.ModelViewSet):
    queryset           = Characteristic.objects.all().order_by('name')
    serializer_class   = CharacteristicSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsVerifiedOwner()]

    def create(self, request, *args, **kwargs):
        name = request.data.get('name')
        if name:
            existing = Characteristic.objects.filter(name__iexact=name).first()
            if existing:
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)


# Payment APIs

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def cinetpay_notify_view(request):
    transaction_id = (
        request.data.get('cpm_trans_id')
        or request.data.get('transaction_id')
        or request.POST.get('cpm_trans_id')
    )
    if not transaction_id:
        return Response({'error': 'transaction_id manquant.'}, status=400)
    try:
        payment = Payment.objects.get(transaction_id=transaction_id)
    except Payment.DoesNotExist:
        return Response({'error': 'Paiement introuvable.'}, status=404)
    if payment.status == 'success':
        return Response({'status': 'already_processed'}, status=200)
    try:
        verify_data = verify_payment(transaction_id)
    except Exception as e:
        return Response({'error': 'Erreur de vérification.'}, status=502)
    payment.raw_notify = verify_data
    cinetpay_status = verify_data.get('data', {}).get('status', '')
    payment.cinetpay_id    = verify_data.get('data', {}).get('operator_id', '')
    payment.payment_method = verify_data.get('data', {}).get('payment_method', '')
    if cinetpay_status == 'ACCEPTED':
        payment.status = 'success'
        payment.save()
        order = payment.order
        if order and order.status == 'pending_payment':
            order.status = 'pending'
            order.save(update_fields=['status'])
            from .notifications_utils import notify_user
            try:
                notify_user(
                    user=order.estate.owner,
                    n_type='new_booking',
                    title_key='notification.new_booking_title',
                    body_key='notification.new_booking_body',
                    body_params={'estate': order.estate.name, 'client': order.name},
                    link='/dashboard',
                )
            except: pass
    else:
        payment.status = 'failed'
        payment.save()
        order = payment.order
        if order and order.status == 'pending_payment':
            order.status = 'payment_failed'
            order.save(update_fields=['status'])
    return Response({'status': 'ok'}, status=200)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def payment_status_view(request, transaction_id):
    try:
        payment = Payment.objects.get(transaction_id=transaction_id, user=request.user)
    except Payment.DoesNotExist:
        return Response({'error': 'Paiement introuvable.'}, status=404)
    return Response({
        'transaction_id': payment.transaction_id,
        'status':         payment.status,
        'amount':         payment.amount,
        'order_id':       payment.order_id,
        'order_status':   payment.order.status if payment.order else None,
        'payment_method': payment.payment_method,
        'created_at':     payment.created_at.isoformat(),
    })


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN — MONITORING, LOGS, MOTS BANNIS
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsEyangAdmin])
def admin_monitoring_view(request):
    """
    État en temps réel du système :
    - Base de données (nombre d'erreurs récentes)
    - Utilisateurs en ligne
    - Erreurs des dernières 24h
    - WebSocket (via présence)
    """
    from django.db import connection
    from datetime import timedelta

    now = timezone.now()
    last_24h = now - timedelta(hours=24)
    last_1h  = now - timedelta(hours=1)

    # DB health check
    db_ok = True
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
    except Exception:
        db_ok = False

    # System logs stats
    errors_24h = SystemLog.objects.filter(created_at__gte=last_24h, level='ERROR').count()
    errors_1h  = SystemLog.objects.filter(created_at__gte=last_1h,  level='ERROR').count()
    warnings_24h = SystemLog.objects.filter(created_at__gte=last_24h, level='WARNING').count()

    # Online users
    try:
        from .consumers import ONLINE_USERS
        online_count = len(ONLINE_USERS)
    except Exception:
        online_count = 0

    # Recent system logs
    recent_logs = SystemLog.objects.order_by('-created_at')[:20]
    logs_data = [
        {
            'id': l.id,
            'level': l.level,
            'category': l.category,
            'message': l.message[:200],
            'created_at': l.created_at.isoformat(),
        }
        for l in recent_logs
    ]

    return Response({
        'db': {'status': 'ok' if db_ok else 'error'},
        'online_users': online_count,
        'errors': {'last_24h': errors_24h, 'last_1h': errors_1h},
        'warnings_24h': warnings_24h,
        'recent_logs': logs_data,
    })


@api_view(['GET'])
@permission_classes([IsEyangAdmin])
def admin_system_logs_view(request):
    """Liste paginée des logs système (erreurs, warnings, infos)."""
    level    = request.query_params.get('level', '')       # ERROR, WARNING, INFO…
    category = request.query_params.get('category', '')    # server, websocket, email…
    limit    = int(request.query_params.get('limit', 50))

    qs = SystemLog.objects.order_by('-created_at')
    if level:
        qs = qs.filter(level=level.upper())
    if category:
        qs = qs.filter(category__icontains=category)
    qs = qs[:limit]

    data = [
        {
            'id': l.id, 'level': l.level, 'category': l.category,
            'message': l.message, 'traceback': l.traceback,
            'created_at': l.created_at.isoformat(),
        }
        for l in qs
    ]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsEyangAdmin])
def admin_audit_logs_view(request):
    """Liste paginée des logs d'audit (connexions, actions utilisateurs)."""
    action_filter = request.query_params.get('action', '')
    result_filter = request.query_params.get('result', '')  # SUCCESS ou FAILURE
    limit         = int(request.query_params.get('limit', 50))

    qs = AuditLog.objects.select_related('user').order_by('-created_at')
    if action_filter:
        qs = qs.filter(action__icontains=action_filter)
    if result_filter:
        qs = qs.filter(result=result_filter.upper())
    qs = qs[:limit]

    data = [
        {
            'id': l.id,
            'user': l.user.username if l.user else 'anonyme',
            'user_email': l.user.email if l.user else None,
            'action': l.action, 'result': l.result,
            'ip_address': l.ip_address, 'details': l.details,
            'created_at': l.created_at.isoformat(),
        }
        for l in qs
    ]
    return Response(data)


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsEyangAdmin])
def admin_banned_words_view(request):
    """CRUD pour les mots bannis."""
    if request.method == 'GET':
        words = BannedWord.objects.order_by('word')
        return Response([
            {'id': w.id, 'word': w.word, 'created_at': w.created_at.isoformat()}
            for w in words
        ])

    if request.method == 'POST':
        word = (request.data.get('word') or '').strip().lower()
        if not word:
            return Response({'error': 'Le mot est requis.'}, status=400)
        obj, created = BannedWord.objects.get_or_create(word=word)
        return Response(
            {'id': obj.id, 'word': obj.word, 'created': created},
            status=201 if created else 200,
        )

    if request.method == 'DELETE':
        wid = request.query_params.get('id')
        try:
            BannedWord.objects.get(pk=wid).delete()
            return Response({'deleted': True})
        except BannedWord.DoesNotExist:
            return Response({'error': 'Mot introuvable.'}, status=404)

