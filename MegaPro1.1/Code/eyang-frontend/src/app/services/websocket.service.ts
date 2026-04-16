// src/app/services/websocket.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
    private chatSocket: WebSocket | null = null;
    private notificationSocket: WebSocket | null = null;

    private messageSubject = new Subject<any>();
    public messages$ = this.messageSubject.asObservable();

    private notificationSubject = new Subject<any>();
    public notifications$ = this.notificationSubject.asObservable();

    private readonly WS_BASE = environment.wsUrl;
    private currentConvId: number | null = null;
    private chatReconnectAttempts = 0;
    private notifReconnectAttempts = 0;
    private chatHeartbeatInterval: any;
    private notifHeartbeatInterval: any;

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
        if (this.notificationSocket && this.notificationSocket.readyState === WebSocket.OPEN) {
            return; // Already connected
        }

        const token = this.auth.getAccessToken();
        if (!token) return;

        try {
            const url = `${this.WS_BASE}/notifications/?token=${token}`;
            this.notificationSocket = new WebSocket(url);

            this.notificationSocket.onopen = () => {
                this.notifReconnectAttempts = 0; // reset on successful connection
                this.startNotificationHeartbeat();
                console.info('[WS] Notification socket connected');
            };

            this.notificationSocket.onmessage = (event) => {
                try {
                    this.notificationSubject.next(JSON.parse(event.data));
                } catch { /* ignore malformed frames */ }
            };

            this.notificationSocket.onerror = (event) => {
                console.warn('[WS] Notification error:', event);
            };

            this.notificationSocket.onclose = () => {
                this.stopNotificationHeartbeat();
                this.notificationSocket = null;
                console.warn('[WS] Notification socket closed, reconnecting...');
                
                // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
                const delay = Math.min(1000 * Math.pow(2, this.notifReconnectAttempts), 30000);
                this.notifReconnectAttempts++;
                
                setTimeout(() => {
                    if (this.auth.isAuthenticated()) {
                        this.connectNotifications();
                    }
                }, delay);
            };
        } catch (e) {
            console.error('[WS] Error creating notification socket:', e);
        }
    }

    private startNotificationHeartbeat(): void {
        this.stopNotificationHeartbeat();
        // Send ping every 30s to keep connection alive
        this.notifHeartbeatInterval = setInterval(() => {
            if (this.notificationSocket?.readyState === WebSocket.OPEN) {
                try {
                    this.notificationSocket.send(JSON.stringify({ type: 'ping' }));
                } catch { /* ignore */ }
            }
        }, 30000);
    }

    private stopNotificationHeartbeat(): void {
        if (this.notifHeartbeatInterval) {
            clearInterval(this.notifHeartbeatInterval);
            this.notifHeartbeatInterval = null;
        }
    }

    disconnectNotifications(): void {
        this.stopNotificationHeartbeat();
        if (this.notificationSocket) {
            this.notificationSocket.onclose = null; // prevent auto-reconnect
            this.notificationSocket.close();
            this.notificationSocket = null;
        }
    }

    // ── Chat ───────────────────────────────────────────────────────────────

    connectChat(convId: number): void {
        // If already connected to the same conversation, do nothing
        if (this.currentConvId === convId && 
            this.chatSocket && 
            this.chatSocket.readyState === WebSocket.OPEN) {
            return;
        }

        // Disconnect from previous conversation
        this.disconnectChat();

        const token = this.auth.getAccessToken();
        if (!token) return;

        try {
            const url = `${this.WS_BASE}/chat/${convId}/?token=${token}`;
            this.chatSocket = new WebSocket(url);
            this.currentConvId = convId;

            this.chatSocket.onopen = () => {
                this.chatReconnectAttempts = 0;
                this.startChatHeartbeat();
                console.info(`[WS] Chat socket connected for conversation ${convId}`);
            };

            this.chatSocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type !== 'pong') {
                        this.messageSubject.next(data);
                    }
                } catch { /* ignore */ }
            };

            this.chatSocket.onerror = (event) => {
                console.warn('[WS] Chat error:', event);
            };

            this.chatSocket.onclose = () => {
                this.stopChatHeartbeat();
                const wasConnId = this.currentConvId;
                this.chatSocket = null;
                this.currentConvId = null;
                
                console.warn(`[WS] Chat socket closed for conversation ${wasConnId}, will reconnect on next message`);
                // Reconnect will be triggered when user sends a message or navigates
            };
        } catch (e) {
            console.error('[WS] Error creating chat socket:', e);
            this.currentConvId = null;
        }
    }

    private startChatHeartbeat(): void {
        this.stopChatHeartbeat();
        // Send ping every 30s
        this.chatHeartbeatInterval = setInterval(() => {
            if (this.chatSocket?.readyState === WebSocket.OPEN) {
                try {
                    this.chatSocket.send(JSON.stringify({ type: 'ping' }));
                } catch { /* ignore */ }
            }
        }, 30000);
    }

    private stopChatHeartbeat(): void {
        if (this.chatHeartbeatInterval) {
            clearInterval(this.chatHeartbeatInterval);
            this.chatHeartbeatInterval = null;
        }
    }

    /**
     * Send a raw text message through the chat socket.
     * Returns true if the socket was open and the message was queued.
     * If false, caller should fall back to HTTP POST.
     */
    sendChatMessage(text: string, senderId: number, senderName: string): boolean {
        // Try to reconnect if socket is closed
        if (!this.chatSocket || this.chatSocket.readyState !== WebSocket.OPEN) {
            if (this.currentConvId) {
                // Attempt to reconnect in the background
                this.connectChat(this.currentConvId);
            }
            return false;
        }

        try {
            this.chatSocket.send(JSON.stringify({
                message: text,
                sender_id: senderId,
                sender_name: senderName,
            }));
            return true;
        } catch (e) {
            console.error('[WS] Error sending chat message:', e);
            return false;
        }
    }

    get isChatOpen(): boolean {
        return this.chatSocket?.readyState === WebSocket.OPEN;
    }

    disconnectChat(): void {
        this.stopChatHeartbeat();
        if (this.chatSocket) {
            this.chatSocket.onclose = null; // prevent auto-reconnect triggers
            try {
                this.chatSocket.close();
            } catch { /* ignore */ }
            this.chatSocket = null;
        }
        this.currentConvId = null;
    }

    ngOnDestroy(): void {
        this.stopChatHeartbeat();
        this.stopNotificationHeartbeat();
        this.disconnectChat();
        this.disconnectNotifications();
    }
}