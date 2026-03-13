// src/app/services/websocket.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
    private chatSocket: WebSocket | null = null;
    private notificationSocket: WebSocket | null = null;

    private messageSubject = new Subject<any>();
    public messages$ = this.messageSubject.asObservable();

    private notificationSubject = new Subject<any>();
    public notifications$ = this.notificationSubject.asObservable();

    private readonly WS_BASE = 'ws://localhost:8000/ws';

    constructor(private auth: AuthService) {
        // Automatically connect to notifications if logged in
        this.auth.currentUser$.subscribe(user => {
            if (user) {
                this.connectNotifications();
            } else {
                this.disconnectNotifications();
                this.disconnectChat();
            }
        });
    }

    connectNotifications() {
        if (this.notificationSocket) return;

        const token = this.auth.getAccessToken();
        if (!token) return;

        const url = `${this.WS_BASE}/notifications/?token=${token}`;
        this.notificationSocket = new WebSocket(url);

        this.notificationSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.notificationSubject.next(data);
        };

        this.notificationSocket.onerror = (error) => {
            console.error('Notification WebSocket error:', error);
        };

        this.notificationSocket.onclose = () => {
            this.notificationSocket = null;
            // Reconnect after delay if still logged in
            setTimeout(() => {
                if (this.auth.isLoggedIn()) this.connectNotifications();
            }, 5000);
        };
    }

    connectChat(convId: number) {
        this.disconnectChat();

        const token = this.auth.getAccessToken();
        if (!token) return;

        const url = `${this.WS_BASE}/chat/${convId}/?token=${token}`;
        this.chatSocket = new WebSocket(url);

        this.chatSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.messageSubject.next(data);
        };

        this.chatSocket.onerror = (error) => {
            console.error('Chat WebSocket error:', error);
        };

        this.chatSocket.onclose = () => {
            this.chatSocket = null;
        };
    }

    sendMessage(message: string, senderId: number) {
        if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
            this.chatSocket.send(JSON.stringify({
                message,
                sender_id: senderId
            }));
        }
    }

    disconnectChat() {
        if (this.chatSocket) {
            this.chatSocket.close();
            this.chatSocket = null;
        }
    }

    disconnectNotifications() {
        if (this.notificationSocket) {
            this.notificationSocket.close();
            this.notificationSocket = null;
        }
    }

    ngOnDestroy() {
        this.disconnectChat();
        this.disconnectNotifications();
    }
}
