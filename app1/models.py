from django.db import models
from django.contrib.postgres.fields import ArrayField
from PIL import Image
# from django import pillow
class Feature(models.Model):
    name = models.CharField(max_length=100)
    details = models.CharField(max_length=500)
    

class Estate(models.Model):
    name = models.CharField(max_length=100)
    capacity = models.IntegerField()
    free = models.IntegerField()
    rating = models.CharField(max_length=10)
    price= models.IntegerField(default=300000)
    distance= models.IntegerField(default=100)
    wifi= models.CharField(
        choices=(
            ('1','Yes'),
            ('0','No'),
            ),
        default=0
    )
    restaurant=models.CharField(
        choices=(
            ('1','Yes'),
            ('0','No'),
            ),
        default=0
    )
    generator=models.CharField(
        choices=(
            ('1','Yes'),
            ('0','No'),
            ),
        default=0
    )
    room_size=models.CharField(
        choices=(
            ('1','Large'),
            ('2','Medium'),
            ('3','Small'),
            ),
        default=1
    )
    forage=models.CharField(
        choices=(
            ('1','Yes'),
            ('0','No'),
            ),
        default=0
    )
    
    pic = models.ImageField(upload_to='estates/', blank=True, null=False)
    
    
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
         






