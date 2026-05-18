import { Component, OnInit, OnDestroy, AfterViewChecked, ElementRef, ViewChild, ChangeDetectorRef, HostListener, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import * as L from 'leaflet';
import {
  LucideAngularModule,
  Home, BarChart3, Clock, Star, Plus, Trash2, X,
  Wifi, Utensils, Zap, Droplets, Tv, Thermometer,
  MessageSquare, FileText, Phone, MapPin, Calendar,
  CheckCircle, AlertCircle, Info, Send, ArrowLeft,
  Edit, Package, User, Mail, Building, Pencil, ChevronDown,
  Navigation, Check, Save, Search, Loader, ArrowRight,
  ParkingCircle, ShieldCheck, CreditCard, Video, Sparkles, Dribbble, Gamepad2
} from 'lucide-angular';
import { AuthService, User as AuthUser } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import {
  EstateService, Estate, EstateRaw, EstateImage, RoomCategory, RoomImage, QuickOrder, Reservation, Invoice, Review, ContactRequest,
  Conversation, ChatMessage, OwnerDashboardStats, ClientDashboardStats,
  enrichReview
} from '../../services/estate.service';
import { Subscription, filter, interval, catchError, of, forkJoin, Observable, map, switchMap } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

// ── Fix Leaflet icon paths when bundled by Angular ──────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl:       'assets/leaflet/marker-icon.png',
  shadowUrl:     'assets/leaflet/marker-shadow.png',
});

