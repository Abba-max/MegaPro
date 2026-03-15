// src/app/services/websocket.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
    private chatSocket: WebSocket | null = null;
    private notificationSocket: WebSocket | null = null;

    private messageSubject = new Subject<any>();
    public messages$ = this.messageSubject.asObservable();

    private notificationSubject = new Subject<any>();
    public notifications$ = this.notificationSubject.asObservable();

    private readonly WS_BASE = 'ws://localhost:8000/ws';

    constructor(private auth: AuthService) {
        this.auth.currentUser$.subscribe(user => {
            if (user) {
                this.connectNotifications();
            } else {
                this.disconnectNotifications();
                this.disconnectChat();
            }
        });
    }

    // ── Notifications ──────────────────────────────────────────────────────

    connectNotifications(): void {
        if (this.notificationSocket) return;

      const token = this.auth.getAccessToken();
      if (!token) return;

      const url = `${this.WS_BASE}/notifications/?token=${token}`;
      this.notificationSocket = new WebSocket(url);

      this.notificationSocket.onmessage = (event) => {
        try {
            this.notificationSubject.next(JSON.parse(event.data));
        } catch { /* ignore malformed frames */ }
    };

      this.notificationSocket.onerror = () => {
          console.warn('Notification WebSocket error — will retry on close.');
      };

      this.notificationSocket.onclose = () => {
        this.notificationSocket = null;
        // Reconnect after 5 s if still authenticated
        setTimeout(() => {
          if (this.auth.isAuthenticated()) this.connectNotifications();
      }, 5000);
      };
  }

    disconnectNotifications(): void {
        if (this.notificationSocket) {
            this.notificationSocket.onclose = null; // prevent auto-reconnect
            this.notificationSocket.close();
            this.notificationSocket = null;
        }
    }

    // ── Chat ───────────────────────────────────────────────────────────────

    connectChat(convId: number): void {
        this.disconnectChat();

      const token = this.auth.getAccessToken();
      if (!token) return;

      const url = `${this.WS_BASE}/chat/${convId}/?token=${token}`;
      this.chatSocket = new WebSocket(url);

      this.chatSocket.onmessage = (event) => {
        try {
            this.messageSubject.next(JSON.parse(event.data));
        } catch { /* ignore */ }
    };

      this.chatSocket.onerror = () => {
          console.warn('Chat WebSocket error.');
      };

      this.chatSocket.onclose = () => {
        this.chatSocket = null;
      };
  }

    /**
     * Send a raw text message through the chat socket.
     * Returns true if the socket was open and the message was queued.
     */
    sendChatMessage(text: string, senderId: number, senderName: string): boolean {
        if (this.chatSocket?.readyState === WebSocket.OPEN) {
            this.chatSocket.send(JSON.stringify({
          message: text,
          sender_id: senderId,
          sender_name: senderName,
      }));
        return true;
    }
      return false;
  }

    get isChatOpen(): boolean {
        return this.chatSocket?.readyState === WebSocket.OPEN;
    }

    disconnectChat(): void {
        if (this.chatSocket) {
        this.chatSocket.onclose = null;
          this.chatSocket.close();
          this.chatSocket = null;
      }
  }

    ngOnDestroy(): void {
        this.disconnectChat();
        this.disconnectNotifications();
    }
}