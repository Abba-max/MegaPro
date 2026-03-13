from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Estate, QuickOrder, Review, ContactRequest, EstateImage


class CustomUserAdmin(UserAdmin):
    # Extra fields shown on the "Change user" page
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('user_type', 'contact', 'address', 'visitor_category', 'is_verified', 'id_card')}),
    )
    # Extra fields shown on the "Add user" page
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('user_type', 'contact', 'address', 'visitor_category', 'is_verified', 'id_card')}),
    )
    list_display = ['username', 'email', 'first_name', 'last_name', 'user_type', 'is_staff', 'is_verified']
    list_filter  = UserAdmin.list_filter + ('user_type',)


class EstateImageInline(admin.TabularInline):
    model = EstateImage
    extra = 1

class EstateAdmin(admin.ModelAdmin):
    inlines = [EstateImageInline]
    list_display = ['name', 'location', 'price', 'status', 'owner']
    list_filter = ['status', 'location', 'wifi', 'restaurant', 'generator']
    search_fields = ['name', 'location', 'description']

admin.site.register(User, CustomUserAdmin)
admin.site.register(Estate, EstateAdmin)
admin.site.register(QuickOrder)
admin.site.register(ContactRequest)
admin.site.register(Review)
