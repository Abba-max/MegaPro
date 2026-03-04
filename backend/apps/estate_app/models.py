from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth import get_user_model

class Estate(models.Model):
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='estates', null=True, blank=True)
    capacity = models.IntegerField(default=1)
    location = models.CharField(max_length=255, default="Yaounde")
    free = models.IntegerField(default=1)
    rating = models.CharField(max_length=10, default="0.0")
    price = models.IntegerField(default=300000)
    distance = models.IntegerField(default=100)
    wifi = models.CharField(max_length=1, choices=(('1', 'Yes'), ('0', 'No')), default='0')
    restaurant = models.CharField(max_length=1, choices=(('1', 'Yes'), ('0', 'No')), default='0')
    generator = models.CharField(max_length=1, choices=(('1', 'Yes'), ('0', 'No')), default='0')
    room_size = models.CharField(max_length=1, choices=(('1', 'Large'), ('2', 'Medium'), ('3', 'Small')), default='2')
    forage = models.CharField(max_length=1, choices=(('1', 'Yes'), ('0', 'No')), default='0')
    description = models.TextField(blank=True, default="")
    publishedAt = models.DateTimeField(auto_now=True)
    status = models.CharField(
        max_length=20, 
        default="published", 
        choices=(("draft", "Draft"), ("published", "Published"), ("archived", "Archived"))
    )

    def __str__(self):
        return self.name

class EstateImage(models.Model):
    estate = models.ForeignKey(Estate, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='estates/images/')

    def __str__(self):
        return f"Image for {self.estate.name}"

class Review(models.Model):
    estate = models.ForeignKey(Estate, on_delete=models.CASCADE, related_name='reviews')
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')
    name = models.CharField(max_length=100)
    rating = models.IntegerField()
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField(get_user_model(), related_name='liked_reviews', blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Review by {self.name} on {self.estate}"

class QuickOrder(models.Model):
    estate = models.ForeignKey(Estate, on_delete=models.CASCADE, related_name='quick_orders')
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class ContactRequest(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    message = models.TextField(default="")
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ContactRequest from {self.name}"

class Global_user(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    first_name = models.CharField(max_length=20, null=True, blank=True)
    last_name = models.CharField(max_length=20, null=True, blank=True)
    contact = models.CharField(max_length=13, null=True, blank=True)
    address = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(
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
