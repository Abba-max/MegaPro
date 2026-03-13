from rest_framework import permissions

class IsVerifiedOwner(permissions.BasePermission):
    """
    Custom permission to only allow verified owners to create estates.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Staff/Admins are always allowed
        if request.user.is_staff or request.user.is_superuser:
            return True
            
        # Owners must be verified
        if request.user.user_type == 'owner':
            return request.user.is_verified
            
        return False
