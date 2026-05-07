import { Component, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideAngularModule,
  MapPin, Star, Building, ChevronLeft, ChevronRight, Users, Bed, BedDouble,
  LayoutDashboard, Wifi, Zap, Droplets, Utensils, Calendar,
  MessageSquare, Send, X, Images, Loader, CheckCircle, XCircle, AlertCircle,
  Heart, Tv, Thermometer, Phone, Info ,Tag, Gift, Package, CheckSquare
} from 'lucide-angular';
import { EstateService, Estate, Review, Conversation, RoomCategory, AverageRating, getAbsoluteUrl,Supplement, EstateCharacteristic} from '../../services/estate.service';
import { AuthService, User } from '../../services/auth.service';
import { RoomGalleryComponent } from '../../components/room-gallery/room-gallery.component';
export interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

@Component({
  selector: 'app-housing-detail',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule, FormsModule, TranslateModule, RoomGalleryComponent],
  templateUrl: './housing-detail.component.html',
  styleUrl: './housing-detail.component.css'
})
export class HousingDetailComponent implements OnInit {
  @ViewChild('msgScroll') msgScroll!: ElementRef;

  readonly ChevronLeftIcon  = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly MapPinIcon       = MapPin;
  readonly StarIcon         = Star;
  readonly BuildingIcon     = Building;
  readonly UsersIcon        = Users;
  readonly BedIcon          = Bed;
  readonly BedDoubleIcon    = BedDouble;
  readonly LayoutIcon       = LayoutDashboard;
  readonly MessageIcon      = MessageSquare;
  readonly CalendarIcon     = Calendar;
  readonly SendIcon         = Send;
  readonly XIcon            = X;
  readonly ZapIconRef       = Zap;
  readonly ImagesIcon       = Images;
  readonly LoaderIcon       = Loader;
  readonly WifiIcon         = Wifi;
  readonly DropletsIcon     = Droplets;
  readonly UtensilsIcon     = Utensils;
  readonly CheckCircleIcon  = CheckCircle;
  readonly XCircleIcon      = XCircle;
  readonly AlertCircleIcon  = AlertCircle;
  readonly HeartIcon        = Heart;
  readonly TvIcon           = Tv;
  readonly FridgeIcon       = Thermometer;
  readonly PhoneIcon        = Phone;
  readonly InfoIcon         = Info;
  readonly TagIcon          = Tag;
readonly GiftIcon         = Gift;
readonly PackageIcon      = Package;
readonly CheckSquareIcon  = CheckSquare;

  housing: Estate | null = null;
  hosingEquipmentsWithIcons: { name: string; icon: any; color: string; colorKey: string }[] = [];
  photos: string[] = [];
  reviews: Review[] = [];
  currentUser: User | null = null;
  isLoading     = true;
  errorMessage  = '';
  isSubmitting  = false;
  submitSuccess = false;

  // ── Review "show more" ──────────────────────────────────
  readonly REVIEWS_PER_PAGE = 3;
  reviewsDisplayed = 3;

  // ── Room category selection ───────────────────────────────
  selectedRoomCategory: RoomCategory | null = null;

  activePhotoIndex   = 0;
  showLightbox       = false;
  showContactModal   = false;
  showMessageModal   = false;

  contactForm = { name: '', phone: '', message: '' };
  messageText = '';
  isSendingMessage      = false;
  isLoadingConversation = false;
  activeConversation: Conversation | null = null;

  // ── Room Gallery state ──────────────────────────────────
  showRoomGallery = false;
  roomGalleryImages: any[] = [];
  roomGalleryIndex = 0;
  supplements: Supplement[]           = [];
characteristics: EstateCharacteristic[] = [];

  openRoomGallery(rc: RoomCategory, index: number = 0): void {
    if (!rc.images || rc.images.length === 0) return;
    this.roomGalleryImages = rc.images.map(img => ({
      url: img.image,
      caption: img.caption || rc.name
    }));
    this.roomGalleryIndex = index;
    this.showRoomGallery = true;
  }

  closeRoomGallery(): void {
    this.showRoomGallery = false;
  }

  // ── Review form ──────────────────────────────────────────
  showReviewForm     = false;
  isSubmittingReview = false;
  reviewForm         = { rating: 0, comment: '' };
  reviewHover        = 0;

