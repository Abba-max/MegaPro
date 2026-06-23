"""
apps/estate_app/consumers.py

Fonctionnalités :
1. ChatConsumer authentifie la connexion (ferme si anonyme).
2. Filtrage des mots bannis : si un message contient un mot interdit,
   le message est rejeté et l'expéditeur reçoit un message d'erreur.
3. Sauvegarde en BDD puis diffusion à tous les membres du groupe.
4. Indicateur d'écriture (typing) : envoyé en temps réel sans sauvegarde.
5. Accusés de lecture (read receipts) : notifie l'expéditeur que son message a été lu.
6. NotificationConsumer gère le statut en ligne (ONLINE_USERS).
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
def _check_banned_words(text):
    """
    Checks if the text contains any banned words.
    Returns (is_banned: bool, matched_word: str|None).
    """
    from .models import BannedWord
    text_lower = text.lower()
    banned = BannedWord.objects.values_list('word', flat=True)
    for word in banned:
        if word.lower() in text_lower:
            return True, word
    return False, None


@database_sync_to_async
def _save_message(conversation, sender, text):
    """Persist message and touch conversation.updated_at."""
    from .models import Message
    msg = Message.objects.create(conversation=conversation, sender=sender, text=text)
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
    updated = Message.objects.filter(
        conversation=conversation, read=False
    ).exclude(sender=sender).update(read=True)
    return updated > 0  # Returns True if any were marked read


@database_sync_to_async
def _get_recipient_id(conversation, sender_id):
    """Get the ID of the other participant in the conversation."""
    if conversation.client_id == sender_id:
        return conversation.owner_id
    return conversation.client_id


# ── Chat consumer ──────────────────────────────────────────────────────────

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")

        if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.user = user
        conv_id = self.scope["url_route"]["kwargs"]["conv_id"]

        self.conversation = await _get_conversation(conv_id, user)
        if self.conversation is None:
            await self.close(code=4003)
            return

        self.conv_id = str(conv_id)
        self.group_name = f"chat_{self.conv_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Mark existing messages as read on join
        had_unread = await _mark_others_read(self.conversation, self.user)

        # If there were unread messages, notify sender that they were read
        if had_unread:
            recipient_id = await _get_recipient_id(self.conversation, self.user.id)
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "read_receipt",
                    "conv_id": self.conv_id,
                    "read_by": self.user.id,
                    "recipient_id": recipient_id,
                }
            )

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            # Notify others that user stopped typing on disconnect
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "typing_indicator",
                    "user_id": self.user.id if hasattr(self, "user") else None,
                    "is_typing": False,
                }
            )
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        """
        Receive a message from the WebSocket client.
        Supports:
          - type "message": saves to DB and broadcasts
          - type "typing": broadcasts typing indicator (no DB save)
          - type "read": marks messages as read and sends receipt
        """
        try:
            data = json.loads(text_data)
        except (json.JSONDecodeError, TypeError):
            return

        msg_type = data.get("type", "message")

        # ── Typing indicator (no DB save) ──────────────────────────────────
        if msg_type == "typing":
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "typing_indicator",
                    "user_id": self.user.id,
                    "is_typing": data.get("is_typing", False),
                }
            )
            return

        # ── Read receipt ───────────────────────────────────────────────────
        if msg_type == "read":
            had_unread = await _mark_others_read(self.conversation, self.user)
            if had_unread:
                recipient_id = await _get_recipient_id(self.conversation, self.user.id)
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "read_receipt",
                        "conv_id": self.conv_id,
                        "read_by": self.user.id,
                        "recipient_id": recipient_id,
                    }
                )
            return

        # ── Standard chat message ──────────────────────────────────────────
        text = (data.get("message") or "").strip()
        if not text:
            return

        # ── Content Validation (Email/Phone) ───────────────────────────────
        import re
        if re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text):
            await self.send(text_data=json.dumps({
                "type": "error",
                "code": "BANNED_CONTENT",
                "message": "⛔ L'envoi d'adresses email est strictement interdit pour des raisons de sécurité."
            }))
            return

        if re.search(r'(\+?\d[\s\-\.]*){8,}', text):
            await self.send(text_data=json.dumps({
                "type": "error",
                "code": "BANNED_CONTENT",
                "message": "⛔ L'envoi de numéros de téléphone est strictement interdit pour des raisons de sécurité."
            }))
            return

        # ── Banned word filter ─────────────────────────────────────────────
        is_banned, matched_word = await _check_banned_words(text)
        if is_banned:
            # Send a rejection error ONLY to the sender (not the group)
            await self.send(text_data=json.dumps({
                "type": "error",
                "code": "BANNED_WORD",
                "message": (
                    "⛔ Votre message a été bloqué car il contient un terme interdit. "
                    "Le message n'a pas été envoyé. C'est interdit ici."
                ),
            }))
            return

        # Persist to DB — signals.py 'message_post_save' handles the broadcast.
        await _save_message(self.conversation, self.user, text)

    async def chat_message(self, event):
        """Forward a saved message to the WebSocket client."""
        payload = {k: v for k, v in event.items() if k != "type"}
        payload["type"] = "message"
        await self.send(text_data=json.dumps(payload))

    async def typing_indicator(self, event):
        """Forward typing indicator to the WebSocket client."""
        # Don't send the typing event back to the user who triggered it
        if event.get("user_id") != self.user.id:
            await self.send(text_data=json.dumps({
                "type": "typing",
                "user_id": event.get("user_id"),
                "is_typing": event.get("is_typing", False),
            }))

    async def read_receipt(self, event):
        """Forward read receipt to the WebSocket client."""
        await self.send(text_data=json.dumps({
            "type": "read_receipt",
            "conv_id": event.get("conv_id"),
            "read_by": event.get("read_by"),
        }))


# ── Online presence tracking ───────────────────────────────────────────────

ONLINE_USERS: set[int] = set()


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")

        if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.user_id = user.id
        self.group_name = f"user_{self.user_id}"

        # Track presence
        ONLINE_USERS.add(self.user_id)

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Broadcast online status to a global presence group
        await self.channel_layer.group_send(
            "presence",
            {
                "type": "user_presence",
                "user_id": self.user_id,
                "online": True,
            }
        )

        # Also join the presence group to receive others' updates
        await self.channel_layer.group_add("presence", self.channel_name)

        # Send current online users list to the newly connected client
        await self.send(text_data=json.dumps({
            "type": "online_users",
            "user_ids": list(ONLINE_USERS),
        }))

    async def disconnect(self, close_code):
        if hasattr(self, "user_id"):
            ONLINE_USERS.discard(self.user_id)
            # Broadcast offline status
            try:
                await self.channel_layer.group_send(
                    "presence",
                    {
                        "type": "user_presence",
                        "user_id": self.user_id,
                        "online": False,
                    }
                )
            except Exception:
                pass

        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        try:
            await self.channel_layer.group_discard("presence", self.channel_name)
        except Exception:
            pass

    async def send_notification(self, event):
        """Receive a notification event from the channel layer and forward it."""
        await self.send(text_data=json.dumps(event["data"]))

    async def user_presence(self, event):
        """Forward presence update to the WebSocket client."""
        await self.send(text_data=json.dumps({
            "type": "presence",
            "user_id": event.get("user_id"),
            "online": event.get("online"),
        }))


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