const EYANG_CENTER: L.LatLngTuple = [3.884041, 11.390736];

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LucideAngularModule, RouterModule, TranslateModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('ownerViewport') ownerViewport?: ElementRef;
  private shouldScroll = false;

  // ── Icons ─────────────────────────────────────────────────
  readonly HomeIcon       = Home;
  readonly BarChartIcon   = BarChart3;
  readonly ClockIcon      = Clock;
  readonly StarIcon       = Star;
  readonly PlusIcon       = Plus;
  readonly TrashIcon      = Trash2;
  readonly XIcon          = X;
  readonly WifiIcon       = Wifi;
  readonly UtensilsIcon   = Utensils;
  readonly ZapIcon        = Zap;
  readonly DropletsIcon   = Droplets;
  readonly TvIcon         = Tv;
  readonly FridgeIcon     = Thermometer;
  readonly MessageIcon    = MessageSquare;
  readonly FileIcon       = FileText;
  readonly PhoneIcon      = Phone;
  readonly MapPinIcon     = MapPin;
  readonly CalendarIcon   = Calendar;
  readonly CheckIcon      = CheckCircle;
  readonly AlertIcon      = AlertCircle;
  readonly InfoIcon       = Info;
  readonly SendIcon       = Send;
  readonly BackIcon       = ArrowLeft;
  readonly EditIcon       = Edit;
  readonly PencilIcon     = Pencil;
  readonly PackageIcon    = Package;
  readonly UserIcon       = User;
  readonly MailIcon       = Mail;
  readonly BuildingIcon   = Building;
  readonly ChevronDownIcon = ChevronDown;
  readonly NavigationIcon = Navigation;
  readonly SaveIcon       = Save;
  readonly SearchIcon     = Search;
  readonly LocateIcon     = Navigation;
  readonly LoaderIcon     = Loader;
  readonly NextIcon       = ArrowRight;
  readonly ParkingIcon    = ParkingCircle;
  readonly ShieldCheckIcon = ShieldCheck;
  readonly CreditCardIcon  = CreditCard;
  readonly VideoIcon       = Video;
  readonly SparklesIcon    = Sparkles;
  readonly DribbbleIcon    = Dribbble;
  readonly Gamepad2Icon    = Gamepad2;

  // ── State ─────────────────────────────────────────────────
  currentUser: AuthUser | null = null;
  isOwner = false;
  isLoading = true;
  activeTab = 'overview'; // For Owners: overview, estates, reservations, reviews, messages. For Clients: reservations, reviews, contacts, messages.

  /** True only when the owner's account has been verified by an admin */
  get isOwnerVerified(): boolean { return this.currentUser?.is_verified === true; }

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
    if (tab === 'reservations' && this.isOwner) {
       // Refresh owner reservations if needed
       this.estateService.getUnifiedReservations(this.isOwner ? 'owner' : 'client').subscribe(o => this.myReservations = o);
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void { this.mobileTabOpen = false; }

  // ── Owner ─────────────────────────────────────────────────
  ownerStats: OwnerDashboardStats = {
    total_estates: 0, occupancy_pct: 0, pending_orders: 0, avg_rating: 0
  };
  myEstates: Estate[] = [];
  myReservations: Reservation[] = [];
  myInvoices: Invoice[] = [];
  myReviews: Review[] = [];

  // ── Action Modal State ──
  showActionModal = false;
  actionModalTitle = '';
  actionModalMessage = '';
  actionModalType: 'success' | 'error' = 'success';
  actionModalPrimaryBtn = '';
  actionModalSecondaryBtn = '';
  actionModalPrimaryFn: (() => void) | null = null;
  actionModalSecondaryFn: (() => void) | null = null;

  openActionModal(
    type: 'success' | 'error',
    title: string,
    message: string,
    primaryBtn: string,
    primaryFn: (() => void) | null = null,
    secondaryBtn: string = '',
    secondaryFn: (() => void) | null = null
  ) {
    this.actionModalType = type;
    this.actionModalTitle = title;
    this.actionModalMessage = message;
    this.actionModalPrimaryBtn = primaryBtn;
    this.actionModalPrimaryFn = primaryFn;
    this.actionModalSecondaryBtn = secondaryBtn;
    this.actionModalSecondaryFn = secondaryFn;
    this.showActionModal = true;
  }

  closeActionModal() {
    this.showActionModal = false;
  }

  handleActionPrimary() {
    this.closeActionModal();
    if (this.actionModalPrimaryFn) this.actionModalPrimaryFn();
  }

  handleActionSecondary() {
    this.closeActionModal();
    if (this.actionModalSecondaryFn) this.actionModalSecondaryFn();
  }

  // ── Review pagination (owner) ──────────────────────────────
  readonly REVIEW_PAGE_SIZE = 5;
  visibleReviewCount = this.REVIEW_PAGE_SIZE;

  // ── Estate pagination ──────────────────────────────────────
  readonly PAGE_SIZE = 6;
  visibleEstateCount = this.PAGE_SIZE;

  /** All estates sorted by rating */
  sortedEstates: Estate[] = [];

  /** The slice shown in the grid */
  pagedEstates: Estate[] = [];

  get hasMoreEstates(): boolean  { return this.visibleEstateCount < this.myEstates.length; }

  showMoreEstates(): void {
    this.visibleEstateCount = Math.min(this.visibleEstateCount + this.PAGE_SIZE, this.myEstates.length);
    this.updatePagedEstates();
  }

  resetEstatePage(): void {
    this.visibleEstateCount = this.PAGE_SIZE;
    this.updateSortedEstates();
    this.updatePagedEstates();
  }

  private updateSortedEstates(): void {
    this.sortedEstates = [...this.myEstates].sort((a, b) => {
      const ra = a.average_rating?.value ?? parseFloat(a.rating ?? '0');
      const rb = b.average_rating?.value ?? parseFloat(b.rating ?? '0');
      return rb - ra;
    });
  }

  private updatePagedEstates(): void {
    this.pagedEstates = this.sortedEstates.slice(0, this.visibleEstateCount);
  }

  /** The slice of reviews shown */
  pagedReviews: Review[] = [];

  get hasMoreReviews(): boolean { return this.visibleReviewCount < this.myReviews.length; }

  showMoreReviews(): void {
    this.visibleReviewCount = Math.min(this.visibleReviewCount + this.REVIEW_PAGE_SIZE, this.myReviews.length);
    this.updatePagedReviews();
  }

  resetReviewPage(): void {
    this.visibleReviewCount = this.REVIEW_PAGE_SIZE;
    this.updatePagedReviews();
  }

  private updatePagedReviews(): void {
    this.pagedReviews = this.myReviews.slice(0, this.visibleReviewCount);
  }

  // ── Estate modal ───────────────────────────────────────────
  showEstateModal = false;
  isEditMode      = false;
  editingId: number | null = null;
  isSavingEstate  = signal(false);
  estateForm!: FormGroup;
  distanceDisplay = '';
  currentStep = 1;
  readonly TOTAL_STEPS = 5;

  selectedCharacteristics = signal<number[]>([]);
  estateSupplements       = signal<any[]>([]);

  globalCharacteristics = signal<any[]>([]);
  globalEquipment       = signal<any[]>([]);

  // ── Leaflet map picker (estate modal — owner sets coords) ──
  private map?: L.Map;
  private marker?: L.Marker;
  isGeocoding = false;
  searchAddressQuery = '';
  removedImageIds: number[] = [];

  // ── Leaflet estate map (owner "Carte" view) ────────────────
  showEstateMap = false;
  private estateMap?: L.Map;
  private estateMarkerLayer?: L.LayerGroup;

  // ── Room management ────────────────────────────────────────
  showRoomModal = false;
  selectedEstateForRooms: Estate | null = null;
  isLoadingRooms = false;
  roomCategories: RoomCategory[] = [];

  isRoomEditMode  = false;
  isSavingRoom    = false;
  roomEditId: number | null = null;
  roomForm: Partial<RoomCategory> = this.emptyRoomForm();
  roomEquipment = signal<any[]>([]);

  roomSelectedFiles: File[]   = [];
  roomPreviewImages: string[] = [];
  roomExistingImages: RoomImage[] = [];
  roomRemovedImageIds: number[]   = [];
  existingImages: any[] = [];

  emptyRoomForm(): Partial<RoomCategory> {
    return { 
      name: '', 
      price: 300000, 
      occupancy: 'single', 
      total_rooms: 1,
      available_rooms: 1,
      quantity_available: 1,
      surface_area: 0,
      wifi: false, 
      tv: false, 
      fridge: false, 
      room_size: '2', 
      description: '' 
    };
  }

  newImageFiles:    File[]   = [];
  newImagePreviews: string[] = [];

  availableEquipments = [
    { key: 'restaurant', label: 'Restaurant',  icon: Utensils },
    { key: 'generator',  label: 'Générateur',  icon: Zap      },
    { key: 'forage',     label: 'Forage',      icon: Droplets },
  ];

  // ── Owner messaging ────────────────────────────────────────
  ownerConversationsLoading = false;

  // ── Client ────────────────────────────────────────────────
  clientStats: ClientDashboardStats = {
    total_reservations: 0, total_reviews: 0, total_messages: 0, total_contacts: 0
  };
  mySubmittedReviews:  Review[]     = [];
  myContacts:          ContactRequest[] = [];
  conversations:       Conversation[]  = [];
  onlineUsers:         Set<number>     = new Set();

  activeConversation: Conversation | null = null;
  newMessage = '';
  private pollSub?: Subscription;

  // ── Review modal (create) ──────────────────────────────────
  showReviewModal = false;
  reviewForm      = { estate: 0, rating: 0, comment: '' };
  hoverRating     = 0;
  allEstates: Estate[] = [];

  // ── Review edit modal ──────────────────────────────────────
  showEditReviewModal = false;
  editingReview: Review | null = null;
  editReviewForm  = { rating: 0, comment: '' };
  editHoverRating = 0;
  isSavingReview  = false;

  // ── Confirm dialog ─────────────────────────────────────────
  showConfirm     = false;
  confirmMessage  = '';
  private confirmCallback: (() => void) | null = null;

  private subs: Subscription[] = [];

  constructor(
    private authService:   AuthService,
    private estateService: EstateService,
    private wsService:     WebSocketService,
    private router:        Router,
    private cdr:           ChangeDetectorRef,
    private translate:     TranslateService,
    private fb:            FormBuilder,
    private http:          HttpClient
  ) { 
    this.initForm();
  }

  private initForm(): void {
    this.estateForm = this.fb.group({
      name: ['', Validators.required],
      location: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      distance: [500],
      status: ['published'],
      description: [''],
      lat: [3.884041, Validators.required],
      lng: [11.390736, Validators.required],
      
      // Detailed fields
      etages: [1],
      water_bills: [false],
      electricity_bills: [false],
      fence: [false],
      caretaker: [false],
      security_guard: [false],
      restaurant: [false],
      forage: [false],
      generator: [false],
      parking: [false],
      cctv: [false],
      wifi: [false],
      tv: [false],
      fridge: [false],
      cleaning_service: [false],
      Terrain_de_sport: [false],
      playground: [false],
      max_capacity: [null],
      allowed_gender: ['all']

    });
  }

  ngOnInit(): void {
    const sub = this.authService.currentUser$.pipe(
      filter(user => user !== null)
    ).subscribe(user => {
      this.currentUser = user;
      if (user.role === 'Admin') {
        this.router.navigate(['/app-admin/overview']);
        return;
      }

      this.isOwner     = user.role === 'Owner';
      this.activeTab   = 'reservations'; // Default for both for now, but Owner usually starts at overview
      if (this.isOwner) this.activeTab = 'overview';
      this.isLoading   = true;
      if (this.isOwner) {
        this.loadOwnerData();
      } else {
        this.activeTab = 'reservations'; // Clients don't have an 'overview' tab
        this.loadClientData();
      }
      this.refreshOnlineUsers();
    });
    this.subs.push(sub);

    // ── WebSocket streams ──────────────────────────────────
    // NOTE: WebSocketService.notifications$ is a Subject (hot) — subscribing here
    // is safe alongside NotificationService subscribing to the same stream.
    // Both receive every new frame; no second socket is opened.
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

    const sPoll = interval(30_000).subscribe(() => this.refreshOnlineUsers());
    this.subs.push(sPoll);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.pollSub?.unsubscribe();
    this.destroyEstateMap();
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
    this.confirmMessage  = message;
    this.confirmCallback = callback;
    this.showConfirm     = true;
  }

  confirmYes(): void {
    this.showConfirm = false;
    if (this.confirmCallback) {
      this.confirmCallback();
      this.confirmCallback = null;
    }
  }

  confirmNo(): void {
    this.showConfirm     = false;
    this.confirmCallback = null;
  }

  // ══════════════════════════════════════════════════════════
  //  OWNER
  // ══════════════════════════════════════════════════════════

  loadOwnerData(): void {
    this.estateService.getOwnerStats().subscribe({
      next: s => this.ownerStats = s, error: () => {}
    });
    this.estateService.getMyEstates().subscribe({
      next: e => {
        this.myEstates = e;
        this.resetEstatePage();
        this.isLoading = false;
        // Refresh estate map markers if the map is already open
        if (this.showEstateMap && this.estateMarkerLayer) {
          this.renderEstateMapMarkers();
        }
        this.cdr.detectChanges();
      },
      error: () => { this.isLoading = false; this.cdr.detectChanges(); }
    });
    this.estateService.getUnifiedReservations('owner').subscribe({
      next: o => this.myReservations = o, error: () => {}
    });
    this.estateService.getInvoices().subscribe({
      next: i => this.myInvoices = i, error: () => {}
    });
    this.estateService.getMyReviews().subscribe({
      next: r => { this.myReviews = r; this.resetReviewPage(); }, error: () => {}
    });

    // Load characteristics and equipment for selection
    this.estateService.getCharacteristicList().subscribe(c => this.globalCharacteristics.set(c));
    this.estateService.getEquipmentList().subscribe(e => this.globalEquipment.set(e));
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
    return `${c.first_name} ${c.last_name}`.trim() || c.username;
  }

  getConvColor(conv: Conversation): string {
    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];
    return colors[conv.id % colors.length];
  }

  getOwnerConvColor(conv: Conversation): string {
    return this.getConvColor(conv);
  }

  // ══════════════════════════════════════════════════════════
  //  ESTATE MAP  (owner "Carte" toggle in Mes logements tab)
  // ══════════════════════════════════════════════════════════

  /**
   * Toggle the Leaflet estate overview map.
   * Works like the home-page map: real tiles + image-rich markers.
   */
  toggleEstateMap(): void {
    this.showEstateMap = !this.showEstateMap;
    if (this.showEstateMap) {
      // Allow the *ngIf element to render first
      setTimeout(() => this.initEstateMap(), 200);
    } else {
      this.destroyEstateMap();
    }
  }

  private initEstateMap(): void {
    const el = document.getElementById('estate-map');
    if (!el || this.estateMap) return;

    this.estateMap = L.map(el, {
      center: EYANG_CENTER,
      zoom: 15,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.estateMap);

    L.control.attribution({ position: 'bottomright', prefix: '© OSM' }).addTo(this.estateMap);

    this.estateMarkerLayer = L.layerGroup().addTo(this.estateMap);
    this.renderEstateMapMarkers();
  }

  private renderEstateMapMarkers(): void {
    if (!this.estateMap || !this.estateMarkerLayer) return;
    this.estateMarkerLayer.clearLayers();

    this.myEstates.forEach(estate => {
      const lat = estate.lat && estate.lat !== 0 ? estate.lat : EYANG_CENTER[0];
      const lng = estate.lng && estate.lng !== 0 ? estate.lng : EYANG_CENTER[1];

      const coverImg = estate.images?.[0]?.image ?? '';
      const priceK   = estate.price >= 1_000_000
        ? `${(estate.price / 1_000_000).toFixed(1)}M`
        : `${Math.round(estate.price / 1_000)}k`;

      const statusColor = estate.status === 'published' ? '#10B981'
        : estate.status === 'draft' ? '#6B7280' : '#000';

      // Photo-card marker (matches home-page emk style)
      const imgBlock = coverImg
        ? `<img src="${coverImg}" alt="${estate.name.replace(/"/g, '&quot;')}"
               style="width:100%;height:52px;object-fit:cover;display:block;border-radius:8px 8px 0 0">`
        : `<div style="height:52px;background:#E2E8F0;border-radius:8px 8px 0 0;
               display:flex;align-items:center;justify-content:center;font-size:22px">🏠</div>`;

      const ratingStr = (estate.average_rating?.value ?? 0) > 0
        ? `<span style="float:right;font-size:9px;color:#F59E0B">★ ${estate.average_rating.value.toFixed(1)}</span>`
        : '';

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:96px;background:#fff;border-radius:8px;
                    box-shadow:0 3px 16px rgba(0,0,0,.22);overflow:hidden;cursor:pointer;
                    border:2px solid ${statusColor}">
                 ${imgBlock}
                 <div style="padding:3px 6px 4px">
                   <div style="font-size:9px;font-weight:700;color:#1E293B;
                               white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                     ${estate.name}
                   </div>
                   <div class="conv-row__estate">
                     ${priceK} ${this.translate.instant('housing.currency')}${ratingStr}
                   </div>
                 </div>
               </div>`,
        iconSize:   [96, 82],
        iconAnchor: [48, 82],
      });

      const statusLabel = estate.status === 'published' ? this.translate.instant('dashboard.status_published')
        : estate.status === 'draft' ? this.translate.instant('dashboard.status_draft') : this.translate.instant('dashboard.status_archived');

      const marker = L.marker([lat, lng], { icon });
      marker.bindPopup(
        `<div style="min-width:160px">
           ${coverImg ? `<img src="${coverImg}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px">` : ''}
           <b style="font-size:13px">${estate.name}</b><br>
           <span style="font-size:11px;color:#64748B">📍 ${estate.location}</span><br>
           <span style="font-size:11px;font-weight:600;color:#1E293B">
            ${this.formatPrice(estate.price)}${this.translate.instant('dashboard.per_month') }
           </span><br>
           <span style="font-size:10px;color:${statusColor};font-weight:600">${statusLabel}</span>
         </div>`,
        { maxWidth: 200, className: 'estate-popup' }
      );
      marker.addTo(this.estateMarkerLayer!);
    });

    // Fit map to all markers if there are estates with coords
    const coords = this.myEstates
      .filter(e => e.lat && e.lat !== 0 && e.lng && e.lng !== 0)
      .map(e => [e.lat!, e.lng!] as L.LatLngTuple);
    if (coords.length > 1) {
      this.estateMap.fitBounds(L.latLngBounds(coords), { padding: [30, 30], maxZoom: 16 });
    }
  }

  private destroyEstateMap(): void {
    this.estateMap?.remove();
    this.estateMap        = undefined;
    this.estateMarkerLayer = undefined;
  }

  // ══════════════════════════════════════════════════════════
  //  ESTATE MODAL  (add / edit)
  // ══════════════════════════════════════════════════════════

  openAddModal(): void {
    if (!this.isOwnerVerified) {
      this.showToast(this.translate.instant('dashboard.verification_required'), 'warning');
      return;
    }
    this.isEditMode  = false;
    this.editingId   = null;
    this.currentStep = 1;
    this.estateForm.reset({
      name: '', location: '', distance: 500, price: 0, status: 'published', description: '',
      generator: '0', forage: '0', restaurant: '0', wifi: '0', tv: '0', fridge: '0',
      lat: EYANG_CENTER[0], lng: EYANG_CENTER[1],
      etages: 1, water_bills: false, electricity_bills: false, fence: false,
      caretaker: false, security_guard: false, restaurant_on_site: false,
      borehole_forage: false, generator_available: false, parking: false,
      cctv: false, cleaning_service: false, allowed_gender: 'all'
    });
    this.newImageFiles    = [];
    this.newImagePreviews = [];
    this.existingImages   = [];
    this.selectedCharacteristics.set([]);
    this.estateSupplements.set([]);
    this.showEstateModal  = true;
    setTimeout(() => this.initMap(), 100);
  }

  openEditModal(estate: Estate): void {
    this.isEditMode = true;
    this.editingId  = estate.id;
    this.currentStep = 1;
    this.estateForm.patchValue({
      name: estate.name, location: estate.location, distance: estate.distance,
      price: estate.price, status: estate.status, description: estate.description,
      generator: estate.generator, forage: estate.forage, restaurant: estate.restaurant,
      wifi: estate.wifi, tv: estate.tv, fridge: estate.fridge,
      lat: Number(estate.lat), lng: Number(estate.lng),
      // New fields
      etages: (estate as any).etages || 1,
      water_bills: (estate as any).water_bills || false,
      electricity_bills: (estate as any).electricity_bills || false,
      fence: (estate as any).fence || false,
      caretaker: (estate as any).caretaker || false,
      security_guard: (estate as any).security_guard || false,
      restaurant_on_site: (estate as any).restaurant_on_site || false,
      borehole_forage: (estate as any).borehole_forage || false,
      generator_available: (estate as any).generator_available || false,
      parking: (estate as any).parking || false,
      cctv: (estate as any).cctv || false,
      cleaning_service: (estate as any).cleaning_service || false,
      allowed_gender: (estate as any).allowed_gender || 'all'
    });
    this.existingImages   = [...(estate.images ?? [])];
    
    this.newImageFiles    = [];
    this.newImagePreviews = [];
    
    // Load existing characteristics and supplements
    this.estateService.getEstateCharacteristics(estate.id).subscribe((chars: any[]) => {
      this.selectedCharacteristics.set(chars.map((c: any) => c.characteristic));
    });
    this.estateService.getEstateSupplements(estate.id).subscribe((supps: any[]) => {
      this.estateSupplements.set(supps);
    });

    this.showEstateModal  = true;
    setTimeout(() => this.initMap(), 100);
  }

  closeEstateModal(): void {
    this.showEstateModal  = false;
    this.newImageFiles    = [];
    this.newImagePreviews = [];
    if (this.map) {
      this.map.remove();
      this.map = undefined;
      this.marker = undefined;
    }
  }

  toggleCharacteristic(id: number): void {
    this.selectedCharacteristics.update((list: number[]) => 
      list.includes(id) ? list.filter((item: number) => item !== id) : [...list, id]
    );
  }

  // ── Dynamic Creation Modal State ──
  showDynamicCreateModal = false;
  dynamicCreateType: 'characteristic' | 'equipment' | null = null;
  dynamicCreateName = '';
  dynamicCreateTargetEquipObj: any = null;

  openCreateCharacteristicModal(): void {
    this.dynamicCreateType = 'characteristic';
    this.dynamicCreateName = '';
    this.showDynamicCreateModal = true;
  }

  openCreateEquipmentModal(equipObj: any): void {
    this.dynamicCreateType = 'equipment';
    this.dynamicCreateName = '';
    this.dynamicCreateTargetEquipObj = equipObj;
    this.showDynamicCreateModal = true;
  }

  closeDynamicCreateModal(): void {
    this.showDynamicCreateModal = false;
    this.dynamicCreateType = null;
    this.dynamicCreateName = '';
    this.dynamicCreateTargetEquipObj = null;
  }

  submitDynamicCreate(): void {
    const name = this.dynamicCreateName.trim();
    if (!name) return;

    if (this.dynamicCreateType === 'characteristic') {
      this.estateService.createCharacteristic({ name }).subscribe({
        next: (c) => {
          this.globalCharacteristics.update(list => [...list, c].sort((a, b) => a.name.localeCompare(b.name)));
          this.toggleCharacteristic(c.id);
          this.openActionModal('success', this.translate.instant('admin.success') || 'Success', this.translate.instant('admin.characteristic_created') || 'Characteristic created successfully', 'OK');
          this.closeDynamicCreateModal();
        },
        error: () => this.openActionModal('error', this.translate.instant('admin.error') || 'Error', this.translate.instant('admin.error_creating_characteristic') || 'Error creating characteristic', 'OK')
      });
    } else if (this.dynamicCreateType === 'equipment') {
      this.estateService.createEquipment({ part_name: name }).subscribe({
        next: (eq) => {
          this.globalEquipment.update(list => [...list, eq].sort((a, b) => a.part_name.localeCompare(b.part_name)));
          if (this.dynamicCreateTargetEquipObj) {
            this.dynamicCreateTargetEquipObj.equipment = eq.id;
          }
          this.openActionModal('success', 'Success', 'Equipment created successfully', 'OK');
          this.closeDynamicCreateModal();
        },
        error: () => this.openActionModal('error', 'Error', 'Error creating equipment', 'OK')
      });
    }
  }

  addSupplement(): void {
    this.estateSupplements.update((list: any[]) => [...list, { name: '', price: 0, is_paid_service: true, is_available: true }]);
  }

  removeSupplement(index: number): void {
    this.estateSupplements.update((list: any[]) => list.filter((_, i: number) => i !== index));
  }

  nextStep(): void {
    if (this.currentStep === 1) {
      if (this.estateForm.get('name')?.invalid || this.estateForm.get('location')?.invalid) {
        this.showToast(this.translate.instant('admin.fill_required'), 'warning');
        return;
      }
    } else if (this.currentStep === 4) {
      if (!this.estateForm.get('lat')?.value || !this.estateForm.get('lng')?.value) {
        this.showToast(this.translate.instant('admin.location_required'), 'warning');
        return;
      }
    }

    if (this.currentStep < this.TOTAL_STEPS) {
      this.currentStep++;
      if (this.currentStep === 4) {
        this.initMap();
      }
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) this.currentStep--;
  }


  // ── Room Category Methods ─────────────────────────────────

  openManageRooms(estate: Estate): void {
    this.selectedEstateForRooms = estate;
    this.showRoomModal          = true;
    this.isRoomEditMode         = false;
    this.loadRooms(estate.id);
  }

  closeRoomModal(): void {
    this.showRoomModal          = false;
    this.selectedEstateForRooms = null;
  }

  loadRooms(estateId: number): void {
    this.isLoadingRooms = true;
    this.estateService.getRoomCategories(estateId).subscribe({
      next: rooms => { this.roomCategories = rooms; this.isLoadingRooms = false; this.cdr.detectChanges(); },
      error: () => { this.showToast(this.translate.instant('admin.error_load'), 'error'); this.isLoadingRooms = false; this.cdr.detectChanges(); }
    });
  }

  openCreateRoom(): void {
    this.isRoomEditMode       = true;
    this.roomEditId           = null;
    this.roomForm             = this.emptyRoomForm();
    this.roomSelectedFiles    = [];
    this.roomPreviewImages    = [];
    this.roomExistingImages   = [];
    this.roomRemovedImageIds  = [];
    this.roomEquipment.set([]);
  }

  openEditRoom(room: RoomCategory): void {
    this.isRoomEditMode       = true;
    this.roomEditId           = room.id;
    this.roomForm             = { ...room };
    this.roomExistingImages   = [...(room.images || [])];
    this.roomSelectedFiles    = [];
    this.roomPreviewImages    = [];
    this.roomRemovedImageIds  = [];
    
    this.estateService.getRoomEquipment(room.id).subscribe({
      next: (eq) => this.roomEquipment.set(eq),
      error: () => this.roomEquipment.set([])
    });
  }

  addRoomEquipment(): void {
    this.roomEquipment.update(list => [...list, { equipment: null, quantity: 1, condition: 'GOOD', note: '' }]);
  }

  removeRoomEquipment(index: number): void {
    this.roomEquipment.update(list => list.filter((_, i) => i !== index));
  }

  private syncRoomEquipment(categoryId: number): Observable<any> {
    const equip = this.roomEquipment();
    return this.estateService.getRoomEquipment(categoryId).pipe(
      switchMap((existing: any[]) => {
        const toDelete = existing.map((e: any) => this.estateService.deleteRoomEquipment(e.id));
        const toAdd = equip
          .filter((e: any) => e.equipment) // Only sync if equipment is selected
          .map((e: any) => this.estateService.addRoomEquipment({
            room_category: categoryId,
            equipment: e.equipment,
            quantity: e.quantity,
            condition: e.condition,
            note: e.note
          }));
        return [...toDelete, ...toAdd].length ? forkJoin([...toDelete, ...toAdd]) : of([]);
      }),
      catchError(() => of([]))
    );
  }

  deleteRoom(room: RoomCategory): void {
    this.openActionModal(
      'error',
      'Confirm Deletion',
      this.translate.instant('admin.room_delete_confirm', { name: room.name }),
      'Delete',
      () => {
        this.estateService.deleteRoomCategory(room.id).subscribe(() => {
          this.openActionModal('success', 'Success', this.translate.instant('admin.delete_room_success', { name: room.name }), 'OK');
          if (this.selectedEstateForRooms) this.loadRooms(this.selectedEstateForRooms.id);
        });
      },
      'Cancel'
    );
  }

  saveRoom(): void {
    if (!this.selectedEstateForRooms) return;
    if (!this.roomForm.name) { 
      this.openActionModal('error', 'Error', this.translate.instant('auth.error_missing_fields'), 'OK'); 
      return; 
    }

    this.isSavingRoom = true;
    const payload = { ...this.roomForm, estate: this.selectedEstateForRooms.id };

    const req = this.roomEditId
      ? this.estateService.updateRoomCategory(this.roomEditId, payload)
      : this.estateService.createRoomCategory(payload);

    req.subscribe({
      next: saved => {
        this.syncRoomEquipment(saved.id).subscribe(() => {
          const afterSave = () => {
            this.isSavingRoom   = false;
            this.isRoomEditMode = false;
            this.openActionModal('success', 'Success', 'Room saved successfully', 'OK');
            this.loadRooms(this.selectedEstateForRooms!.id);
          };

          const doRoomUpload = () => {
            if (this.roomSelectedFiles.length > 0) {
              this.estateService.uploadRoomImages(saved.id, this.roomSelectedFiles).subscribe(afterSave);
            } else {
              afterSave();
            }
          };

          if (this.roomRemovedImageIds.length > 0) {
            forkJoin(this.roomRemovedImageIds.map(id => this.estateService.deleteRoomImage(saved.id, id).pipe(catchError(() => of(null)))))
              .subscribe({
                next:  () => { this.roomRemovedImageIds = []; doRoomUpload(); },
                error: () => { this.roomRemovedImageIds = []; doRoomUpload(); }
              });
          } else {
            doRoomUpload();
          }
        });
      },
      error: () => {
        this.openActionModal('error', 'Error', this.translate.instant('admin.error_load'), 'OK');
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

  // ── Save estate (create or update) ────────────────────────

  saveEstate(): void {
    if (this.estateForm.invalid) {
      this.estateForm.markAllAsTouched();
      this.showToast(this.translate.instant('admin.fill_required'), 'warning');
      return;
    }

    this.isSavingEstate.set(true);
    const payload = this.estateForm.value;

    const req$ = this.isEditMode && this.editingId
      ? this.estateService.updateEstate(this.editingId, payload)
      : this.estateService.createEstate(payload);

    req$.subscribe({
      next: savedEstate => {
        this.syncEstateDetails(savedEstate.id).subscribe({
          next: () => {
            const showSuccess = () => {
              this.isSavingEstate.set(false);
              if (this.isEditMode) {
                this.openActionModal(
                  'success',
                  this.translate.instant('admin.update_success', { name: savedEstate.name }),
                  'The estate has been updated successfully.',
                  'OK',
                  () => {
                    this.closeEstateModal();
                    this.loadOwnerData();
                  }
                );
              } else {
                this.openActionModal(
                  'success',
                  this.translate.instant('admin.create_success', { name: savedEstate.name }),
                  'Estate created successfully. Would you like to add rooms now?',
                  'Manage Rooms',
                  () => {
                    this.closeEstateModal();
                    this.loadOwnerData();
                    this.openManageRooms(savedEstate);
                  },
                  'Later',
                  () => {
                    this.closeEstateModal();
                    this.loadOwnerData();
                  }
                );
              }
            };

            const doUpload = () => {
              if (this.newImageFiles.length > 0) {
                this.estateService.uploadEstateImages(savedEstate.id, this.newImageFiles).subscribe({
                  next:  () => showSuccess(),
                  error: () => {
                    this.openActionModal('error', 'Error', this.translate.instant('admin.upload_error'), 'OK');
                    this.isSavingEstate.set(false);
                    this.closeEstateModal();
                    this.loadOwnerData();
                  },
                });
              } else {
                showSuccess();
              }
            };

            if (this.removedImageIds.length > 0) {
              forkJoin(this.removedImageIds.map(id => this.estateService.deleteEstateImage(savedEstate.id, id).pipe(catchError(() => of(null)))))
                .subscribe({
                  next:  () => { this.removedImageIds = []; doUpload(); },
                  error: () => { this.removedImageIds = []; doUpload(); }
                });
            } else {
              doUpload();
            }
          },
          error: (err) => {
            this.isSavingEstate.set(false);
            this.openActionModal('error', 'Error', this.translate.instant('admin.error_sync_details'), 'OK');
            console.error('Sync details error:', err);
          }
        });
      },
      error: (err) => {
        this.isSavingEstate.set(false);
        this.openActionModal('error', 'Error', err?.error?.detail || this.translate.instant('admin.error_load'), 'OK');
      }
    });
  }

  private syncEstateDetails(estateId: number): Observable<any> {
    const chars = this.selectedCharacteristics(); // number[]
    const supps = this.estateSupplements();      // Supplement[]

    const charObs = this.estateService.getEstateCharacteristics(estateId).pipe(
      switchMap((existing: any[]) => {
        // existing characteristics are EstateCharacteristic objects { id, characteristic, ... }
        const existingCharIds = existing.map(ec => ec.characteristic);
        
        // 1. Delete ones that are no longer selected
        const toDelete = existing
          .filter(ec => !chars.includes(ec.characteristic))
          .map(ec => this.estateService.deleteEstateCharacteristic(estateId, ec.characteristic));
        
        // 2. Add ones that are newly selected
        const toAdd = chars
          .filter(id => !existingCharIds.includes(id))
          .map(id => this.estateService.addEstateCharacteristic(estateId, id));
        
        const all = [...toDelete, ...toAdd];
        return all.length ? forkJoin(all) : of([]);
      })
    );

    const suppObs = this.estateService.getEstateSupplements(estateId).pipe(
      switchMap((existing: any[]) => {
        const existingIds = existing.map(s => s.id);
        const incomingIds = supps.filter(s => s.id).map(s => s.id);
        
        // Delete ones that are gone
        const toDelete = existing
          .filter(s => !incomingIds.includes(s.id))
          .map(s => this.estateService.deleteSupplement(s.id));
        
        // Add new ones (no id)
        const toAdd = supps
          .filter(s => !s.id)
          .map(s => this.estateService.addEstateSupplement(estateId, s));
        
        // Update existing ones (has id)
        const toUpdate = supps
          .filter(s => s.id && existingIds.includes(s.id))
          .map(s => this.estateService.updateSupplement(s.id, s));
          
        const all = [...toDelete, ...toAdd, ...toUpdate];
        return all.length ? forkJoin(all) : of([]);
      })
    );

    return forkJoin({ chars: charObs, supps: suppObs });
  }

  deleteEstate(estate: Estate): void {
    this.openConfirm(this.translate.instant('admin.delete_confirm', { name: estate.name }), () => {
      this.estateService.deleteEstate(estate.id).subscribe({
        next:  () => { this.showToast(this.translate.instant('dashboard.delete'), 'success'); this.loadOwnerData(); },
        error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
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
    this.estateService.getClientStats().subscribe({ next: s => this.clientStats = s, error: () => {} });
    this.estateService.getUnifiedReservations('client').subscribe({
      next: r => { this.myReservations = r; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
    this.estateService.getInvoices().subscribe({ next: i => this.myInvoices = i, error: () => {} });
    this.estateService.getMySubmittedReviews().subscribe({ next: r => this.mySubmittedReviews = r, error: () => {} });
    this.estateService.getMyContactRequests().subscribe({ next: c => this.myContacts = c, error: () => {} });
    this.estateService.getConversations().subscribe({ next: c => this.conversations = c, error: () => {} });
    this.estateService.getEstates({ status: 'published' }).subscribe({ next: e => this.allEstates = e, error: () => {} });
  }

  // ── Owner: Reservation actions ────────────────────────────

  acceptReservation(order: Reservation): void {
    if (!order.id) return;
    if (order.is_legacy) {
      this.estateService.acceptQuickOrder(order.id).subscribe({
        next: () => {
          this.updateBookingInDashboard(order.id, 'ACCEPTED', true);
          this.showToast(this.translate.instant('dashboard.status_accepted'), 'success');
          this.loadOwnerData();
        },
        error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
      });
      return;
    }
    this.estateService.acceptReservation(order.id).subscribe({
      next: updated => {
        this.updateBookingInDashboard(order.id, updated, false);
        this.showToast(this.translate.instant('dashboard.status_accepted'), 'success');
        this.loadOwnerData(); // Refresh to fetch newly generated invoice
      },
      error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
    });
  }

  rejectReservation(order: Reservation): void {
    if (!order.id) return;
    this.openConfirm(this.translate.instant('admin.reject_booking_confirm', { name: order.estate_name }), () => {
      if (order.is_legacy) {
        this.estateService.rejectQuickOrder(order.id).subscribe({
          next: () => {
            this.updateBookingInDashboard(order.id, 'REJECTED', true);
            this.showToast(this.translate.instant('dashboard.status_rejected'), 'info');
          },
          error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
        });
        return;
      }
      this.estateService.rejectReservation(order.id).subscribe({
        next: updated => {
          this.updateBookingInDashboard(order.id, updated, false);
          this.showToast(this.translate.instant('dashboard.status_rejected'), 'info');
        },
        error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
      });
    });
  }

  private updateBookingInDashboard(id: number, data: any, isLegacy: boolean): void {
    const idx = this.myReservations.findIndex((o: Reservation) => o.id === id && o.is_legacy === isLegacy);
    if (idx !== -1) {
      if (typeof data === 'string') {
        this.myReservations[idx] = { ...this.myReservations[idx], status: data as any };
      } else {
        this.myReservations[idx] = data;
      }
      this.myReservations = [...this.myReservations];
    }
  }

  // ── Client: Reservations ──────────────────────────────────

  deleteReservation(order: Reservation): void {
    if (!order.id) return;
    this.openConfirm(this.translate.instant('dashboard.cancel_reservation_confirm', { name: order.estate_name }), () => {
      this.estateService.cancelReservation(order.id).subscribe({
        next: updated => {
          const idx = this.myReservations.findIndex((r: Reservation) => r.id === order.id);
          if (idx !== -1) this.myReservations[idx] = updated;
          this.showToast(this.translate.instant('dashboard.cancel_reservation'), 'success');
        },
        error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
      });
    });
  }

  // ── Common: Reservation Details & Bill ────────────────────

  showReservationModal = false;
  selectedReservation: Reservation | null = null;
  
  openReservationDetails(res: Reservation): void {
    this.selectedReservation = res;
    this.showReservationModal = true;
  }
  
  closeReservationDetails(): void {
    this.showReservationModal = false;
    this.selectedReservation = null;
  }
  
  openBill(res: any): void {
    this.estateService.openBill(res);
  }


  downloadInvoice(invoice: Invoice): void {
    this.estateService.downloadInvoice(invoice.id);
  }

  // ── Client: Reviews ───────────────────────────────────────

  openReviewModal(): void {
    this.reviewForm  = { estate: 0, rating: 0, comment: '' };
    this.hoverRating = 0;
    this.showReviewModal = true;
  }

  closeReviewModal(): void { this.showReviewModal = false; }

  setRating(r: number): void  { this.reviewForm.rating = r; }
  setHover(r: number): void   { this.hoverRating = r; }
  clearHover(): void          { this.hoverRating = 0; }

  get selectedReviewEstate(): Estate | null {
    if (!this.reviewForm.estate) return null;
    return this.allEstates.find(e => e.id === this.reviewForm.estate) ?? null;
  }

  submitReview(): void {
    if (!this.reviewForm.estate || !this.reviewForm.rating || !this.reviewForm.comment.trim()) {
      this.showToast(this.translate.instant('auth.error_missing_fields'), 'error');
      return;
    }
    const name = this.currentUser?.name || this.translate.instant('common.anonymous');
    this.estateService.createReview({
      estate:  this.reviewForm.estate,
      name,
      rating:  this.reviewForm.rating,
      comment: this.reviewForm.comment,
    }).subscribe({
      next:  () => { this.showToast(this.translate.instant('reviews.published'), 'success'); this.closeReviewModal(); this.loadClientData(); },
      error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
    });
  }

  openEditReviewModal(review: Review): void {
    this.editingReview  = review;
    this.editReviewForm = { rating: review.rating, comment: review.comment };
    this.editHoverRating = 0;
    this.showEditReviewModal = true;
  }

  closeEditReviewModal(): void { this.showEditReviewModal = false; this.editingReview = null; }

  setEditRating(r: number): void { this.editReviewForm.rating = r; }
  setEditHover(r: number): void  { this.editHoverRating = r; }
  clearEditHover(): void         { this.editHoverRating = 0; }

  saveEditReview(): void {
    if (!this.editingReview || !this.editReviewForm.rating || !this.editReviewForm.comment.trim()) {
      this.showToast(this.translate.instant('auth.error_missing_fields'), 'error');
      return;
    }
    this.isSavingReview = true;
    this.estateService.updateReview(this.editingReview.id, {
      rating:  this.editReviewForm.rating,
      comment: this.editReviewForm.comment.trim()
    }).subscribe({
      next: updated => {
        this.isSavingReview = false;
        const idx = this.mySubmittedReviews.findIndex(r => r.id === this.editingReview!.id);
        if (idx !== -1) this.mySubmittedReviews[idx] = enrichReview(updated);
        this.showToast(this.translate.instant('reviews.published'), 'success');
        this.closeEditReviewModal();
      },
      error: () => { this.isSavingReview = false; this.showToast(this.translate.instant('admin.error_load'), 'error'); }
    });
  }

  deleteReview(review: Review): void {
    this.openConfirm(this.translate.instant('admin.delete_confirm_review_short'), () => {
      this.estateService.deleteReview(review.id).subscribe({
        next: () => {
          this.mySubmittedReviews = this.mySubmittedReviews.filter(r => r.id !== review.id);
          this.clientStats.total_reviews = Math.max(0, this.clientStats.total_reviews - 1);
          this.showToast(this.translate.instant('dashboard.delete'), 'success');
        },
        error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
      });
    });
  }

  // ── Client: Contacts ──────────────────────────────────────

  deleteContact(contact: ContactRequest): void {
    this.openConfirm(this.translate.instant('admin.delete_confirm_contact_short'), () => {
      this.estateService.deleteContactRequest(contact.id!).subscribe({
        next: () => {
          this.myContacts = this.myContacts.filter(c => c.id !== contact.id);
          this.clientStats.total_contacts = Math.max(0, this.clientStats.total_contacts - 1);
          this.showToast(this.translate.instant('dashboard.delete'), 'success');
        },
        error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
      });
    });
  }

  // ── Client: Messages ──────────────────────────────────────

  deleteConversation(conv: Conversation): void {
    this.openConfirm(this.translate.instant('dashboard.delete_conv_confirm', { name: this.getConvPartner(conv) }), () => {
      this.estateService.deleteConversation(conv.id).subscribe({
        next: () => {
          this.conversations = this.conversations.filter(c => c.id !== conv.id);
          if (this.activeConversation?.id === conv.id) {
            this.activeConversation = null;
            this.wsService.disconnectChat();
          }
          this.clientStats.total_messages = Math.max(0, this.clientStats.total_messages - 1);
          this.showToast(this.translate.instant('dashboard.delete'), 'success');
        },
        error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
      });
    });
  }

  // ── Messaging (shared owner + client) ────────────────────

  openConversation(conv: Conversation): void {
    // Show instantly — don't block on HTTP
    this.activeConversation = { ...conv, messages: conv.messages || [] };
    conv.unread_count = 0;

    this.estateService.markConversationRead(conv.id).subscribe({ error: () => {} });

    // Connect WS BEFORE the HTTP fetch — no messages missed during load
    this.wsService.connectChat(conv.id);

    // Fetch full history; merge any WS frames that arrived during the request
    this.estateService.getConversation(conv.id).subscribe({
      next: full => {
        if (this.activeConversation?.id !== full.id) return; // user switched away
        const serverIds = new Set(full.messages.map((m: ChatMessage) => m.id));
        const pending   = (this.activeConversation.messages || []).filter(
          (m: ChatMessage) => !serverIds.has(m.id)
        );
        this.activeConversation = { ...full, messages: [...full.messages, ...pending] };
        this.shouldScroll = true;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }
  closeConversation(): void {
    this.activeConversation = null;
    this.wsService.disconnectChat();
    if (this.isOwner) {
      this.loadOwnerConversations();
    } else {
      this.estateService.getConversations().subscribe({ next: c => this.conversations = c, error: () => {} });
    }
  }

  handleRealtimeMessage(msg: any): void {
    if (!msg.id || msg.sender === undefined || !msg.created_at) return;

    // ── A. Background conversation — sidebar update only ─────────────────
    const conv = this.conversations.find(c => c.id === msg.conversation);
    if (conv) {
      conv.last_message = { text: msg.text, created_at: msg.created_at, sender_id: msg.sender };
      conv.updated_at   = msg.created_at;
      if (!this.activeConversation || this.activeConversation.id !== msg.conversation) {
        if (msg.sender !== this.currentUser?.id) {
          conv.unread_count = (conv.unread_count || 0) + 1;
        }
      }
      // Bubble to top of list
      this.conversations = [conv, ...this.conversations.filter(c => c.id !== conv.id)];
    }

    if (!this.activeConversation || this.activeConversation.id !== msg.conversation) {
      this.cdr.detectChanges();
      return;
    }

    // ── B. Active conversation ────────────────────────────────────────────
    const isOwnEcho = msg.sender === this.currentUser?.id;

    // B1. Own-echo: replace optimistic bubble (negative temp id)
    if (isOwnEcho) {
      const idx = this.activeConversation.messages.findIndex(
        (m: ChatMessage) => (m.id as unknown as number) < 0 && m.text === msg.text
      );
      if (idx !== -1) {
        this.activeConversation.messages[idx] = {
          id: msg.id, sender: msg.sender, text: msg.text,
          created_at: msg.created_at, read: msg.read ?? false,
          conversation: msg.conversation,
          sender_name: msg.sender_name || '', sender_username: msg.sender_username || '',
        };
        this.activeConversation.last_message = {
          text: msg.text, created_at: msg.created_at, sender_id: msg.sender,
        };
        this.cdr.detectChanges();
        return;
      }
    }

    // B2. Exact duplicate guard
    if (this.activeConversation.messages.some((m: ChatMessage) => m.id === msg.id)) {
      this.cdr.detectChanges();
      return;
    }

    // B3. Append
    const newMsg: ChatMessage = {
      id: msg.id, sender: msg.sender, text: msg.text,
      created_at: msg.created_at, read: msg.read ?? false,
      conversation: msg.conversation,
      sender_name: msg.sender_name || '', sender_username: msg.sender_username || '',
    };
    this.activeConversation.messages.push(newMsg);
    this.activeConversation.last_message = {
      text: msg.text, created_at: msg.created_at, sender_id: msg.sender,
    };

    // Auto-mark as read — conversation is open
    if (!isOwnEcho) {
      this.estateService.markConversationRead(this.activeConversation.id)
        .subscribe({ error: () => {} });
    }

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
        if (notif.status === 'verified' || !notif.status) {
          this.showToast(this.translate.instant('dashboard.account_verified', { message: notif.message || '' }), 'success');
          if (this.currentUser) { this.currentUser.is_verified = true; }
          this.cdr.detectChanges();
        } else {
          this.showToast('❌ ' + (notif.message || ''), 'error');
        }
        break;
      case 'new_booking':
        this.showToast(`📋 ${notif.message}`, 'info');
        this.loadOwnerData();
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
    if (!text || !this.activeConversation || !this.currentUser?.id) return;

    const convId = this.activeConversation.id;
    this.newMessage = '';

    // ── Optimistic bubble (negative temp id for echo matching) ───────────
    const tempId = -(Date.now());
    const optimistic: ChatMessage = {
      id:              tempId as unknown as number,
      sender:          this.currentUser.id,
      text,
      created_at:      new Date().toISOString(),
      read:            false,
      conversation:    convId,
      sender_name:     this.currentUser.name,
      sender_username: this.currentUser.name || '',
    };
    this.activeConversation.messages.push(optimistic);
    this.shouldScroll = true;
    this.cdr.detectChanges();

    const removeOptimistic = () => {
      if (!this.activeConversation) return;
      const i = this.activeConversation.messages.findIndex(
        (m: ChatMessage) => m.id === tempId
      );
      if (i !== -1) this.activeConversation.messages.splice(i, 1);
    };

    const replaceOptimistic = (msg: ChatMessage) => {
      if (!this.activeConversation) return;
      const i = this.activeConversation.messages.findIndex(
        (m: ChatMessage) => m.id === tempId
      );
      if (i !== -1) {
        this.activeConversation.messages[i] = msg;
      } else if (!this.activeConversation.messages.some((m: ChatMessage) => m.id === msg.id)) {
        this.activeConversation.messages.push(msg);
      }
      this.activeConversation.last_message = {
        text: msg.text, created_at: msg.created_at, sender_id: msg.sender,
      };
    };

    // ── WebSocket path — server echoes → handleRealtimeMessage replaces bubble
    const wsSent = this.wsService.sendChatMessage(
      text, this.currentUser.id, this.currentUser.name
    );
    if (wsSent) return;

    // ── HTTP fallback (WS not open) ───────────────────────────────────────
    this.estateService.sendMessage(convId, text).subscribe({
      next: msg => {
        replaceOptimistic(msg);
        this.shouldScroll = true;
        this.cdr.detectChanges();
      },
      error: () => {
        removeOptimistic();
        this.newMessage = text;
        this.showToast(this.translate.instant('messages.send_error'), 'error');
        this.cdr.detectChanges();
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
    return p.toLocaleString(this.translate.currentLang === 'fr' ? 'fr-FR' : 'en-US') + ' ' + this.translate.instant('housing.currency');
  }

  getStars(n: number): number[] {
    return Array(n).fill(0).map((_, i) => i + 1);
  }

  openReceipt(url: string | undefined): void {
    if (url) {
      window.open(url, '_blank');
    }
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
    const d    = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    if (diff === 0) return this.translate.instant('messages.today');
    if (diff === 1) return this.translate.instant('messages.yesterday');
    if (diff < 7)   return d.toLocaleDateString(this.translate.currentLang === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long' });
    return d.toLocaleDateString(this.translate.currentLang === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  refreshOnlineUsers(): void {
    this.estateService.getOnlineUsers().subscribe({
      next: data => { this.onlineUsers = new Set(data.online_user_ids); this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  // ── Refactored Helpers ────────────────────────────────────

  getImageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `https://res.cloudinary.com/dfm8v939p/${path}`;
  }

  onLatLngInput(): void {
    const lat = this.estateForm.get('lat')?.value;
    const lng = this.estateForm.get('lng')?.value;
    if (lat && lng && this.map && this.marker) {
      const pos = L.latLng(lat, lng);
      this.marker.setLatLng(pos);
      this.map.setView(pos, 16);
    }
  }

  searchAddress(): void {
    if (!this.searchAddressQuery.trim()) return;
    this.isGeocoding = true;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchAddressQuery)}`;

    this.http.get<any[]>(url).subscribe({
      next: results => {
        this.isGeocoding = false;
        if (results && results.length > 0) {
          const first = results[0];
          const lat = parseFloat(first.lat);
          const lng = parseFloat(first.lon);
          this.estateForm.patchValue({ lat, lng });
          this.onLatLngInput();
        } else {
          this.showToast('Location not found', 'warning');
        }
      },
      error: () => {
        this.isGeocoding = false;
        this.showToast('Error searching address', 'error');
      }
    });
  }

  useMyLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude } = pos.coords;
          this.estateForm.patchValue({ lat: latitude, lng: longitude });
          this.onLatLngInput();
        },
        () => this.showToast('Could not get your location', 'warning')
      );
    }
  }

  private initMap(): void {
    // Small delay to ensure container is rendered
    setTimeout(() => {
      const container = document.getElementById('map-picker');
      if (!container) return;

      const lat = this.estateForm.get('lat')?.value || 3.884041;
      const lng = this.estateForm.get('lng')?.value || 11.390736;

      if (this.map) {
        this.map.remove();
      }

      this.map = L.map(container).setView([lat, lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);

      this.marker.on('dragend', () => {
        const pos = this.marker!.getLatLng();
        this.estateForm.patchValue({ lat: pos.lat, lng: pos.lng });
      });

      this.map.on('click', (e: any) => {
        this.marker!.setLatLng(e.latlng);
        this.estateForm.patchValue({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      // Force a resize fix
      setTimeout(() => this.map?.invalidateSize(), 200);
    }, 100);
  }

  onImagesSelected(event: any): void {
    const files: FileList = event.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.newImageFiles.push(file);

      const reader = new FileReader();
      reader.onload = (e: any) => this.newImagePreviews.push(e.target.result);
      reader.readAsDataURL(file);
    }
  }

  removeNewImage(idx: number): void {
    this.newImageFiles.splice(idx, 1);
    this.newImagePreviews.splice(idx, 1);
  }

  removeExistingImage(img: any): void {
    this.existingImages = this.existingImages.filter((i: any) => i.id !== img.id);
    this.removedImageIds.push(img.id);
  }
}




