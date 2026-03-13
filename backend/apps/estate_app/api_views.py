from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Estate, EstateImage, Review, QuickOrder, ContactRequest, Conversation, Message, User
from .serializers import (
    EstateSerializer, EstateImageSerializer, ReviewSerializer, QuickOrderSerializer,
    ContactRequestSerializer, RegisterSerializer,
    MyTokenObtainPairSerializer, UserSerializer,
    ConversationSerializer, MessageSerializer,
)
from .permissions import IsVerifiedOwner


# ══════════════════════════════════════════════════════════════
#  Auth
# ══════════════════════════════════════════════════════════════

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        print(f"DEBUG: Register validation failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    user = serializer.save()
    refresh = MyTokenObtainPairSerializer.get_token(user)
    return Response({
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me_view(request):
    user = request.user
    data = UserSerializer(user, context={'request': request}).data
    
    # Direct role access from user_type
    if user.is_staff or user.is_superuser:
        data['role'] = 'Admin'
    elif user.user_type == 'owner':
        data['role'] = 'Owner'
    else:
        role_map = {'1': 'Student', '2': 'Parent', '3': 'Local resident', '4': 'Visitor'}
        data['role'] = role_map.get(user.visitor_category, 'Student')
    
    data['phone']   = user.contact or ''
    data['address'] = user.address or ''
    
    full_name        = f"{user.first_name} {user.last_name}".strip() or user.username
    data['name']     = full_name
    data['initials'] = ''.join(w[0].upper() for w in full_name.split()[:2]) or '??'
    return Response(data)


# ══════════════════════════════════════════════════════════════
#  Estates
# ══════════════════════════════════════════════════════════════

class EstateViewSet(viewsets.ModelViewSet):
    queryset           = Estate.objects.all().prefetch_related('images')
    serializer_class   = EstateSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    # Support multipart for image-included creates/updates
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = Estate.objects.all().prefetch_related('images')
        p  = self.request.query_params
        if loc  := p.get('location'):   qs = qs.filter(location__icontains=loc)
        if st   := p.get('status'):     qs = qs.filter(status=st)
        if wifi := p.get('wifi'):       qs = qs.filter(wifi=wifi)
        if gen  := p.get('generator'):  qs = qs.filter(generator=gen)
        if fog  := p.get('forage'):     qs = qs.filter(forage=fog)
        if rst  := p.get('restaurant'): qs = qs.filter(restaurant=rst)
        if tv   := p.get('tv'):         qs = qs.filter(tv=tv)
        if fri  := p.get('fridge'):     qs = qs.filter(fridge=fri)
        if mn   := p.get('min_price'):  qs = qs.filter(price__gte=mn)
        if mx   := p.get('max_price'):  qs = qs.filter(price__lte=mx)
        if rs   := p.get('room_size'):  qs = qs.filter(room_size=rs)
        if mxd  := p.get('max_dist'):   qs = qs.filter(distance__lte=mxd)
        if p.get('mine') == '1' and self.request.user.is_authenticated:
            qs = qs.filter(owner=self.request.user)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def perform_create(self, serializer):
        # Additional check for owners
        if self.request.user.user_type == 'owner' and not self.request.user.is_verified:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Votre compte n'est pas encore vérifié. Vous ne pouvez pas publier d'annonces.")
            
        owner = self.request.user if self.request.user.is_authenticated else None
        serializer.save(owner=owner)

    # ── POST /api/estates/{id}/images/  →  upload one or more images ──
    @action(
        detail=True, methods=['post'],
        url_path='images',
        permission_classes=[permissions.IsAuthenticated],
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_images(self, request, pk=None):
        estate = self.get_object()
        # Only the owner (or admin) may upload images
        if estate.owner != request.user and not request.user.is_staff:
            return Response({'error': 'Non autorisé.'}, status=403)

        files = request.FILES.getlist('images')
        if not files:
            return Response({'error': 'Aucune image fournie.'}, status=400)

        created = []
        for f in files:
            img = EstateImage.objects.create(estate=estate, image=f)
            created.append(EstateImageSerializer(img, context={'request': request}).data)

        return Response(created, status=201)

    # ── DELETE /api/estates/{id}/images/{image_id}/  →  remove one image ──
    @action(
        detail=True, methods=['delete'],
        url_path=r'images/(?P<image_id>\d+)',
        permission_classes=[permissions.IsAuthenticated],
    )
    def delete_image(self, request, pk=None, image_id=None):
        estate = self.get_object()
        if estate.owner != request.user and not request.user.is_staff:
            return Response({'error': 'Non autorisé.'}, status=403)
        try:
            img = EstateImage.objects.get(pk=image_id, estate=estate)
        except EstateImage.DoesNotExist:
            return Response({'error': 'Image introuvable.'}, status=404)
        img.image.delete(save=False)   # remove file from disk
        img.delete()
        return Response(status=204)


# ══════════════════════════════════════════════════════════════
#  Reviews
# ══════════════════════════════════════════════════════════════

class ReviewViewSet(viewsets.ModelViewSet):
    queryset           = Review.objects.all()
    serializer_class   = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def get_queryset(self):
        qs = Review.objects.all().select_related('estate').prefetch_related('likes')
        p  = self.request.query_params
        if eid := p.get('estate'):
            qs = qs.filter(estate_id=eid)
        if p.get('mine') == '1' and self.request.user.is_authenticated:
            qs = qs.filter(estate__owner=self.request.user)
        if p.get('client') == '1' and self.request.user.is_authenticated:
            qs = qs.filter(user=self.request.user)
        return qs

    @action(detail=True, methods=['post'], url_path='like',
            permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        review = self.get_object()
        user   = request.user
        if review.likes.filter(pk=user.pk).exists():
            review.likes.remove(user)
            liked = False
        else:
            review.likes.add(user)
            liked = True
        return Response({'liked': liked, 'likes_count': review.likes.count()})


# ══════════════════════════════════════════════════════════════
#  Quick Orders
# ══════════════════════════════════════════════════════════════

class QuickOrderViewSet(viewsets.ModelViewSet):
    queryset           = QuickOrder.objects.all()
    serializer_class   = QuickOrderSerializer
    permission_classes = [permissions.AllowAny]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def get_queryset(self):
        qs = QuickOrder.objects.all().select_related('estate').order_by('-created_at')
        p  = self.request.query_params
        if p.get('mine') == '1' and self.request.user.is_authenticated:
            qs = qs.filter(estate__owner=self.request.user)
        if p.get('client') == '1' and self.request.user.is_authenticated:
            qs = qs.filter(user=self.request.user)
        return qs


# ══════════════════════════════════════════════════════════════
#  Contact Requests
# ══════════════════════════════════════════════════════════════

class ContactRequestViewSet(viewsets.ModelViewSet):
    queryset           = ContactRequest.objects.all()
    serializer_class   = ContactRequestSerializer
    permission_classes = [permissions.AllowAny]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def get_queryset(self):
        qs = ContactRequest.objects.all().order_by('-submitted_at')
        p  = self.request.query_params
        if p.get('client') == '1' and self.request.user.is_authenticated:
            qs = qs.filter(user=self.request.user)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"message": "Message envoyé avec succès.", "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )


# ══════════════════════════════════════════════════════════════
#  Conversations & Messages
# ══════════════════════════════════════════════════════════════

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class   = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def get_queryset(self):
        user = self.request.user
        return Conversation.objects.filter(Q(client=user) | Q(owner=user)).order_by('-updated_at')

    def create(self, request, *args, **kwargs):
        estate_id = request.data.get('estate_id')
        owner_id  = request.data.get('owner_id')
        if not estate_id or not owner_id:
            return Response({'error': 'estate_id and owner_id are required.'}, status=400)
        try:
            estate = Estate.objects.get(pk=estate_id)
            owner  = User.objects.get(pk=owner_id)
        except (Estate.DoesNotExist, User.DoesNotExist):
            return Response({'error': 'Estate or owner not found.'}, status=404)
        conv, created = Conversation.objects.get_or_create(
            client=request.user, owner=owner, estate=estate,
        )
        serializer = self.get_serializer(conv)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='messages')
    def send_message(self, request, pk=None):
        conv = self.get_object()
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'error': 'Message text is required.'}, status=400)
        msg = Message.objects.create(conversation=conv, sender=request.user, text=text)
        conv.save()
        conv.messages.filter(read=False).exclude(sender=request.user).update(read=True)
        return Response(MessageSerializer(msg, context={'request': request}).data, status=201)

    @action(detail=True, methods=['post'], url_path='read')
    def mark_read(self, request, pk=None):
        conv = self.get_object()
        conv.messages.filter(read=False).exclude(sender=request.user).update(read=True)
        return Response({'status': 'ok'})


# ══════════════════════════════════════════════════════════════
#  Public stats
# ══════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def stats_view(request):
    return Response({
        'estates':  Estate.objects.filter(status='published').count(),
        'users':    User.objects.filter(is_active=True).count(),
        'reviews':  Review.objects.count(),
        'campuses': Estate.objects.filter(status='published').values('location').distinct().count(),
        'orders':   QuickOrder.objects.count(),
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def owner_stats_view(request):
    estates = Estate.objects.filter(owner=request.user)
    orders  = QuickOrder.objects.filter(estate__owner=request.user)
    total_cap  = sum(e.capacity for e in estates)
    total_free = sum(e.free     for e in estates)
    occupied   = total_cap - total_free
    occ_pct    = round((occupied / total_cap) * 100) if total_cap > 0 else 0
    ratings    = [float(e.rating) for e in estates if e.rating and float(e.rating) > 0]
    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else 0
    return Response({
        'total_estates':  estates.count(),
        'occupancy_pct':  occ_pct,
        'pending_orders': orders.count(),
        'avg_rating':     avg_rating,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def client_stats_view(request):
    user = request.user
    return Response({
        'total_reservations': QuickOrder.objects.filter(user=user).count(),
        'total_reviews':      Review.objects.filter(user=user).count(),
        'total_messages':     Message.objects.filter(sender=user).count(),
        'total_contacts':     ContactRequest.objects.filter(user=user).count(),
    })


# ══════════════════════════════════════════════════════════════
#  Admin: overview stats
# ══════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def admin_stats_view(request):
    total_users   = User.objects.filter(is_active=True).count()
    total_estates = Estate.objects.count()
    total_orders  = QuickOrder.objects.count()
    total_reviews = Review.objects.count()

    recent_orders  = QuickOrder.objects.select_related('estate').order_by('-created_at')[:5]
    recent_reviews = Review.objects.select_related('estate').order_by('-created_at')[:5]

    activities = []
    for o in recent_orders:
        activities.append({
            'type': 'order', 'title': f"Réservation : {o.estate.name}",
            'subtitle': o.name, 'created_at': o.created_at.isoformat(),
        })
    for r in recent_reviews:
        activities.append({
            'type': 'review', 'title': f"Avis sur : {r.estate.name}",
            'subtitle': r.name, 'created_at': r.created_at.isoformat(),
        })
    activities.sort(key=lambda x: x['created_at'], reverse=True)

    from django.db.models import Count
    from django.db.models.functions import TruncMonth
    from datetime import datetime, timedelta
    six_months_ago = datetime.now() - timedelta(days=180)
    monthly = (
        QuickOrder.objects.filter(created_at__gte=six_months_ago)
        .annotate(month=TruncMonth('created_at'))
        .values('month').annotate(count=Count('id')).order_by('month')
    )
    return Response({
        'total_users': total_users, 'total_estates': total_estates,
        'total_orders': total_orders, 'total_reviews': total_reviews,
        'recent_activities': activities[:8],
        'monthly_orders': [{'month': m['month'].strftime('%b'), 'value': m['count']} for m in monthly],
    })


# ══════════════════════════════════════════════════════════════
#  Admin: ALL bookings  GET /api/admin/bookings/
# ══════════════════════════════════════════════════════════════

@api_view(['GET', 'DELETE'])
@permission_classes([permissions.IsAdminUser])
def admin_bookings_view(request):
    if request.method == 'DELETE':
        bid = request.query_params.get('id')
        try:
            QuickOrder.objects.get(pk=bid).delete()
            return Response({'deleted': True})
        except QuickOrder.DoesNotExist:
            return Response({'error': 'Réservation introuvable.'}, status=404)

    orders = QuickOrder.objects.select_related('estate', 'user').order_by('-created_at')
    result = []
    for o in orders:
        result.append({
            'id': o.id, 'estate': o.estate_id,
            'estate_name': o.estate.name,
            'name': o.name, 'phone': o.phone, 'note': o.note,
            'created_at': o.created_at.isoformat(),
            'user_email': o.user.email if o.user else None,
        })
    return Response(result)


# ══════════════════════════════════════════════════════════════
#  Admin: ALL reviews  GET /api/admin/reviews/
# ══════════════════════════════════════════════════════════════

@api_view(['GET', 'DELETE'])
@permission_classes([permissions.IsAdminUser])
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
        result.append({
            'id': r.id, 'estate': r.estate_id,
            'estate_name': r.estate.name,
            'name': r.name, 'rating': r.rating, 'comment': r.comment,
            'created_at': r.created_at.isoformat(),
            'user_email': r.user.email if r.user else None,
        })
    return Response(result)


# ══════════════════════════════════════════════════════════════
#  Admin: contact requests  GET /api/admin/contacts/
# ══════════════════════════════════════════════════════════════

@api_view(['GET', 'DELETE'])
@permission_classes([permissions.IsAdminUser])
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
        result.append({
            'id': c.id, 'estate': c.estate_id,
            'estate_name': c.estate.name if c.estate else None,
            'name': c.name, 'email': c.email, 'phone': c.phone,
            'message': c.message, 'submitted_at': c.submitted_at.isoformat(),
        })
    return Response(result)


# ══════════════════════════════════════════════════════════════
#  Admin: users
# ══════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def admin_users_view(request):
    users = User.objects.all().order_by('-date_joined')
    
    # Filter for verification queue
    pending_only = request.query_params.get('pending_only') == '1'
    if pending_only:
        users = users.filter(user_type='owner', is_verified=False).exclude(id_card='')
        
    color_map = {'Étudiant': '#3B82F6', 'Parent': '#8B5CF6', 'Propriétaire': '#10B981', 'Admin': '#EF4444'}
    result = []
    for u in users:
        if u.is_staff or u.is_superuser:
            role = 'Admin'
        elif u.user_type == 'owner':
            role = 'Propriétaire'
        else:
            role_map = {'1': 'Étudiant', '2': 'Parent', '3': 'Résident', '4': 'Visiteur'}
            role = role_map.get(u.visitor_category, 'Étudiant')
            
        name = f"{u.first_name} {u.last_name}".strip() or u.username
        initials = ''.join(w[0].upper() for w in name.split()[:2]) or '??'
        result.append({
            'id': u.id, 'name': name, 'email': u.email or u.username,
            'type': role, 'active': u.is_active, 'initials': initials,
            'color': color_map.get(role, '#64748B'),
            'joined': u.date_joined.strftime('%d/%m/%Y'),
            'is_verified': u.is_verified,
            'id_card': request.build_absolute_uri(u.id_card.url) if u.id_card else None,
            'phone': u.contact
        })
    return Response(result)


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def admin_verify_owner_view(request, user_id):
    """POST /api/admin/users/<id>/verify/  — Approve or reject owner"""
    try:
        user = User.objects.get(pk=user_id, user_type='owner')
    except User.DoesNotExist:
        return Response({'error': 'Compte bailleur introuvable.'}, status=404)

    action = request.data.get('action') # 'approve' or 'reject'
    if action == 'approve':
        user.is_verified = True
        user.save()
        return Response({'id': user.id, 'is_verified': True})
    elif action == 'reject':
        user.is_verified = False
        # Optional: delete the ID card to allow re-upload
        if user.id_card:
            user.id_card.delete(save=False)
        user.save()
        return Response({'id': user.id, 'is_verified': False, 'rejected': True})
    
    return Response({'error': 'Action invalide.'}, status=400)


@api_view(['PATCH'])
@permission_classes([permissions.IsAdminUser])
def admin_toggle_user_view(request, user_id):
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable.'}, status=404)
    user.is_active = not user.is_active
    user.save()
    return Response({'id': user.id, 'active': user.is_active})

    if user == request.user:
        return Response({'error': 'Vous ne pouvez pas supprimer votre propre compte.'}, status=400)

    user.delete()
    return Response({'deleted': True, 'id': user_id})


@api_view(['PATCH'])
@permission_classes([permissions.IsAdminUser])
def admin_update_user_view(request, user_id):
    """PATCH /api/admin/users/<id>/update/  — update name, email, password"""
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable.'}, status=404)

    if 'first_name' in request.data:
        user.first_name = request.data['first_name']
    if 'last_name' in request.data:
        user.last_name = request.data['last_name']
    if 'email' in request.data:
        user.email = request.data['email']
    if 'password' in request.data and request.data['password']:
        user.password = make_password(request.data['password'])

    user.save()
    return Response({
        'id':         user.id,
        'name':       f"{user.first_name} {user.last_name}".strip() or user.username,
        'email':      user.email,
        'is_active':  user.is_active,
    })


@api_view(['DELETE'])
@permission_classes([permissions.IsAdminUser])
def admin_delete_user_view(request, user_id):
    """DELETE /api/admin/users/<id>/delete/"""
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable.'}, status=404)

    if user == request.user:
        return Response({'error': 'Vous ne pouvez pas supprimer votre propre compte.'}, status=400)

    user.delete()
    return Response({'deleted': True, 'id': user_id})