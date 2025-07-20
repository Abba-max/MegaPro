from django.shortcuts import render,redirect
from django.http import HttpResponse
from django.contrib.auth.models import User,auth
from django.contrib import messages 
from .models import Feature
from .models import Estate
from .models import Recentposts
from .models import Estate, Review, Global_user
from django.contrib.auth.decorators import login_required
from .models import QuickOrder
from django.contrib import messages
from .models import ContactRequest
# from django.core.files.storage import default_storage
from .forms import CommentForm

# Create your view
def index(request):
    features= Feature.objects.all()
    estates= Estate.objects.all()
    recent= Recentposts.objects.all()
    return render(request, 'index.html', {'features': features,'estates':estates, 'recent' :recent,})


# def estates(request):


#     context = {


#     'estates': Estate.objects.all(),


#     }


#     return render(request, 'Estates.html',context)



def registration(request):
    if request.method == 'POST':
        username = request.POST['username']
        email = request.POST['email']
        password = request.POST.get('password')
        password1 = request.POST.get('password1')
        if password==password1:
          if User.objects.filter(email=email).exists():
            messages.info(request, 'Email Already Used')
            return redirect('registration')
          elif User.objects.filter(username=username).exists():
            messages.info(request, 'Username Already Used')
            return redirect('/registration')
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
    if request.method =='POST':
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

# from django.core.files.storage import default_storage

# def post(request, pk):
#     if request.method == 'POST':
#         estate = Estate.objects.get(id=pk)
#         # if 'pic' in request.FILES:
#         #     estate.pic = request.FILES['pic']
#         #     estate.save()
#     estate = Estate.objects.get(id=pk)
#     return render(request, 'post.html', {'estates': estate})
  
# def rpost(request, pk):
#   recent = Recentposts.objects.get(id=pk)
#   return render(request, 'rpost.html', {'recent': recent})
# def review_view(request):
#     estate_name = request.GET.get('estate', 'Estate')
#     if request.method == 'POST':
#         name = request.POST['name']
#         rating = int(request.POST['rating'])
#         comment = request.POST['comment']
#         estate, created = Estate.objects.get_or_create(name=estate_name)
#         Review.objects.create(estate=estate, name=name, rating=rating, comment=comment)
#         messages.success(request, "Review submitted successfully!")
#         return redirect('index')  
#     return render(request, 'review.html', {'estate_name': estate_name})
@login_required
def quick_order_view(request):
    if request.method == 'POST':
        QuickOrder.objects.create(
            name=request.POST['name'],
            phone=request.POST['phone'],
            note=request.POST.get('note', '')
        )
        messages.success(request, "Your order has been placed!")
        return redirect('index')
    return render(request, 'quick_order.html')
@login_required
def contact_view(request):
    if request.method == 'POST':
        ContactRequest.objects.create(
            name=request.POST['name'],
            email=request.POST['email'],
            phone=request.POST['phone'],
            message=request.POST['message']
        )
        messages.success(request, "Thanks! Your message was sent.")
        return redirect('index')
    return render(request, 'contact.html')