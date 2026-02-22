from django.contrib import admin
from .models import Estate, QuickOrder, Review, ContactRequest, Global_user, EstateImage

class EstateImageInline(admin.TabularInline):
    model = EstateImage
    extra = 1

class EstateAdmin(admin.ModelAdmin):
    inlines = [EstateImageInline]
    list_display = ['name', 'location', 'price', 'status', 'owner']
    list_filter = ['status', 'location', 'wifi', 'restaurant', 'generator']
    search_fields = ['name', 'location', 'description']

admin.site.register(Estate, EstateAdmin)
admin.site.register(QuickOrder)
admin.site.register(ContactRequest)
admin.site.register(Review)
admin.site.register(Global_user)
