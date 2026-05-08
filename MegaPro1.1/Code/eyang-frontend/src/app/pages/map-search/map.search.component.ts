// src/app/pages/map-search/map-search.component.ts
import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, inject, signal, computed, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import {
  EstateService, Estate, EstateFilters,
} from '../../services/estate.service';
import { AuthService } from '../../services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap, tap, catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

// ── Fix Leaflet icon paths when bundled by Angular ────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl:       'assets/leaflet/marker-icon.png',
  shadowUrl:     'assets/leaflet/marker-shadow.png',
});

// Centre = Institut Universitaire Saint Jean Ingénieur, Eyang
// (2 km de l'autoroute Yaoundé-Douala, arrondissement de Lobo, Lékié)
const EYANG_CENTER: L.LatLngTuple = [3.8852, 11.3912];
const DEFAULT_ZOOM = 15;

function estateCoords(estate: Estate): L.LatLngTuple {
  const lat = estate.lat, lng = estate.lng;
  if (lat && lng && lat !== 0 && lng !== 0) return [lat, lng];
  return EYANG_CENTER;
}

function priceLabel(price: number): string {
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000)     return `${Math.round(price / 1_000)}k`;
  return String(price);
}

@Component({
  selector:    'app-map-search',
  standalone:  true,
  imports:     [CommonModule, FormsModule, TranslateModule],
  templateUrl: './map-search.component.html',
  styleUrls:   ['./map-search.component.scss'],
})
export class MapSearchComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainerRef!: ElementRef<HTMLDivElement>;

  private estateService = inject(EstateService);
  private auth          = inject(AuthService);
  private translate     = inject(TranslateService);
  router                = inject(Router);

  // ── UI state ──────────────────────────────────────────────────────────
  estates        = signal<Estate[]>([]);
  loading        = signal(false);
  error          = signal<string | null>(null);
  activeId       = signal<number | null>(null);
  hoveredId      = signal<number | null>(null);
  viewMode       = signal<'split' | 'map' | 'list'>('split');
  showFilters    = signal(false);
  mapReady       = signal(false);
  showMapSection = signal(false);

  // ── Filters ───────────────────────────────────────────────────────────
  filterLocation   = signal('');
  filterGenerator  = signal<boolean | null>(null);
  filterForage     = signal<boolean | null>(null);
  filterRestaurant = signal<boolean | null>(null);
  filterWifi       = signal<boolean | null>(null);
  filterPlayground = signal<boolean | null>(null);
  filterMinPrice   = signal<number | null>(null);
  filterMaxPrice   = signal<number | null>(null);
  filterMaxDist    = signal<number | null>(null);

  hasActiveFilters = computed(() =>
    !!(this.filterGenerator() != null || this.filterForage() != null || this.filterRestaurant() != null ||
       this.filterWifi() != null || this.filterPlayground() != null || 
       this.filterMinPrice() || this.filterMaxPrice() || this.filterMaxDist())
  );

  /** Client-side filtered list — drives BOTH the card list AND the map markers. */
  visibleEstates = computed(() => {
    let list = this.estates();
    const minP = this.filterMinPrice();
    const maxP = this.filterMaxPrice();
    const wifi = this.filterWifi();
    const gen  = this.filterGenerator();
    const fog  = this.filterForage();
    const rst  = this.filterRestaurant();
    const dist = this.filterMaxDist();

    if (minP != null) list = list.filter(e => e.price >= minP);
    if (maxP != null) list = list.filter(e => e.price <= maxP);
    if (wifi != null) list = list.filter(e => !!e.wifi === wifi);
    if (gen != null)  list = list.filter(e => !!e.generator === gen);
    if (fog != null)  list = list.filter(e => !!e.forage === fog);
    if (rst != null)  list = list.filter(e => !!e.restaurant === rst);
    if (dist != null) list = list.filter(e => e.distance <= dist);

    return list;
  });

  // ── Leaflet internals ─────────────────────────────────────────────────
  map!:                 L.Map;
  private markerLayer!: L.LayerGroup;
  private markerMap   = new Map<number, L.Marker>();

  // ── Search pipeline ───────────────────────────────────────────────────
  private filterTrigger$ = new Subject<EstateFilters>();
  private subs: Subscription[] = [];

  /**
   * Re-render markers whenever visibleEstates() changes (catches both
   * server-side and client-side filter changes) or activeId changes.
   */
  private markersEffect = effect(() => {
    const visible = this.visibleEstates();
    const active  = this.activeId();
    if (this.mapReady()) this.renderMarkers(visible, active);
  });

  ngOnInit(): void {
    const sub = this.filterTrigger$.pipe(
      debounceTime(350),
      tap(() => { this.loading.set(true); this.error.set(null); }),
      switchMap(filters =>
        this.estateService.getEstates(filters).pipe(
          catchError(err => {
            this.error.set(err?.error?.detail ?? this.translate.instant('admin.error_load'));
            this.loading.set(false);
            return EMPTY;
          })
        )
      ),
      tap(() => this.loading.set(false)),
    ).subscribe(list => this.estates.set(list));
    this.subs.push(sub);
  }

  ngAfterViewInit(): void { this.initMap(); }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.markersEffect.destroy();
    this.map?.remove();
  }

  // ── Map init ──────────────────────────────────────────────────────────
  private initMap(): void {
    this.map = L.map(this.mapContainerRef.nativeElement, {
      center: EYANG_CENTER, zoom: DEFAULT_ZOOM,
      zoomControl: false, attributionControl: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this.map);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    L.control.attribution({ position: 'bottomright', prefix: '© OSM' }).addTo(this.map);
    this.markerLayer = L.layerGroup().addTo(this.map);
    this.mapReady.set(true);
    this.triggerSearch();
  }

  // ── Server-side search ────────────────────────────────────────────────
  triggerSearch(): void {
    const f: EstateFilters = { status: 'published' };
    if (this.filterLocation())   f.location   = this.filterLocation();
    if (this.filterGenerator() != null)  f.generator  = this.filterGenerator() ? 'true' : 'false';
    if (this.filterForage() != null)     f.forage     = this.filterForage() ? 'true' : 'false';
    if (this.filterRestaurant() != null) f.restaurant = this.filterRestaurant() ? 'true' : 'false';
    if (this.filterWifi() != null)       f.wifi       = this.filterWifi() ? 'true' : 'false';
    if (this.filterPlayground() != null) f.playground = this.filterPlayground() ? 'true' : 'false';
    if (this.filterMinPrice())   f.min_price  = this.filterMinPrice()!;
    if (this.filterMaxPrice())   f.max_price  = this.filterMaxPrice()!;
    if (this.filterMaxDist())    f.max_dist   = this.filterMaxDist()!;
    
    this.filterTrigger$.next(f);
  }

  resetFilters(): void {
    this.filterGenerator.set(null); this.filterForage.set(null);
    this.filterRestaurant.set(null); this.filterWifi.set(null);
    this.filterPlayground.set(null);
    this.filterMinPrice.set(null); this.filterMaxPrice.set(null);
    this.filterMaxDist.set(null);  this.filterLocation.set('');
    this.triggerSearch();
  }

  // ── Map section toggle ────────────────────────────────────────────────
  toggleMapSection(): void {
    this.showMapSection.set(!this.showMapSection());
    if (this.showMapSection()) setTimeout(() => this.map?.invalidateSize(), 320);
  }

  centreMap(): void {
    this.map?.flyTo(EYANG_CENTER, DEFAULT_ZOOM, { duration: 0.7 });
  }

  // ── Marker rendering ──────────────────────────────────────────────────
  private renderMarkers(visible: Estate[], activeId: number | null): void {
    this.markerLayer.clearLayers();
    this.markerMap.clear();

    visible.forEach(estate => {
      const [lat, lng] = estateCoords(estate);
      const isActive   = estate.id === activeId;

      const marker = L.marker([lat, lng], {
        icon:         this.buildMarkerIcon(estate, isActive),
        zIndexOffset: isActive ? 1000 : 0,
      });

      marker.bindPopup(this.buildPopupHtml(estate), {
        maxWidth: 280, className: 'estate-popup',
      });

      marker.on('click', () => {
        this.activeId.set(estate.id);
        this.hoveredId.set(estate.id);
        document.getElementById(`card-${estate.id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });

      marker.addTo(this.markerLayer);
      this.markerMap.set(estate.id, marker);
    });
  }

  /**
   * Photo-card marker when the estate has an image,
   * plain price pill as fallback.
   */
  private buildMarkerIcon(estate: Estate, active: boolean): L.DivIcon {
    const label = priceLabel(estate.price);
    const cls   = active ? ' emk--active' : '';

    if (estate.image) {
      const rating = (estate.average_rating?.value ?? 0) > 0
        ? `<span class="emk__rating">★ ${estate.average_rating.value.toFixed(1)}</span>`
        : '';
      return L.divIcon({
        className:  '',
        html: `<div class="emk${cls}">
                 <div class="emk__img">
                   <img src="${estate.image}" alt="${estate.name.replace(/"/g, '&quot;')}" />
                   ${rating}
                 </div>
                 <div class="emk__price">${label} XAF</div>
               </div>`,
        iconSize:    [80, 74],
        iconAnchor:  [40, 74],
        popupAnchor: [0, -76],
      });
    }

    // No image — plain pill
    return L.divIcon({
      className:  '',
      html: `<div class="emk emk--pill${cls}">${label} XAF</div>`,
      iconSize:    [94, 32],
      iconAnchor:  [47, 16],
      popupAnchor: [0, -18],
    });
  }

  private buildPopupHtml(e: Estate): string {
    const img    = e.image
      ? `<div class="pop-img"><img src="${e.image}" alt="${e.name}" /></div>`
      : '';
    const stars  = '★'.repeat(Math.round(e.average_rating?.value ?? 0))
                 + '☆'.repeat(5 - Math.round(e.average_rating?.value ?? 0));
    const badges = [
      e.wifi          ? '<span class="pop-badge">WiFi</span>'         : '',
      e.generator     ? `<span class="pop-badge">${this.translate.instant('filters.generator')}</span>`  : '',
      e.forage        ? `<span class="pop-badge">${this.translate.instant('filters.water')}</span>`        : '',
      e.restaurant    ? `<span class="pop-badge">${this.translate.instant('filters.restaurant')}</span>`    : '',
      e.playground    ? `<span class="pop-badge">${this.translate.instant('admin.playground')}</span>`    : '',
    ].filter(Boolean).join('');

    return `
      <div class="estate-popup-inner">
        ${img}
        <div class="pop-body">
          <p class="pop-name">${e.name}</p>
          ${(e.average_rating?.value ?? 0) > 0
            ? `<p class="pop-rating">${stars} <span>(${e.reviews_count ?? 0} avis)</span></p>`
            : ''}
          <p class="pop-location">📍 ${e.location} · ${e.distance}m ${this.translate.instant('detail.from_campus')}</p>
          ${badges ? `<div class="pop-badges">${badges}</div>` : ''}
          <div class="pop-footer">
            <span class="pop-price">${e.price.toLocaleString('fr-CM')} XAF<em>${this.translate.instant('dashboard.per_month')}</em></span>
            <a class="pop-link" href="/housing/${e.id}">${this.translate.instant('listings.show_more')} →</a>
          </div>
        </div>
      </div>`;
  }

  // ── Card interactions ─────────────────────────────────────────────────
  onCardHover(id: number): void { this.hoveredId.set(id); this.activeId.set(id); }
  onCardLeave(): void            { this.hoveredId.set(null); this.activeId.set(null); }

  flyTo(estate: Estate): void {
    const [lat, lng] = estateCoords(estate);
    this.map.flyTo([lat, lng], 17, { duration: 0.6 });
    setTimeout(() => this.markerMap.get(estate.id)?.openPopup(), 650);
  }

  setViewMode(m: 'split' | 'map' | 'list'): void {
    this.viewMode.set(m);
    if (m !== 'list') setTimeout(() => this.map?.invalidateSize(), 50);
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  formatPrice(p: number): string { return `${p.toLocaleString('fr-CM')} XAF/mois`; }

  amenityList(e: Estate): string[] {
    const a: string[] = [];
    if (e.wifi)       a.push('WiFi');
    if (e.generator)  a.push('Groupe élec.');
    if (e.forage)     a.push('Forage');
    if (e.restaurant) a.push('Restaurant');
    if (e.tv)         a.push('TV');
    if (e.fridge)     a.push('Frigo');
    if (e.playground) a.push('Jeux');
    return a;
  }

  // ── Map-grid helpers ──────────────────────────────────────────────────
  gridMarkerLabel(price: number): string { return priceLabel(price); }

  gridMarkerX(e: Estate): number {
    return Math.round(260 + (e.lng - EYANG_CENTER[1]) * 3000 + (e.id % 5) * 3);
  }

  gridMarkerY(e: Estate): number {
    return Math.round(150 + (EYANG_CENTER[0] - e.lat) * 3000 + (e.id % 5) * 3);
  }

  onGridMarkerClick(estate: Estate): void {
    this.activeId.set(estate.id);
    this.hoveredId.set(estate.id);
    document.getElementById(`card-${estate.id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (this.mapReady()) this.flyTo(estate);
  }

  trackById(_: number, e: Estate): number { return e.id; }

  get currentUser()     { return this.auth.currentUser; }
  get isAuthenticated() { return this.auth.isAuthenticated(); }
}




