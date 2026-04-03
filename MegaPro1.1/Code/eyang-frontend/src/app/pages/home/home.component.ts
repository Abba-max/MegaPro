import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideAngularModule,
  MapPin, Search, Wifi, Zap, Droplets, Star, Filter,
  Coffee, Check, Lock, Home, Building, Shield, MessageSquare, Loader,
  CheckCircle, XCircle, AlertCircle, Info, Tv, Thermometer,
  Maximize2, Navigation, BedDouble, Bed, X, Users, ChevronDown
} from 'lucide-angular';
import { EstateService, Estate, PlatformStats } from '../../services/estate.service';
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
export class HomeComponent implements OnInit {
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

  searchQuery  = '';
  housings: Estate[] = [];
  isLoading    = true;
  errorMessage = '';

  // ── Pagination ────────────────────────────────────────────
  readonly HOME_PAGE_SIZE = 6;
  visibleCount = this.HOME_PAGE_SIZE;

  /** All housings sorted by average_rating descending */
  get sortedHousings(): Estate[] {
    return [...this.housings].sort((a, b) => {
      const ra = a.average_rating?.value ?? parseFloat(a.rating ?? '0');
      const rb = b.average_rating?.value ?? parseFloat(b.rating ?? '0');
      return rb - ra;
    });
  }

  /** The slice shown in the grid */
  get pagedHousings(): Estate[] {
    return this.sortedHousings.slice(0, this.visibleCount);
  }

  get hasMoreHousings(): boolean {
    return this.visibleCount < this.housings.length;
  }

  showMoreHousings(): void {
    this.visibleCount = Math.min(
      this.visibleCount + this.HOME_PAGE_SIZE,
      this.housings.length
    );
  }

  private resetHomePage(): void {
    this.visibleCount = this.HOME_PAGE_SIZE;
  }

  // ── Quick filter bar ─────────────────────────────────────
  filterWifi       = '';
  filterGenerator  = '';
  filterForage     = '';
  filterRestaurant = '';

  // ── Advanced filter drawer ───────────────────────────────
  showAdvanced   = false;
  filterTv       = '';
  filterFridge   = '';
  filterRoomSize = '';
  filterMaxDist: number | null = null;
  filterMinPrice: number | null = null;
  filterMaxPrice: number | null = null;
  filterMinFree  = 0;

  // ── Stats ────────────────────────────────────────────────
  platformStats: PlatformStats = { estates: 0, users: 0, reviews: 0, campuses: 0, orders: 0 };
  statsLoading = true;

  // ── Toast ────────────────────────────────────────────────
  toasts: Toast[] = [];
  private toastCounter = 0;

  // ── FAQ ──────────────────────────────────────────────────
  faqs: { question: string; answer: string; open: boolean }[] = [];

  /** Used in the footer copyright line */
  readonly currentYear = new Date().getFullYear();

  constructor(
    private estateService: EstateService,
    private authService: AuthService,
    private translate: TranslateService
  ) {}

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
      this.housings = [...this.housings];
    });
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
      next: data => { this.housings = data; this.isLoading = false; this.resetHomePage(); },
      error: err => {
        console.error('Failed to load estates:', err);
        this.errorMessage = 'Impossible de charger les logements.';
        this.isLoading    = false;
        this.showToast('Impossible de charger les logements', 'error');
      }
    });
  }

  applyFilters(): void {
    const filters: any = { status: 'published' };
    if (this.filterWifi)        filters.wifi        = this.filterWifi;
    if (this.filterGenerator)   filters.generator   = this.filterGenerator;
    if (this.filterForage)      filters.forage      = this.filterForage;
    if (this.filterRestaurant)  filters.restaurant  = this.filterRestaurant;
    if (this.filterTv)          filters.tv          = this.filterTv;
    if (this.filterFridge)      filters.fridge      = this.filterFridge;
    if (this.filterRoomSize)    filters.room_size   = this.filterRoomSize;
    if (this.filterMaxDist)     filters.max_dist    = this.filterMaxDist;
    if (this.filterMinPrice)    filters.min_price   = this.filterMinPrice;
    if (this.filterMaxPrice)    filters.max_price   = this.filterMaxPrice;

    this.isLoading = true;
    this.estateService.getEstates(filters).subscribe({
      next: data => {
        let result = data;
        if (this.filterMinFree > 0) {
          result = data.filter(h => h.free >= this.filterMinFree);
        }
        this.housings  = result;
        this.isLoading = false;
        this.resetHomePage();
      },
      error: () => { this.isLoading = false; }
    });
  }

  applyFiltersAndClose(): void {
    this.applyFilters();
    this.showAdvanced = false;
    document.body.style.overflow = '';
  }

  resetFilters(): void {
    this.filterWifi = this.filterGenerator = this.filterForage = this.filterRestaurant = '';
    this.filterTv = this.filterFridge = this.filterRoomSize = '';
    this.filterMaxDist = this.filterMinPrice = this.filterMaxPrice = null;
    this.filterMinFree = 0;
    this.showAdvanced = false;
    document.body.style.overflow = '';
    this.loadEstates();
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
  }

  get activeFilterCount(): number {
    let c = 0;
    if (this.filterWifi)       c++;
    if (this.filterGenerator)  c++;
    if (this.filterForage)     c++;
    if (this.filterRestaurant) c++;
    if (this.filterTv)         c++;
    if (this.filterFridge)     c++;
    if (this.filterRoomSize)   c++;
    if (this.filterMaxDist)    c++;
    if (this.filterMaxPrice)   c++;
    if (this.filterMinPrice)   c++;
    if (this.filterMinFree > 0) c++;
    return c;
  }

  // ── Search ────────────────────────────────────────────────
  onSearchInput(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) { this.loadEstates(); return; }
    this.estateService.getEstates({ status: 'published' }).subscribe({
      next: data => {
        this.housings = data.filter(h =>
          h.name.toLowerCase().includes(q) || h.location.toLowerCase().includes(q)
        );
        this.resetHomePage();
      }
    });
  }

  onSearch(): void { this.onSearchInput(); }

  // ── Helpers ───────────────────────────────────────────────
  getFirstImage(estate: Estate): string {
    if (estate.images?.length > 0 && estate.images[0].image) return estate.images[0].image;
    return 'assets/images/placeholder.jpg';
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
      { key: 'wifi',       label: 'filters.wifi_label',   active: h.wifi === '1' },
      { key: 'forage',     label: 'filters.water',        active: h.forage === '1' },
      { key: 'generator',  label: 'filters.generator',    active: h.generator === '1' },
      { key: 'restaurant', label: 'filters.restaurant',   active: h.restaurant === '1' },
      { key: 'tv',         label: 'filters.tv_label',     active: h.tv === '1' },
      { key: 'fridge',     label: 'filters.fridge_label', active: h.fridge === '1' },
    ];
    return all.filter(f => f.active).slice(0, 3).map(({ key, label }) => ({ key, label }));
  }

  scrollToListings(): void {
    document.querySelector('.listings-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Footer scroll helper — works for section class names like
   * 'listings', 'why', 'stats', 'testimonials', 'faq'
   */
  scrollToSection(name: string): void {
    const selector = `.${name}-section`;
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Open auth modals from the footer */
  openLoginFromFooter(): void  { this.authService.openLogin(); }
  openSignupFromFooter(): void {
    // Re-use the header's signup flow via the auth service.
    // The header listens to authService.openSignup$ if you have one;
    // if not, open login and let the user switch — or directly dispatch:
    this.authService.openLogin();
  }
}