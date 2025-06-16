from django.shortcuts import render,redirect
from django.http import HttpResponse
from django.contrib.auth.models import User,auth
from django.contrib import messages 
from .models import Feature
from .models import Estate
from .models import Recentposts
# from django.core.files.storage import default_storage
from .forms import CommentForm

# Create your view
def index(request):
    features= Feature.objects.all()
    estates= Estate.objects.all()
    recent= Recentposts.objects.all()
    return render(request, 'index.html', {'features': features,'estates':estates, 'recent' :recent,})

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
            return redirect('/login')
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
            return redirect('/')
        else:
            messages.info(request, 'Credentials not valid')
            return render(request, 'login.html')
    else:        
     return render(request, 'login.html')
 
def logout(request):
      auth.logout(request)
      return redirect('/')
  
  
def post(request, pk):
    estates = Estate.objects.get(id=pk)
    commentform=CommentForm.objects.get(all)
    return render(request, 'post.html', {'estates': estates, 'commentform':commentform})

# from django.core.files.storage import default_storage

def post(request, pk):
    if request.method == 'POST':
        estate = Estate.objects.get(id=pk)
        # if 'pic' in request.FILES:
        #     estate.pic = request.FILES['pic']
        #     estate.save()
    estate = Estate.objects.get(id=pk)
    return render(request, 'post.html', {'estates': estate})
  
def rpost(request, pk):
  recent = Recentposts.objects.get(id=pk)
  return render(request, 'rpost.html', {'recent': recent})

