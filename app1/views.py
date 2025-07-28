from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.contrib.auth.models import User, auth
from django.contrib import messages 
from .models import  Estate, Recentposts, Review, Global_user, QuickOrder, ContactRequest
from django.contrib.auth.decorators import login_required
from .forms import CommentForm
from django.http import JsonResponse
from .models import Estate, EstateFeature, EstateImage
from django.core.serializers import serialize
import json
from django.forms.models import model_to_dict
# Create your views
def index(request):
    estates = Estate.objects.all()
    recent = Recentposts.objects.all()
    return render(request, 'index.html', { 'estates': estates, 'recent': recent})

def get_estates_api(request):
    estates_qs = Estate.objects.all().order_by('-rating') # Sorted by rating as in your JS

    estates_data = []
    for estate in estates_qs:
        # Get features
        features = [feature.name for feature in estate.features.all()]

        # Get images
        images = [request.build_absolute_uri(image.image.url) for image in estate.images.all()]
        if not images and estate.main_image: # If no specific images but main_image exists
            images.append(request.build_absolute_uri(estate.main_image.url))

        # Construct the dictionary similar to your JS EstateData structure
        estate_dict = {
            'id': estate.id,
            'name': estate.name,
            'publishedAt': int(estate.published_at.timestamp() * 1000), # Convert to milliseconds timestamp
            'rating': estate.rating,
            'location': estate.location,
            'Capacity': estate.capacity, # Note: JS uses 'Capacity', Python 'capacity'
            'Price': estate.price,       # Note: JS uses 'Price', Python 'price'
            'Free_Rooms': estate.free_rooms, # Note: JS uses 'Free_Rooms', Python 'free_rooms'
            'Distance': estate.distance,     # Note: JS uses 'Distance', Python 'distance'
            'Space': estate.space,
            'description': estate.description,
            'WIFI': 'YES' if estate.wifi else 'NO', # Convert boolean to 'YES'/'NO'
            'Restaurant': 'YES' if estate.restaurant else 'NO',
            'Generator': 'YES' if estate.generator else 'NO',
            'TV_Fridge': 'YES' if estate.tv_fridge else 'NO',
            'Security': 'YES' if estate.security else 'NO',
            'image': request.build_absolute_uri(estate.main_image.url) if estate.main_image else '/static/assets/img/Estate Images/DJI_0071.jpg',
            'category': features, # Using the features as categories
            'images': images,
            'reviews': [], # Placeholder, you might add a Review model later
            'reservationAvailable': True # Example if you have such a field
        }
        estates_data.append(estate_dict)

    return JsonResponse(estates_data, safe=False) # safe=False allows lists as top-level JSON

def registration(request):
    if request.method == 'POST':
        username = request.POST['username']
        email = request.POST['email']
        password = request.POST.get('password')
        password1 = request.POST.get('password1')
        if password == password1:
            if User.objects.filter(email=email).exists():
                messages.info(request, 'Email Already Used')
                return redirect('registration')
            elif User.objects.filter(username=username).exists():
                messages.info(request, 'Username Already Used')
                return redirect('registration')
            else:
                user = User.objects.create_user(username=username, email=email, password=password)
                user.save()
                messages.success(request, "Registration successful! Welcome to Eyang Estate.")
                return redirect('login')
        else:
            messages.info(request, 'Password not the same')
            return redirect('registration')
    else:
        return render(request, 'registration.html')

def login(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = auth.authenticate(username=username, password=password)
        if user is not None:
            auth.login(request, user)
            messages.success(request, f"Welcome back, {user.username}!")
            return redirect('index')
        else:
            messages.error(request, "Invalid credentials.")
            return render(request, 'login.html')
    else:        
        return render(request, 'login.html')
 
def logout(request):
    auth.logout(request)
    return redirect('/')

def post(request, pk):
    estate = Estate.objects.get(id=pk)
    return render(request, 'post.html', {'estates': estate})
  
def rpost(request, pk):
    recent = Recentposts.objects.get(id=pk)
    return render(request, 'rpost.html', {'recent': recent})
def review_view(request):
    estate_name = request.GET.get('estate', 'Estate')
    
    if request.method == 'POST':
        name = request.POST.get('userName', '')
        if not name and request.user.is_authenticated:
            name = request.user.username
        elif not name:
            name = "Anonymous"
            
        rating = request.POST.get('rating')
        comment = request.POST.get('comment', '')
        
        if not rating:
            messages.error(request, "Please select a rating.")
            return render(request, 'review.html', {'estate_name': estate_name})
        
        try:
            rating = int(rating)
        except ValueError:
            messages.error(request, "Invalid rating selected.")
            return render(request, 'review.html', {'estate_name': estate_name})
        
        # Fix: Ensure all required fields have proper values
        try:
            estate = Estate.objects.get(name=estate_name)
        except Estate.DoesNotExist:
            # Create new estate with explicit non-null values
                estate = Estate.objects.create(
        name=estate_name,
        capacity=1,
        free_rooms=1, # Ensure this matches your model field
        rating=0.0,   # Make sure this is a float
        price=0.0,
        distance=0.0,
        space=0.0,
        description="Default description for a new estate.", # Make sure this matches your model
        wifi=False,
        restaurant=False,
        generator=False,
        tv_fridge=False, # Ensure this matches your model field
        security=False,
        location="Unknown", # Add a default if location is non-nullable
            )
        
        # Create the review
        Review.objects.create(
            estate=estate, 
            name=name, 
            rating=rating, 
            comment=comment
        )
        
        messages.success(request, "Review submitted successfully!")
        return redirect('index')  
    
    return render(request, 'review.html', {'estate_name': estate_name})
@login_required
def quick_order_view(request):
    estate_name = request.GET.get('estate', 'Estate') 
    if request.method == 'POST':
        QuickOrder.objects.create(
            name=request.POST.get('name', request.user.username),
            estate=request.POST.get('estate_name', estate_name),
            phone=request.POST['phone'],
            note=request.POST.get('note', '')
        )
        messages.success(request, "Your reservation has been placed!")
        return redirect('index')
    return render(request, 'quick_order.html', {'estate_name': estate_name})

def contact_view(request):
    if request.method == 'POST':
        try:
            # Get form data with fallbacks
            name = request.POST.get('name', '')
            email = request.POST.get('email', '')
            phone = request.POST.get('phone', '')
            message = request.POST.get('message', '')
            
            # Use authenticated user data as fallback
            if not name and request.user.is_authenticated:
                name = request.user.username
            if not email and request.user.is_authenticated:
                email = request.user.email
            
            # Validate required fields
            if not all([name, email, phone, message]):
                messages.error(request, "All fields are required.")
                return render(request, 'contact.html', {'user': request.user})
            
            # Create and save contact request
            contact_request = ContactRequest.objects.create(
                name=name,
                email=email,
                phone=phone,
                message=message
            )
            
            messages.success(request, "Thanks! Your message was sent successfully.")
            return redirect('index')
            
        except Exception as e:
            messages.error(request, "There was an error sending your message. Please try again.")
            return render(request, 'contact.html', {'user': request.user})
    
    # For GET requests
    return render(request, 'contact.html', {'user': request.user})