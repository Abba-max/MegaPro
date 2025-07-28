from django.contrib import admin
from .models import Estate
from .models import QuickOrder
from .models import Review
from .models import ContactRequest
from .models import Estate, EstateImage, EstateFeature 

# Register your models here.


admin.site.register(QuickOrder)
admin.site.register(ContactRequest)
admin.site.register(Review)

admin.site.register(Estate)
admin.site.register(EstateImage)
admin.site.register(EstateFeature)