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
  EstateService, Estate, EstateFilters, getAbsoluteUrl,
} from '../../services/estate.service';
import { AuthService } from '../../services/auth.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap, tap, catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

// ── Fix Leaflet icon paths when bundled by Angular ────────────────────────
// (Webpack loses the default URLs; we point them at our assets folder)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl:       'assets/leaflet/marker-icon.png',
  shadowUrl:     'assets/leaflet/marker-shadow.png',
});

// Eyang / Lobo area — adjust to exact campus coords
const EYANG_CENTER: L.LatLngTuple = [3.8622, 11.5172];
const DEFAULT_ZOOM = 15;

// Hardcoded coordinates for each known location string.
// The Estate model stores location as a text field (e.g. "Eyang", "Lobo"),
// so we geocode to a fixed point ± a small jitter for spread.
const LOCATION_COORDS: Record<string, L.LatLngTuple> = {
  'eyang':  [3.8622, 11.5172],
  'lobo':   [3.8580, 11.5130],
  'vogt':   [3.8700, 11.5200],
  'nlongkak': [3.8810, 11.5260],
};

function estateCoords(estate: Estate): L.LatLngTuple {
  const key = estate.location?.toLowerCase().trim() ?? '';
  const base = LOCATION_COORDS[key] ?? EYANG_CENTER;
  // Small deterministic jitter so estates at the same location don't stack
  const jitter = (estate.id % 100) * 0.00005;
  return [base[0] + jitter, base[1] + (jitter * 1.3)];
}

@Component({
  selector:    'app-map-search',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './map-search.component.html',
  styleUrls:   ['./map-search.component.scss'],
})
export class MapSearchComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainerRef!: ElementRef<HTMLDivElement>;

  private estateService = inject(EstateService);
  private auth          = inject(AuthService);
  router                = inject(Router);

  // ── UI state ──────────────────────────────────────────────────────────
  estates         = signal<Estate[]>([]);
  loading         = signal(false);
  error           = signal<string | null>(null);
  activeId        = signal<number | null>(null);
  hoveredId       = signal<number | null>(null);
  viewMode        = signal<'split' | 'map' | 'list'>('split');
  showFilters     = signal(false);
  mapReady        = signal(false);

  // Filters — mirror EstateFilters fields actually used by EstateViewSet
  filterLocation  = signal('');
  filterGenerator = signal('');
  filterForage    = signal('');
  filterRestaurant= signal('');
  filterWifi      = signal('');
  filterMinPrice  = signal<number | null>(null);
  filterMaxPrice  = signal<number | null>(null);
  filterMaxDist   = signal<number | null>(null);

  hasActiveFilters = computed(() =>
    !!(this.filterGenerator() || this.filterForage() || this.filterRestaurant() ||
       this.filterWifi() || this.filterMinPrice() || this.filterMaxPrice() || this.filterMaxDist())
  );

  count = computed(() => this.estates().length);

  // ── Leaflet internals ─────────────────────────────────────────────────
  map!:                  L.Map;   // public so template locate-btn can call flyTo
  private markerLayer!:  L.LayerGroup;
  private markerMap    = new Map<number, L.Marker>();

  // ── Search pipeline ───────────────────────────────────────────────────
  private filterTrigger$ = new Subject<EstateFilters>();
  private subs: Subscription[] = [];

  // Re-render markers when estates or activeId change
  private markersEffect = effect(() => {
    const list = this.estates();
    const active = this.activeId();
    if (this.mapReady()) this.renderMarkers(list, active);
  });

  ngOnInit(): void {
    const sub = this.filterTrigger$.pipe(
      debounceTime(350),
      tap(() => { this.loading.set(true); this.error.set(null); }),
      switchMap(filters =>
        this.estateService.getEstates(filters).pipe(
          catchError(err => {
            this.error.set(err?.error?.detail ?? 'Erreur lors de la recherche');
            this.loading.set(false);
            return EMPTY;
          })
        )
      ),
      tap(() => this.loading.set(false)),
    ).subscribe(list => this.estates.set(list));

    this.subs.push(sub);
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.markersEffect.destroy();
    this.map?.remove();
  }

  // ── Map initialisation ────────────────────────────────────────────────
  private initMap(): void {
    this.map = L.map(this.mapContainerRef.nativeElement, {
      center:           EYANG_CENTER,
      zoom:             DEFAULT_ZOOM,
      zoomControl:      false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    L.control.attribution({ position: 'bottomright', prefix: '© OSM' }).addTo(this.map);

    this.markerLayer = L.layerGroup().addTo(this.map);

    this.mapReady.set(true);
    this.triggerSearch();     // initial load
  }

  // ── Trigger / filter ──────────────────────────────────────────────────
  triggerSearch(): void {
    const f: EstateFilters = {
      status: 'published',
    };
    if (this.filterLocation())   f.location  = this.filterLocation();
    if (this.filterGenerator())  f.generator = this.filterGenerator();
    if (this.filterForage())     f.forage    = this.filterForage();
    if (this.filterRestaurant()) f.restaurant= this.filterRestaurant();
    if (this.filterMaxDist())    f.max_dist  = this.filterMaxDist()!;
    // Price + wifi are client-side filtered (no backend param for them yet)
    this.filterTrigger$.next(f);
  }

  // Client-side extra filter (price + wifi not yet in EstateViewSet)
  visibleEstates = computed(() => {
    let list = this.estates();
    const minP = this.filterMinPrice();
    const maxP = this.filterMaxPrice();
    const wifi = this.filterWifi();
    if (minP) list = list.filter(e => e.price >= minP);
    if (maxP) list = list.filter(e => e.price <= maxP);
    if (wifi) list = list.filter(e => e.wifi === wifi);
    return list;
  });

  resetFilters(): void {
    this.filterGenerator.set('');
    this.filterForage.set('');
    this.filterRestaurant.set('');
    this.filterWifi.set('');
    this.filterMinPrice.set(null);
    this.filterMaxPrice.set(null);
    this.filterMaxDist.set(null);
    this.filterLocation.set('');
    this.triggerSearch();
  }

  // ── Marker rendering ──────────────────────────────────────────────────
  private renderMarkers(estates: Estate[], activeId: number | null): void {
    this.markerLayer.clearLayers();
    this.markerMap.clear();

    const visible = this.visibleEstates();

    visible.forEach(estate => {
      const [lat, lng] = estateCoords(estate);
      const isActive   = estate.id === activeId;

      const marker = L.marker([lat, lng], {
        icon: this.buildPriceIcon(estate.price, isActive),
        zIndexOffset: isActive ? 1000 : 0,
      });

      marker.bindPopup(this.buildPopupHtml(estate), {
        maxWidth:   260,
        className:  'estate-popup',
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

  private buildPriceIcon(price: number, active: boolean): L.DivIcon {
    const label = price >= 1_000_000
      ? `${(price / 1_000_000).toFixed(1)}M`
      : price >= 1_000 ? `${Math.round(price / 1_000)}k` : String(price);

    return L.divIcon({
      className: '',
      html: `<div class="estate-marker${active ? ' estate-marker--active' : ''}">${label}</div>`,
      iconSize:   [80, 32],
      iconAnchor: [40, 16],
    });
  }

  private buildPopupHtml(e: Estate): string {
    const img = e.image ? `<img src="${e.image}" alt="${e.name}" />` : '';
    const stars = '★'.repeat(Math.round(e.average_rating?.value ?? 0))
                + '☆'.repeat(5 - Math.round(e.average_rating?.value ?? 0));
    const badges = [
      e.wifi === '1'      ? '<span class="pop-badge">WiFi</span>' : '',
      e.generator === '1' ? '<span class="pop-badge">Groupe élec.</span>' : '',
      e.forage === '1'    ? '<span class="pop-badge">Forage</span>' : '',
    ].filter(Boolean).join('');

    return `
      <div class="estate-popup-inner">
        <div class="pop-img">${img}</div>
        <div class="pop-body">
          <p class="pop-name">${e.name}</p>
          <p class="pop-rating">${stars} <span>(${e.reviews_count ?? 0})</span></p>
          <p class="pop-location">📍 ${e.location} · ${e.distance}m du campus</p>
          ${badges ? `<div class="pop-badges">${badges}</div>` : ''}
          <div class="pop-footer">
            <span class="pop-price">${e.price.toLocaleString('fr-CM')} XAF<em>/mois</em></span>
            <a class="pop-link" href="/housing/${e.id}">Voir →</a>
          </div>
        </div>
      </div>`;
  }

  // ── Card interactions ─────────────────────────────────────────────────
  onCardHover(id: number): void {
    this.hoveredId.set(id);
    this.activeId.set(id);
  }

  onCardLeave(): void {
    this.hoveredId.set(null);
    this.activeId.set(null);
  }

  flyTo(estate: Estate): void {
    const [lat, lng] = estateCoords(estate);
    this.map.flyTo([lat, lng], 17, { duration: 0.7 });
    setTimeout(() => this.markerMap.get(estate.id)?.openPopup(), 700);
  }

  // ── View mode ─────────────────────────────────────────────────────────
  setViewMode(m: 'split' | 'map' | 'list'): void {
    this.viewMode.set(m);
    if (m !== 'list') setTimeout(() => this.map?.invalidateSize(), 50);
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  formatPrice(p: number): string {
    return `${p.toLocaleString('fr-CM')} XAF/mois`;
  }

  ratingStars(val: number): string[] {
    const full  = Math.floor(val);
    const half  = val - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return [...Array(full).fill('full'), ...Array(half).fill('half'), ...Array(empty).fill('empty')];
  }

  amenityList(e: Estate): string[] {
    const a: string[] = [];
    if (e.wifi      === '1') a.push('WiFi');
    if (e.generator === '1') a.push('Groupe élec.');
    if (e.forage    === '1') a.push('Forage');
    if (e.restaurant=== '1') a.push('Restaurant');
    if (e.tv        === '1') a.push('TV');
    if (e.fridge    === '1') a.push('Frigo');
    return a;
  }

  trackById(_: number, e: Estate): number { return e.id; }

  get currentUser() { return this.auth.currentUser; }
  get isAuthenticated() { return this.auth.isAuthenticated(); }
}