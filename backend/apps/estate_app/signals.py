# backend/apps/estate_app/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg
from .models import Message, User, Review, QuickOrder


def _get_ws_utils():
    from . import ws_utils
    return ws_utils


def _notify_safe(user, n_type, title_key, body_key, body_params=None, link=None):
    """Wrapper around notify_user that never raises — safe to call from signals."""
    try:
        from .notifications_utils import notify_user
        notify_user(
            user=user,
            n_type=n_type,
            title_key=title_key,
            body_key=body_key,
            body_params=body_params or {},
            link=link,
        )
    except Exception as e:
        print(f"[signals] notify_safe failed: {e}")


def _recalculate_estate_rating(estate):
    result = estate.reviews.filter(parent__isnull=True).aggregate(avg=Avg('rating'))
    avg = result['avg']
    estate.rating = f"{round(avg, 1):.1f}" if avg is not None else "0.0"
    estate.save(update_fields=['rating'])


@receiver(post_save, sender=Review)
def review_post_save(sender, instance, created, **kwargs):
    try:
        _recalculate_estate_rating(instance.estate)
        if created:
            _notify_safe(
                user=instance.estate.owner,
                n_type='new_review',
                title_key='notification.new_review_title',
                body_key='notification.new_review_body',
                body_params={'estate': instance.estate.name, 'user': instance.name},
                link='/dashboard',
            )
    except Exception as e:
        print(f"[signals] review_post_save error: {e}")


@receiver(post_delete, sender=Review)
def review_post_delete(sender, instance, **kwargs):
    try:
        _recalculate_estate_rating(instance.estate)
    except Exception as e:
        print(f"[signals] review_post_delete error: {e}")


@receiver(post_save, sender=Message)
def message_post_save(sender, instance, created, **kwargs):
    if not created:
        return
    try:
        ws = _get_ws_utils()
        sender_name = (
            f"{instance.sender.first_name} {instance.sender.last_name}".strip()
            or instance.sender.username
        )
        ws.broadcast_chat_message(
            conv_id=instance.conversation_id,
            message=instance.text,
            sender_id=instance.sender_id,
            sender_name=sender_name,
        )
        recipient = (
            instance.conversation.owner
            if instance.sender_id == instance.conversation.client_id
            else instance.conversation.client
        )
        _notify_safe(
            user=recipient,
            n_type='new_message',
            title_key='notification.new_message_title',
            body_key='notification.new_message_body',
            body_params={'sender': sender_name, 'text': instance.text[:50]},
            link='/messages',
        )
    except Exception as e:
        print(f"[signals] message_post_save error: {e}")


@receiver(post_save, sender=User)
def user_verification_post_save(sender, instance, created, update_fields, **kwargs):
    """
    Only fires when is_verified is explicitly saved via update_fields=['is_verified'].
    This prevents any notification during registration (create_user) or any other
    unrelated user.save() call.
    """
    # Skip: new user creation
    if created:
        return
    # Skip: save didn't explicitly target is_verified
    if not update_fields or 'is_verified' not in (update_fields or []):
        return
    # Skip: was set to False (reject action)
    if not instance.is_verified:
        return
    # Skip: not an owner
    if instance.user_type != 'owner':
        return

    _notify_safe(
        user=instance,
        n_type='verification_status',
        title_key='notification.verified_title',
        body_key='notification.verified_body',
        link='/dashboard',
    )


@receiver(post_save, sender=QuickOrder)
def quick_order_post_save(sender, instance, created, **kwargs):
    try:
        if created:
            _notify_safe(
                user=instance.estate.owner,
                n_type='new_booking',
                title_key='notification.new_booking_title',
                body_key='notification.new_booking_body',
                body_params={'estate': instance.estate.name, 'client': instance.name},
                link='/dashboard',
            )
        else:
            if instance.status in ['accepted', 'rejected'] and instance.user:
                _notify_safe(
                    user=instance.user,
                    n_type='new_booking',
                    title_key='notification.booking_update_title',
                    body_key=f'notification.booking_{instance.status}_body',
                    body_params={'estate': instance.estate.name},
                    link='/dashboard' if instance.status == 'accepted' else '/',
                )
    except Exception as e:
        print(f"[signals] quick_order_post_save error: {e}")


from django.contrib.auth.signals import user_logged_in, user_logged_out
from .utils import log_audit

@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    log_audit(user=user, action="CONNEXION", request=request, result="SUCCESS", details=f"Utilisateur {user.username} s'est connecté.")

@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    log_audit(user=user, action="DÉCONNEXION", request=request, result="SUCCESS", details=f"Utilisateur {user.username} s'est déconnecté.")


@receiver(post_save, sender=User)
def manage_user_profile(sender, instance, created, **kwargs):
    from .models import UserProfile
    try:
        if created:
            UserProfile.objects.get_or_create(user=instance)
        else:
            if not hasattr(instance, 'profile'):
                UserProfile.objects.get_or_create(user=instance)
    except Exception as e:
        print(f"[signals] manage_user_profile error: {e}")
