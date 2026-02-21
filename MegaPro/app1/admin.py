from django.contrib import admin
from .models import Feature, Estate, QuickOrder, Review, ContactRequest, Global_user, EstateImage

class EstateImageInline(admin.TabularInline):
    model = EstateImage
    extra = 1  # Number of empty forms to display

class EstateAdmin(admin.ModelAdmin):
    inlines = [EstateImageInline]

admin.site.register(Feature)
admin.site.register(Estate, EstateAdmin)  # Use custom admin
admin.site.register(QuickOrder)
admin.site.register(ContactRequest)
admin.site.register(Review)
admin.site.register(Global_user)
