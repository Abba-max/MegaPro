from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Estate, Review, QuickOrder, ContactRequest, Global_user
from .serializers import (
    EstateSerializer, ReviewSerializer, QuickOrderSerializer,
    ContactRequestSerializer, RegisterSerializer,
    MyTokenObtainPairSerializer, UserSerializer,
)



class MyTokenObtainPairView(TokenObtainPairView):
    """Remplace la vue JWT par défaut pour injecter nos claims custom."""
    serializer_class = MyTokenObtainPairSerializer


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    """
    Crée un compte et retourne directement les tokens JWT.
    Body: { username, email, password, first_name, last_name, phone, role }
    Response: { access, refresh }
    """
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()

    # Générer tokens avec notre serializer enrichi
    refresh = MyTokenObtainPairSerializer.get_token(user)
    return Response({
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
    }, status=status.HTTP_201_CREATED)



@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me_view(request):
    """Retourne le profil complet de l'utilisateur connecté."""
    user = request.user
    data = UserSerializer(user).data

    role_map = {'1': 'Student', '2': 'Parent', '3': 'Owner'}
    try:
        gu = user.global_user
        data['role']    = 'Admin' if (user.is_staff or user.is_superuser) else role_map.get(gu.status, 'Student')
        data['phone']   = gu.contact  or ''
        data['address'] = gu.address  or ''
    except Global_user.DoesNotExist:
        data['role'] = 'Admin' if (user.is_staff or user.is_superuser) else 'Student'

    full_name        = f"{user.first_name} {user.last_name}".strip() or user.username
    data['name']     = full_name
    data['initials'] = ''.join(w[0].upper() for w in full_name.split()[:2]) or '??'
    return Response(data)




class EstateViewSet(viewsets.ModelViewSet):
    queryset           = Estate.objects.all().prefetch_related('images')
    serializer_class   = EstateSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Estate.objects.all().prefetch_related('images')
        p  = self.request.query_params

        if loc  := p.get('location'):   qs = qs.filter(location__icontains=loc)
        if st   := p.get('status'):     qs = qs.filter(status=st)
        if wifi := p.get('wifi'):       qs = qs.filter(wifi=wifi)
        if gen  := p.get('generator'):  qs = qs.filter(generator=gen)
        if fog  := p.get('forage'):     qs = qs.filter(forage=fog)
        if mn   := p.get('min_price'):  qs = qs.filter(price__gte=mn)
        if mx   := p.get('max_price'):  qs = qs.filter(price__lte=mx)
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        owner = self.request.user if self.request.user.is_authenticated else None
        serializer.save(owner=owner)




class ReviewViewSet(viewsets.ModelViewSet):
    queryset           = Review.objects.all()
    serializer_class   = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Review.objects.all()
        if eid := self.request.query_params.get('estate'):
            qs = qs.filter(estate_id=eid)
        return qs




class QuickOrderViewSet(viewsets.ModelViewSet):
    queryset           = QuickOrder.objects.all()
    serializer_class   = QuickOrderSerializer
    permission_classes = [permissions.AllowAny]




class ContactRequestViewSet(viewsets.ModelViewSet):
    queryset           = ContactRequest.objects.all()
    serializer_class   = ContactRequestSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"message": "Message envoyé avec succès.", "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )