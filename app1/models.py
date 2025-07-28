from django.db import models
#from django.contrib.postgres.fields import ArrayField
from PIL import Image
from django.contrib.auth.models import User
from PIL import Image
from django.utils import timezone
# from django import pillow
# class Feature(models.Model):
#     name = models.CharField(max_length=255)
#     details = models.CharField(max_length=500)
    
# class Estate(models.Model):
#     name = models.CharField(max_length=255)
#     # Fix: Ensure default values are not None and remove null=True if not needed
#     capacity = models.IntegerField(default=1)  # Changed from default=0 to avoid issues
#     free = models.IntegerField(default=1)      # Changed from default=0 to avoid issues
#     rating = models.CharField(max_length=10, default="0.0", blank=True)
#     image = models.ImageField(upload_to='estate-images/', blank=True, null=True) #Uploading Estate Images
#     price = models.IntegerField(default=300000)
#     distance = models.IntegerField(default=100)
#     wifi = models.CharField(
#         max_length=1,  # Add max_length for CharField
#         choices=(
#             ('1', 'Yes'),
#             ('0', 'No'),
#         ),
#         default='0'
#     )
#     restaurant = models.CharField(
#         max_length=1,  # Add max_length for CharField
#         choices=(
#             ('1', 'Yes'),
#             ('0', 'No'),
#         ),
#         default='0'
#     )
#     generator = models.CharField(
#         max_length=1,  # Add max_length for CharField
#         choices=(
#             ('1', 'Yes'),
#             ('0', 'No'),
#         ),
#         default='0'
#     )
#     room_size = models.CharField(
#         max_length=1,  # Add max_length for CharField
#         choices=(
#             ('1', 'Large'),
#             ('2', 'Medium'),
#             ('3', 'Small'),
#         ),
#         default='2'  # Changed to '2' (Medium) as default
#     )
#     forage = models.CharField(
#         max_length=1,  # Add max_length for CharField
#         choices=(
#             ('1', 'Yes'),
#             ('0', 'No'),
#         ),
#         default='0'
#     )
    
#     pic = models.ImageField(upload_to='estates/', blank=True, null=True)
    
#     def __str__(self):
#         return self.name

class Estate(models.Model):
    # Basic Information
    id = models.CharField(max_length=100, primary_key=True) # Use char for IDs like 'Cite Universitaire'
    name = models.CharField(max_length=200)
    rating = models.FloatField(default=0.0, null=True, blank=True)
    location = models.CharField(max_length=500, default='')
    capacity = models.CharField(max_length=100, help_text="e.g., '124 Rooms'")
    price = models.IntegerField(default=0)
    free_rooms = models.IntegerField(default=0)
    distance = models.FloatField(default=0.0, null=True, blank=True)
    space = models.CharField(max_length=50, choices=[('Small', 'Small'), ('Medium', 'Medium'), ('Large', 'Large')], default='')
    description = models.TextField(default="No description provided yet.")
    published_at = models.DateTimeField(default=timezone.now)

    # Features (Boolean fields for simplicity, or use ManyToManyField for more complex features)
    wifi = models.BooleanField(default=False)
    restaurant = models.BooleanField(default=False)
    generator = models.BooleanField(default=False)
    tv_fridge = models.BooleanField(default=False)
    security = models.BooleanField(default=False)
    
    # Main image (assuming you'll upload these to a media directory)
    main_image = models.ImageField(upload_to='estate_images/', null=True, blank=True)

    class Meta:
        ordering = ['-published_at'] # Order by most recently published

    def __str__(self):
        return self.name

class EstateImage(models.Model):
    estate = models.ForeignKey(Estate, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='estate_images/')

    def __str__(self):
        return f"Image for {self.estate.name}"

class EstateFeature(models.Model):
    estate = models.ForeignKey(Estate, related_name='features', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)

    class Meta:
        unique_together = ('estate', 'name') # An estate can't have duplicate features

    def __str__(self):
        return self.name

    
    
class Recentposts(models.Model):
    name=models.CharField( max_length=50)
    info=models.CharField( max_length=1000000) 
    author=models.CharField( max_length=50)
    data_aos= models.IntegerField()
    




class Comment(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    subject = models.CharField(max_length=100)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
class Review(models.Model):
    estate = models.ForeignKey(Estate, on_delete=models.CASCADE, related_name='reviews')
    name = models.CharField(max_length=100)
    rating = models.IntegerField()
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
class QuickOrder(models.Model):
    estate = models.CharField(max_length=255)
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
class ContactRequest(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    message = models.TextField()
    submitted_at = models.DateTimeField(auto_now_add=True)
    
class Global_user(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    first_name= models.CharField(max_length=20, null=True)
    last_name= models.CharField(max_length=20, null=True)
    contact= models.CharField(max_length=13, null=True)
    address = models.CharField(max_length=50, null=True)
    status= models.CharField(
        max_length=20,
        default="1",
        choices=(
            ("1", "Student"),
            ("2", "Parent"),
            ("3", "Local resident"),
            ("4", "Visitor"),
        ),
    )
    def __str__(self):
        return self.user.username
         