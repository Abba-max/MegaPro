from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg
from .models import Message, User, Review


# ── Lazy import to avoid circular imports ─────────────────────────────────────
def _get_ws_utils():
    from . import ws_utils
    return ws_utils


# ── Rating auto-calculation ───────────────────────────────────────────────────

def _recalculate_estate_rating(estate):
    """
    Recompute the average rating for an estate from its reviews and
    persist it back to estate.rating.  Only top-level reviews (no parent)
    are counted, matching the intent of the review system.
    """
    result = estate.reviews.filter(parent__isnull=True).aggregate(avg=Avg('rating'))
    avg = result['avg']
    # Round to one decimal place; fall back to "0.0" when there are no reviews
    estate.rating = f"{round(avg, 1):.1f}" if avg is not None else "0.0"
    estate.save(update_fields=['rating'])


@receiver(post_save, sender=Review)
def review_post_save(sender, instance, created, **kwargs):
    """Recalculate the estate rating every time a review is created or updated."""
    try:
        _recalculate_estate_rating(instance.estate)
    except Exception as e:
        print(f"Error recalculating rating on review save: {e}")


@receiver(post_delete, sender=Review)
def review_post_delete(sender, instance, **kwargs):
    """Recalculate the estate rating when a review is deleted."""
    try:
        _recalculate_estate_rating(instance.estate)
    except Exception as e:
        print(f"Error recalculating rating on review delete: {e}")


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
        ws.send_user_notification(recipient.id, {
            'type':            'new_message',
            'message':         instance.text,
            'sender_name':     sender_name,
            'sender_id':       instance.sender_id,
            'conversation_id': instance.conversation_id,
            'created_at':      instance.created_at.isoformat(),
        })
    except Exception as e:
        print(f"Error in message_post_save signal: {e}")


# ── User verification signal ──────────────────────────────────────────────────

@receiver(post_save, sender=User)
def user_verification_post_save(sender, instance, **kwargs):
    if instance.user_type == 'owner' and instance.is_verified:
        try:
            ws = _get_ws_utils()
            ws.send_user_notification(instance.id, {
                'type':    'verification_status',
                'status':  'verified',
                'message': 'Votre compte a été vérifié avec succès !',
            })
        except Exception as e:
            print(f"Error in user_verification_post_save signal: {e}")