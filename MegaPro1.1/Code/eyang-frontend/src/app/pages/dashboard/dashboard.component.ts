import { Component, OnInit, OnDestroy, AfterViewChecked, ElementRef, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  LucideAngularModule,
  Home, BarChart3, Clock, Star, Plus, Trash2, X,
  Wifi, Utensils, Zap, Droplets, Tv, Thermometer,
  MessageSquare, FileText, Phone, MapPin, Calendar,
  CheckCircle, AlertCircle, Info, Send, ArrowLeft,
  Edit, Package, User, Mail, Building, Pencil, ChevronDown
} from 'lucide-angular';
import { AuthService, User as AuthUser } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import {
  EstateService, Estate, EstateRaw, EstateImage, RoomCategory, RoomImage, QuickOrder, Review, ContactRequest,
  Conversation, ChatMessage, OwnerDashboardStats, ClientDashboardStats,
  enrichReview
} from '../../services/estate.service';
import { Subscription, interval } from 'rxjs';
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
  readonly ChevronDownIcon = ChevronDown;

  // ── State ─────────────────────────────────────────────────
  currentUser: AuthUser | null = null;
  isOwner = false;
  isLoading = true;
  activeTab = 'overview';

  toasts: Toast[] = [];
  private toastCounter = 0;

  // ── Mobile tab dropdown ────────────────────────────────────
  mobileTabOpen = false;
  toggleMobileTab(): void { this.mobileTabOpen = !this.mobileTabOpen; }
  closeMobileTab(): void  { this.mobileTabOpen = false; }
  selectTab(tab: string): void {
    this.activeTab = tab;
    this.mobileTabOpen = false;
    if (tab === 'messages' && this.isOwner) this.loadOwnerConversations();
  }

  @HostListener('document:click')
  onDocumentClick(): void { this.mobileTabOpen = false; }

  // ── Owner ─────────────────────────────────────────────────
  ownerStats: OwnerDashboardStats = {
    total_estates: 0, occupancy_pct: 0, pending_orders: 0, avg_rating: 0
  };
  myEstates: Estate[] = [];
  myOrders: QuickOrder[] = [];
  myReviews: Review[] = [];

  // ── Review pagination (owner) ──────────────────────────────
  readonly REVIEW_PAGE_SIZE = 5;
  visibleReviewCount = this.REVIEW_PAGE_SIZE;
  get pagedReviews(): Review[] { return this.myReviews.slice(0, this.visibleReviewCount); }
  get hasMoreReviews(): boolean { return this.visibleReviewCount < this.myReviews.length; }
  showMoreReviews(): void { this.visibleReviewCount = Math.min(this.visibleReviewCount + this.REVIEW_PAGE_SIZE, this.myReviews.length); }
  resetReviewPage(): void { this.visibleReviewCount = this.REVIEW_PAGE_SIZE; }

  // ── Estate pagination ──────────────────────────────────────
  /** Number of estate cards shown per page */
  readonly PAGE_SIZE = 6;
  /** How many estates are currently visible */
  visibleEstateCount = this.PAGE_SIZE;

  /** Estates sorted by rating (highest first), ready to display */
  get sortedEstates(): Estate[] {
    return [...this.myEstates].sort((a, b) => {
      const ra = a.average_rating?.value ?? parseFloat(a.rating ?? '0');
      const rb = b.average_rating?.value ?? parseFloat(b.rating ?? '0');
      return rb - ra;
    });
  }

  /** The slice currently shown in the grid */
  get pagedEstates(): Estate[] {
    return this.sortedEstates.slice(0, this.visibleEstateCount);
  }

  /** True when there are more estates to load */
  get hasMoreEstates(): boolean {
    return this.visibleEstateCount < this.myEstates.length;
  }

  /** Show 6 more */
  showMoreEstates(): void {
    this.visibleEstateCount = Math.min(
      this.visibleEstateCount + this.PAGE_SIZE,
      this.myEstates.length
    );
  }

  /** Reset pagination when tab is re-opened */
  resetEstatePage(): void {
    this.visibleEstateCount = this.PAGE_SIZE;
  }

  showEstateModal = false;
  isEditMode = false;
  editingId: number | null = null;
  isSavingEstate = false;
  estateForm: any = {};
  distanceDisplay = '';

  // ── Room management state ───────────────────────────────
  showRoomModal = false;
  selectedEstateForRooms: Estate | null = null;
  isLoadingRooms = false;
  roomCategories: RoomCategory[] = [];

  isRoomEditMode = false;
  isSavingRoom = false;
  roomEditId: number | null = null;
  roomForm: Partial<RoomCategory> = this.emptyRoomForm();

  roomSelectedFiles: File[] = [];
  roomPreviewImages: string[] = [];
  roomExistingImages: RoomImage[] = [];
  roomRemovedImageIds: number[] = [];

  emptyRoomForm(): Partial<RoomCategory> {
    return { name: '', price: 300000, occupancy: 'single', quantity_available: 1, wifi: '0', tv: '0', fridge: '0', room_size: '2', description: '' };
  }

  newImageFiles: File[] = [];
  newImagePreviews: string[] = [];

  availableEquipments = [
    { key: 'restaurant', label: 'Restaurant', icon: Utensils },
    { key: 'generator', label: 'Générateur', icon: Zap },
    { key: 'forage', label: 'Forage', icon: Droplets },
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
  onlineUsers: Set<number> = new Set();

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
      this.refreshOnlineUsers();
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

    // Poll online users every 30 seconds
    const sPoll = interval(30000).subscribe(() => this.refreshOnlineUsers());
    this.subs.push(sPoll);
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
      next: e => {
        this.myEstates = e;
        this.resetEstatePage();          // reset to first 6 on fresh load
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isLoading = false; this.cdr.detectChanges(); }
    });
    this.estateService.getMyOrders().subscribe({
      next: o => this.myOrders = o,
      error: () => { }
    });
    this.estateService.getMyReviews().subscribe({
      next: r => { this.myReviews = r; this.resetReviewPage(); },
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
      name: '', location: '',
      description: '', status: 'published',
      restaurant: '0', generator: '0', forage: '0',
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
      description: estate.description,
      status: estate.status,
      restaurant: estate.restaurant,
      generator: estate.generator, forage: estate.forage,
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

  // ── Room Category Methods ────────────────────────────────────────────────
  openManageRooms(estate: Estate): void {
    this.selectedEstateForRooms = estate;
    this.showRoomModal = true;
    this.isRoomEditMode = false;
    this.loadRooms(estate.id);
  }

  closeRoomModal(): void {
    this.showRoomModal = false;
    this.selectedEstateForRooms = null;
  }

  loadRooms(estateId: number): void {
    this.isLoadingRooms = true;
    this.estateService.getRoomCategories(estateId).subscribe({
      next: (rooms) => {
        this.roomCategories = rooms;
        this.isLoadingRooms = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.showToast('Erreur chargement chambres.', 'error');
        this.isLoadingRooms = false;
        this.cdr.detectChanges();
      }
    });
  }

  openCreateRoom(): void {
    this.isRoomEditMode = true;
    this.roomEditId = null;
    this.roomForm = this.emptyRoomForm();
    this.roomSelectedFiles = [];
    this.roomPreviewImages = [];
    this.roomExistingImages = [];
    this.roomRemovedImageIds = [];
  }

  openEditRoom(room: RoomCategory): void {
    this.isRoomEditMode = true;
    this.roomEditId = room.id;
    this.roomForm = { ...room };
    this.roomExistingImages = [...(room.images || [])];
    this.roomSelectedFiles = [];
    this.roomPreviewImages = [];
    this.roomRemovedImageIds = [];
  }

  deleteRoom(room: RoomCategory): void {
    if (confirm(`Supprimer la catégorie "${room.name}" ?`)) {
      this.estateService.deleteRoomCategory(room.id).subscribe(() => {
        this.showToast('Chambre supprimée.', 'info');
        if (this.selectedEstateForRooms) this.loadRooms(this.selectedEstateForRooms.id);
      });
    }
  }

  saveRoom(): void {
    if (!this.selectedEstateForRooms) return;
    if (!this.roomForm.name) { this.showToast('Le nom est obligatoire.', 'warning'); return; }

    this.isSavingRoom = true;
    const payload = { ...this.roomForm, estate: this.selectedEstateForRooms.id };

    const req = this.roomEditId
      ? this.estateService.updateRoomCategory(this.roomEditId, payload)
      : this.estateService.createRoomCategory(payload);

    req.subscribe({
      next: (saved) => {
        const afterSave = () => {
          this.isSavingRoom = false;
          this.isRoomEditMode = false;
          this.showToast(`Chambre ${this.roomEditId ? 'mise à jour' : 'ajoutée'}.`, 'success');
          this.loadRooms(this.selectedEstateForRooms!.id);
        };

        if (this.roomSelectedFiles.length > 0) {
          this.estateService.uploadRoomImages(saved.id, this.roomSelectedFiles).subscribe(afterSave);
        } else {
          afterSave();
        }
      },
      error: () => {
        this.showToast('Erreur lors de l\'enregistrement de la chambre.', 'error');
        this.isSavingRoom = false;
        this.cdr.detectChanges();
      }
    });
  }

  onRoomFilesSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach(f => {
        this.roomSelectedFiles.push(f);
        const reader = new FileReader();
        reader.onload = ev => { this.roomPreviewImages.push(ev.target!.result as string); this.cdr.detectChanges(); };
        reader.readAsDataURL(f);
      });
    }
    input.value = '';
  }

  removeRoomPreview(idx: number): void {
    this.roomSelectedFiles.splice(idx, 1);
    this.roomPreviewImages.splice(idx, 1);
  }

  removeExistingRoomImage(idx: number): void {
    const img = this.roomExistingImages.splice(idx, 1)[0];
    if (img.id) this.roomRemovedImageIds.push(img.id);
  }

  switchToRoomManagerFromEdit(): void {
    if (!this.editingId) return;
    const est = this.myEstates.find(h => h.id === this.editingId);
    if (est) {
      this.closeEstateModal();
      this.openManageRooms(est);
    }
  }

  // ── Save estate (create or update, then upload images) ────

  saveEstate(): void {
    if (!this.estateForm.name || !this.estateForm.location) {
      this.showToast('Veuillez remplir le nom et la localisation du logement.', 'error');
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

        const finalizeCreation = () => {
          this.isSavingEstate = false;
          this.showToast(this.isEditMode ? 'Logement mis à jour.' : 'Logement créé avec succès. Veuillez configurer les chambres.', 'success');
          this.closeEstateModal();
          this.loadOwnerData();
          if (!this.isEditMode) {
            this.openManageRooms(savedEstate);
          }
        };

        if (this.newImageFiles.length > 0) {
          this.estateService.uploadEstateImages(estateId, this.newImageFiles).subscribe({
            next: () => finalizeCreation(),
            error: () => finalizeCreation()
          });
        } else {
          finalizeCreation();
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

  // ── Owner: Reservation actions ────────────────────────────

  acceptReservation(order: QuickOrder): void {
    if (!order.id) return;
    this.estateService.acceptReservation(order.id).subscribe({
      next: updated => {
        const idx = this.myOrders.findIndex(o => o.id === order.id);
        if (idx !== -1) this.myOrders[idx] = updated;
        this.showToast('Réservation acceptée.', 'success');
      },
      error: () => this.showToast('Erreur lors de la mise à jour.', 'error')
    });
  }

  rejectReservation(order: QuickOrder): void {
    if (!order.id) return;
    this.openConfirm(`Rejeter la réservation de "${order.name}" ?`, () => {
      this.estateService.rejectReservation(order.id!).subscribe({
        next: updated => {
          const idx = this.myOrders.findIndex(o => o.id === order.id);
          if (idx !== -1) this.myOrders[idx] = updated;
          this.showToast('Réservation rejetée.', 'info');
        },
        error: () => this.showToast('Erreur lors de la mise à jour.', 'error')
      });
    });
  }

  // ── Client: Reservations ──────────────────────────────────

  deleteReservation(order: QuickOrder): void {
    this.openConfirm(`Annuler la réservation pour "${order.estate_name}" ?`, () => {
      this.estateService.deleteQuickOrder(order.id!).subscribe({
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
    // msg fields (from ws_utils.broadcast_chat_message):
    //   id, conversation, text, sender, sender_name, sender_username, read, created_at

    // Update sidebar conversation preview
    const conv = this.conversations.find(c => c.id === msg.conversation);
    if (conv) {
      conv.last_message = { text: msg.text, created_at: msg.created_at, sender_id: msg.sender };
      if (!this.activeConversation || this.activeConversation.id !== msg.conversation) {
        conv.unread_count = (conv.unread_count || 0) + 1;
      }
      conv.updated_at = msg.created_at;
      this.conversations.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }

    // Only mutate the active conversation's message list
    if (!this.activeConversation || this.activeConversation.id !== msg.conversation) return;

    // Dedup: skip if a message with this DB id already exists
    const alreadyExists = this.activeConversation.messages.some(m => m.id === msg.id);
    if (alreadyExists) return;

    const newMsg: ChatMessage = {
      id:               msg.id,
      sender:           msg.sender,
      text:             msg.text,
      created_at:       msg.created_at,
      read:             msg.read ?? false,
      conversation:     msg.conversation,
      sender_name:      msg.sender_name || '',
      sender_username:  msg.sender_username || '',
    };
    this.activeConversation.messages.push(newMsg);
    this.activeConversation.last_message = { text: msg.text, created_at: msg.created_at, sender_id: msg.sender };
    this.shouldScroll = true;
    this.cdr.detectChanges();
  }

  handleRealtimeNotification(notif: any): void {
    switch (notif.type) {
      case 'new_message':
        if (!this.activeConversation || this.activeConversation.id !== notif.conversation_id) {
          this.showToast(`💬 ${notif.sender_name}: ${(notif.message || '').substring(0, 40)}`, 'info');
          const conv = this.conversations.find(c => c.id === notif.conversation_id);
          if (conv) conv.unread_count = (conv.unread_count || 0) + 1;
        }
        break;
      case 'verification_status':
        this.showToast(notif.message || 'Compte vérifié !', 'success');
        if (this.currentUser) this.currentUser.is_verified = true;
        break;
      case 'new_booking':
        this.showToast(`📋 ${notif.message}`, 'info');
        this.loadOwnerData(); // refresh reservation list
        break;
      case 'booking_accepted':
        this.showToast(`✅ ${notif.message}`, 'success');
        this.loadClientData();
        break;
      case 'booking_rejected':
        this.showToast(`❌ ${notif.message}`, 'warning');
        this.loadClientData();
        break;
    }
  }

  sendMessage(): void {
    const text = this.newMessage.trim();
    if (!text || !this.activeConversation) return;
    this.newMessage = '';

    const convId = this.activeConversation.id;

    // ── Strategy: single source of truth ──────────────────────────────────
    // If the WebSocket is open, send via WS only. The server saves to DB,
    // then signals.py broadcasts the saved record back to both participants
    // via group_send. handleRealtimeMessage() adds it to the list — no HTTP.
    //
    // If WS is closed, fall back to HTTP POST. The response IS the record;
    // add it directly. WS is not active so there is no echo to dedup.
    // ─────────────────────────────────────────────────────────────────────

    if (this.wsService.isChatOpen) {
      // Send via WS; the server echo will add the message via handleRealtimeMessage()
      this.wsService.sendChatMessage(text, this.currentUser!.id!, this.currentUser!.name);
    } else {
      // HTTP fallback
      this.estateService.sendMessage(convId, text).subscribe({
        next: msg => {
          if (this.activeConversation) {
            this.activeConversation = {
              ...this.activeConversation,
              messages: [...this.activeConversation.messages, msg],
              last_message: { text: msg.text, created_at: msg.created_at, sender_id: msg.sender }
            };
            this.shouldScroll = true;
            this.cdr.detectChanges();
          }
        },
        error: () => {
          this.newMessage = text;
          this.showToast("Erreur lors de l'envoi.", 'error');
        }
      });
    }
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

  getConvPartnerId(conv: Conversation): number {
    return this.isOwner ? conv.client.id : conv.owner.id;
  }

  isPartnerOnline(conv: Conversation): boolean {
    return this.onlineUsers.has(this.getConvPartnerId(conv));
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

  refreshOnlineUsers(): void {
    this.estateService.getOnlineUsers().subscribe({
      next: data => {
        this.onlineUsers = new Set(data.online_user_ids);
        this.cdr.detectChanges();
      },
      error: () => { }
    });
  }
}