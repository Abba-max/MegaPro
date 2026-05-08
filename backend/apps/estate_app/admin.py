from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Estate, QuickOrder, Review, ContactRequest, EstateImage, RoomCategory, RoomImage


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


class RoomImageInline(admin.TabularInline):
    model = RoomImage
    extra = 1

class RoomCategoryAdmin(admin.ModelAdmin):
    inlines = [RoomImageInline]
    list_display = ['name', 'estate', 'occupancy', 'price', 'quantity_available']
    list_filter = ['occupancy', 'wifi', 'tv', 'fridge', 'room_size']
    search_fields = ['name', 'estate__name', 'description']

class EstateImageInline(admin.TabularInline):
    model = EstateImage
    extra = 1

class EstateAdmin(admin.ModelAdmin):
    inlines = [EstateImageInline]
    list_display = ['name', 'location', 'status', 'owner']
    list_filter = ['status', 'location', 'restaurant', 'generator']
    search_fields = ['name', 'location', 'description']

class QuickOrderAdmin(admin.ModelAdmin):
    list_display = ['name', 'estate', 'status', 'is_payment_verified', 'created_at']
    list_filter  = ['status', 'is_payment_verified', 'created_at']
    search_fields = ['name', 'phone', 'estate__name']
    readonly_fields = ['receipt_preview']

    def receipt_preview(self, obj):
        if obj.receipt:
            return f'<img src="{obj.receipt.url}" style="max-height: 200px;"/>'
        return "Pas de reçu"
    receipt_preview.allow_tags = True
    receipt_preview.short_description = "Aperçu du reçu"

admin.site.register(User, CustomUserAdmin)
admin.site.register(Estate, EstateAdmin)
admin.site.register(RoomCategory, RoomCategoryAdmin)
admin.site.register(QuickOrder, QuickOrderAdmin)
admin.site.register(ContactRequest)
admin.site.register(Review)
