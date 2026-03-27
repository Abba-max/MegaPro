// src/app/pages/messages/messages.component.ts
import {
  Component, OnInit, OnDestroy, AfterViewChecked,
  ElementRef, ViewChild, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  LucideAngularModule,
  Send, Search, Phone, MoreVertical, Paperclip,
  CheckCheck, Check, Home, ArrowLeft, Clock, MessageSquare
} from 'lucide-angular';
import { AuthService, User } from '../../services/auth.service';
import { EstateService, Conversation, ChatMessage } from '../../services/estate.service';
import { WebSocketService } from '../../services/websocket.service';
import { NotificationService } from '../../services/notification.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.css'
})
export class MessagesComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesViewport') messagesViewport!: ElementRef;

  readonly SendIcon = Send;
  readonly SearchIcon = Search;
  readonly PhoneIcon = Phone;
  readonly MoreIcon = MoreVertical;
  readonly PaperclipIcon = Paperclip;
  readonly CheckCheckIcon = CheckCheck;
  readonly CheckIcon = Check;
  readonly HomeIcon = Home;
  readonly ArrowLeftIcon = ArrowLeft;
  readonly ClockIcon = Clock;
  readonly MessageSquareIcon = MessageSquare;

  currentUser: User | null = null;
  searchQuery = '';
  newMessage = '';
  showSidebar = true;
  isLoading = true;
  isSending = false;

  conversations: Conversation[] = [];
  activeConversation: Conversation | null = null;
  onlineUsers: Set<number> = new Set();

  private shouldScroll = false;
  private subs: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private estateService: EstateService,
    private wsService: WebSocketService,
    private notifService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const s1 = this.authService.currentUser$.subscribe(u => {
      this.currentUser = u;
      if (u) this.loadConversations();
    });

    // FIX: Listen to incoming WS messages from WebSocketService (single WS owner).
    const s2 = this.wsService.messages$.subscribe(data => {
      this.handleIncomingWsMessage(data);
    });

    // Initial fetch of online users
    this.refreshOnlineUsers();

    // Poll online users every 30 seconds
    const s3 = interval(30000).subscribe(() => this.refreshOnlineUsers());

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

  // ── Data ───────────────────────────────────────────────────────────────

  loadConversations(): void {
    this.isLoading = true;
    this.estateService.getConversations().subscribe({
      next: convs => {
        this.conversations = convs;
        this.isLoading = false;
        if (this.activeConversation) {
          const updated = convs.find(c => c.id === this.activeConversation!.id);
          if (updated) {
            this.activeConversation = {
              ...updated,
              messages: this.activeConversation!.messages
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
    this.activeConversation = { ...conv, messages: conv.messages || [] };
    this.showSidebar = false;
    this.shouldScroll = true;

    // Optimistically clear unread badge
    conv.unread_count = 0;

    // Mark as read on the server
    this.estateService.markConversationRead(conv.id).subscribe({ error: () => { } });

    // Load full message history
    this.estateService.getConversation(conv.id).subscribe({
      next: full => {
        this.activeConversation = full;
        this.shouldScroll = true;
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    // Connect WebSocket for real-time updates
    this.wsService.connectChat(conv.id);
  }

  backToList(): void {
    this.showSidebar = true;
    this.wsService.disconnectChat();
    this.loadConversations();
  }

  // ── Incoming WS messages ───────────────────────────────────────────────

  /**
   * Called for every message broadcast by the server.
   * This now covers BOTH sides:
   *   - Messages sent by the other participant  → add to list
   *   - Echoed back from our own send()         → replace the optimistic bubble
   */
  private handleIncomingWsMessage(data: any): void {
    if (!this.activeConversation) return;
    if (data.conversation !== this.activeConversation.id) return;

    const isMine = data.sender === this.currentUser?.id;

    if (isMine) {
      // Replace the temporary "sending" bubble with the real DB record
      const msgs = this.activeConversation.messages;
      const tempIdx = msgs.findIndex(
        m => m.id < 0 && m.text === data.text && m.sender === data.sender
      );
      if (tempIdx !== -1) {
        msgs[tempIdx] = this.wsMsgToChatMessage(data);
      } else {
        // Dedup: skip if we already have this id (HTTP response arrived first)
        if (!msgs.find(m => m.id === data.id)) {
          msgs.push(this.wsMsgToChatMessage(data));
        }
      }
    } else {
      // Message from the other party
      const exists = this.activeConversation.messages.find(m => m.id === data.id);
      if (!exists) {
        const msg = this.wsMsgToChatMessage(data);
        this.activeConversation.messages.push(msg);

        // Toast notification
        const name = this.getPartnerName(this.activeConversation);
        this.notifService.toast({
          type: 'message', icon: '💬', title: name,
          message: data.text.length > 60 ? data.text.slice(0, 60) + '…' : data.text,
          duration: 4000
        });

        // Mark as read since we're viewing this conversation
        this.estateService.markConversationRead(this.activeConversation.id)
          .subscribe({ error: () => { } });
      }
    }

    this.activeConversation.last_message = {
      text: data.text,
      created_at: data.created_at,
      sender_id: data.sender
    };

    this.shouldScroll = true;
    this.loadConversations(); // refresh sidebar badges
    this.cdr.detectChanges();
  }

  private wsMsgToChatMessage(data: any): ChatMessage {
    return {
      id: data.id,
      conversation: data.conversation,
      sender: data.sender,
      sender_name: data.sender_name || '',
      sender_username: data.sender_username || '',
      text: data.text,
      read: data.read ?? false,
      created_at: data.created_at,
    };
  }

  // ── Send ───────────────────────────────────────────────────────────────

  sendMessage(): void {
    const text = this.newMessage.trim();
    if (!text || !this.activeConversation || this.isSending) return;

    this.isSending = true;
    const convId = this.activeConversation.id;

    // Add an optimistic bubble with a temporary negative id
    const tempMsg: ChatMessage = {
      id: -Date.now(), // negative = temporary
      conversation: convId,
      sender: this.currentUser!.id!,
      sender_name: this.currentUser!.name,
      sender_username: '',
      text,
      read: false,
      created_at: new Date().toISOString(),
    };
    this.activeConversation.messages.push(tempMsg);
    this.shouldScroll = true;
    this.newMessage = '';
    this.cdr.detectChanges();

    // FIX: Single send path.
    // If the WebSocket is open, send via WS only — the consumer saves to DB
    // and broadcasts back (including to us), which replaces the temp bubble.
    // If WS is NOT open, fall back to HTTP POST, which also saves to DB.
    if (this.wsService.isChatOpen) {
      this.wsService.sendChatMessage(text, this.currentUser!.id!, this.currentUser!.name);
      // The echo from the server will replace the temp bubble via handleIncomingWsMessage
      this.isSending = false;
    } else {
      this.estateService.sendMessage(convId, text).subscribe({
        next: msg => {
          // Replace temp bubble with the real DB record
          const msgs = this.activeConversation!.messages;
          const idx = msgs.findIndex(m => m.id === tempMsg.id);
          if (idx !== -1) msgs[idx] = msg;
          this.activeConversation!.last_message = {
            text: msg.text, created_at: msg.created_at, sender_id: msg.sender
          };
          this.isSending = false;
          this.shouldScroll = true;
          this.loadConversations();
          this.cdr.detectChanges();
        },
        error: () => {
          // Remove the temp bubble and restore the input
          this.activeConversation!.messages = this.activeConversation!.messages
            .filter(m => m.id !== tempMsg.id);
          this.newMessage = text;
          this.isSending = false;
          this.notifService.error('Erreur d\'envoi', 'Impossible d\'envoyer le message. Réessayez.');
          this.cdr.detectChanges();
        }
      });
    }
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
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Hier';
    if (diff < 7) return d.toLocaleDateString('fr-FR', { weekday: 'long' });
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
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
    const isOwner = this.currentUser.role === 'Owner';
    const party = isOwner ? conv.client : conv.owner;
    return (`${party.first_name || ''} ${party.last_name || ''}`.trim()) || party.username;
  }

  getPartnerInitials(conv: Conversation): string {
    return this.getPartnerName(conv)
      .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
  }

  getPartnerColor(conv: Conversation): string {
    const c = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16'];
    return c[conv.id % c.length];
  }

  isMine(msg: ChatMessage): boolean {
    return msg.sender === this.currentUser?.id;
  }

  formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    if (diff === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diff === 1) return 'Hier';
    if (diff < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  getTotalUnread(): number {
    return this.conversations.reduce((s, c) => s + (c.unread_count || 0), 0);
  }

  getLastMessagePreview(conv: Conversation): string {
    const last = conv.last_message;
    if (!last?.text) return 'Démarrez la conversation…';
    const prefix = last.sender_id === this.currentUser?.id ? 'Vous: ' : '';
    const preview = last.text.length > 40 ? last.text.slice(0, 40) + '…' : last.text;
    return prefix + preview;
  }

  isPartnerOnline(conv: Conversation): boolean {
    const p = this.currentUser?.role === 'Owner' ? conv.client : conv.owner;
    return this.onlineUsers.has(p?.id);
  }

  getOnlineStatus(conv: Conversation): string {
    return this.isPartnerOnline(conv) ? 'En ligne' : 'Hors ligne';
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