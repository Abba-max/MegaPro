from django.db import models
from django.contrib.postgres.fields import ArrayField
# from PIL import image
# Create your models here.z
class Feature(models.Model):
    name = models.CharField(max_length=100)
    details = models.CharField(max_length=500)
    

class Estate(models.Model):
    name = models.CharField(max_length=100)
    capacity = models.IntegerField()
    free = models.IntegerField()
    rating = models.CharField(max_length=10)
    # pic = models.ImageField(upload_to='estates/', blank=True, null=False)
    image=ArrayField(models.CharField(max_length=500))
    
class Recentposts(models.Model):
    name=models.CharField( max_length=50)
    info=models.CharField( max_length=1000000) 
    author=models.CharField( max_length=50)
    data_aos= models.IntegerField()
    




# class Comment(models.Model):
#     name = models.CharField(max_length=100)
#     email = models.EmailField()
#     subject = models.CharField(max_length=100)
#     message = models.TextField()
#     created_at = models.DateTimeField(auto_now_add=True)

#     def __str__(self):
#         return self.name
         






