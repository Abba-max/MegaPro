import {
  Component, OnInit, OnDestroy, AfterViewChecked,
  ElementRef, ViewChild, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  LucideAngularModule,
  Send, Search, Paperclip,
  CheckCheck, Check, Home, ArrowLeft, Clock, MessageSquare, Download, File
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
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  readonly SendIcon = Send;
  readonly SearchIcon = Search;
  readonly PaperclipIcon = Paperclip;
  readonly CheckCheckIcon = CheckCheck;
  readonly CheckIcon = Check;
  readonly HomeIcon = Home;
  readonly ArrowLeftIcon = ArrowLeft;
  readonly ClockIcon = Clock;
  readonly MessageSquareIcon = MessageSquare;
  readonly DownloadIcon = Download;
  readonly FileIcon = File;

  currentUser: User | null = null;
  searchQuery = '';
  newMessage = '';
  showSidebar = true;
  isLoading = true;
  isSending = false;
  isUploadingFile = false;

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
   * Called for every message broadcast by the server via WebSocketService.messages$.
   *
   * The server (ws_utils.broadcast_chat_message) sends these fields:
   *   id, conversation, text, sender, sender_name, sender_username, read, created_at
   *
   * Single-source-of-truth rule:
   *   - If WS is open and we sent via WS, the server echo is the authoritative record.
   *     We add it here; we never also add it from the HTTP response.
   *   - If we sent via HTTP (WS was closed), we already added the msg in sendMessage().
   *     The WS is not active, so this handler is not called — no dedup needed.
   *   - Dedup guard: skip any msg whose DB id already exists in the list.
   */
  private handleIncomingWsMessage(data: any): void {
    if (!this.activeConversation) {
      console.warn('[MSG] Received message but no active conversation');
      return;
    }
    if (data.conversation !== this.activeConversation.id) {
      console.warn('[MSG] Message is for different conversation, ignoring');
      return;
    }

    // Validate required fields
    if (!data.id || data.sender === undefined || !data.text || !data.created_at) {
      console.error('[MSG] Invalid message format received:', data);
      return;
    }

    // Dedup by DB id — the only reliable key
    const alreadyExists = this.activeConversation.messages.some(m => m.id === data.id);
    if (alreadyExists) {
      console.warn('[MSG] Duplicate message (id=' + data.id + '), ignoring');
      return;
    }

    const msg = this.wsMsgToChatMessage(data);
    this.activeConversation.messages.push(msg);

    this.activeConversation.last_message = {
      text: data.text,
      created_at: data.created_at,
      sender_id: data.sender,
    };

    // Toast only for incoming messages (not our own echo)
    if (!this.isMine(msg)) {
      const name = this.getPartnerName(this.activeConversation);
      this.notifService.toast({
        type: 'message', icon: '💬', title: name,
        message: data.text.length > 60 ? data.text.slice(0, 60) + '…' : data.text,
        duration: 4000,
      });
      this.estateService.markConversationRead(this.activeConversation.id)
        .subscribe({ error: () => { } });
    }

    this.shouldScroll = true;
    this.loadConversations(); // refresh sidebar badges
    this.cdr.detectChanges();
    
    console.info('[MSG] Message added (id=' + msg.id + ') from ' + 
                 (msg.sender === this.currentUser?.id ? 'self' : 'peer'));
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
    this.newMessage = '';

    // ── Strategy: single source of truth with fallback ──────────────────
    // WS open  → send via WS only; server echo adds msg via handleIncomingWsMessage().
    // WS closed → send via HTTP; add response directly; no echo expected.
    // If WS fails unexpectedly → automatically fallback to HTTP
    // ─────────────────────────────────────────────────────────────────────

    const attemptWsSend = (): boolean => {
      return this.wsService.sendChatMessage(
        text,
        this.currentUser!.id!,
        this.currentUser!.name
      );
    };

    const attemptHttpSend = (): void => {
      this.estateService.sendMessage(convId, text).subscribe({
        next: msg => {
          if (this.activeConversation) {
            this.activeConversation.messages.push(msg);
            this.activeConversation.last_message = {
              text: msg.text,
              created_at: msg.created_at,
              sender_id: msg.sender,
            };
          }
          this.isSending = false;
          this.shouldScroll = true;
          this.loadConversations();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('HTTP send failed:', err);
          this.newMessage = text; // restore for retry
          this.isSending = false;
          this.notifService.error(
            'Erreur d\'envoi',
            'Impossible d\'envoyer le message. Réessayez.'
          );
          this.cdr.detectChanges();
        },
      });
    };

    // Try WS first
    if (attemptWsSend()) {
      // Message queued on WS, server will echo it back
      this.isSending = false;
      console.info('[MSG] Sent via WebSocket');
    } else {
      // WS not available, try HTTP immediately
      console.warn('[MSG] WS unavailable, falling back to HTTP');
      attemptHttpSend();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // ── File Upload ────────────────────────────────────────────────────────

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any): void {
    const files: File[] = event.target.files;
    if (!files || files.length === 0) return;
    
    for (let file of files) {
      this.uploadFile(file);
    }

    // Reset file input
    this.fileInput.nativeElement.value = '';
  }

  private uploadFile(file: File): void {
    if (!this.activeConversation || this.isUploadingFile) return;

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      this.notifService.error('Fichier trop volumineux', 'La taille maximale est 10 MB');
      return;
    }

    this.isUploadingFile = true;
    const convId = this.activeConversation.id;
    const fileName = file.name;
    const fileSize = this.formatFileSize(file.size);

    // Send file via the backend
    this.estateService.sendMessageWithFile(convId, file).subscribe({
      next: (msg) => {
        if (this.activeConversation) {
          this.activeConversation.messages.push(msg);
          this.activeConversation.last_message = {
            text: `📎 ${fileName}`,
            created_at: msg.created_at,
            sender_id: msg.sender,
          };
        }
        this.isUploadingFile = false;
        this.shouldScroll = true;
        this.loadConversations();
        this.notifService.success('Fichier envoyé', `${fileName} a été envoyé avec succès`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('File upload failed:', err);
        this.isUploadingFile = false;
        this.notifService.error(
          'Erreur d\'envoi',
          `Impossible d'envoyer le fichier. Réessayez.`
        );
        this.cdr.detectChanges();
      }
    });
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
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