  toasts: Toast[] = [];
  private toastCounter = 0;
private expandedRoomEquipmentIds = new Set<number>();
get freeSupplements(): Supplement[] {
  return this.supplements.filter(s => !s.is_paid_service && s.is_available !== false);
}
get paidSupplements(): Supplement[] {
  return this.supplements.filter(s => s.is_paid_service);
}

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private estateService: EstateService,
    private authService: AuthService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => {
      this.currentUser = u;
      if (u && !this.contactForm.name) {
        this.contactForm.name = u.name || '';
      }
    });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadEstate(Number(id));
      this.loadReviews(Number(id));
      this.loadSupplementsAndCharacteristics(Number(id));
    }
  }

  // ── Toast helpers ─────────────────────────────────────────

  showToast(message: string, type: Toast['type'] = 'success'): void {
    const id = ++this.toastCounter;
    this.toasts.push({ id, type, message });
    setTimeout(() => this.dismissToast(id), 4000);
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  // ── Data loading ──────────────────────────────────────────

  loadEstate(id: number): void {
    this.isLoading = true;
    this.estateService.getEstate(id).subscribe({
      next: (data) => {
        this.hosingEquipmentsWithIcons = this.buildEquipments(data);
        this.housing    = data;
        this.photos     = data.images.map((img: any) => getAbsoluteUrl(img.image, 1200)).filter(Boolean);
        this.isLoading  = false;
        const available = (data.room_categories || []).filter(rc => rc.quantity_available > 0);
        if (available.length === 1) {
          this.selectedRoomCategory = available[0];
        }
      },
      error: () => {
        this.errorMessage = this.translate.instant('admin.error_load');
        this.isLoading    = false;
        this.showToast(this.translate.instant('admin.error_load'), 'error');
      }
    });
  }
toggleRoomEquipment(roomCategoryId: number): void {
  if (this.expandedRoomEquipmentIds.has(roomCategoryId)) {
    this.expandedRoomEquipmentIds.delete(roomCategoryId);
  } else {
    this.expandedRoomEquipmentIds.add(roomCategoryId);
  }
}
 
isRoomEquipmentExpanded(roomCategoryId: number): boolean {
  return this.expandedRoomEquipmentIds.has(roomCategoryId);
}
private loadSupplementsAndCharacteristics(estateId: number): void {
  this.estateService.getEstateSupplements(estateId).subscribe({
    next: (data) => { this.supplements = data; },
    error: () => { this.supplements = []; }
  });
 
  this.estateService.getEstateCharacteristics(estateId).subscribe({
    next: (data) => { this.characteristics = data; },
    error: () => { this.characteristics = []; }
  });
}

  loadReviews(estateId: number): void {
    this.estateService.getReviews(estateId).subscribe({
      next: (data) => { this.reviews = data; },
      error: () => {}
    });
  }

  private buildEquipments(h: Estate): { name: string; icon: any; color: string; colorKey: string }[] {
    const eq: { name: string; icon: any; color: string; colorKey: string }[] = [];
    if (h.wifi === '1')       eq.push({ name: 'WiFi',          icon: this.WifiIcon,     color: 'orange', colorKey: 'wifi'       });
    if (h.generator === '1')  eq.push({ name: 'Générateur',    icon: this.ZapIconRef,   color: 'yellow', colorKey: 'generator'  });
    if (h.forage === '1')     eq.push({ name: 'Forage / Eau',  icon: this.DropletsIcon, color: 'blue',   colorKey: 'forage'     });
    if (h.restaurant === '1') eq.push({ name: 'Restaurant',    icon: this.UtensilsIcon, color: 'brown',  colorKey: 'restaurant' });
    if (h.tv === '1')         eq.push({ name: 'Télévision',    icon: this.TvIcon,       color: 'purple', colorKey: 'tv'         });
    if (h.fridge === '1')     eq.push({ name: 'Réfrigérateur', icon: this.FridgeIcon,   color: 'teal',   colorKey: 'fridge'     });
    
    // Translate names
    return eq.map(item => ({
      ...item,
      name: this.translate.instant('housing.' + item.colorKey)
    }));
  }

  // ── Room category selection ───────────────────────────────

  selectRoomCategory(rc: RoomCategory): void {
    this.selectedRoomCategory = rc;
  }

  clearRoomCategory(): void {
    this.selectedRoomCategory = null;
  }

  // ── Star helpers ──────────────────────────────────────────

  getStarArray(rating: number | string): number[] {
    const n = Math.round(Number(rating));
    return Array(n > 0 ? n : 0).fill(0);
  }

  getEmptyStarArray(rating: number | string): number[] {
    const n = Math.round(Number(rating));
    return Array(Math.max(0, 5 - n)).fill(0);
  }

  getRatingAsNumber(rating: string): number { return Number(rating); }

  /**
   * Returns the percentage width for a star-breakdown bar.
   * @param breakdown  The AverageRating.breakdown object
   * @param star       The star level (1-5)
   * @param total      Total number of reviews
   */
  // ── Room category image swiper ─────────────────────────
  private rccSlideIndexMap = new Map<number, number>();
  private rccTouchStartX = 0;
  private rccMouseStartX = 0;

  getRccActiveIndex(rc: { id: number }): number {
    return this.rccSlideIndexMap.get(rc.id) ?? 0;
  }
  nextRccSlide(rc: { id: number; images: any[] }): void {
    const cur = this.rccSlideIndexMap.get(rc.id) ?? 0;
    this.rccSlideIndexMap.set(rc.id, (cur + 1) % rc.images.length);
  }
  prevRccSlide(rc: { id: number; images: any[] }): void {
    const cur = this.rccSlideIndexMap.get(rc.id) ?? 0;
    this.rccSlideIndexMap.set(rc.id, (cur - 1 + rc.images.length) % rc.images.length);
  }
  onRccTouchStart(e: TouchEvent, rc: any): void { this.rccTouchStartX = e.touches[0].clientX; }
  onRccTouchEnd(e: TouchEvent, rc: any): void {
    const dx = e.changedTouches[0].clientX - this.rccTouchStartX;
    if (Math.abs(dx) > 35) { dx < 0 ? this.nextRccSlide(rc) : this.prevRccSlide(rc); }
  }
  onRccMouseDown(e: MouseEvent, rc: any): void { this.rccMouseStartX = e.clientX; }
  onRccMouseUp(e: MouseEvent, rc: any): void {
    const dx = e.clientX - this.rccMouseStartX;
    if (Math.abs(dx) > 35) { dx < 0 ? this.nextRccSlide(rc) : this.prevRccSlide(rc); }
  }

  getBreakdownPct(breakdown: AverageRating['breakdown'], star: number, total: number): number {
    if (!total || !breakdown) return 0;
    return Math.round(((breakdown[star] || 0) / total) * 100);
  }

  // ── Review form ───────────────────────────────────────────

  toggleReviewForm(): void {
    this.showReviewForm = !this.showReviewForm;
    if (!this.showReviewForm) {
      this.reviewForm  = { rating: 0, comment: '' };
      this.reviewHover = 0;
    }
  }

  reviewRatingLabel(): string {
    const labels: Record<number, string> = {
      1: this.translate.instant('review.rating_1'),
      2: this.translate.instant('review.rating_2'),
      3: this.translate.instant('review.rating_3'),
      4: this.translate.instant('review.rating_4'),
      5: this.translate.instant('review.rating_5')
    };
    return labels[this.reviewForm.rating] || '';
  }

  submitReview(): void {
    if (!this.currentUser) {
      this.showToast('Connectez-vous pour laisser un avis', 'info');
      return;
    }
    if (!this.reviewForm.rating || !this.reviewForm.comment.trim()) {
      this.showToast('Veuillez choisir une note et écrire un commentaire', 'warning');
      return;
    }
    this.isSubmittingReview = true;
    this.estateService.createReview({
      estate:  this.housing!.id,
      name:    this.currentUser.name || 'Anonyme',
      rating:  this.reviewForm.rating,
      comment: this.reviewForm.comment.trim(),
    }).subscribe({
      next: () => {
        this.isSubmittingReview = false;
        this.showToast(this.translate.instant('review.submit_success'), 'success');
        this.showReviewForm = false;
        this.reviewForm     = { rating: 0, comment: '' };
        // Reload both reviews list AND estate (to update average_rating in the UI)
        this.loadReviews(this.housing!.id);
        this.loadEstate(this.housing!.id);
      },
      error: () => {
        this.isSubmittingReview = false;
        this.showToast(this.translate.instant('review.submit_error'), 'error');
      }
    });
  }

  // ── Like ──────────────────────────────────────────────────

  likeReview(review: Review, event: Event): void {
    event.stopPropagation();
    if (!this.currentUser) {
      this.showToast('Connectez-vous pour liker un avis', 'info');
      return;
    }
    this.estateService.likeReview(review.id).subscribe({
      next: (res) => {
        review.likes_count = res.likes_count;
        review.liked_by_me = res.liked;
      },
      error: () => this.showToast('Erreur lors du like', 'error')
    });
  }

  // ── Review "show more" ────────────────────────────────────

  get visibleReviews(): Review[] {
    return this.reviews.slice(0, this.reviewsDisplayed);
  }

  hasMoreReviews(): boolean {
    return this.reviewsDisplayed < this.reviews.length;
  }

  loadMoreReviews(): void {
    this.reviewsDisplayed += this.REVIEWS_PER_PAGE;
  }

  // ── Messaging ─────────────────────────────────────────────

  openMessageModal(): void {
    if (!this.currentUser) {
      this.showToast('Connectez-vous pour envoyer un message', 'info');
      this.openLogin();
      return;
    }
    if (!this.housing?.owner) {
      this.showToast('Propriétaire introuvable', 'error');
      return;
    }
    this.showMessageModal      = true;
    this.isLoadingConversation = true;
    this.activeConversation    = null;

    this.estateService.startConversation(this.housing.id, this.housing.owner.id).subscribe({
      next: (conv) => {
        this.activeConversation    = conv;
        this.isLoadingConversation = false;
        setTimeout(() => this.scrollMessages(), 100);
      },
      error: () => {
        this.isLoadingConversation = false;
        this.showToast('Impossible d\'ouvrir la conversation', 'error');
      }
    });
  }

  closeMessageModal(): void {
    this.showMessageModal      = false;
    this.messageText           = '';
    this.activeConversation    = null;
    this.isLoadingConversation = false;
  }

  sendMessage(): void {
    const text = this.messageText.trim();
    if (!text || !this.activeConversation || this.isSendingMessage) return;

    this.isSendingMessage = true;
    this.messageText = '';

    this.estateService.sendMessage(this.activeConversation.id, text).subscribe({
      next: (msg) => {
        this.activeConversation!.messages.push(msg);
        this.isSendingMessage = false;
        setTimeout(() => this.scrollMessages(), 50);
      },
      error: () => {
        this.isSendingMessage = false;
        this.messageText = text;
        this.showToast('Erreur lors de l\'envoi', 'error');
      }
    });
  }

  private scrollMessages(): void {
    try {
      const el = this.msgScroll?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  // ── Navigation ────────────────────────────────────────────

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (!this.showLightbox) return;
    if (event.key === 'ArrowLeft')  this.prevPhoto();
    if (event.key === 'ArrowRight') this.nextPhoto();
    if (event.key === 'Escape')     this.closeLightbox();
  }

  goBack(): void { this.router.navigate(['/']); }
  setActivePhoto(i: number): void { this.activePhotoIndex = i; }
  prevPhoto(): void { this.activePhotoIndex = (this.activePhotoIndex - 1 + this.photos.length) % this.photos.length; }
  nextPhoto(): void { this.activePhotoIndex = (this.activePhotoIndex + 1) % this.photos.length; }
  openLightbox(i: number): void { this.activePhotoIndex = i; this.showLightbox = true; }
  closeLightbox(): void { this.showLightbox = false; }
  openContact(): void { this.showContactModal = true; }
  closeContact(): void { this.showContactModal = false; }
  openLogin(): void { this.router.navigate(['/login']); }

  // ── Reservation submit ────────────────────────────────────

  handleSendRequest(): void {
    if (!this.contactForm.name.trim() || !this.contactForm.phone.trim() || !this.housing) {
      this.showToast('Veuillez remplir votre nom et téléphone', 'warning');
      return;
    }
    this.isSubmitting  = true;
    this.submitSuccess = false;

    this.estateService.createQuickOrder({
      estate:         this.housing.id,
      room_category:  this.selectedRoomCategory?.id ?? null,
      name:           this.contactForm.name.trim(),
      phone:          this.contactForm.phone.trim(),
      note:           this.contactForm.message
    }).subscribe({
      next: () => {
        this.isSubmitting  = false;
        this.submitSuccess = true;
        this.showToast('Demande envoyée ! Le propriétaire vous contactera bientôt.', 'success');
        setTimeout(() => {
          this.closeContact();
          this.submitSuccess = false;
          this.contactForm   = { name: '', phone: '', message: '' };
        }, 2200);
      },
      error: () => {
        this.isSubmitting = false;
        this.showToast('Erreur lors de l\'envoi. Veuillez réessayer.', 'error');
      }
    });
  }
}




