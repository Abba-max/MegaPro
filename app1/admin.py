from django.contrib import admin
from .models import Feature
from .models import Estate
from .models import QuickOrder
from .models import ContactRequest
# Register your models here.

admin.site.register(Feature)
admin.site.register(Estate)
admin.site.register(QuickOrder)
admin.site.register(ContactRequest)
