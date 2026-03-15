// src/app/services/notification.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subscription, interval } from 'rxjs';
import { AuthService } from './auth.service';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'message';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  icon?: string;
}

export interface AppNotification {
  id: string;
  type: 'new_message' | 'new_booking' | 'new_review' | 'verification_status' | 'new_contact' | 'info';
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  link?: string;
  icon?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private readonly BASE    = 'http://localhost:8000';
  private readonly WS_BASE = 'ws://localhost:8000';

  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.toastsSubject.asObservable();

  private notifsSubject = new BehaviorSubject<AppNotification[]>([]);
  notifications$ = this.notifsSubject.asObservable();

  get unreadCount(): number {
    return this.notifsSubject.value.filter(n => !n.read).length;
  }

  private ws?: WebSocket;
  private pollSub?: Subscription;
  private authSub?: Subscription;

  constructor(private authService: AuthService, private http: HttpClient) {
    // FIX: removed NgZone — HTTP and WebSocket callbacks run inside the zone
    // automatically with provideZoneChangeDetection().
    this.authSub = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.connect();
      } else {
        this.disconnect();
        this.notifsSubject.next([]);
        this.toastsSubject.next([]);
      }
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.authSub?.unsubscribe();
  }

  // ── WebSocket ──────────────────────────────────────────────────────────

  private connect(): void {
    if (this.ws) return; // already connected
    const token = this.authService.getAccessToken();
    if (!token) return;

    try {
      this.ws = new WebSocket(`${this.WS_BASE}/ws/notifications/?token=${token}`);

      this.ws.onopen = () => {
        this.pollSub?.unsubscribe();
        this.pollSub = undefined;
      };

      this.ws.onmessage = (ev) => {
        try { this.handleEvent(JSON.parse(ev.data)); } catch { /* skip bad frames */ }
      };

      this.ws.onerror = () => this.startPolling();

      this.ws.onclose = () => {
        this.ws = undefined;
        if (this.authService.getAccessToken()) {
          // Retry WebSocket after 5 s, fall back to polling in the meantime
          this.startPolling();
          setTimeout(() => this.connect(), 5000);
        }
      };
    } catch {
      this.startPolling();
    }
  }

  private disconnect(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = undefined;
    }
  }

  private startPolling(): void {
    if (this.pollSub) return;
    this.pollSub = interval(10_000).subscribe(() => {
      if (!this.authService.getAccessToken()) return;
      this.http.get<any[]>(`${this.BASE}/api/conversations/`).subscribe({
        next: (convs) => {
          const total = convs.reduce((s, c) => s + (c.unread_count || 0), 0);
          if (total > 0) {
            const existing = this.notifsSubject.value.find(
              n => n.type === 'new_message' && !n.read
            );
            if (!existing) {
              this.addNotification({
                type: 'new_message',
                title: 'Nouveaux messages',
                body: `${total} message${total > 1 ? 's' : ''} non lu${total > 1 ? 's' : ''}`,
                icon: '💬',
                link: '/messages',
              });
            }
          }
        },
        error: () => {},
      });
    });
  }

  // ── Event dispatcher ───────────────────────────────────────────────────

  private handleEvent(data: any): void {
    switch (data.type) {
      case 'new_message':
        this.toast({ type: 'message', title: data.sender_name || 'Nouveau message',
          message: data.message, duration: 5000, icon: '💬' });
        this.addNotification({ type: 'new_message',
          title: `Message de ${data.sender_name || 'quelqu\'un'}`,
          body: data.message, icon: '💬', link: '/messages' });
        break;

      case 'verification_status':
        if (data.status === 'verified') {
          this.toast({ type: 'success', title: 'Compte vérifié !',
            message: data.message, duration: 7000, icon: '✅' });
          this.addNotification({ type: 'verification_status',
            title: 'Compte vérifié',
            body: data.message || 'Votre compte a été vérifié avec succès !', icon: '✅' });
        } else {
          this.toast({ type: 'error', title: 'Vérification refusée',
            message: data.message, duration: 7000, icon: '❌' });
          this.addNotification({ type: 'verification_status',
            title: 'Vérification refusée',
            body: data.message || 'Votre demande a été refusée.', icon: '❌' });
        }
        break;

      case 'new_booking':
        this.toast({ type: 'info', title: 'Nouvelle réservation',
          message: data.message, duration: 6000, icon: '📋' });
        this.addNotification({ type: 'new_booking', title: 'Nouvelle réservation',
          body: data.message, icon: '📋', link: '/dashboard' });
        break;

      case 'new_review':
        this.toast({ type: 'info', title: 'Nouvel avis',
          message: data.message, duration: 5000, icon: '⭐' });
        this.addNotification({ type: 'new_review', title: 'Nouvel avis',
          body: data.message, icon: '⭐', link: '/dashboard' });
        break;

      case 'new_contact':
        this.toast({ type: 'info', title: 'Demande de contact',
          message: data.message, duration: 6000, icon: '📩' });
        this.addNotification({ type: 'new_contact', title: 'Demande de contact',
          body: data.message, icon: '📩', link: '/dashboard' });
        break;
    }
  }

  // ── Notification store ─────────────────────────────────────────────────

  private addNotification(partial: Omit<AppNotification, 'id' | 'read' | 'created_at'>): void {
    const n: AppNotification = {
      id: crypto.randomUUID(),
      read: false,
      created_at: new Date().toISOString(),
      ...partial,
    };
    this.notifsSubject.next([n, ...this.notifsSubject.value].slice(0, 50));
  }

  markAllRead(): void {
    this.notifsSubject.next(this.notifsSubject.value.map(n => ({ ...n, read: true })));
  }
  markRead(id: string): void {
    this.notifsSubject.next(
      this.notifsSubject.value.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }
  clearAll(): void { this.notifsSubject.next([]); }

  // ── Toast API ──────────────────────────────────────────────────────────

  toast(options: Omit<Toast, 'id'>): void {
    const t: Toast = { id: crypto.randomUUID(), duration: 4000, ...options };
    this.toastsSubject.next([...this.toastsSubject.value, t]);
    if (t.duration && t.duration > 0) {
      setTimeout(() => this.dismiss(t.id), t.duration);
    }
  }

  dismiss(id: string): void {
    this.toastsSubject.next(this.toastsSubject.value.filter(t => t.id !== id));
  }

  success(title: string, msg?: string): void {
    this.toast({ type: 'success', title, message: msg, duration: 4000, icon: '✅' });
  }
  error(title: string, msg?: string): void {
    this.toast({ type: 'error', title, message: msg, duration: 5000, icon: '❌' });
  }
  info(title: string, msg?: string): void {
    this.toast({ type: 'info', title, message: msg, duration: 4000, icon: 'ℹ️' });
  }
  warning(title: string, msg?: string): void {
    this.toast({ type: 'warning', title, message: msg, duration: 4500, icon: '⚠️' });
  }
}