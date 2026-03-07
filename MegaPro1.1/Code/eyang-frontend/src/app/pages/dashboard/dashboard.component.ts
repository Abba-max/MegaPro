import { Component, OnInit, OnDestroy, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  LucideAngularModule,
  Home, BarChart3, Clock, Star, Plus, Trash2, X,
  Wifi, Utensils, Zap, Droplets, Tv, Thermometer,
  MessageSquare, FileText, Phone, MapPin, Calendar,
  CheckCircle, AlertCircle, Info, Send, ArrowLeft,
  Edit, Package, User, Mail, Building
} from 'lucide-angular';
import { AuthService, User as AuthUser } from '../../services/auth.service';
import {
  EstateService, Estate, EstateRaw, EstateImage, QuickOrder, Review, ContactRequest,
  Conversation, ChatMessage, OwnerDashboardStats, ClientDashboardStats,
  enrichReview
} from '../../services/estate.service';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('ownerViewport') ownerViewport?: ElementRef;
  private shouldScroll = false;

  // ── Icons ─────────────────────────────────────────────────
  readonly HomeIcon     = Home;
  readonly BarChartIcon = BarChart3;
  readonly ClockIcon    = Clock;
  readonly StarIcon     = Star;
  readonly PlusIcon     = Plus;
  readonly TrashIcon    = Trash2;
  readonly XIcon        = X;
  readonly WifiIcon     = Wifi;
  readonly UtensilsIcon = Utensils;
  readonly ZapIcon      = Zap;
  readonly DropletsIcon = Droplets;
  readonly TvIcon       = Tv;
  readonly FridgeIcon   = Thermometer;
  readonly MessageIcon  = MessageSquare;
  readonly FileIcon     = FileText;
  readonly PhoneIcon    = Phone;
  readonly MapPinIcon   = MapPin;
  readonly CalendarIcon = Calendar;
  readonly CheckIcon    = CheckCircle;
  readonly AlertIcon    = AlertCircle;
  readonly InfoIcon     = Info;
  readonly SendIcon     = Send;
  readonly BackIcon     = ArrowLeft;
  readonly EditIcon     = Edit;
  readonly PackageIcon  = Package;
  readonly UserIcon     = User;
  readonly MailIcon     = Mail;
  readonly BuildingIcon = Building;

  // ── State ─────────────────────────────────────────────────
  currentUser: AuthUser | null = null;
  isOwner   = false;
  isLoading = true;
  activeTab = 'overview';

  toasts: Toast[] = [];
  private toastCounter = 0;

  // ── Owner ─────────────────────────────────────────────────
  ownerStats: OwnerDashboardStats = {
    total_estates: 0, occupancy_pct: 0, pending_orders: 0, avg_rating: 0
  };
  myEstates: Estate[]   = [];
  myOrders:  QuickOrder[] = [];
  myReviews: Review[]   = [];

  showEstateModal  = false;
  isEditMode       = false;
  editingId: number | null = null;
  isSavingEstate   = false;
  estateForm: any  = {};
  distanceDisplay  = '';

  /** Files chosen by the owner for upload */
  newImageFiles:    File[]   = [];
  /** Base64 previews of newImageFiles */
  newImagePreviews: string[] = [];

  availableEquipments = [
    { key: 'wifi',       label: 'WiFi',         icon: Wifi        },
    { key: 'restaurant', label: 'Restaurant',    icon: Utensils    },
    { key: 'generator',  label: 'Générateur',    icon: Zap         },
    { key: 'forage',     label: 'Forage',        icon: Droplets    },
    { key: 'tv',         label: 'Télévision',    icon: Tv          },
    { key: 'fridge',     label: 'Réfrigérateur', icon: Thermometer },
  ];

  // ── Owner messaging ───────────────────────────────────────
  ownerConversationsLoading = false;

  // ── Client ────────────────────────────────────────────────
  clientStats: ClientDashboardStats = {
    total_reservations: 0, total_reviews: 0, total_messages: 0, total_contacts: 0
  };
  myReservations:      QuickOrder[]     = [];
  mySubmittedReviews:  Review[]         = [];
  myContacts:          ContactRequest[] = [];
  conversations:       Conversation[]   = [];

  activeConversation: Conversation | null = null;
  newMessage = '';
  private pollSub?: Subscription;

  showReviewModal = false;
  reviewForm      = { estate: 0, rating: 0, comment: '' };
  hoverRating     = 0;
  allEstates:     Estate[] = [];

  private subs: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private estateService: EstateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const sub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (!user) { this.router.navigate(['/']); return; }
      this.isOwner  = user.role === 'Owner';
      this.activeTab = this.isOwner ? 'overview' : 'reservations';
      this.isLoading = true;
      if (this.isOwner) {
        this.loadOwnerData();
      } else {
        this.loadClientData();
      }
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

  private scrollToBottom(): void {
    try {
      const el = this.ownerViewport?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  // ══════════════════════════════════════════════════════════
  //  OWNER
  // ══════════════════════════════════════════════════════════

  loadOwnerData(): void {
    this.estateService.getOwnerStats().subscribe({
      next: s  => this.ownerStats = s,
      error: () => {}
    });
    this.estateService.getMyEstates().subscribe({
      next: e  => { this.myEstates = e; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
    this.estateService.getMyOrders().subscribe({
      next: o  => this.myOrders = o,
      error: () => {}
    });
    this.estateService.getMyReviews().subscribe({
      next: r  => this.myReviews = r,
      error: () => {}
    });
  }

  // ── Owner conversations ───────────────────────────────────

  loadOwnerConversations(): void {
    this.ownerConversationsLoading = true;
    this.estateService.getConversations().subscribe({
      next: convs => { this.conversations = convs; this.ownerConversationsLoading = false; },
      error: ()   => { this.ownerConversationsLoading = false; }
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
    this.editingId  = null;
    this.estateForm = {
      name: '', location: '', price: '', capacity: '', free: '',
      description: '', status: 'published', room_size: '3',
      wifi: '0', restaurant: '0', generator: '0', forage: '0', tv: '0', fridge: '0',
      existingImages: []
    };
    this.distanceDisplay  = '';
    this.newImageFiles    = [];
    this.newImagePreviews = [];
    this.showEstateModal  = true;
  }

  openEditModal(estate: Estate): void {
    this.isEditMode = true;
    this.editingId  = estate.id;
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
    this.distanceDisplay  = String(estate.distance);
    this.newImageFiles    = [];
    this.newImagePreviews = [];
    this.showEstateModal  = true;
  }

  closeEstateModal(): void {
    this.showEstateModal  = false;
    this.newImageFiles    = [];
    this.newImagePreviews = [];
  }

  toggleEquipment(key: string): void {
    this.estateForm[key] = this.estateForm[key] === '1' ? '0' : '1';
  }

  // ── Image selection ───────────────────────────────────────

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
    // Reset input so same file can be re-selected
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

  // ── Save estate (create or update, then upload images) ────

  saveEstate(): void {
    if (!this.estateForm.name || !this.estateForm.price) {
      this.showToast('Veuillez remplir les champs obligatoires.', 'error');
      return;
    }
    this.isSavingEstate = true;
    const payload = { ...this.estateForm, distance: parseFloat(this.distanceDisplay) || 0 };
    delete payload.existingImages; // not a backend field

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
    if (!confirm(`Supprimer "${estate.name}" ?`)) return;
    this.estateService.deleteEstate(estate.id).subscribe({
      next: () => { this.showToast('Logement supprimé.', 'success'); this.loadOwnerData(); },
      error: () => this.showToast('Erreur lors de la suppression.', 'error')
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
      next: s  => this.clientStats = s,
      error: () => {}
    });
    this.estateService.getMyReservations().subscribe({
      next: r  => { this.myReservations = r; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
    this.estateService.getMySubmittedReviews().subscribe({
      next: r  => this.mySubmittedReviews = r,
      error: () => {}
    });
    this.estateService.getMyContactRequests().subscribe({
      next: c  => this.myContacts = c,
      error: () => {}
    });
    this.estateService.getConversations().subscribe({
      next: c  => this.conversations = c,
      error: () => {}
    });
    this.estateService.getEstates({ status: 'published' }).subscribe({
      next: e  => this.allEstates = e,
      error: () => {}
    });
  }

  // ── Messaging (shared owner + client) ────────────────────

  openConversation(conv: Conversation): void {
    this.activeConversation = conv;
    this.estateService.markConversationRead(conv.id).subscribe({
      next: () => { conv.unread_count = 0; },
      error: () => {}
    });
    // Load full messages
    this.estateService.getConversation(conv.id).subscribe({
      next: full => {
        this.activeConversation = full;
        this.shouldScroll = true;
      },
      error: () => {}
    });
    this.startPolling(conv.id);
  }

  closeConversation(): void {
    this.activeConversation = null;
    this.pollSub?.unsubscribe();
    // Refresh list to reflect read counts
    if (this.isOwner) {
      this.loadOwnerConversations();
    } else {
      this.estateService.getConversations().subscribe({ next: c => this.conversations = c, error: () => {} });
    }
  }

  startPolling(convId: number): void {
    this.pollSub?.unsubscribe();
    this.pollSub = interval(5000).pipe(
      switchMap(() => this.estateService.getConversation(convId))
    ).subscribe(conv => {
      const prevCount = this.activeConversation?.messages.length ?? 0;
      this.activeConversation = conv;
      if (conv.messages.length > prevCount) this.shouldScroll = true;
    });
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

  // ── Review modal ──────────────────────────────────────────

  openReviewModal(): void {
    this.reviewForm  = { estate: 0, rating: 0, comment: '' };
    this.hoverRating = 0;
    this.showReviewModal = true;
  }

  closeReviewModal(): void { this.showReviewModal = false; }

  setRating(r: number): void  { this.reviewForm.rating = r; }
  setHover(r: number):  void  { this.hoverRating = r; }
  clearHover():         void  { this.hoverRating = 0; }

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

  deleteReview(review: Review): void {
    if (!confirm('Supprimer cet avis ?')) return;
    this.estateService.deleteReview(review.id).subscribe({
      next: () => { this.showToast('Avis supprimé.', 'success'); this.loadClientData(); },
      error: () => this.showToast('Erreur lors de la suppression.', 'error')
    });
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
}