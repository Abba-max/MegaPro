from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Estate, QuickOrder, Review, ContactRequest, EstateImage

class EstateImageInline(admin.TabularInline):
    model = EstateImage
    extra = 1

class EstateAdmin(admin.ModelAdmin):
    inlines = [EstateImageInline]
    list_display = ['name', 'location', 'price', 'status', 'owner']
    list_filter = ['status', 'location', 'wifi', 'restaurant', 'generator']
    search_fields = ['name', 'location', 'description']

admin.site.register(User, UserAdmin)
admin.site.register(Estate, EstateAdmin)
admin.site.register(QuickOrder)
admin.site.register(ContactRequest)
admin.site.register(Review)
