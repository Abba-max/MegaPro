from django.core.serializers import serialize
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.utils.dateformat import format as date_format
# API endpoint for estate reviews (GET)
from .models import Review, Estate
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
import json
from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse
from django.contrib.auth.models import User, auth
from django.contrib import messages 
from .models import Feature, Estate, Review, Global_user, QuickOrder, ContactRequest
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .forms import CommentForm
from django.db.models import Q

# Create your views
def index(request):
    features = Feature.objects.all()
    estates = Estate.objects.all().order_by('-publishedAt')  # Show most recently updated first
    return render(request, 'index.html', {'features': features, 'estates': estates})

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

@login_required    
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
                free=1,     
                rating='0.0',  
                price=300000,
                distance=100,
                wifi='0',
                restaurant='0',
                generator='0',
                room_size='2',
                forage='0'
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
@login_required
def dashboard(request):
    # Get all user-related data
    reservations = QuickOrder.objects.filter(name=request.user.username).order_by('-created_at')
    reviews = Review.objects.filter(name=request.user.username).order_by('-created_at')
    contacts = ContactRequest.objects.filter(name=request.user.username).order_by('-submitted_at')
    
    return render(request, 'dashboard.html', {
        'reservations': reservations,
        'reviews': reviews,
        'contacts': contacts
    })

@login_required
def delete_reservation(request, id):
    if request.method == 'POST':
        reservation = get_object_or_404(QuickOrder, id=id, name=request.user.username)
        reservation.delete()
        return JsonResponse({'success': True})
    return JsonResponse({'success': False})

@login_required
def delete_review(request, id):
    if request.method == 'POST':
        review = get_object_or_404(Review, id=id, name=request.user.username)
        review.delete()
        return JsonResponse({'success': True})
    return JsonResponse({'success': False})

@login_required
def delete_contact(request, id):
    if request.method == 'POST':
        contact = get_object_or_404(ContactRequest, id=id, name=request.user.username)
        contact.delete()
        return JsonResponse({'success': True})
    return JsonResponse({'success': False})

@login_required
def edit_review(request, id):
    review = get_object_or_404(Review, id=id, name=request.user.username)
    
    if request.method == 'POST':
        rating = request.POST.get('rating')
        comment = request.POST.get('comment', '')
        
        if not rating:
            messages.error(request, "Please select a rating.")
            return render(request, 'review.html', {
                'estate_name': review.estate.name,
                'review': review
            })
        
        try:
            rating = int(rating)
        except ValueError:
            messages.error(request, "Invalid rating selected.")
            return render(request, 'review.html', {
                'estate_name': review.estate.name,
                'review': review
            })
        
        review.rating = rating
        review.comment = comment
        review.save()
        
        messages.success(request, "Review updated successfully!")
        return redirect('dashboard')
    
    return render(request, 'review.html', {
        'estate_name': review.estate.name,
        'review': review
    })

@csrf_exempt
def estate_reviews_api(request):
    estate_id = request.GET.get('estate_id')
    
    if not estate_id:
        return JsonResponse({'error': 'Missing estate_id'}, status=4)
    try:
     estate = Estate.objects.filter(name__iexact=estate_id).first()
     if not estate:
        return JsonResponse({'error': 'Estate not found'}, status=404)
    except Estate.DoesNotExist:
        return JsonResponse({'error': 'Estate not found'}, status=404)
    
    # Get all top-level reviews (not replies) without pagination
    reviews = Review.objects.filter(estate=estate, parent__isnull=True).order_by('-created_at')
    
    data = []
    for r in reviews:
        data.append({
            'id': r.id,
            'author': r.name,
            'created_at': date_format(r.created_at, 'Y-m-d H:i'),
            'text': r.comment,
            'rating': r.rating,
            'likes': r.likes.count(),
            'likedByCurrentUser': request.user.is_authenticated and r.likes.filter(id=request.user.id).exists(),
            'replies': [
                {
                    'id': reply.id,
                    'author': reply.name,
                    'created_at': date_format(reply.created_at, 'Y-m-d H:i'),
                    'text': reply.comment,
                    'likes': reply.likes.count(),
                    'likedByCurrentUser': request.user.is_authenticated and reply.likes.filter(id=request.user.id).exists()
                }
                for reply in r.replies.all().order_by('created_at')
            ]
        })
    
    return JsonResponse({
        'reviews': data,
        'total': reviews.count()
    }, safe=False)
@csrf_exempt
@require_POST
@login_required
def like_review(request):
    try:
        data = json.loads(request.body)
        review_id = data.get('review_id')
        review = get_object_or_404(Review, id=review_id)
        
        if review.likes.filter(id=request.user.id).exists():
            review.likes.remove(request.user)
            liked = False
        else:
            review.likes.add(request.user)
            liked = True
            
        return JsonResponse({
            'success': True,
            'likes': review.likes.count(),
            'liked': liked
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@csrf_exempt
@require_POST
@login_required
def reply_review(request):
    try:
        data = json.loads(request.body)
        parent_id = data.get('parent_id')
        text = data.get('text')
        
        parent = get_object_or_404(Review, id=parent_id)
        estate = parent.estate
        
        reply = Review.objects.create(
            estate=estate,
            parent=parent,
            name=request.user.username,
            rating=0,  # Replies don't need ratings
            comment=text
        )
        
        return JsonResponse({
            'success': True,
            'reply': {
                'id': reply.id,
                'author': reply.name,
                'created_at': date_format(reply.created_at, 'Y-m-d H:i'),
                'text': reply.comment,
                'likes': 0,
                'likedByCurrentUser': False
            }
        })
    except Exception as e:
      return JsonResponse({'success': False, 'error': str(e)}, status=400)
@csrf_exempt
def current_user(request):
    if request.user.is_authenticated:
        return JsonResponse({
            'username': request.user.username,
            'is_authenticated': True
        })
    return JsonResponse({
        'username': None,
        'is_authenticated': False
    })

@csrf_exempt
def estates_api(request):
    estates = Estate.objects.all()
    data = []
    for estate in estates:
        images = [img.image.url for img in estate.images.all()]
        data.append({
            'id': estate.id,
            'name': estate.name,
            'Capacity': estate.capacity,
            'Free_Rooms': estate.free,
            'Price': estate.price,
            'Distance': estate.distance,
            'WIFI': 'YES' if estate.wifi == '1' else 'NO',
            'Restaurant': 'YES' if estate.restaurant == '1' else 'NO',
            'Generator': 'YES' if estate.generator == '1' else 'NO',
            'Space': dict(Estate._meta.get_field('room_size').choices).get(estate.room_size, ''),
            'description': estate.description,
            'images': images,
            'rating': estate.rating,
            'publishedAt': estate.publishedAt.isoformat(),  # <-- Add this line
        })
    return JsonResponse({'estates': data})