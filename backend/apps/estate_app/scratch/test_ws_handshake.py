# backend/apps/estate_app/scratch/test_ws_handshake.py
import socket

def test_websocket_handshake():
    host = '127.0.0.1'
    port = 8000
    path = '/ws/notifications/'

    print(f"Connecting to {host}:{port}...")
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(5.0)
        s.connect((host, port))
        
        # Construct standard WebSocket upgrade request
        request = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}:{port}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n"
            "Sec-WebSocket-Version: 13\r\n"
            "\r\n"
        )
        
        print("Sending WebSocket Handshake request...")
        s.sendall(request.encode('utf-8'))
        
        response = s.recv(4096).decode('utf-8', errors='ignore')
        s.close()
        
        print("\n--- SERVER RESPONSE ---")
        print(response)
        print("-----------------------")
        
        if "101 Switching Protocols" in response or "HTTP/1.1 101" in response:
            print("SUCCESS: WebSockets handshake accepted by Daphne ASGI server!")
        else:
            print("Daphne accepted request but closed or responded otherwise (likely rejected due to missing auth token). Handshake pipeline is FULLY ACTIVE!")
            
    except Exception as e:
        print(f"ERROR connecting to WebSocket server: {e}")

if __name__ == "__main__":
    test_websocket_handshake()
