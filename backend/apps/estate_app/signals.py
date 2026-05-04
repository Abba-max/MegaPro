# backend/apps/estate_app/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg
from .models import Message, User, Review, QuickOrder
from .notifications_utils import notify_user


# ── Lazy import to avoid circular imports ─────────────────────────────────────
def _get_ws_utils():
    from . import ws_utils
    return ws_utils


# ── Rating auto-calculation ───────────────────────────────────────────────────

def _recalculate_estate_rating(estate):
    """
    Recompute the average rating for an estate from its reviews and
    persist it back to estate.rating. Only top-level reviews (no parent)
    are counted, matching the intent of the review system.
    """
    result = estate.reviews.filter(parent__isnull=True).aggregate(avg=Avg('rating'))
    avg = result['avg']
    estate.rating = f"{round(avg, 1):.1f}" if avg is not None else "0.0"
    estate.save(update_fields=['rating'])


@receiver(post_save, sender=Review)
def review_post_save(sender, instance, created, **kwargs):
    """Recalculate the estate rating and notify the owner."""
    try:
        _recalculate_estate_rating(instance.estate)
        if created:
            notify_user(
                user=instance.estate.owner,
                n_type='new_review',
                title_key='notification.new_review_title',
                body_key='notification.new_review_body',
                body_params={'estate': instance.estate.name, 'user': instance.name},
                link=f'/dashboard'
            )
    except Exception as e:
        print(f"[signals] review_post_save error: {e}")


@receiver(post_delete, sender=Review)
def review_post_delete(sender, instance, **kwargs):
    """Recalculate the estate rating when a review is deleted."""
    try:
        _recalculate_estate_rating(instance.estate)
    except Exception as e:
        print(f"[signals] review_post_delete error: {e}")


# ── Messaging signals ─────────────────────────────────────────────────────────

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
        notify_user(
            user=recipient,
            n_type='new_message',
            title_key='notification.new_message_title',
            body_key='notification.new_message_body',
            body_params={'sender': sender_name, 'text': instance.text[:50]},
            link=f'/messages'
        )
    except Exception as e:
        print(f"[signals] message_post_save error: {e}")


# ── User verification signal ──────────────────────────────────────────────────

@receiver(post_save, sender=User)
def user_verification_post_save(sender, instance, created, update_fields, **kwargs):
    """
    Only notify the owner when is_verified is explicitly flipped to True
    via update_fields=['is_verified']. This prevents the signal from firing
    on every user save (including create_user during registration).
    """
    # Guard: only act when is_verified was explicitly updated
    if update_fields is None or 'is_verified' not in update_fields:
        return
    if not instance.is_verified:
        return
    if instance.user_type != 'owner':
        return
    try:
        notify_user(
            user=instance,
            n_type='verification_status',
            title_key='notification.verified_title',
            body_key='notification.verified_body',
            link='/dashboard'
        )
    except Exception as e:
        print(f"[signals] user_verification_post_save error: {e}")


# ── Reservation (QuickOrder) signals ──────────────────────────────────────────

@receiver(post_save, sender=QuickOrder)
def quick_order_post_save(sender, instance, created, **kwargs):
    """Notify owner of new booking, or client of status change."""
    try:
        if created:
            notify_user(
                user=instance.estate.owner,
                n_type='new_booking',
                title_key='notification.new_booking_title',
                body_key='notification.new_booking_body',
                body_params={'estate': instance.estate.name, 'client': instance.name},
                link='/dashboard'
            )
        else:
            if instance.status in ['accepted', 'rejected']:
                recipient = instance.user
                if recipient:
                    status_key = f'notification.booking_{instance.status}_body'
                    notify_user(
                        user=recipient,
                        n_type='new_booking',
                        title_key='notification.booking_update_title',
                        body_key=status_key,
                        body_params={'estate': instance.estate.name},
                        link='/dashboard' if instance.status == 'accepted' else '/'
                    )
    except Exception as e:
        print(f"[signals] quick_order_post_save error: {e}")