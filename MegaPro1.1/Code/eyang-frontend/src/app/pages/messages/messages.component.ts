import { Component, OnInit, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Send, Search, Phone, MoreVertical, Paperclip, Smile, CheckCheck, Check, Home, ArrowLeft } from 'lucide-angular';
import { AuthService, User } from '../../services/auth.service';

export interface Message {
  id: number;
  senderId: number;
  senderName: string;
  text: string;
  time: string;
  read: boolean;
  type: 'sent' | 'received';
}

export interface Conversation {
  id: number;
  contactName: string;
  contactInitials: string;
  contactColor: string;
  estateTitle: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: Message[];
  isOwner: boolean; // true = the other party is owner
}

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.css'
})
export class MessagesComponent implements OnInit, AfterViewChecked {
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
  searchQuery = '';
  newMessage  = '';
  showSidebar = true; // mobile: toggle sidebar

  conversations: Conversation[] = [
    {
      id: 1,
      contactName: 'Jean Eyenga',
      contactInitials: 'JE',
      contactColor: '#3B82F6',
      estateTitle: 'Cité Universitaire Soa',
      lastMessage: 'Bonjour, est-ce que la chambre est encore disponible ?',
      lastTime: '10:42',
      unread: 2,
      isOwner: true,
      messages: [
        { id: 1, senderId: 99, senderName: 'Jean Eyenga',  text: 'Bonjour, est-ce que la chambre est encore disponible ?', time: '10:40', read: true,  type: 'received' },
        { id: 2, senderId: 0,  senderName: 'Moi',          text: 'Oui, il reste 2 places disponibles.', time: '10:41', read: true,  type: 'sent' },
        { id: 3, senderId: 99, senderName: 'Jean Eyenga',  text: 'Parfait ! Quel est le montant de la caution ?', time: '10:42', read: false, type: 'received' },
      ]
    },
    {
      id: 2,
      contactName: 'Marie Kamga',
      contactInitials: 'MK',
      contactColor: '#10B981',
      estateTitle: 'Résidence Les Palmiers',
      lastMessage: 'Merci pour l\'information, je vais confirmer.',
      lastTime: 'Hier',
      unread: 0,
      isOwner: false,
      messages: [
        { id: 1, senderId: 0,  senderName: 'Moi',        text: 'Bonjour, je suis intéressée par votre logement.', time: 'Hier 09:15', read: true, type: 'sent' },
        { id: 2, senderId: 88, senderName: 'Marie Kamga', text: 'Bonjour ! Oui, la chambre est disponible à partir du 1er mars.', time: 'Hier 09:30', read: true, type: 'received' },
        { id: 3, senderId: 0,  senderName: 'Moi',        text: 'Merci pour l\'information, je vais confirmer.', time: 'Hier 09:45', read: true, type: 'sent' },
      ]
    },
    {
      id: 3,
      contactName: 'Paul Nkemdirim',
      contactInitials: 'PN',
      contactColor: '#8B5CF6',
      estateTitle: 'Studio Melen',
      lastMessage: 'D\'accord, à bientôt !',
      lastTime: '02/03',
      unread: 0,
      isOwner: true,
      messages: [
        { id: 1, senderId: 77, senderName: 'Paul Nkemdirim', text: 'Bonjour, je voudrais visiter le logement.', time: '02/03 14:00', read: true, type: 'received' },
        { id: 2, senderId: 0,  senderName: 'Moi',            text: 'Bien sûr, quand êtes-vous disponible ?', time: '02/03 14:10', read: true, type: 'sent' },
        { id: 3, senderId: 77, senderName: 'Paul Nkemdirim', text: 'D\'accord, à bientôt !', time: '02/03 14:20', read: true, type: 'received' },
      ]
    }
  ];

  activeConversation: Conversation | null = null;
  private shouldScroll = false;

  ngOnInit(): void {
    // Auto-select first conversation
    if (this.conversations.length > 0) {
      this.selectConversation(this.conversations[0]);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  get filteredConversations(): Conversation[] {
    if (!this.searchQuery.trim()) return this.conversations;
    const q = this.searchQuery.toLowerCase();
    return this.conversations.filter(c =>
      c.contactName.toLowerCase().includes(q) ||
      c.estateTitle.toLowerCase().includes(q)
    );
  }

  selectConversation(conv: Conversation): void {
    this.activeConversation = conv;
    conv.unread = 0;
    this.shouldScroll = true;
    // On mobile, hide sidebar when conversation selected
    this.showSidebar = false;
  }

  backToList(): void {
    this.showSidebar = true;
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.activeConversation) return;
    const now = new Date();
    const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const msg: Message = {
      id:         Date.now(),
      senderId:   0,
      senderName: 'Moi',
      text:       this.newMessage.trim(),
      time,
      read:       false,
      type:       'sent'
    };
    this.activeConversation.messages.push(msg);
    this.activeConversation.lastMessage = msg.text;
    this.activeConversation.lastTime    = time;
    this.newMessage  = '';
    this.shouldScroll = true;
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesViewport?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  getTotalUnread(): number {
    return this.conversations.reduce((sum, c) => sum + c.unread, 0);
  }
}