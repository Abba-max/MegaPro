from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q

User = get_user_model()

class EmailOrUsernameModelBackend(ModelBackend):
    """
    Allows a user to login using either their username or email address.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get(User.USERNAME_FIELD)
        
        try:
            # Case insensitive check for email or username
            user = User.objects.get(
                Q(username__iexact=username) | Q(email__iexact=username)
            )
        except User.DoesNotExist:
            return None
        except User.MultipleObjectsReturned:
            # In case there are multiple users with same email, get the first one
            user = User.objects.filter(
                Q(username__iexact=username) | Q(email__iexact=username)
            ).order_by('id').first()
            
        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
