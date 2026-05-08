import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  LucideAngularModule,
  MapPin, Search, Wifi, Zap, Droplets, Star, Filter,
  Coffee, Check, Lock, Home, Building, Shield, MessageSquare, Loader,
  CheckCircle, XCircle, AlertCircle, Info, Tv, Thermometer,
  Maximize2, Navigation, BedDouble, Bed, X, Users, ChevronDown,
  ParkingCircle, ShieldCheck, Droplet, Video, Sparkles, Dribbble, Gamepad2
} from 'lucide-angular';
import { EstateService, Estate, PlatformStats, getAbsoluteUrl } from '../../services/estate.service';
import { AuthService } from '../../services/auth.service';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule, FormsModule, TranslateModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  readonly MapPinIcon        = MapPin;
  readonly SearchIcon        = Search;
  readonly WifiIcon          = Wifi;
  readonly ZapIcon           = Zap;
  readonly DropletsIcon      = Droplets;
  readonly StarIcon          = Star;
  readonly FilterIcon        = Filter;
  readonly CoffeeIcon        = Coffee;
  readonly CheckIcon         = Check;
  readonly LockIcon          = Lock;
  readonly HomeIcon          = Home;
  readonly BuildingIcon      = Building;
  readonly ShieldIcon        = Shield;
  readonly MessageSquareIcon = MessageSquare;
  readonly LoaderIcon        = Loader;
  readonly CheckCircleIcon   = CheckCircle;
  readonly XCircleIcon       = XCircle;
  readonly AlertCircleIcon   = AlertCircle;
  readonly InfoIcon          = Info;
  readonly TvIcon            = Tv;
  readonly FridgeIcon        = Thermometer;
  readonly SpaceIcon         = Maximize2;
  readonly DistanceIcon      = Navigation;
  readonly BedDoubleIcon     = BedDouble;
  readonly BedIcon           = Bed;
  readonly UsersIcon         = Users;
  readonly XIcon             = X;
  readonly ChevronDownIcon   = ChevronDown;
  readonly ParkingIcon       = ParkingCircle;
  readonly SecurityIcon      = ShieldCheck;
  readonly WaterBillIcon     = Droplet;
  readonly VideoIcon         = Video;
  readonly SparklesIcon      = Sparkles;
  readonly DribbbleIcon      = Dribbble;
  readonly Gamepad2Icon      = Gamepad2;

  searchQuery  = '';
  private searchSubject = new Subject<string>();

  // Master/Display Array Pattern
  allHousingsMaster: Estate[] = [];
  filteredHousings: Estate[] = [];
  pagedHousings: Estate[] = [];
  
  isLoading    = true;
  errorMessage = '';

  // ── Pagination ────────────────────────────────────────────
  readonly HOME_PAGE_SIZE = 6;
  currentPage = 1;

  get totalPages(): number {
    return Math.ceil(this.filteredHousings.length / this.HOME_PAGE_SIZE) || 1;
  }

  get sortedHousings(): Estate[] {
    return [...this.filteredHousings].sort((a, b) => {
      const ra = a.average_rating?.value ?? parseFloat(a.rating ?? '0');
      const rb = b.average_rating?.value ?? parseFloat(b.rating ?? '0');
      return rb - ra;
    });
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagedHousings();
      this.scrollToListings();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagedHousings();
      this.scrollToListings();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagedHousings();
      this.scrollToListings();
    }
  }

  private resetHomePage(): void {
    this.currentPage = 1;
    this.updatePagedHousings();
  }

  private updatePagedHousings(): void {
    const startIndex = (this.currentPage - 1) * this.HOME_PAGE_SIZE;
    this.pagedHousings = this.sortedHousings.slice(startIndex, startIndex + this.HOME_PAGE_SIZE);
  }

  // ── Quick filter bar ─────────────────────────────────────
  filterWifi       = false;
  filterGenerator  = false;
  filterForage     = false;
  filterRestaurant = false;
  filterCctv       = false;
  filterCleaning   = false;
  filterPlayground = false;

  // ── Advanced filter drawer ───────────────────────────────
  showAdvanced   = false;
  filterTv       = false;
  filterFridge   = false;
  filterRoomSize = '';
  filterMaxDist: number | null = null;
  filterMinPrice: number | null = null;
  filterMaxPrice: number | null = null;
  filterMinFree  = 0;

  // ── Stats ────────────────────────────────────────────────
  platformStats: PlatformStats = { estates: 0, users: 0, students: 0, reviews: 0, campuses: 0, orders: 0 };
  statsLoading = true;

  // ── Toast ────────────────────────────────────────────────
  toasts: Toast[] = [];
  private toastCounter = 0;

  // ── Image swiper state (per estate id) ──────────────────
  private slideIndexMap = new Map<number, number>();
  private swipeTouchStartX = 0;
  private swipeMouseStartX = 0;

  getActiveIndex(h: { id: number }): number {
    return this.slideIndexMap.get(h.id) ?? 0;
  }

  nextSlide(h: { id: number; images: any[] }): void {
    const cur = this.slideIndexMap.get(h.id) ?? 0;
    this.slideIndexMap.set(h.id, (cur + 1) % h.images.length);
  }

  prevSlide(h: { id: number; images: any[] }): void {
    const cur = this.slideIndexMap.get(h.id) ?? 0;
    this.slideIndexMap.set(h.id, (cur - 1 + h.images.length) % h.images.length);
  }

  onSwipeTouchStart(e: TouchEvent, h: any): void {
    this.swipeTouchStartX = e.touches[0].clientX;
  }
  onSwipeTouchEnd(e: TouchEvent, h: any): void {
    const dx = e.changedTouches[0].clientX - this.swipeTouchStartX;
    if (Math.abs(dx) > 40) {
      dx < 0 ? this.nextSlide(h) : this.prevSlide(h);
    }
  }
  onSwipeMouseDown(e: MouseEvent, h: any): void {
    this.swipeMouseStartX = e.clientX;
  }
  onSwipeMouseUp(e: MouseEvent, h: any): void {
    const dx = e.clientX - this.swipeMouseStartX;
    if (Math.abs(dx) > 40) {
      dx < 0 ? this.nextSlide(h) : this.prevSlide(h);
    }
  }

  // ── FAQ ──────────────────────────────────────────────────
  faqs: { question: string; answer: string; open: boolean }[] = [];

  /** Used in the footer copyright line */
  readonly currentYear = new Date().getFullYear();

  constructor(
    private estateService: EstateService,
    private authService: AuthService,
    private translate: TranslateService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => this.applyFilters());
  }

  ngOnInit(): void {
    const lang = this.translate.currentLang || this.translate.defaultLang || 'fr';

    this.loadEstates();
    this.loadStats();

    const alreadyLoaded = this.translate.instant('faq.q1') !== 'faq.q1';
    if (alreadyLoaded) {
      this.buildFaqs();
    } else {
      this.translate.getTranslation(lang).subscribe(() => this.buildFaqs());
    }

    this.translate.onLangChange.subscribe(() => {
      this.buildFaqs();
    });

    // Detect if redirected from registration
    this.route.queryParams.subscribe(params => {
      if (params['registered'] === 'true') {
        // Delay slightly to ensure toast is visible and animations are ready
        setTimeout(() => {
          this.showToast(this.translate.instant('auth.success_signup'), 'success');
          // Clean up URL to avoid showing toast again on refresh
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { registered: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
          });
        }, 500);
      }
    });
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  private buildFaqs(): void {
    this.faqs = [1, 2, 3, 4, 5, 6].map(n => ({
      question: this.translate.instant(`faq.q${n}`),
      answer:   this.translate.instant(`faq.a${n}`),
      open: this.faqs[n - 1]?.open ?? false
    }));
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

  // ── Stats ─────────────────────────────────────────────────
  loadStats(): void {
    this.statsLoading = true;
    this.estateService.getStats().subscribe({
      next:  data => { this.platformStats = data; this.statsLoading = false; },
      error: ()   => { this.statsLoading = false; }
    });
  }

  // ── Estates ───────────────────────────────────────────────
  loadEstates(): void {
    this.isLoading    = true;
    this.errorMessage = '';
    this.estateService.getEstates({ status: 'published' }).subscribe({
      next: data => { 
        this.allHousingsMaster = data; 
        this.applyFilters();
        this.isLoading = false; 
      },
      error: err => {
        console.error('Failed to load estates:', err);
        this.errorMessage = this.translate.instant('admin.error_load');
        this.isLoading    = false;
        this.showToast(this.translate.instant('admin.error_load'), 'error');
      }
    });
  }

  applyFilters(): void {
    const query = this.searchQuery.toLowerCase().trim();
    
    this.filteredHousings = this.allHousingsMaster.filter(h => {
      const matchSearch = !query || 
        h.name.toLowerCase().includes(query) || 
        h.location.toLowerCase().includes(query);
      
      const matchWifi       = !this.filterWifi       || !!h.wifi;
      const matchGenerator  = !this.filterGenerator  || !!h.generator;
      const matchForage     = !this.filterForage     || !!h.forage;
      const matchRestaurant = !this.filterRestaurant || !!h.restaurant;
      const matchTv         = !this.filterTv         || !!h.tv;
      const matchFridge     = !this.filterFridge     || !!h.fridge;
      const matchCctv       = !this.filterCctv       || !!h.cctv;
      const matchCleaning   = !this.filterCleaning   || !!h.cleaning_service;
      const matchPlayground = !this.filterPlayground || !!h.playground;
      
      const matchRoomSize = !this.filterRoomSize || h.room_categories.some(rc => rc.room_size === this.filterRoomSize);
      
      const matchDist = (this.filterMaxDist === null || this.filterMaxDist === undefined) || h.distance <= this.filterMaxDist;
      
      const minPrice = this.filterMinPrice ?? 0;
      const maxPrice = this.filterMaxPrice ?? Infinity;
      const matchPrice = h.price >= minPrice && h.price <= maxPrice;
      
      const matchFree = h.free >= this.filterMinFree;

      return matchSearch && matchWifi && matchGenerator && matchForage && 
             matchRestaurant && matchTv && matchFridge && matchRoomSize && 
             matchDist && matchPrice && matchFree && 
             matchCctv && matchCleaning && matchPlayground;
    });

    this.resetHomePage();
  }

  applyFiltersAndClose(): void {
    this.applyFilters();
    this.showAdvanced = false;
    document.body.style.overflow = '';
  }

  resetFilters(): void {
    this.filterWifi = this.filterGenerator = this.filterForage = this.filterRestaurant = false;
    this.filterTv = this.filterFridge = this.filterCctv = this.filterCleaning = this.filterPlayground = false;
    this.filterRoomSize = '';
    this.filterMaxDist = this.filterMinPrice = this.filterMaxPrice = null;
    this.filterMinFree = 0;
    this.searchQuery = '';
    this.showAdvanced = false;
    document.body.style.overflow = '';
    this.applyFilters();
  }

  toggleAdvanced(): void {
    this.showAdvanced = !this.showAdvanced;
    document.body.style.overflow = this.showAdvanced ? 'hidden' : '';
  }

  closeAdvanced(): void {
    this.showAdvanced = false;
    document.body.style.overflow = '';
  }

  setMaxPrice(val: number): void {
    this.filterMaxPrice = this.filterMaxPrice === val ? null : val;
    this.applyFilters();
  }

  get activeFilterCount(): number {
    let c = 0;
    if (this.filterWifi)       c++;
    if (this.filterGenerator)  c++;
    if (this.filterForage)     c++;
    if (this.filterRestaurant) c++;
    if (this.filterTv)         c++;
    if (this.filterFridge)     c++;
    if (this.filterCctv)       c++;
    if (this.filterCleaning)   c++;
    if (this.filterPlayground) c++;
    if (this.filterRoomSize)   c++;
    if (this.filterMaxDist)    c++;
    if (this.filterMaxPrice)   c++;
    if (this.filterMinPrice)   c++;
    if (this.filterMinFree > 0) c++;
    return c;
  }

  // ── Search ────────────────────────────────────────────────
  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery);
  }

  onSearch(): void { this.applyFilters(); }

  // ── Helpers ───────────────────────────────────────────────
  getFirstImage(estate: Estate): string {
    if (estate.images?.length > 0 && estate.images[0].image) {
      return getAbsoluteUrl(estate.images[0].image, 400);
    }
    return '';
  }

  getStarArray(rating: string | number): number[] {
    return Array(Math.round(Number(rating))).fill(0);
  }

  getEmptyStarArray(rating: string | number): number[] {
    return Array(Math.max(0, 5 - Math.round(Number(rating)))).fill(0);
  }

  getTimeAgo(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const diffMs   = Date.now() - new Date(dateStr).getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return this.translate.instant('listings.published_today');
    if (diffDays < 7)   return this.translate.instant('listings.published_days_ago',   { days: diffDays });
    const weeks = Math.floor(diffDays / 7);
    if (weeks < 4)      return this.translate.instant('listings.published_weeks_ago',  { weeks });
    const months = Math.floor(diffDays / 30);
    return this.translate.instant('listings.published_months_ago', { months });
  }

  toggleFaq(index: number): void { this.faqs[index].open = !this.faqs[index].open; }

  getTopFeatures(h: Estate): { key: string; label: string }[] {
    const all: { key: string; label: string; active: boolean }[] = [
      { key: 'wifi',       label: 'filters.wifi_label',   active: !!h.wifi },
      { key: 'forage',     label: 'filters.water',        active: !!h.forage || !!h.borehole_forage },
      { key: 'generator',  label: 'filters.generator',    active: !!h.generator || !!h.generator_available },
      { key: 'restaurant', label: 'filters.restaurant',   active: !!h.restaurant || !!h.restaurant_on_site },
      { key: 'tv',         label: 'filters.tv_label',     active: !!h.tv },
      { key: 'fridge',     label: 'filters.fridge_label', active: !!h.fridge },
      { key: 'parking',    label: 'admin.parking',        active: !!h.parking },
      { key: 'security',   label: 'admin.security_guard', active: !!h.security_guard },
      { key: 'cctv',       label: 'admin.cctv',           active: !!h.cctv },
      { key: 'cleaning',   label: 'admin.cleaning',       active: !!h.cleaning_service },
      { key: 'playground', label: 'admin.playground',     active: !!h.playground },
      { key: 'stadium',    label: 'admin.sport_field',    active: !!h.Terrain_de_sport },
      { key: 'water_bills', label: 'admin.water_bills',   active: !!h.water_bills },
      { key: 'elec_bills',  label: 'admin.electricity_bills', active: !!h.electricity_bills },
    ];
    // Return up to 4 features for the card
    return all.filter(f => f.active).slice(0, 4).map(({ key, label }) => ({ key, label }));
  }

  scrollToListings(): void {
    document.querySelector('.listings-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  scrollToSection(name: string): void {
    const selector = `.${name}-section`;
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  openLoginFromFooter(): void  { this.router.navigate(['/login']); }
  openSignupFromFooter(): void {
    this.router.navigate(['/login']);
  }
}




