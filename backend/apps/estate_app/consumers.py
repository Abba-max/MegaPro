"""
apps/estate_app/consumers.py

Key fixes:
1. ChatConsumer now authenticates the connection (closes if anonymous).
2. ChatConsumer saves the message to the DB via database_sync_to_async,
   then broadcasts it — this is the single source of truth.
   The frontend should NOT also POST via HTTP when WS is open; only one
   path creates the DB record. The frontend's HTTP POST fallback is kept
   for when WS is unavailable (no WebSocket connection).
3. NotificationConsumer was already correct but relied on JwtAuthMiddleware
   to populate scope["user"] — that is now wired up in asgi.py.
4. A push_notification helper is exported so api_views can send real-time
   events (new booking, new review, etc.) to specific users.
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


# ── DB helpers (run in thread pool) ───────────────────────────────────────

@database_sync_to_async
def _get_conversation(conv_id, user):
    """Return the conversation if user is a participant, else None."""
    from .models import Conversation
    try:
        conv = Conversation.objects.get(pk=conv_id)
        if conv.client_id == user.id or conv.owner_id == user.id:
            return conv
        return None
    except Conversation.DoesNotExist:
        return None


@database_sync_to_async
def _save_message(conversation, sender, text):
    """Persist message and touch conversation.updated_at."""
    from .models import Message
    msg = Message.objects.create(conversation=conversation, sender=sender, text=text)
    # Touch updated_at on conversation so ordering stays correct
    conversation.save(update_fields=["updated_at"])
    return {
        "id": msg.id,
        "conversation": msg.conversation_id,
        "sender": msg.sender_id,
        "sender_name": msg.sender.get_full_name() or msg.sender.username,
        "sender_username": msg.sender.username,
        "text": msg.text,
        "read": msg.read,
        "created_at": msg.created_at.isoformat(),
    }


@database_sync_to_async
def _mark_others_read(conversation, sender):
    """Mark all messages from the other participant as read."""
    from .models import Message
    Message.objects.filter(
        conversation=conversation, read=False
    ).exclude(sender=sender).update(read=True)


# ── Chat consumer ──────────────────────────────────────────────────────────

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")

        # Reject anonymous connections
        if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.user = user
        conv_id = self.scope["url_route"]["kwargs"]["conv_id"]

        # Verify the user is actually a participant in this conversation
        self.conversation = await _get_conversation(conv_id, user)
        if self.conversation is None:
            await self.close(code=4003)
            return

        self.conv_id = str(conv_id)
        self.group_name = f"chat_{self.conv_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Mark existing messages as read on join
        await _mark_others_read(self.conversation, self.user)

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        """
        Receive a message from the WebSocket client.
        Save it to the DB first, then broadcast the saved version
        (with real id, created_at, etc.) to all group members.
        """
        try:
            data = json.loads(text_data)
        except (json.JSONDecodeError, TypeError):
            return

        text = (data.get("message") or "").strip()
        if not text:
            return

        # Persist to DB — this is the authoritative record.
        # The signals.py 'message_post_save' will handle the broadcast 
        # to the chat group and the push notification to the recipient.
        await _save_message(self.conversation, self.user, text)

    async def chat_message(self, event):
        """Forward a saved message to the WebSocket client."""
        # Remove the internal 'type' key before sending to the browser
        payload = {k: v for k, v in event.items() if k != "type"}
        await self.send(text_data=json.dumps(payload))


ONLINE_USERS: set[int] = set()

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")

        if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.user_id = user.id
        self.group_name = f"user_{self.user_id}"
        
        # Tracking presence
        ONLINE_USERS.add(self.user_id)

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        
        # Notify partners could be done here if we had a list of conversation IDs
        # For now, we'll let the frontend poll online status or we can broadcast globally
        # to a presence group if needed.

    async def disconnect(self, close_code):
        if hasattr(self, "user_id"):
            ONLINE_USERS.discard(self.user_id)
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_notification(self, event):
        """Receive a notification event from the channel layer and forward it."""
        await self.send(text_data=json.dumps(event["data"]))


# ── Utility: push a notification to a user from anywhere in Django ─────────

async def push_notification(user_id: int, data: dict):
    """
    Call this from api_views (via async_to_sync) to push a real-time
    notification to a specific user's browser.

    Usage in a sync view:
        from asgiref.sync import async_to_sync
        from .consumers import push_notification
        async_to_sync(push_notification)(user.id, {"type": "new_booking", "message": "..."})
    """
    from channels.layers import get_channel_layer
    layer = get_channel_layer()
    await layer.group_send(
        f"user_{user_id}",
        {"type": "send.notification", "data": data},
    )