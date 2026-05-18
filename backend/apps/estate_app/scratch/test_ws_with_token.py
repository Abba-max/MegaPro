# backend/apps/estate_app/scratch/test_ws_with_token.py
import socket
import requests
import json

def test_websocket_with_token():
    # 1. Login to get token
    login_url = "http://127.0.0.1:8000/api/token/"
    payload = {
        "username": "student",
        "password": "studentpassword123"
    }
    
    print("Attempting to login to get a valid JWT token...")
    try:
        r = requests.post(login_url, json=payload, timeout=5.0)
        if r.status_code != 200:
            # Try parent or admin if student login fails
            payload = {
                "username": "admin",
                "password": "adminpassword123"
            }
            r = requests.post(login_url, json=payload, timeout=5.0)
            
        if r.status_code != 200:
            print(f"Login failed: {r.status_code} - {r.text}")
            print("Trying to generate a token directly from Django...")
            # Fallback: get token using django context
            token = get_token_from_django()
        else:
            token = r.json().get("access")
            print("Successfully retrieved JWT token from login API!")
            
    except Exception as e:
        print(f"Failed to call login API: {e}")
        print("Trying to generate a token directly from Django...")
        token = get_token_from_django()

    if not token:
        print("ERROR: Could not obtain a valid JWT token.")
        return

    # 2. Perform WebSocket handshake
    host = '127.0.0.1'
    port = 8000
    path = f'/ws/notifications/?token={token}'

    print(f"\nConnecting to WebSocket at ws://{host}:{port}{path}...")
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(5.0)
        s.connect((host, port))
        
        request = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}:{port}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n"
            "Sec-WebSocket-Version: 13\r\n"
            "\r\n"
        )
        
        s.sendall(request.encode('utf-8'))
        response = s.recv(4096).decode('utf-8', errors='ignore')
        s.close()
        
        print("\n--- SERVER HANDSHAKE RESPONSE ---")
        print(response)
        print("---------------------------------")
        
        if "101 Switching Protocols" in response or "HTTP/1.1 101" in response:
            print("\n[SUCCESS] Daphne ASGI server accepted the JWT token and successfully upgraded to WebSockets (101 Switching Protocols)!")
        else:
            print("\n[FAIL] Handshake failed: Daphne responded with a non-101 status.")
            
    except Exception as e:
        print(f"ERROR performing WebSocket handshake: {e}")

def get_token_from_django():
    """Fallback helper to get a token directly from the database context."""
    import os
    import sys
    import django
    # Add backend directory to sys.path so 'project' module can be found
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
    django.setup()
    
    from django.contrib.auth import get_user_model
    from rest_framework_simplejwt.tokens import RefreshToken
    
    User = get_user_model()
    # Find any user
    user = User.objects.first()
    if user:
        refresh = RefreshToken.for_user(user)
        print(f"Direct token generated for user: {user.username} (Role: {getattr(user, 'role', 'N/A')})")
        return str(refresh.access_token)
    return None

if __name__ == "__main__":
    test_websocket_with_token()
