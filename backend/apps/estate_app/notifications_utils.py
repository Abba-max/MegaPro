from .models import Notification


def notify_user(user, n_type, title_key, body_key, body_params=None, link=None):
    """
    Creates a persistent notification in the DB and pushes it via WebSocket.
    WebSocket push failure never propagates — DB persist is the priority.
    """
    if body_params is None:
        body_params = {}

    # 1. Persist to DB
    notif = Notification.objects.create(
        user=user,
        type=n_type,
        title_key=title_key,
        body_key=body_key,
        body_params=body_params,
        link=link,
    )

    # 2. Push via WebSocket — completely optional, never raises
    try:
        from .ws_utils import send_user_notification
        ws_data = {
            'id': notif.id,
            'type': n_type,
            'title_key': title_key,
            'body_key': body_key,
            'body_params': body_params,
            'link': link,
            'read': False,
            'created_at': notif.created_at.isoformat(),
        }
        send_user_notification(user.id, ws_data)
    except Exception as e:
        print(f"[notifications_utils] WebSocket push failed (non-critical): {e}")

    return notif