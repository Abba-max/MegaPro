import { Component, OnInit, OnDestroy, AfterViewChecked, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  LucideAngularModule,
  Home, BarChart3, Clock, Star, Plus, Trash2, X,
  Wifi, Utensils, Zap, Droplets, Tv, Thermometer,
  MessageSquare, FileText, Phone, MapPin, Calendar,
  CheckCircle, AlertCircle, Info, Send, ArrowLeft,
  Edit, Package, User, Mail, Building, Pencil
} from 'lucide-angular';
import { AuthService, User as AuthUser } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import {
  EstateService, Estate, EstateRaw, EstateImage, QuickOrder, Review, ContactRequest,
  Conversation, ChatMessage, OwnerDashboardStats, ClientDashboardStats,
  enrichReview
} from '../../services/estate.service';
import { Subscription } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, RouterModule, TranslateModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('ownerViewport') ownerViewport?: ElementRef;
  private shouldScroll = false;

  // ── Icons ─────────────────────────────────────────────────
  readonly HomeIcon = Home;
  readonly BarChartIcon = BarChart3;
  readonly ClockIcon = Clock;
  readonly StarIcon = Star;
  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;
  readonly XIcon = X;
  readonly WifiIcon = Wifi;
  readonly UtensilsIcon = Utensils;
  readonly ZapIcon = Zap;
  readonly DropletsIcon = Droplets;
  readonly TvIcon = Tv;
  readonly FridgeIcon = Thermometer;
  readonly MessageIcon = MessageSquare;
  readonly FileIcon = FileText;
  readonly PhoneIcon = Phone;
  readonly MapPinIcon = MapPin;
  readonly CalendarIcon = Calendar;
  readonly CheckIcon = CheckCircle;
  readonly AlertIcon = AlertCircle;
  readonly InfoIcon = Info;
  readonly SendIcon = Send;
  readonly BackIcon = ArrowLeft;
  readonly EditIcon = Edit;
  readonly PencilIcon = Pencil;
  readonly PackageIcon = Package;
  readonly UserIcon = User;
  readonly MailIcon = Mail;
  readonly BuildingIcon = Building;

  // ── State ─────────────────────────────────────────────────
  currentUser: AuthUser | null = null;
  isOwner = false;
  isLoading = true;
  activeTab = 'overview';

  toasts: Toast[] = [];
  private toastCounter = 0;

  // ── Owner ─────────────────────────────────────────────────
  ownerStats: OwnerDashboardStats = {
    total_estates: 0, occupancy_pct: 0, pending_orders: 0, avg_rating: 0
  };
  myEstates: Estate[] = [];
  myOrders: QuickOrder[] = [];
  myReviews: Review[] = [];

  showEstateModal = false;
  isEditMode = false;
  editingId: number | null = null;
  isSavingEstate = false;
  estateForm: any = {};
  distanceDisplay = '';

  newImageFiles: File[] = [];
  newImagePreviews: string[] = [];

  availableEquipments = [
    { key: 'wifi', label: 'WiFi', icon: Wifi },
    { key: 'restaurant', label: 'Restaurant', icon: Utensils },
    { key: 'generator', label: 'Générateur', icon: Zap },
    { key: 'forage', label: 'Forage', icon: Droplets },
    { key: 'tv', label: 'Télévision', icon: Tv },
    { key: 'fridge', label: 'Réfrigérateur', icon: Thermometer },
  ];

  // ── Owner messaging ───────────────────────────────────────
  ownerConversationsLoading = false;

  // ── Client ────────────────────────────────────────────────
  clientStats: ClientDashboardStats = {
    total_reservations: 0, total_reviews: 0, total_messages: 0, total_contacts: 0
  };
  myReservations: QuickOrder[] = [];
  mySubmittedReviews: Review[] = [];
  myContacts: ContactRequest[] = [];
  conversations: Conversation[] = [];

  activeConversation: Conversation | null = null;
  newMessage = '';
  private pollSub?: Subscription;

  // ── Review modal (create) ─────────────────────────────────
  showReviewModal = false;
  reviewForm = { estate: 0, rating: 0, comment: '' };
  hoverRating = 0;
  allEstates: Estate[] = [];

  // ── Review edit modal ─────────────────────────────────────
  showEditReviewModal = false;
  editingReview: Review | null = null;
  editReviewForm = { rating: 0, comment: '' };
  editHoverRating = 0;
  isSavingReview = false;

  // ── Confirm dialog ────────────────────────────────────────
  showConfirm = false;
  confirmMessage = '';
  private confirmCallback: (() => void) | null = null;

  private subs: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private estateService: EstateService,
    private wsService: WebSocketService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const sub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (!user) { this.router.navigate(['/']); return; }
      this.isOwner = user.role === 'Owner';
      this.activeTab = this.isOwner ? 'overview' : 'reservations';
      this.isLoading = true;
      if (this.isOwner) {
        this.loadOwnerData();
      } else {
        this.loadClientData();
      }
    });
    this.subs.push(sub);

    this.subs.push(
      this.wsService.notifications$.subscribe(notif => {
        this.handleRealtimeNotification(notif);
        this.cdr.detectChanges();
      })
    );

    this.subs.push(
      this.wsService.messages$.subscribe(msg => {
        this.handleRealtimeMessage(msg);
        this.cdr.detectChanges();
      })
    );
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

  private scrollToBottom(): void {
    try {
      const el = this.ownerViewport?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { }
  }

  // ══════════════════════════════════════════════════════════
  //  CONFIRM DIALOG
  // ══════════════════════════════════════════════════════════

  openConfirm(message: string, callback: () => void): void {
    this.confirmMessage = message;
    this.confirmCallback = callback;
    this.showConfirm = true;
  }

  confirmYes(): void {
    this.showConfirm = false;
    if (this.confirmCallback) {
      this.confirmCallback();
      this.confirmCallback = null;
    }
  }

  confirmNo(): void {
    this.showConfirm = false;
    this.confirmCallback = null;
  }

  // ══════════════════════════════════════════════════════════
  //  OWNER
  // ══════════════════════════════════════════════════════════

  loadOwnerData(): void {
    this.estateService.getOwnerStats().subscribe({
      next: s => this.ownerStats = s,
      error: () => { }
    });
    this.estateService.getMyEstates().subscribe({
      next: e => { this.myEstates = e; this.isLoading = false; this.cdr.detectChanges(); },
      error: () => { this.isLoading = false; this.cdr.detectChanges(); }
    });
    this.estateService.getMyOrders().subscribe({
      next: o => this.myOrders = o,
      error: () => { }
    });
    this.estateService.getMyReviews().subscribe({
      next: r => this.myReviews = r,
      error: () => { }
    });
  }

  // ── Owner conversations ───────────────────────────────────

  loadOwnerConversations(): void {
    this.ownerConversationsLoading = true;
    this.estateService.getConversations().subscribe({
      next: convs => { this.conversations = convs; this.ownerConversationsLoading = false; },
      error: () => { this.ownerConversationsLoading = false; }
    });
  }

  getTotalUnread(): number {
    return this.conversations.reduce((s, c) => s + (c.unread_count || 0), 0);
  }

  getClientName(conv: Conversation): string {
    const c = conv.client;
    return (`${c.first_name} ${c.last_name}`.trim()) || c.username;
  }

  getOwnerConvColor(conv: Conversation): string {
    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];
    return colors[conv.id % colors.length];
  }

  // ── Estate modal ──────────────────────────────────────────

  openAddModal(): void {
    this.isEditMode = false;
    this.editingId = null;
    this.estateForm = {
      name: '', location: '', price: '', capacity: '', free: '',
      description: '', status: 'published', room_size: '3',
      wifi: '0', restaurant: '0', generator: '0', forage: '0', tv: '0', fridge: '0',
      existingImages: []
    };
    this.distanceDisplay = '';
    this.newImageFiles = [];
    this.newImagePreviews = [];
    this.showEstateModal = true;
  }

  openEditModal(estate: Estate): void {
    this.isEditMode = true;
    this.editingId = estate.id;
    this.estateForm = {
      name: estate.name, location: estate.location,
      price: estate.price, capacity: estate.capacity,
      free: estate.free, description: estate.description,
      status: estate.status, room_size: estate.room_size,
      wifi: estate.wifi, restaurant: estate.restaurant,
      generator: estate.generator, forage: estate.forage,
      tv: estate.tv, fridge: estate.fridge,
      existingImages: [...(estate.images ?? [])]
    };
    this.distanceDisplay = String(estate.distance);
    this.newImageFiles = [];
    this.newImagePreviews = [];
    this.showEstateModal = true;
  }

  closeEstateModal(): void {
    this.showEstateModal = false;
    this.newImageFiles = [];
    this.newImagePreviews = [];
  }

  toggleEquipment(key: string): void {
    this.estateForm[key] = this.estateForm[key] === '1' ? '0' : '1';
  }

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    Array.from(input.files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        this.showToast(`"${file.name}" dépasse 5 Mo.`, 'error');
        return;
      }
      this.newImageFiles.push(file);
      const reader = new FileReader();
      reader.onload = e => this.newImagePreviews.push(e.target!.result as string);
      reader.readAsDataURL(file);
    });
    input.value = '';
  }

  removeNewImage(index: number): void {
    this.newImageFiles.splice(index, 1);
    this.newImagePreviews.splice(index, 1);
  }

  removeExistingImage(img: EstateImage): void {
    if (!this.editingId) return;
    this.estateService.deleteEstateImage(this.editingId, img.id).subscribe({
      next: () => {
        this.estateForm.existingImages = this.estateForm.existingImages.filter((i: EstateImage) => i.id !== img.id);
        this.showToast('Image supprimée.', 'success');
      },
      error: () => this.showToast('Erreur lors de la suppression.', 'error')
    });
  }

  saveEstate(): void {
    if (!this.estateForm.name || !this.estateForm.price) {
      this.showToast('Veuillez remplir les champs obligatoires.', 'error');
      return;
    }
    this.isSavingEstate = true;
    const payload = { ...this.estateForm, distance: parseFloat(this.distanceDisplay) || 0 };
    delete payload.existingImages;

    const req$ = this.isEditMode && this.editingId
      ? this.estateService.updateEstate(this.editingId, payload)
      : this.estateService.createEstate(payload);

    req$.subscribe({
      next: (savedEstate) => {
        const estateId = savedEstate.id;
        if (this.newImageFiles.length > 0) {
          this.estateService.uploadEstateImages(estateId, this.newImageFiles).subscribe({
            next: () => {
              this.isSavingEstate = false;
              this.showToast(this.isEditMode ? 'Logement mis à jour.' : 'Logement ajouté.', 'success');
              this.closeEstateModal();
              this.loadOwnerData();
            },
            error: () => {
              this.isSavingEstate = false;
              this.showToast('Logement sauvegardé mais les images n\'ont pas pu être uploadées.', 'warning');
              this.closeEstateModal();
              this.loadOwnerData();
            }
          });
        } else {
          this.isSavingEstate = false;
          this.showToast(this.isEditMode ? 'Logement mis à jour.' : 'Logement ajouté.', 'success');
          this.closeEstateModal();
          this.loadOwnerData();
        }
      },
      error: () => {
        this.isSavingEstate = false;
        this.showToast('Une erreur est survenue.', 'error');
      }
    });
  }

  deleteEstate(estate: Estate): void {
    this.openConfirm(`Supprimer "${estate.name}" ?`, () => {
      this.estateService.deleteEstate(estate.id).subscribe({
        next: () => { this.showToast('Logement supprimé.', 'success'); this.loadOwnerData(); },
        error: () => this.showToast('Erreur lors de la suppression.', 'error')
      });
    });
  }

  getEstateImage(estate: Estate): string {
    return estate.images?.[0]?.image || '';
  }

  // ══════════════════════════════════════════════════════════
  //  CLIENT
  // ══════════════════════════════════════════════════════════

  loadClientData(): void {
    this.estateService.getClientStats().subscribe({
      next: s => this.clientStats = s,
      error: () => { }
    });
    this.estateService.getMyReservations().subscribe({
      next: r => { this.myReservations = r; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
    this.estateService.getMySubmittedReviews().subscribe({
      next: r => this.mySubmittedReviews = r,
      error: () => { }
    });
    this.estateService.getMyContactRequests().subscribe({
      next: c => this.myContacts = c,
      error: () => { }
    });
    this.estateService.getConversations().subscribe({
      next: c => this.conversations = c,
      error: () => { }
    });
    this.estateService.getEstates({ status: 'published' }).subscribe({
      next: e => this.allEstates = e,
      error: () => { }
    });
  }

  // ── Client: Reservations ──────────────────────────────────

  deleteReservation(order: QuickOrder): void {
    this.openConfirm(`Annuler la réservation pour "${order.estate_name}" ?`, () => {
      this.estateService.deleteOrder(order.id!).subscribe({
        next: () => {
          this.myReservations = this.myReservations.filter(r => r.id !== order.id);
          this.clientStats.total_reservations = Math.max(0, this.clientStats.total_reservations - 1);
          this.showToast('Réservation annulée.', 'success');
        },
        error: () => this.showToast('Erreur lors de l\'annulation.', 'error')
      });
    });
  }

  // ── Client: Reviews ───────────────────────────────────────

  openReviewModal(): void {
    this.reviewForm = { estate: 0, rating: 0, comment: '' };
    this.hoverRating = 0;
    this.showReviewModal = true;
  }

  closeReviewModal(): void { this.showReviewModal = false; }

  setRating(r: number): void { this.reviewForm.rating = r; }
  setHover(r: number): void { this.hoverRating = r; }
  clearHover(): void { this.hoverRating = 0; }

  submitReview(): void {
    if (!this.reviewForm.estate || !this.reviewForm.rating || !this.reviewForm.comment.trim()) {
      this.showToast('Veuillez remplir tous les champs.', 'error');
      return;
    }
    const name = this.currentUser?.name || 'Anonyme';
    this.estateService.createReview({
      estate: this.reviewForm.estate,
      name,
      rating: this.reviewForm.rating,
      comment: this.reviewForm.comment,
    }).subscribe({
      next: () => {
        this.showToast('Avis publié avec succès !', 'success');
        this.closeReviewModal();
        this.loadClientData();
      },
      error: () => this.showToast('Erreur lors de la publication.', 'error')
    });
  }

  openEditReviewModal(review: Review): void {
    this.editingReview = review;
    this.editReviewForm = { rating: review.rating, comment: review.comment };
    this.editHoverRating = 0;
    this.showEditReviewModal = true;
  }

  closeEditReviewModal(): void {
    this.showEditReviewModal = false;
    this.editingReview = null;
  }

  setEditRating(r: number): void { this.editReviewForm.rating = r; }
  setEditHover(r: number): void { this.editHoverRating = r; }
  clearEditHover(): void { this.editHoverRating = 0; }

  saveEditReview(): void {
    if (!this.editingReview || !this.editReviewForm.rating || !this.editReviewForm.comment.trim()) {
      this.showToast('Veuillez remplir tous les champs.', 'error');
      return;
    }
    this.isSavingReview = true;
    this.estateService.updateReview(this.editingReview.id, {
      rating: this.editReviewForm.rating,
      comment: this.editReviewForm.comment.trim()
    }).subscribe({
      next: (updated) => {
        this.isSavingReview = false;
        const idx = this.mySubmittedReviews.findIndex(r => r.id === this.editingReview!.id);
        if (idx !== -1) this.mySubmittedReviews[idx] = enrichReview(updated);
        this.showToast('Avis mis à jour !', 'success');
        this.closeEditReviewModal();
      },
      error: () => {
        this.isSavingReview = false;
        this.showToast('Erreur lors de la mise à jour.', 'error');
      }
    });
  }

  deleteReview(review: Review): void {
    this.openConfirm('Supprimer cet avis ?', () => {
      this.estateService.deleteReview(review.id).subscribe({
        next: () => {
          this.mySubmittedReviews = this.mySubmittedReviews.filter(r => r.id !== review.id);
          this.clientStats.total_reviews = Math.max(0, this.clientStats.total_reviews - 1);
          this.showToast('Avis supprimé.', 'success');
        },
        error: () => this.showToast('Erreur lors de la suppression.', 'error')
      });
    });
  }

  // ── Client: Contacts ──────────────────────────────────────

  deleteContact(contact: ContactRequest): void {
    this.openConfirm('Supprimer cette demande de contact ?', () => {
      this.estateService.deleteContactRequest(contact.id!).subscribe({
        next: () => {
          this.myContacts = this.myContacts.filter(c => c.id !== contact.id);
          this.clientStats.total_contacts = Math.max(0, this.clientStats.total_contacts - 1);
          this.showToast('Contact supprimé.', 'success');
        },
        error: () => this.showToast('Erreur lors de la suppression.', 'error')
      });
    });
  }

  // ── Client: Messages ──────────────────────────────────────

  deleteConversation(conv: Conversation): void {
    this.openConfirm(`Supprimer la conversation avec ${this.getConvPartner(conv)} ?`, () => {
      this.estateService.deleteConversation(conv.id).subscribe({
        next: () => {
          this.conversations = this.conversations.filter(c => c.id !== conv.id);
          if (this.activeConversation?.id === conv.id) {
            this.activeConversation = null;
            this.wsService.disconnectChat();
          }
          this.clientStats.total_messages = Math.max(0, this.clientStats.total_messages - 1);
          this.showToast('Conversation supprimée.', 'success');
        },
        error: () => this.showToast('Erreur lors de la suppression.', 'error')
      });
    });
  }

  // ── Messaging (shared owner + client) ────────────────────

  openConversation(conv: Conversation): void {
    this.activeConversation = conv;
    this.estateService.markConversationRead(conv.id).subscribe({
      next: () => { conv.unread_count = 0; },
      error: () => { }
    });
    this.estateService.getConversation(conv.id).subscribe({
      next: full => {
        this.activeConversation = full;
        this.shouldScroll = true;
      },
      error: () => { }
    });
    this.wsService.connectChat(conv.id);
  }

  closeConversation(): void {
    this.activeConversation = null;
    this.wsService.disconnectChat();
    if (this.isOwner) {
      this.loadOwnerConversations();
    } else {
      this.estateService.getConversations().subscribe({ next: c => this.conversations = c, error: () => { } });
    }
  }

  handleRealtimeMessage(msg: any): void {
    const conv = this.conversations.find(c => c.id === msg.conversation_id);
    if (conv) {
      conv.last_message = {
        text: msg.message,
        created_at: new Date().toISOString(),
        sender_id: msg.sender_id
      };
      if (!this.activeConversation || this.activeConversation.id !== conv.id) {
        conv.unread_count = (conv.unread_count || 0) + 1;
      }
      conv.updated_at = new Date().toISOString();
      this.conversations.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }

    if (!this.activeConversation || this.activeConversation.id !== msg.conversation_id) return;

    const exists = this.activeConversation.messages.some(m =>
      m.text === msg.message && m.sender === msg.sender_id
    );

    if (!exists) {
      const newMsg: ChatMessage = {
        id: 0,
        sender: msg.sender_id,
        text: msg.message,
        created_at: new Date().toISOString(),
        read: true,
        conversation: this.activeConversation.id,
        sender_name: msg.sender_name || 'Autre',
        sender_username: ''
      };
      this.activeConversation.messages.push(newMsg);
      this.shouldScroll = true;
      this.cdr.detectChanges();
    }
  }

  handleRealtimeNotification(notif: any): void {
    if (notif.type === 'new_message') {
      if (!this.activeConversation || this.activeConversation.id !== notif.conversation_id) {
        this.showToast(`${notif.sender_name}: ${notif.message.substring(0, 30)}...`, 'info');
        const conv = this.conversations.find(c => c.id === notif.conversation_id);
        if (conv) conv.unread_count = (conv.unread_count || 0) + 1;
      }
    } else if (notif.type === 'verification_status') {
      this.showToast(notif.message, 'success');
      if (this.currentUser) this.currentUser.is_verified = true;
    }
  }

  sendMessage(): void {
    const text = this.newMessage.trim();
    if (!text || !this.activeConversation) return;
    this.newMessage = '';
    this.estateService.sendMessage(this.activeConversation.id, text).subscribe({
      next: msg => {
        if (this.activeConversation) {
          this.activeConversation = {
            ...this.activeConversation,
            messages: [...this.activeConversation.messages, msg],
            last_message: { text: msg.text, created_at: msg.created_at, sender_id: msg.sender }
          };
          this.shouldScroll = true;
        }
      },
      error: () => {
        this.newMessage = text;
        this.showToast("Erreur lors de l'envoi.", 'error');
      }
    });
  }

  isMine(msg: ChatMessage): boolean {
    return msg.sender === this.currentUser?.id;
  }

  formatMsgTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  getConvPartner(conv: Conversation): string {
    const o = conv.owner;
    return `${o.first_name} ${o.last_name}`.trim() || o.username;
  }

  getConvInitials(conv: Conversation): string {
    const name = this.isOwner ? this.getClientName(conv) : this.getConvPartner(conv);
    return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '??';
  }

  // ── Helpers ───────────────────────────────────────────────

  formatDate(dateStr?: string): string {
    if (!dateStr) return '–';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  formatPrice(p: number): string {
    return p.toLocaleString('fr-FR') + ' FCFA';
  }

  getStars(n: number): number[] {
    return Array(n).fill(0).map((_, i) => i + 1);
  }

  // ── Toasts ────────────────────────────────────────────────

  showToast(message: string, type: Toast['type'] = 'success'): void {
    const id = ++this.toastCounter;
    this.toasts.push({ id, type, message });
    setTimeout(() => this.dismissToast(id), 4000);
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  // ── Grouped messages with date separators ─────────────────

  getGroupedMessages(messages: ChatMessage[]): { type: 'separator' | 'message'; label?: string; msg?: ChatMessage }[] {
    const result: { type: 'separator' | 'message'; label?: string; msg?: ChatMessage }[] = [];
    let lastDate = '';
    for (const msg of messages) {
      const key = new Date(msg.created_at).toDateString();
      if (key !== lastDate) {
        result.push({ type: 'separator', label: this.msgDateLabel(msg.created_at) });
        lastDate = key;
      }
      result.push({ type: 'message', msg });
    }
    return result;
  }

  private msgDateLabel(dateStr: string): string {
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Hier';
    if (diff < 7) return d.toLocaleDateString('fr-FR', { weekday: 'long' });
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}