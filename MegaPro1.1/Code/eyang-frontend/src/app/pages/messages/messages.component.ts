import { Component, OnInit, OnDestroy, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Send, Search, Phone, MoreVertical, Paperclip, Smile, CheckCheck, Check, Home, ArrowLeft } from 'lucide-angular';
import { AuthService, User } from '../../services/auth.service';
import { EstateService, Conversation, ChatMessage } from '../../services/estate.service';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.css'
})
export class MessagesComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesViewport') messagesViewport!: ElementRef;

  readonly SendIcon       = Send;
  readonly SearchIcon     = Search;
  readonly PhoneIcon      = Phone;
  readonly MoreIcon       = MoreVertical;
  readonly PaperclipIcon  = Paperclip;
  readonly SmileIcon      = Smile;
  readonly CheckCheckIcon = CheckCheck;
  readonly CheckIcon      = Check;
  readonly HomeIcon       = Home;
  readonly ArrowLeftIcon  = ArrowLeft;

  currentUser: User | null = null;
  searchQuery  = '';
  newMessage   = '';
  showSidebar  = true;
  isLoading    = true;
  isSending    = false;

  conversations: Conversation[]      = [];
  activeConversation: Conversation | null = null;

  private shouldScroll = false;
  private pollSub?: Subscription;
  private subs: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private estateService: EstateService
  ) {}

  ngOnInit(): void {
    const sub = this.authService.currentUser$.subscribe(u => {
      this.currentUser = u;
      if (u) this.loadConversations();
    });
    this.subs.push(sub);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.pollSub?.unsubscribe();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  // ── Data ──────────────────────────────────────────────────

  loadConversations(): void {
    this.isLoading = true;
    this.estateService.getConversations().subscribe({
      next: (convs) => {
        this.conversations = convs;
        this.isLoading = false;
        // Re-select active conversation if it still exists
        if (this.activeConversation) {
          const updated = convs.find(c => c.id === this.activeConversation!.id);
          if (updated) this.activeConversation = updated;
        }
      },
      error: () => { this.isLoading = false; }
    });
  }

  selectConversation(conv: Conversation): void {
    this.activeConversation = conv;
    this.showSidebar = false;
    this.shouldScroll = true;

    // Mark as read
    this.estateService.markConversationRead(conv.id).subscribe({
      next: () => { conv.unread_count = 0; },
      error: () => {}
    });

    // Load full messages for this conversation
    this.estateService.getConversation(conv.id).subscribe({
      next: (full) => {
        this.activeConversation = full;
        this.shouldScroll = true;
      },
      error: () => {}
    });

    // Start polling for new messages
    this.startPolling(conv.id);
  }

  backToList(): void {
    this.showSidebar = true;
    this.pollSub?.unsubscribe();
    this.loadConversations();
  }

  // ── Polling ───────────────────────────────────────────────

  private startPolling(convId: number): void {
    this.pollSub?.unsubscribe();
    this.pollSub = interval(5000).pipe(
      switchMap(() => this.estateService.getConversation(convId))
    ).subscribe({
      next: (conv) => {
        const prevCount = this.activeConversation?.messages.length ?? 0;
        this.activeConversation = conv;
        if (conv.messages.length > prevCount) this.shouldScroll = true;
      },
      error: () => {}
    });
  }

  // ── Send ──────────────────────────────────────────────────

  sendMessage(): void {
    const text = this.newMessage.trim();
    if (!text || !this.activeConversation || this.isSending) return;

    this.isSending = true;
    this.newMessage = '';

    this.estateService.sendMessage(this.activeConversation.id, text).subscribe({
      next: (msg) => {
        this.activeConversation!.messages.push(msg);
        this.activeConversation!.last_message = {
          text: msg.text,
          created_at: msg.created_at,
          sender_id: msg.sender
        };
        this.isSending = false;
        this.shouldScroll = true;
      },
      error: () => {
        this.newMessage = text; // restore on error
        this.isSending = false;
      }
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  get filteredConversations(): Conversation[] {
    if (!this.searchQuery.trim()) return this.conversations;
    const q = this.searchQuery.toLowerCase();
    return this.conversations.filter(c =>
      this.getPartnerName(c).toLowerCase().includes(q) ||
      c.estate_name?.toLowerCase().includes(q)
    );
  }

  /** Returns the "other party" name from the current user's perspective */
  getPartnerName(conv: Conversation): string {
    if (!this.currentUser) return '?';
    const isOwner = this.currentUser.role === 'Owner';
    const party = isOwner ? conv.client : conv.owner;
    return (`${party.first_name} ${party.last_name}`.trim()) || party.username;
  }

  getPartnerInitials(conv: Conversation): string {
    return this.getPartnerName(conv)
      .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
  }

  getPartnerColor(conv: Conversation): string {
    // Deterministic color from conversation id
    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];
    return colors[conv.id % colors.length];
  }

  isMine(msg: ChatMessage): boolean {
    return msg.sender === this.currentUser?.id;
  }

  formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7)  return d.toLocaleDateString('fr-FR', { weekday: 'short' });
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  getTotalUnread(): number {
    return this.conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesViewport?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}