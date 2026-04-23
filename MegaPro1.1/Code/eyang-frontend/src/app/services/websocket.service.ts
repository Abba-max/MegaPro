// src/app/services/websocket.service.ts  — OPTIMIZED
//
// Key improvements vs previous version:
//  1. connectNotifications() is idempotent — calling it multiple times (once
//     from NotificationService, once from DashboardComponent) opens only ONE
//     socket thanks to a "connecting" guard.
//  2. Chat socket: if the same convId is requested while a connection attempt
//     is already in-flight (readyState === CONNECTING), we skip instead of
//     creating a second socket.
//  3. Heartbeat intervals reduced: 25 s chat / 30 s notif — keeps Nginx /
//     AWS ALB from killing idle sockets without wasting bandwidth.
//  4. ngOnDestroy cleans up both sockets reliably.
//  5. Public helper isConnectingChat so components can show a "connecting"
//     spinner if needed.

import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {

  // ── Subjects ────────────────────────────────────────────────────────────
  private messageSubject      = new Subject<any>();
  public  messages$           = this.messageSubject.asObservable();

  private notificationSubject = new Subject<any>();
  public  notifications$      = this.notificationSubject.asObservable();

  // ── Sockets ─────────────────────────────────────────────────────────────
  private chatSocket:         WebSocket | null = null;
  private notificationSocket: WebSocket | null = null;

  // ── State ────────────────────────────────────────────────────────────────
  private currentConvId:          number | null = null;
  private chatReconnectAttempts   = 0;
  private notifReconnectAttempts  = 0;
  private chatHeartbeatInterval:  ReturnType<typeof setInterval> | null = null;
  private notifHeartbeatInterval: ReturnType<typeof setInterval> | null = null;

  /** True while we deliberately tore down the socket (no auto-reconnect). */
  private intentionalChatClose  = false;
  private intentionalNotifClose = false;

  /** Guard against spawning a second CONNECTING socket for the same conv. */
  private connectingChatConvId: number | null = null;

  private readonly WS_BASE = environment.wsUrl;

  constructor(private auth: AuthService, private ngZone: NgZone) {
    this.auth.currentUser$.subscribe(user => {
      if (user) {
        this.connectNotifications();
      } else {
        this.disconnectNotifications();
        this.disconnectChat();
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  NOTIFICATIONS SOCKET
  // ════════════════════════════════════════════════════════════════════════

  connectNotifications(): void {
    // Already open → nothing to do
    if (this.notificationSocket?.readyState === WebSocket.OPEN) return;
    // Still connecting → don't open a second socket
    if (this.notificationSocket?.readyState === WebSocket.CONNECTING) return;

    const token = this.auth.getAccessToken();
    if (!token) return;

    this.intentionalNotifClose = false;

    try {
      this.ngZone.runOutsideAngular(() => {
        this.notificationSocket = new WebSocket(
          `${this.WS_BASE}/notifications/?token=${token}`
        );

        this.notificationSocket.onopen = () => {
          this.notifReconnectAttempts = 0;
          this.startNotifHeartbeat();
        };

        this.notificationSocket.onmessage = ({ data }) => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'pong') return;
            this.ngZone.run(() => this.notificationSubject.next(parsed));
          } catch { /* ignore malformed frames */ }
        };

        this.notificationSocket.onerror = () => { /* server logs handle this */ };

        this.notificationSocket.onclose = () => {
          this.stopNotifHeartbeat();
          this.notificationSocket = null;
          if (this.intentionalNotifClose) return;

          // Exponential back-off capped at 30 s
          const delay = Math.min(1000 * 2 ** this.notifReconnectAttempts, 30_000);
          this.notifReconnectAttempts++;
          setTimeout(() => {
            if (this.auth.isAuthenticated() && !this.intentionalNotifClose) {
              this.connectNotifications();
            }
          }, delay);
        };
      });
    } catch (e) {
      console.error('[WS] Failed to create notification socket:', e);
    }
  }

  disconnectNotifications(): void {
    this.intentionalNotifClose = true;
    this.stopNotifHeartbeat();
    if (this.notificationSocket) {
      this.notificationSocket.onclose = null; // prevent auto-reconnect
      this.notificationSocket.close();
      this.notificationSocket = null;
    }
  }

  private startNotifHeartbeat(): void {
    this.stopNotifHeartbeat();
    this.notifHeartbeatInterval = setInterval(() => {
      if (this.notificationSocket?.readyState === WebSocket.OPEN) {
        try { this.notificationSocket.send(JSON.stringify({ type: 'ping' })); } catch { /* ignore */ }
      }
    }, 30_000);
  }

  private stopNotifHeartbeat(): void {
    if (this.notifHeartbeatInterval) {
      clearInterval(this.notifHeartbeatInterval);
      this.notifHeartbeatInterval = null;
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  //  CHAT SOCKET
  // ════════════════════════════════════════════════════════════════════════

  connectChat(convId: number): void {
    // Already open for this conversation → skip
    if (this.currentConvId === convId &&
        this.chatSocket?.readyState === WebSocket.OPEN) return;

    // Already in the process of connecting to the same convId → skip
    if (this.connectingChatConvId === convId &&
        this.chatSocket?.readyState === WebSocket.CONNECTING) return;

    // Tear down any existing socket for a different conversation
    this.disconnectChat();

    const token = this.auth.getAccessToken();
    if (!token) return;

    this.intentionalChatClose  = false;
    this.connectingChatConvId  = convId;

    try {
      this.ngZone.runOutsideAngular(() => {
        this.chatSocket    = new WebSocket(`${this.WS_BASE}/chat/${convId}/?token=${token}`);
        this.currentConvId = convId;

        this.chatSocket.onopen = () => {
          this.chatReconnectAttempts = 0;
          this.connectingChatConvId  = null;
          this.startChatHeartbeat();
        };

        this.chatSocket.onmessage = ({ data }) => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'pong') return;
            // Emit inside Angular zone so change-detection fires immediately
            this.ngZone.run(() => this.messageSubject.next(parsed));
          } catch { /* ignore */ }
        };

        this.chatSocket.onerror = () => { /* let onclose handle reconnect */ };

        this.chatSocket.onclose = () => {
          this.stopChatHeartbeat();
          const closedConvId        = this.currentConvId;
          this.chatSocket           = null;
          this.currentConvId        = null;
          this.connectingChatConvId = null;

          if (this.intentionalChatClose) return;

          // Back-off: 1 s → 2 s → 4 s … max 15 s
          const delay = Math.min(1000 * 2 ** this.chatReconnectAttempts, 15_000);
          this.chatReconnectAttempts++;
          setTimeout(() => {
            if (closedConvId && !this.intentionalChatClose && this.auth.isAuthenticated()) {
              this.connectChat(closedConvId);
            }
          }, delay);
        };
      });
    } catch (e) {
      console.error('[WS] Failed to create chat socket:', e);
      this.currentConvId        = null;
      this.connectingChatConvId = null;
    }
  }

  /**
   * Send a chat message over the open WebSocket.
   * Returns true if the frame was queued, false if WS is unavailable
   * (caller should fall back to HTTP POST).
   */
  sendChatMessage(text: string, senderId: number, senderName: string): boolean {
    if (!this.chatSocket || this.chatSocket.readyState !== WebSocket.OPEN) {
      // Trigger a background reconnect; let the caller fall back to HTTP
      if (this.currentConvId) this.connectChat(this.currentConvId);
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
      console.error('[WS] Failed to send chat message:', e);
      return false;
    }
  }

  get isChatOpen(): boolean {
    return this.chatSocket?.readyState === WebSocket.OPEN;
  }

  get isConnectingChat(): boolean {
    return this.chatSocket?.readyState === WebSocket.CONNECTING;
  }

  disconnectChat(): void {
    this.intentionalChatClose = true;
    this.stopChatHeartbeat();
    if (this.chatSocket) {
      this.chatSocket.onclose = null; // prevent auto-reconnect
      try { this.chatSocket.close(); } catch { /* ignore */ }
      this.chatSocket = null;
    }
    this.currentConvId        = null;
    this.connectingChatConvId = null;
  }

  private startChatHeartbeat(): void {
    this.stopChatHeartbeat();
    this.chatHeartbeatInterval = setInterval(() => {
      if (this.chatSocket?.readyState === WebSocket.OPEN) {
        try { this.chatSocket.send(JSON.stringify({ type: 'ping' })); } catch { /* ignore */ }
      }
    }, 25_000);
  }

  private stopChatHeartbeat(): void {
    if (this.chatHeartbeatInterval) {
      clearInterval(this.chatHeartbeatInterval);
      this.chatHeartbeatInterval = null;
    }
  }

  ngOnDestroy(): void {
    this.disconnectChat();
    this.disconnectNotifications();
  }
}