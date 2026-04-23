import {
  Component, OnInit, OnDestroy, AfterViewChecked,
  ElementRef, ViewChild, ChangeDetectorRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  LucideAngularModule,
  Send, Search,
  CheckCheck, Check, Home, ArrowLeft, Clock, MessageSquare
} from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService, User } from '../../services/auth.service';
import { EstateService, Conversation, ChatMessage } from '../../services/estate.service';
import { WebSocketService } from '../../services/websocket.service';
import { NotificationService } from '../../services/notification.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule, TranslateModule],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.css'
})
export class MessagesComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesViewport') messagesViewport!: ElementRef;

  readonly SendIcon          = Send;
  readonly SearchIcon        = Search;
  readonly CheckCheckIcon    = CheckCheck;
  readonly CheckIcon         = Check;
  readonly HomeIcon          = Home;
  readonly ArrowLeftIcon     = ArrowLeft;
  readonly ClockIcon         = Clock;
  readonly MessageSquareIcon = MessageSquare;

  currentUser: User | null            = null;
  searchQuery                         = '';
  newMessage                          = '';
  showSidebar                         = true;
  isLoading                           = true;
  isSending                           = false;

  conversations: Conversation[]       = [];
  activeConversation: Conversation | null = null;
  onlineUsers: Set<number>            = new Set();

  private shouldScroll = false;
  private subs: Subscription[] = [];

  constructor(
    private authService:   AuthService,
    private estateService: EstateService,
    // public → template reads wsService.isChatOpen for the live indicator
    public  wsService:     WebSocketService,
    private notifService:  NotificationService,
    private cdr:           ChangeDetectorRef,
    private ngZone:        NgZone,
    private translate:     TranslateService
  ) {}

  ngOnInit(): void {
    // ── Auth ──────────────────────────────────────────────────────────────
    const s1 = this.authService.currentUser$.subscribe(u => {
      this.currentUser = u;
      if (u) this.loadConversations();
    });

    // ── WebSocket chat messages ───────────────────────────────────────────
    // WebSocketService already calls ngZone.run() before emitting, so every
    // subscriber receives the value inside the Angular zone automatically.
    const s2 = this.wsService.messages$.subscribe(data =>
      this.handleIncomingWsMessage(data)
    );

    // ── Online presence poll (30 s) ───────────────────────────────────────
    this.refreshOnlineUsers();
    const s3 = interval(30_000).subscribe(() => this.refreshOnlineUsers());

    this.subs.push(s1, s2, s3);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.wsService.disconnectChat();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  // ── Conversations ──────────────────────────────────────────────────────

  loadConversations(): void {
    this.isLoading = true;
    this.estateService.getConversations().subscribe({
      next: convs => {
        this.conversations = convs;
        this.isLoading     = false;
        // Keep the open conversation's existing messages array intact
        if (this.activeConversation) {
          const updated = convs.find(c => c.id === this.activeConversation!.id);
          if (updated) {
            this.activeConversation = {
              ...updated,
              messages: this.activeConversation!.messages,
            };
          }
        }
        this.cdr.detectChanges();
      },
      error: () => { this.isLoading = false; }
    });
  }

  private refreshOnlineUsers(): void {
    if (!this.currentUser) return;
    this.estateService.getOnlineUsers().subscribe({
      next: res => {
        this.onlineUsers = new Set(res.online_user_ids);
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  selectConversation(conv: Conversation): void {
    if (this.activeConversation?.id === conv.id) return;

    // 1. Show instantly — don't wait for HTTP
    this.activeConversation = { ...conv, messages: conv.messages || [] };
    this.showSidebar        = false;
    this.shouldScroll       = true;
    conv.unread_count       = 0;

    this.estateService.markConversationRead(conv.id).subscribe({ error: () => {} });

    // 2. Connect WS BEFORE the HTTP fetch — no messages missed during load
    this.wsService.connectChat(conv.id);

    // 3. Fetch full history and merge with any WS frames that arrived in-flight
    this.estateService.getConversation(conv.id).subscribe({
      next: full => {
        if (this.activeConversation?.id !== full.id) return; // user switched away
        const serverIds = new Set(full.messages.map((m: ChatMessage) => m.id));
        const pending   = (this.activeConversation.messages || []).filter(
          m => !serverIds.has(m.id)
        );
        this.activeConversation = {
          ...full,
          messages: [...full.messages, ...pending],
        };
        this.shouldScroll = true;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  backToList(): void {
    this.showSidebar        = true;
    this.activeConversation = null;
    this.wsService.disconnectChat();
    this.loadConversations();
  }

  // ══════════════════════════════════════════════════════════════════════
  //  WebSocket message handler
  //  Called for every frame the server pushes on the chat socket.
  // ══════════════════════════════════════════════════════════════════════

  private handleIncomingWsMessage(data: any): void {
    // Drop malformed frames early
    if (!data.id || data.sender === undefined || !data.created_at) return;

    // ── A. Message for a BACKGROUND conversation — sidebar update only ────
    if (!this.activeConversation || this.activeConversation.id !== data.conversation) {
      const conv = this.conversations.find(c => c.id === data.conversation);
      if (conv) {
        conv.last_message = {
          text: data.text, created_at: data.created_at, sender_id: data.sender,
        };
        conv.updated_at = data.created_at;
        // Only bump unread count for the other party's messages
        if (data.sender !== this.currentUser?.id) {
          conv.unread_count = (conv.unread_count || 0) + 1;
        }
        // Bubble to top of sidebar list
        this.conversations = [conv, ...this.conversations.filter(c => c.id !== conv.id)];
        this.cdr.detectChanges();
      }
      return;
    }

    // ── B. Message for the ACTIVE conversation ───────────────────────────

    const isOwnEcho = data.sender === this.currentUser?.id;

    // B1. Own-echo: replace the optimistic bubble (has a negative temp id)
    if (isOwnEcho) {
      const idx = this.activeConversation.messages.findIndex(
        m => (m.id as unknown as number) < 0 && m.text === data.text
      );
      if (idx !== -1) {
        this.activeConversation.messages[idx] = this.toMsg(data);
        this.activeConversation.last_message  = {
          text: data.text, created_at: data.created_at, sender_id: data.sender,
        };
        this.bumpConvTop(data);
        this.cdr.detectChanges();
        return;
      }
    }

    // B2. Exact duplicate guard (HTTP fallback already appended it)
    if (this.activeConversation.messages.some(m => m.id === data.id)) return;

    // B3. Append incoming message
    this.activeConversation.messages.push(this.toMsg(data));
    this.activeConversation.last_message = {
      text: data.text, created_at: data.created_at, sender_id: data.sender,
    };

    // Auto-mark as read since the conversation is open
    if (!isOwnEcho) {
      this.estateService.markConversationRead(this.activeConversation.id)
        .subscribe({ error: () => {} });
    }

    this.bumpConvTop(data);
    this.shouldScroll = true;
    this.cdr.detectChanges();
  }

  // ── Sidebar: bubble conversation to top using a WS frame ──────────────
  private bumpConvTop(data: any): void {
    const conv = this.conversations.find(c => c.id === (data.conversation ?? data.id));
    if (!conv) return;
    if (data.text !== undefined) {
      conv.last_message = {
        text: data.text, created_at: data.created_at, sender_id: data.sender,
      };
      conv.updated_at = data.created_at;
    }
    this.conversations = [conv, ...this.conversations.filter(c => c.id !== conv.id)];
  }

  private toMsg(data: any): ChatMessage {
    return {
      id:              data.id,
      conversation:    data.conversation,
      sender:          data.sender,
      sender_name:     data.sender_name     || '',
      sender_username: data.sender_username || '',
      text:            data.text,
      read:            data.read ?? false,
      created_at:      data.created_at,
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  //  Send message
  // ══════════════════════════════════════════════════════════════════════

  sendMessage(): void {
    const text = this.newMessage.trim();
    if (!text || !this.activeConversation || !this.currentUser?.id) return;

    const convId = this.activeConversation.id;
    this.newMessage = '';

    // ── Optimistic bubble (negative temp id for later echo matching) ─────
    const tempId = -(Date.now());
    const optimistic: ChatMessage = {
      id:              tempId as unknown as number,
      conversation:    convId,
      sender:          this.currentUser.id,
      sender_name:     this.currentUser.name,
      sender_username: this.currentUser.name || '',
      text,
      read:            false,
      created_at:      new Date().toISOString(),
    };
    this.activeConversation.messages.push(optimistic);
    this.shouldScroll = true;
    this.cdr.detectChanges();

    // ── Helpers ───────────────────────────────────────────────────────────
    const removeOptimistic = () => {
      if (!this.activeConversation) return;
      const i = this.activeConversation.messages.findIndex(m => m.id === tempId);
      if (i !== -1) this.activeConversation.messages.splice(i, 1);
    };

    const replaceOptimistic = (msg: ChatMessage) => {
      if (!this.activeConversation) return;
      const i = this.activeConversation.messages.findIndex(m => m.id === tempId);
      if (i !== -1) {
        this.activeConversation.messages[i] = msg;
      } else if (!this.activeConversation.messages.some(m => m.id === msg.id)) {
        this.activeConversation.messages.push(msg);
      }
      this.activeConversation.last_message = {
        text: msg.text, created_at: msg.created_at, sender_id: msg.sender,
      };
      this.bumpConvTop(msg);
    };

    // ── WebSocket path ─────────────────────────────────────────────────────
    // Server echoes the saved message back → handleIncomingWsMessage()
    // finds the optimistic bubble via tempId and replaces it instantly.
    const wsSent = this.wsService.sendChatMessage(
      text,
      this.currentUser.id,
      this.currentUser.name
    );
    if (wsSent) return; // WS queued — done until echo arrives

    // ── HTTP fallback (WS not open) ────────────────────────────────────────
    this.isSending = true;
    this.estateService.sendMessage(convId, text).subscribe({
      next: msg => {
        replaceOptimistic(msg);
        this.isSending    = false;
        this.shouldScroll = true;
        this.cdr.detectChanges();
      },
      error: () => {
        removeOptimistic();
        this.newMessage = text; // restore so user can retry
        this.isSending  = false;
        this.notifService.error(
          this.translate.instant('messages.send_error'),
          this.translate.instant('messages.retry_send')
        );
        this.cdr.detectChanges();
      },
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // ── Grouped messages with date separators ─────────────────────────────

  get groupedMessages(): { type: 'separator' | 'message'; label?: string; msg?: ChatMessage }[] {
    if (!this.activeConversation) return [];
    const result: { type: 'separator' | 'message'; label?: string; msg?: ChatMessage }[] = [];
    let lastDate = '';
    for (const msg of this.activeConversation.messages) {
      const key = new Date(msg.created_at).toDateString();
      if (key !== lastDate) {
        result.push({ type: 'separator', label: this.dateLabel(msg.created_at) });
        lastDate = key;
      }
      result.push({ type: 'message', msg });
    }
    return result;
  }

  private dateLabel(dateStr: string): string {
    const d    = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    const lang = this.translate.currentLang || 'fr';
    if (diff === 0) return lang === 'fr' ? "Aujourd'hui" : 'Today';
    if (diff === 1) return lang === 'fr' ? 'Hier' : 'Yesterday';
    if (diff < 7)   return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long' });
    return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  get filteredConversations(): Conversation[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.conversations;
    return this.conversations.filter(c =>
      this.getPartnerName(c).toLowerCase().includes(q) ||
      c.estate_name?.toLowerCase().includes(q)
    );
  }

  getPartnerName(conv: Conversation): string {
    if (!this.currentUser) return '?';
    const party = this.currentUser.role === 'Owner' ? conv.client : conv.owner;
    return (`${party.first_name || ''} ${party.last_name || ''}`.trim()) || party.username;
  }

  getPartnerInitials(conv: Conversation): string {
    return this.getPartnerName(conv)
      .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
  }

  getPartnerColor(conv: Conversation): string {
    const c = ['#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#EC4899','#84CC16'];
    return c[conv.id % c.length];
  }

  isMine(msg: ChatMessage): boolean { return msg.sender === this.currentUser?.id; }

  formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    const d    = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    if (diff === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diff === 1) return 'Hier';
    if (diff < 7)   return d.toLocaleDateString('fr-FR', { weekday: 'short' });
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  getTotalUnread(): number {
    return this.conversations.reduce((s, c) => s + (c.unread_count || 0), 0);
  }

  getLastMessagePreview(conv: Conversation): string {
    const last = conv.last_message;
    if (!last?.text) return this.translate.instant('messages.start_conv');
    const prefix  = last.sender_id === this.currentUser?.id
      ? this.translate.instant('messages.you_prefix') : '';
    const preview = last.text.length > 40 ? last.text.slice(0, 40) + '…' : last.text;
    return prefix + preview;
  }

  isPartnerOnline(conv: Conversation): boolean {
    const p = this.currentUser?.role === 'Owner' ? conv.client : conv.owner;
    return this.onlineUsers.has(p?.id);
  }

  getOnlineStatus(conv: Conversation): string {
    return this.isPartnerOnline(conv)
      ? this.translate.instant('messages.online')
      : this.translate.instant('messages.offline');
  }

  getReadReceiptLabel(msg: ChatMessage): string {
    if (!this.isMine(msg) || !msg.read) return '';
    return `Lu à ${new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  isLastSentMessage(msg: ChatMessage): boolean {
    if (!this.activeConversation) return false;
    const sent = this.activeConversation.messages.filter(m => this.isMine(m));
    return sent.length > 0 && sent[sent.length - 1].id === msg.id;
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesViewport?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { /* ignore */ }
  }
}