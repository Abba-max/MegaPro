from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q
import logging

logger = logging.getLogger(__name__)

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
            logger.warning(f"Authentication failed: No user found for {username}")
            return None
        except User.MultipleObjectsReturned:
            # In case there are multiple users with same email, get the first one
            user = User.objects.filter(
                Q(username__iexact=username) | Q(email__iexact=username)
            ).order_by('id').first()
            
        if user and user.check_password(password):
            if self.user_can_authenticate(user):
                return user
            else:
                print(f"[auth] User {user.username} is not allowed to authenticate (is_active={user.is_active})")
        else:
            if user:
                print(f"[auth] Password check failed for user {user.username}")
            else:
                print(f"[auth] No user found for identifier: {username}")
        return None
