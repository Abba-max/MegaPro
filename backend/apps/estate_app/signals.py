from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Message, User
from .ws_utils import broadcast_chat_message, send_user_notification

@receiver(post_save, sender=Message)
def message_post_save(sender, instance, created, **kwargs):
    if created:
        try:
            sender_name = f"{instance.sender.first_name} {instance.sender.last_name}".strip() or instance.sender.username
            # Broadcast the message to the conversation group
            broadcast_chat_message(
                conv_id=instance.conversation_id,
                message=instance.text,
                sender_id=instance.sender_id,
                sender_name=sender_name
            )
            
            # Also send a notification to the recipient of the message
            recipient = (
                instance.conversation.owner 
                if instance.sender_id == instance.conversation.client_id 
                else instance.conversation.client
            )
            
            send_user_notification(recipient.id, {
                'type': 'new_message',
                'message': instance.text,
                'sender_name': sender_name,
                'sender_id': instance.sender_id,
                'conversation_id': instance.conversation_id,
                'created_at': instance.created_at.isoformat()
            })
        except Exception as e:
            print(f"Error in message_post_save signal: {e}")

@receiver(post_save, sender=User)
def user_verification_post_save(sender, instance, **kwargs):
    if instance.user_type == 'owner' and instance.is_verified:
        try:
            send_user_notification(instance.id, {
                'type': 'verification_status',
                'status': 'verified',
                'message': 'Votre compte a été vérifié avec succès !'
            })
        except Exception as e:
            print(f"Error in user_verification_post_save signal: {e}")
