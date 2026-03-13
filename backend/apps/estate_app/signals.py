from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Message, User
from .ws_utils import broadcast_chat_message, send_user_notification

@receiver(post_save, sender=Message)
def message_post_save(sender, instance, created, **kwargs):
    if created:
        sender_name = f"{instance.sender.first_name} {instance.sender.last_name}".strip() or instance.sender.username
        # Broadcast the message to the conversation group
        broadcast_chat_message(
            conv_id=instance.conversation_id,
            message=instance.text,
            sender_id=instance.sender_id,
            sender_name=sender_name
        )
        
        # Also send a notification to the recipient of the message
        # The recipient is either the client or the owner of the conversation
        recipient = (
            instance.conversation.owner 
            if instance.sender == instance.conversation.client 
            else instance.conversation.client
        )
        
        send_user_notification(recipient.id, {
            'type': 'new_message',
            'message': instance.text,
            'sender_name': f"{instance.sender.first_name} {instance.sender.last_name}".strip() or instance.sender.username,
            'conversation_id': instance.conversation_id
        })

@receiver(post_save, sender=User)
def user_verification_post_save(sender, instance, **kwargs):
    # This is a bit simplified; ideally check if is_verified changed from False to True
    if instance.user_type == 'owner' and instance.is_verified:
        send_user_notification(instance.id, {
            'type': 'verification_status',
            'status': 'verified',
            'message': 'Votre compte a été vérifié avec succès !'
        })
