from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings

class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('visitor', 'Visitor/Student'),
        ('owner', 'Estate Owner'),
    )
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='visitor')
    contact = models.CharField(max_length=13, null=True, blank=True)
    address = models.CharField(max_length=50, null=True, blank=True)
    visitor_category = models.CharField(
        max_length=20,
        default="1",
        choices=(("1", "Student"), ("2", "Parent"), ("3", "Local resident"), ("4", "Visitor")),
        null=True, blank=True
    )

    class Meta(AbstractUser.Meta):
        db_table = 'auth_user'

    def __str__(self):
        return self.username


class Estate(models.Model):
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='estates', limit_choices_to={'user_type': 'owner'})
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
    tv = models.CharField(max_length=1, choices=(('1', 'Yes'), ('0', 'No')), default='0')
    fridge = models.CharField(max_length=1, choices=(('1', 'Yes'), ('0', 'No')), default='0')
    description = models.TextField(blank=True, default="")
    publishedAt = models.DateTimeField(auto_now=True)
    status = models.CharField(
        max_length=20, default="published",
        choices=(("draft", "Draft"), ("published", "Published"), ("archived", "Archived"))
    )

    def __str__(self):
        return self.name


class EstateImage(models.Model):
    estate = models.ForeignKey(Estate, related_name='images', on_delete=models.CASCADE)
    image  = models.ImageField(upload_to='estates/images/')

    def __str__(self):
        return f"Image for {self.estate.name}"


class Review(models.Model):
    estate     = models.ForeignKey(Estate, on_delete=models.CASCADE, related_name='reviews')
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviews')
    parent     = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')
    name       = models.CharField(max_length=100)
    rating     = models.IntegerField()
    comment    = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    likes      = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='liked_reviews', blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Review by {self.name} on {self.estate}"


class QuickOrder(models.Model):
    estate     = models.ForeignKey(Estate, on_delete=models.CASCADE, related_name='quick_orders')
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='quick_orders')
    name       = models.CharField(max_length=100)
    phone      = models.CharField(max_length=20)
    note       = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order by {self.name} for {self.estate}"


class ContactRequest(models.Model):
    user         = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='contact_requests')
    estate       = models.ForeignKey(Estate, on_delete=models.SET_NULL, null=True, blank=True, related_name='contact_requests')
    name         = models.CharField(max_length=255)
    email        = models.EmailField()
    phone        = models.CharField(max_length=20)
    message      = models.TextField(default="")
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ContactRequest from {self.name}"


class Conversation(models.Model):
    client     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='client_conversations')
    owner      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owner_conversations')
    estate     = models.ForeignKey(Estate, on_delete=models.CASCADE, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('client', 'owner', 'estate')
        ordering        = ['-updated_at']

    def __str__(self):
        return f"Conv: {self.client} ↔ {self.owner} ({self.estate})"


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    text         = models.TextField()
    read         = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Msg from {self.sender} in conv {self.conversation_id}"