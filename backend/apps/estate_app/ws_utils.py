# backend/apps/estate_app/ws_utils.py
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def send_user_notification(user_id, data):
    """
    Sends a real-time notification to a specific user.
    Silently fails if the channel layer is unavailable.
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        group_name = f'user_{user_id}'
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'send_notification',
                'data': data
            }
        )
    except Exception as e:
        print(f"[ws_utils] send_user_notification failed for user {user_id}: {e}")


def broadcast_chat_message(conv_id, message, sender_id, sender_name):
    """
    Broadcasts a chat message to all participants of a conversation.
    Silently fails if the channel layer is unavailable.
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
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
    except Exception as e:
        print(f"[ws_utils] broadcast_chat_message failed for conv {conv_id}: {e}")