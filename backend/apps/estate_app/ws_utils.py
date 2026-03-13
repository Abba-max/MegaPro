from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def send_user_notification(user_id, data):
    """
    Sends a real-time notification to a specific user.
    """
    channel_layer = get_channel_layer()
    group_name = f'user_{user_id}'
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            'type': 'send_notification',
            'data': data
        }
    )

def broadcast_chat_message(conv_id, message, sender_id, sender_name):
    """
    Broadcasts a chat message to all participants of a conversation.
    """
    channel_layer = get_channel_layer()
    group_name = f'chat_{conv_id}'
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            'type': 'chat_message',
            'message': message,
            'sender_id': sender_id,
            'sender_name': sender_name,
            'conversation_id': conv_id
        }
    )
