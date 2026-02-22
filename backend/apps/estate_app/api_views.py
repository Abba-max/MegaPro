from rest_framework import viewsets, permissions
from .models import Estate, Review, QuickOrder
from .serializers import EstateSerializer, ReviewSerializer, QuickOrderSerializer

class EstateViewSet(viewsets.ModelViewSet):
    queryset = Estate.objects.all().prefetch_related('images')
    serializer_class = EstateSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        # Automatically set the owner to the logged-in user
        if self.request.user.is_authenticated:
            serializer.save(owner=self.request.user)
        else:
            serializer.save()

class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny] # Anyone can read/post reviews for now

class QuickOrderViewSet(viewsets.ModelViewSet):
    queryset = QuickOrder.objects.all()
    serializer_class = QuickOrderSerializer
    permission_classes = [permissions.AllowAny]