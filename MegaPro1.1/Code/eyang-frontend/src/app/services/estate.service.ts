import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, shareReplay, forkJoin, of, catchError } from 'rxjs';
import { environment } from '../../environments/environment';


export interface EstateImage { id: number; image: string; }

export interface RoomImage { id: number; image: string; caption: string; room_category: number; }

// ── Equipment & Supplement interfaces ─────────────────────────────────────────

export interface Equipment {
  id: number;
  part_name: string;
  removable: boolean;
}

export interface RoomEquipment {
  id: number;
  room_category: number;
  equipment: number;
  equipment_name?: string;
  part?: string;
  quantity: number;
  surface_area_m2?: number | null;
  condition: 'NEW' | 'GOOD' | 'BAD';
  note?: string;
}

export interface Supplement {
  id: number;
  estate: number;
  name: string;
  price: number;
  description?: string;
  is_available: boolean;
  is_paid_service: boolean;
}

export interface Characteristic {
  id: number;
  name: string;
  description?: string;
}

export interface EstateCharacteristic {
  id: number;
  estate: number;
  characteristic: number;
  characteristic_name?: string;
}

// ── Room Category (expanded) ───────────────────────────────────────────────────

export interface RoomCategory {
  id: number;
  estate: number;
  name: string;
  occupancy: 'single' | 'double' | 'shared';
  price: number;
  price_per_month?: number;
  /** Canonical availability fields */
  total_rooms: number;
  available_rooms: number;
  /** Legacy compatibility aliases (kept in sync server-side) */
  quantity_available: number;
  surface_area?: number | null;
  wifi: boolean;
  tv: boolean;
  fridge: boolean;
  room_size: '1' | '2' | '3';
  description: string;
  images: RoomImage[];
  equipment?: RoomEquipment[];
}

export interface AverageRating {
  value: number;
  display: string;
  count: number;
  breakdown: { [star: number]: number };
}

export interface EstateRaw {
  id: number; name: string; location: string;
  rating: string;
  average_rating: AverageRating;
  distance: number;
  restaurant: boolean; generator: boolean;
  forage: boolean;
  description: string; publishedAt: string;
  status: 'draft' | 'published' | 'archived';
  images: EstateImage[];
  room_categories: RoomCategory[];
  owner?: { id: number; username: string; email: string; first_name: string; last_name: string; };
  reviews_count: number; orders_count: number;
  price: number; capacity: number; free: number;
  wifi: boolean; tv: boolean; fridge: boolean;
  lat: number;
  lng: number;
  parking?: boolean;
  security_guard?: boolean;
  cctv?: boolean;
  cleaning_service?: boolean;
  borehole_forage?: boolean;
  generator_available?: boolean;
  restaurant_on_site?: boolean;
  Terrain_de_sport?: boolean;
  playground?: boolean;
  water_bills?: boolean;
  electricity_bills?: boolean;
  fence?: boolean;
  caretaker?: boolean;
  max_capacity?: number;
  etages?: number;
  allowed_gender?: 'all' | 'male' | 'female';
  characteristics?: EstateCharacteristic[];
  supplements?: Supplement[];
  /** true = admin approved, badge shown on card */
  is_verified?: boolean;
  owner_id?: number;
}

export interface Estate extends EstateRaw {
  title: string; image: string; type: string;
  features: string[]; area: number | null; minMonths: number;
  equipments: { name: string; icon: any; color: string; colorKey: string }[];
}

export interface Review {
  id: number; estate: number; estate_name?: string; estate_image?: string;
  name: string; rating: number; comment: string; created_at: string;
  parent?: number | null; initials?: string; date?: string;
  user_email?: string; likes_count?: number; liked_by_me?: boolean;
}

export interface QuickOrder {
  id?: number; estate: number; estate_name?: string; estate_image?: string;
  estate_location?: string; estate_price?: number;
  room_category?: number | null; room_category_name?: string | null;
  name: string; phone: string; note?: string; created_at?: string;
  user_email?: string;
  status?: 'pending_payment' | 'paid' | 'pending' | 'accepted' | 'rejected' | 'payment_failed';
  receipt?: string;
  is_payment_verified?: boolean;
}

export interface Invoice {
  id: number;
  reservation: number;
  invoice_id: string;
  total_amount: number;
  pdf_download_url?: string;
  estate_name?: string;
  client_name?: string;
  status: 'UNPAID' | 'PAID';
  created_at: string;
}

/** Snapshot of estate + room-category state at reservation time. */
export interface ReservationSnapshot {
  estate: {
    id: number; name: string; address: string;
    owner_email?: string; owner_phone?: string;
    characteristics: { [key: string]: any };
  };
  room_category: {
    id: number; name: string;
    surface_area?: number;
    price_per_month: number;
    description?: string;
    equipment: { name: string; quantity: number; surface_area?: number; condition: string }[];
  };
  supplements: { id: number; name: string; price: number; description?: string }[];
}

export interface Reservation {
  id: number;
  user: number;
  room_category: number;
  room?: number;
  /** ISO date strings */
  check_in: string;
  check_out: string;
  start_date?: string;
  end_date?: string;
  num_rooms: number;
  total_price?: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
  /** Immutable snapshot of estate + room-category at booking time */
  reservation_details_json?: ReservationSnapshot;
  selected_supplements?: number[];
  invoice?: Invoice;
  /** PDF bill download URL (populated after acceptance + generation) */
  bill_url?: string | null;
  estate_name?: string;
  room_category_name?: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  note?: string;
  estate_image?: string;
  estate_location?: string;
  is_legacy?: boolean;
  legacy_receipt?: string;
}

export interface ContactRequest {
  id?: number; estate?: number; estate_name?: string;
  name: string; email: string; phone?: string; message: string;
  submitted_at?: string;
}

export interface ChatMessage {
  id: number; conversation: number; sender: number;
  sender_name: string; sender_username: string;
  text: string; read: boolean; created_at: string;
  file?: { id: number; file: string; filename: string; size: number } | null;
}

export interface Conversation {
  id: number;
  client: { id: number; username: string; email: string; first_name: string; last_name: string; };
  owner: { id: number; username: string; email: string; first_name: string; last_name: string; };
  estate: number; estate_name: string; estate_image?: string;
  last_message?: { text: string; created_at: string; sender_id: number } | null;
  unread_count: number; messages: ChatMessage[];
  created_at: string; updated_at: string;
}

export interface PlatformStats { estates: number; users: number; students: number; reviews: number; campuses: number; orders: number; }

export interface OwnerDashboardStats { total_estates: number; occupancy_pct: number; pending_orders: number; avg_rating: number; }

export interface ClientDashboardStats { total_reservations: number; total_reviews: number; total_messages: number; total_contacts: number; }

export interface AdminStats {
  total_users: number; total_estates: number; total_orders: number; total_reviews: number;
  pending_verifications?: number;
  pending_payments?: number;
  recent_activities: AdminActivity[];
  monthly_orders: { month: string; value: number }[];
}

export interface AdminActivity { type: string; title: string; subtitle: string; created_at: string; }

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  username?: string;
  type: string;
  active: boolean;
  initials: string;
  color: string;
  joined: string;
}

export interface EstateFilters {
  location?: string; status?: string; wifi?: string; generator?: string;
  forage?: string; restaurant?: string; tv?: string; fridge?: string;
  min_price?: number; max_price?: number; room_size?: string; max_dist?: number; mine?: string;
  playground?: string; cctv?: string; cleaning?: string;
}

export function getAbsoluteUrl(url: string | null | undefined, width?: number): string {
  if (!url) return '';
  let finalUrl = url;
  if (!url.startsWith('http')) {
    const base = environment.apiUrl.replace('/api', '');
    finalUrl = url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
  }

  // Cloudinary optimization: automatically add auto quality and format
  if (finalUrl.includes('res.cloudinary.com') && finalUrl.includes('/upload/')) {
    const params = width ? `q_auto,f_auto,w_${width},c_limit` : 'q_auto,f_auto';
    // Matches /upload/ followed by an optional transformation segment (anything not containing a slash) and a slash
    return finalUrl.replace(/\/upload\/(?:[^\/]+\/)?/, `/upload/${params}/`);
  }
  return finalUrl;
}

function defaultAverageRating(storedRating: string): AverageRating {
  const value = parseFloat(storedRating) || 0;
  return { value, display: value.toFixed(1), count: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
}

const EYANG_LAT = 3.884041;
const EYANG_LNG = 11.390736;

export function enrichEstate(raw: EstateRaw): Estate {
  const features: string[] = [];
  const equipments: { name: string; icon: string; color: string; colorKey: string }[] = [];

  // Feature mapping (All are now booleans from backend)
  const hasWifi = !!raw.wifi;
  const hasGenerator = !!raw.generator || !!raw.generator_available;
  const hasForage = !!raw.forage || !!raw.borehole_forage;
  const hasRestaurant = !!raw.restaurant || !!raw.restaurant_on_site;
  const hasTv = !!raw.tv;
  const hasFridge = !!raw.fridge;
  const hasPlayground = !!raw.playground;

  if (hasWifi) {
    features.push('wifi');
    equipments.push({ name: 'WiFi', icon: 'Wifi', color: 'orange', colorKey: 'wifi' });
  }
  if (hasGenerator) {
    features.push('zap');
    equipments.push({ name: 'Générateur', icon: 'Zap', color: 'yellow', colorKey: 'generator' });
  }
  if (hasForage) {
    features.push('droplets');
    equipments.push({ name: 'Forage', icon: 'Droplets', color: 'blue', colorKey: 'forage' });
  }
  if (hasRestaurant) {
    features.push('restaurant');
    equipments.push({ name: 'Restaurant', icon: 'Utensils', color: 'brown', colorKey: 'restaurant' });
  }
  if (hasTv) {
    features.push('tv');
    equipments.push({ name: 'TV', icon: 'Tv', color: 'purple', colorKey: 'tv' });
  }
  if (hasFridge) {
    features.push('fridge');
    equipments.push({ name: 'Réfrigérateur', icon: 'Thermometer', color: 'teal', colorKey: 'fridge' });
  }
  if (hasPlayground) {
    features.push('playground');
    equipments.push({ name: 'Aire de jeux', icon: 'Gamepad2', color: 'green', colorKey: 'playground' });
  }

  // New boolean flags
  if (raw.parking) equipments.push({ name: 'Parking', icon: 'ParkingCircle', color: 'indigo', colorKey: 'parking' });
  if (raw.security_guard) equipments.push({ name: 'Sécurité', icon: 'ShieldCheck', color: 'red', colorKey: 'security_guard' });
  if (raw.cctv) equipments.push({ name: 'Vidéosurveillance', icon: 'Video', color: 'gray', colorKey: 'cctv' });
  if (raw.cleaning_service) equipments.push({ name: 'Ménage', icon: 'Sparkles', color: 'blue', colorKey: 'cleaning' });
  if (raw.Terrain_de_sport) equipments.push({ name: 'Sport', icon: 'Dribbble', color: 'green', colorKey: 'sport_field' });
  if (raw.water_bills) equipments.push({ name: 'Eau incluse', icon: 'Droplet', color: 'cyan', colorKey: 'water_bills' });
  if (raw.electricity_bills) equipments.push({ name: 'Élec. incluse', icon: 'Zap', color: 'yellow', colorKey: 'electricity_bills' });

  const images = (raw.images || []).map(img => ({ ...img, image: getAbsoluteUrl(img.image, 400) }));
  const room_categories = (raw.room_categories || []).map(rc => ({
    ...rc,
    images: (rc.images || []).map(img => ({ ...img, image: getAbsoluteUrl(img.image, 400) }))
  }));

  const average_rating: AverageRating = raw.average_rating ?? defaultAverageRating(raw.rating ?? '0.0');
  const lat = (raw.lat != null && raw.lat !== 0) ? Number(raw.lat) : EYANG_LAT;
  const lng = (raw.lng != null && raw.lng !== 0) ? Number(raw.lng) : EYANG_LNG;

  return {
    ...raw,
    lat, lng, images, room_categories, average_rating,
    title: raw.name,
    image: images[0]?.image ?? '',
    type: 'Logement',
    features, area: null, minMonths: 2, 
    equipments: equipments as any[]
  };
}

export function enrichReview(r: Review): Review {
  return {
    ...r,
    initials: r.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
    date: new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
  };
}

export function occupancyLabel(occ: string): string {
  return { single: 'Individuelle', double: 'Double', shared: 'Partagée' }[occ] ?? occ;
}

export function roomSizeLabel(s: string): string {
  return { '1': 'Grande', '2': 'Moyenne', '3': 'Petite' }[s] ?? '';
}

@Injectable({ providedIn: 'root' })
export class EstateService {
  private readonly BASE = environment.apiUrl;

  private stats$?: Observable<PlatformStats>;
  private ownerStats$?: Observable<OwnerDashboardStats>;
  private clientStats$?: Observable<ClientDashboardStats>;
  private adminStats$?: Observable<AdminStats>;
  private characteristics$?: Observable<Characteristic[]>;
  private equipment$?: Observable<Equipment[]>;

  constructor(public http: HttpClient) { }

  private buildParams(f?: EstateFilters): HttpParams {
    let p = new HttpParams();
    if (!f) return p;
    Object.entries(f).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    });
    return p;
  }

  // ── Public ────────────────────────────────────────────────
  getEstates(filters?: EstateFilters): Observable<Estate[]> {
    return this.http.get<EstateRaw[]>(`${this.BASE}/estates/`, { params: this.buildParams(filters) })
      .pipe(map(list => list.map(enrichEstate)));
  }

  getEstate(id: number): Observable<Estate> {
    return this.http.get<EstateRaw>(`${this.BASE}/estates/${id}/`).pipe(map(enrichEstate));
  }

  getStats(): Observable<PlatformStats> {
    if (!this.stats$) {
      this.stats$ = this.http.get<PlatformStats>(`${this.BASE}/stats/`).pipe(shareReplay(1));
    }
    return this.stats$;
  }

  // ── Owner dashboard ───────────────────────────────────────
  getMyEstates(): Observable<Estate[]> { return this.getEstates({ mine: '1' }); }

  getOwnerStats(): Observable<OwnerDashboardStats> {
    if (!this.ownerStats$) {
      this.ownerStats$ = this.http.get<OwnerDashboardStats>(`${this.BASE}/dashboard/stats/`).pipe(shareReplay(1));
    }
    return this.ownerStats$;
  }

  getMyOrders(): Observable<QuickOrder[]> {
    return this.http.get<QuickOrder[]>(`${this.BASE}/orders/?mine=1`).pipe(
      map(list => list.map(o => ({ ...o, estate_image: getAbsoluteUrl(o.estate_image) })))
    );
  }

  getMyReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.BASE}/reviews/?mine=1`).pipe(
      map(list => list.map(r => ({ ...enrichReview(r), estate_image: getAbsoluteUrl(r.estate_image) })))
    );
  }

  // ── Client dashboard ──────────────────────────────────────
  getClientStats(): Observable<ClientDashboardStats> {
    if (!this.clientStats$) {
      this.clientStats$ = this.http.get<ClientDashboardStats>(`${this.BASE}/client/stats/`).pipe(shareReplay(1));
    }
    return this.clientStats$;
  }

  getMyLegacyOrders(): Observable<QuickOrder[]> {
    return this.http.get<QuickOrder[]>(`${this.BASE}/orders/?client=1`).pipe(
      map(list => list.map(o => ({ ...o, estate_image: getAbsoluteUrl(o.estate_image) })))
    );
  }

  getMySubmittedReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.BASE}/reviews/?client=1`).pipe(
      map(list => list.map(r => ({ ...enrichReview(r), estate_image: getAbsoluteUrl(r.estate_image) })))
    );
  }

  getMyContactRequests(): Observable<ContactRequest[]> {
    return this.http.get<ContactRequest[]>(`${this.BASE}/contact-requests/?client=1`);
  }

  // ── Messaging ─────────────────────────────────────────────
  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.BASE}/conversations/`).pipe(
      map(list => list.map(c => ({ ...c, estate_image: getAbsoluteUrl(c.estate_image) })))
    );
  }

  getConversation(id: number): Observable<Conversation> {
    return this.http.get<Conversation>(`${this.BASE}/conversations/${id}/`).pipe(
      map(c => ({ ...c, estate_image: getAbsoluteUrl(c.estate_image) }))
    );
  }

  startConversation(estateId: number, ownerId: number): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.BASE}/conversations/`, { estate_id: estateId, owner_id: ownerId });
  }

  sendMessage(conversationId: number, text: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.BASE}/conversations/${conversationId}/messages/`, { text });
  }

  sendMessageWithFile(conversationId: number, file: File): Observable<ChatMessage> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.post<ChatMessage>(`${this.BASE}/conversations/${conversationId}/messages/`, fd);
  }

  markConversationRead(conversationId: number): Observable<any> {
    return this.http.post(`${this.BASE}/conversations/${conversationId}/read/`, {});
  }

  deleteConversation(conversationId: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/conversations/${conversationId}/`);
  }

  deleteChatMessage(conversationId: number, messageId: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/conversations/${conversationId}/messages/${messageId}/`);
  }

  // ── Estate images ─────────────────────────────────────────
  uploadEstateImages(estateId: number, files: File[]): Observable<EstateImage[]> {
    const fd = new FormData();
    files.forEach(f => fd.append('images', f, f.name));
    return this.http.post<EstateImage[]>(`${this.BASE}/estates/${estateId}/images/`, fd);
  }

  deleteEstateImage(estateId: number, imageId: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/estates/${estateId}/images/${imageId}/`);
  }

  // ── Admin ─────────────────────────────────────────────────
  getAdminStats(): Observable<AdminStats> {
    if (!this.adminStats$) {
      this.adminStats$ = this.http.get<AdminStats>(`${this.BASE}/admin/stats/`).pipe(shareReplay(1));
    }
    return this.adminStats$;
  }

  getAdminBookings(): Observable<QuickOrder[]> {
    return this.http.get<QuickOrder[]>(`${this.BASE}/admin/bookings/`).pipe(
      map(list => list.map(o => ({ ...o, estate_image: getAbsoluteUrl(o.estate_image) })))
    );
  }

  deleteAdminBooking(id: number): Observable<any> {
    return this.http.delete(`${this.BASE}/admin/bookings/?id=${id}`);
  }

  getAdminReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.BASE}/admin/reviews/`).pipe(map(list => list.map(enrichReview)));
  }

  deleteAdminReview(id: number): Observable<any> {
    return this.http.delete(`${this.BASE}/admin/reviews/?id=${id}`);
  }

  getAdminContacts(): Observable<ContactRequest[]> {
    return this.http.get<ContactRequest[]>(`${this.BASE}/admin/contacts/`);
  }

  deleteAdminContact(id: number): Observable<any> {
    return this.http.delete(`${this.BASE}/admin/contacts/?id=${id}`);
  }

  getAdminUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.BASE}/admin/users/`);
  }

  toggleUser(userId: number): Observable<{ id: number; active: boolean }> {
    return this.http.patch<{ id: number; active: boolean }>(`${this.BASE}/admin/users/${userId}/toggle/`, {});
  }

  getPendingOwners(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/admin/users/?pending_only=1`).pipe(
      map(users => users.map(u => ({ ...u, id_card: getAbsoluteUrl(u.id_card) })))
    );
  }

  verifyOwner(userId: number, action: 'approve' | 'reject'): Observable<any> {
    return this.http.post(`${this.BASE}/admin/users/${userId}/verify/`, { action });
  }

  // ── CRUD estates ──────────────────────────────────────────
  createEstate(data: Partial<EstateRaw>): Observable<Estate> {
    return this.http.post<EstateRaw>(`${this.BASE}/estates/`, data).pipe(map(enrichEstate));
  }

  updateEstate(id: number, data: Partial<EstateRaw>): Observable<Estate> {
    return this.http.patch<EstateRaw>(`${this.BASE}/estates/${id}/`, data).pipe(map(enrichEstate));
  }

  deleteEstate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/estates/${id}/`);
  }

  /**
   * Admin-only: approve or reject an estate's verification.
   * POST /api/estates/{id}/verify/ { action: 'approve' | 'reject' }
   */
  verifyEstate(id: number, action: 'approve' | 'reject'): Observable<{ id: number; is_verified: boolean }> {
    return this.http.post<{ id: number; is_verified: boolean }>(`${this.BASE}/estates/${id}/verify/`, { action });
  }

  transferOwnership(id: number, newOwnerId: number): Observable<Estate> {
    return this.http.post<EstateRaw>(`${this.BASE}/estates/${id}/transfer-ownership/`, { new_owner_id: newOwnerId })
      .pipe(map(enrichEstate));
  }

  // ── Reservations & Invoices ───────────────────────────────
  getReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.BASE}/reservations/`).pipe(
      map(list => list.map(r => ({ ...r, estate_image: getAbsoluteUrl(r.estate_image) }))),
      catchError(() => of([]))
    );
  }

  /**
   * Returns a merged list of new Reservations and legacy QuickOrders
   * for the current user's role.
   */
  getUnifiedReservations(role: 'admin' | 'owner' | 'client'): Observable<Reservation[]> {
    const res$ = this.getReservations();
    let legacy$: Observable<QuickOrder[]>;

    if (role === 'admin') {
      legacy$ = this.getAdminBookings().pipe(catchError(() => of([])));
    } else if (role === 'owner') {
      legacy$ = this.getMyOrders().pipe(catchError(() => of([])));
    } else {
      legacy$ = this.getMyLegacyOrders().pipe(catchError(() => of([])));
    }

    return forkJoin([res$, legacy$]).pipe(
      map(([res, legacy]) => {
        const mappedLegacy = legacy.map(o => this.mapLegacyToReservation(o));
        return [...res, ...mappedLegacy].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      })
    );
  }

  private mapLegacyToReservation(o: QuickOrder): Reservation {
    // Map legacy 'pending_payment', 'paid' etc to new statuses
    let status: Reservation['status'] = 'PENDING';
    if (o.status === 'accepted') status = 'ACCEPTED';
    else if (o.status === 'rejected') status = 'REJECTED';
    else if (o.status === 'payment_failed') status = 'REJECTED';

    return {
      id: o.id || 0,
      user: 0,
      room_category: o.room_category || 0,
      check_in: o.created_at?.split('T')[0] || '', // Fallback to creation date
      check_out: '',
      num_rooms: 1,
      status: status,
      created_at: o.created_at || new Date().toISOString(),
      updated_at: o.created_at || new Date().toISOString(),
      estate_name: o.estate_name,
      estate_image: o.estate_image,
      client_name: o.name,
      client_phone: o.phone,
      note: o.note,
      estate_location: o.estate_location,
      is_legacy: true,
      legacy_receipt: o.receipt
    } as any;
  }

  getReservation(id: number): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.BASE}/reservations/${id}/`).pipe(
      map(r => ({ ...r, estate_image: getAbsoluteUrl(r.estate_image) }))
    );
  }

  /**
   * Create a new reservation (PENDING). The backend will:
   * - Build and store a snapshot of the current estate/room state.
   * - Compute total_price from price_per_month × months × num_rooms.
   * - NOT decrement available_rooms yet (only done on accept).
   */
  createReservation(data: {
    room_category: number;
    check_in: string;
    check_out: string;
    num_rooms?: number;
    selected_supplements?: number[];
  }): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.BASE}/reservations/`, data);
  }

  /**
   * Accept a reservation (owner/admin). Triggers concurrency-safe room
   * decrement + async PDF generation. Returns immediately with ACCEPTED status.
   */
  acceptReservation(id: number): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.BASE}/reservations/${id}/accept/`, {});
  }

  /** Reject a reservation (owner/admin). Restores available_rooms if was ACCEPTED. */
  rejectReservation(id: number): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.BASE}/reservations/${id}/reject/`, {});
  }

  /** Cancel a reservation (client — own reservations only). */
  cancelReservation(id: number): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.BASE}/reservations/${id}/cancel/`, {});
  }

  /**
   * Poll for the bill URL. Returns HTTP 202 + { bill_url: null } while the
   * background PDF thread is still running; 200 + { bill_url: string } when ready.
   */
  getReservationBill(id: number): Observable<{ bill_url: string | null; invoice_id?: string; message?: string }> {
    return this.http.get<{ bill_url: string | null; invoice_id?: string; message?: string }>(
      `${this.BASE}/reservations/${id}/bill/`
    );
  }

  /** Open the PDF bill in a new browser tab (polls once if URL not yet cached). */
  openBill(reservation: any): void {
    if (reservation.is_legacy) {
      if (reservation.legacy_receipt) {
        const url = reservation.legacy_receipt.startsWith('http') ? reservation.legacy_receipt : `${this.BASE.replace('/api', '')}${reservation.legacy_receipt}`;
        window.open(url, '_blank');
      } else {
        alert("Ce reçu n'est pas disponible pour les anciennes réservations.");
      }
      return;
    }

    const url = reservation.bill_url ?? reservation.invoice?.pdf_download_url;
    if (url) {
      window.open(url, '_blank');
    } else {
      this.getReservationBill(reservation.id).subscribe(res => {
        if (res.bill_url) window.open(res.bill_url, '_blank');
      });
    }
  }

  getInvoices(): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(`${this.BASE}/invoices/`);
  }

  downloadInvoice(invoiceId: number): void {
    this.http.get<Invoice>(`${this.BASE}/invoices/${invoiceId}/`).subscribe(inv => {
      if (inv.pdf_download_url) window.open(inv.pdf_download_url, '_blank');
    });
  }

  uploadReceipt(id: number, file: File): Observable<QuickOrder> {
    const fd = new FormData();
    fd.append('receipt', file, file.name);
    return this.http.post<QuickOrder>(`${this.BASE}/orders/${id}/upload-receipt/`, fd);
  }

  verifyPayment(id: number, action: 'approve' | 'reject'): Observable<any> {
    return this.http.post(`${this.BASE}/orders/${id}/verify-payment/`, { action });
  }

  acceptQuickOrder(id: number): Observable<QuickOrder> {
    return this.http.patch<QuickOrder>(`${this.BASE}/orders/${id}/accept/`, {});
  }

  rejectQuickOrder(id: number): Observable<QuickOrder> {
    return this.http.patch<QuickOrder>(`${this.BASE}/orders/${id}/reject/`, {});
  }

  // ── Reviews ───────────────────────────────────────────────
  getReviews(estateId?: number): Observable<Review[]> {
    let p = new HttpParams();
    if (estateId) p = p.set('estate', String(estateId));
    return this.http.get<Review[]>(`${this.BASE}/reviews/`, { params: p }).pipe(map(list => list.map(enrichReview)));
  }

  createReview(data: Omit<Review, 'id' | 'created_at'>): Observable<Review> {
    return this.http.post<Review>(`${this.BASE}/reviews/`, data).pipe(map(enrichReview));
  }

  updateReview(id: number, data: { rating: number; comment: string }): Observable<Review> {
    return this.http.patch<Review>(`${this.BASE}/reviews/${id}/`, data).pipe(map(enrichReview));
  }

  deleteReview(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/reviews/${id}/`);
  }

  likeReview(id: number): Observable<{ liked: boolean; likes_count: number }> {
    return this.http.post<{ liked: boolean; likes_count: number }>(`${this.BASE}/reviews/${id}/like/`, {});
  }

  // ── Room Categories ──────────────────────────────────────
  getRoomCategories(estateId: number): Observable<RoomCategory[]> {
    return this.http.get<RoomCategory[]>(`${this.BASE}/room-categories/`, {
      params: new HttpParams().set('estate', estateId.toString())
    }).pipe(
      map(list => list.map(rc => ({
        ...rc,
        images: (rc.images || []).map(img => ({ ...img, image: getAbsoluteUrl(img.image) }))
      })))
    );
  }

  createRoomCategory(data: Partial<RoomCategory>): Observable<RoomCategory> {
    return this.http.post<RoomCategory>(`${this.BASE}/room-categories/`, data);
  }

  updateRoomCategory(id: number, data: Partial<RoomCategory>): Observable<RoomCategory> {
    return this.http.patch<RoomCategory>(`${this.BASE}/room-categories/${id}/`, data);
  }

  deleteRoomCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/room-categories/${id}/`);
  }

  uploadRoomImages(categoryId: number, files: File[]): Observable<RoomImage[]> {
    const fd = new FormData();
    files.forEach(f => fd.append('images', f, f.name));
    return this.http.post<RoomImage[]>(`${this.BASE}/room-categories/${categoryId}/images/`, fd);
  }

  getOnlineUsers(): Observable<{ online_user_ids: number[] }> {
    return this.http.get<{ online_user_ids: number[] }>(`${this.BASE}/online-users/`);
  }

  deleteContactRequest(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/contact-requests/${id}/`);
  }

  // ── Quick Orders (legacy booking flow) ──────────────────────────────
  createQuickOrder(data: Partial<QuickOrder>): Observable<QuickOrder> {
    return this.http.post<QuickOrder>(`${this.BASE}/orders/`, data);
  }

  deleteQuickOrder(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/orders/${id}/`);
  }

  updateOrderStatus(id: number, orderStatus: 'accepted' | 'rejected'): Observable<QuickOrder> {
    return this.http.patch<QuickOrder>(`${this.BASE}/orders/${id}/`, { status: orderStatus });
  }





  // ── Equipment ────────────────────────────────────────────────────────
  getEquipmentList(): Observable<Equipment[]> {
    if (!this.equipment$) {
      this.equipment$ = this.http.get<Equipment[]>(`${this.BASE}/equipment/`).pipe(shareReplay(1));
    }
    return this.equipment$;
  }

  createEquipment(data: { part_name: string; removable?: boolean }): Observable<Equipment> {
    return this.http.post<Equipment>(`${this.BASE}/equipment/`, data);
  }

  getRoomEquipment(roomCategoryId: number): Observable<RoomEquipment[]> {
    return this.http.get<RoomEquipment[]>(`${this.BASE}/room-equipment/`, {
      params: new HttpParams().set('room_category', roomCategoryId.toString())
    });
  }

  addRoomEquipment(data: {
    room_category: number;
    equipment?: number;
    custom_name?: string;
    quantity?: number;
    condition?: 'NEW' | 'GOOD' | 'BAD';
    note?: string;
  }): Observable<RoomEquipment> {
    return this.http.post<RoomEquipment>(`${this.BASE}/room-equipment/`, data);
  }

  updateRoomEquipment(id: number, data: Partial<RoomEquipment>): Observable<RoomEquipment> {
    return this.http.patch<RoomEquipment>(`${this.BASE}/room-equipment/${id}/`, data);
  }

  deleteRoomEquipment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/room-equipment/${id}/`);
  }

  // ── Supplements ──────────────────────────────────────────────────────
  getSupplements(estateId?: number): Observable<Supplement[]> {
    let params = new HttpParams();
    if (estateId) params = params.set('estate', estateId.toString());
    return this.http.get<Supplement[]>(`${this.BASE}/supplements/`, { params });
  }

  getEstateSupplements(estateId: number): Observable<Supplement[]> {
    return this.http.get<Supplement[]>(`${this.BASE}/estates/${estateId}/supplements/`);
  }

  addEstateSupplement(estateId: number, data: Partial<Supplement>): Observable<Supplement> {
    return this.http.post<Supplement>(`${this.BASE}/estates/${estateId}/supplements/`, data);
  }

  createSupplement(data: Omit<Supplement, 'id'>): Observable<Supplement> {
    return this.http.post<Supplement>(`${this.BASE}/supplements/`, data);
  }

  updateSupplement(id: number, data: Partial<Supplement>): Observable<Supplement> {
    return this.http.patch<Supplement>(`${this.BASE}/supplements/${id}/`, data);
  }

  deleteSupplement(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/supplements/${id}/`);
  }

  // ── Characteristics ──────────────────────────────────────────────────
  getCharacteristicList(): Observable<Characteristic[]> {
    if (!this.characteristics$) {
      this.characteristics$ = this.http.get<Characteristic[]>(`${this.BASE}/characteristics/`).pipe(shareReplay(1));
    }
    return this.characteristics$;
  }

  createCharacteristic(data: { name: string; description?: string }): Observable<Characteristic> {
    return this.http.post<Characteristic>(`${this.BASE}/characteristics/`, data);
  }

  getEstateCharacteristics(estateId: number): Observable<EstateCharacteristic[]> {
    return this.http.get<EstateCharacteristic[]>(`${this.BASE}/estates/${estateId}/characteristics/`);
  }

  addEstateCharacteristic(estateId: number, characteristicId: number): Observable<EstateCharacteristic> {
    return this.http.post<EstateCharacteristic>(`${this.BASE}/estates/${estateId}/characteristics/`, { characteristic: characteristicId });
  }

  deleteEstateCharacteristic(estateId: number, characteristicId: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/estates/${estateId}/characteristics/${characteristicId}/`);
  }

  // ── Static helpers ───────────────────────────────────────────────────
  /** Months between two ISO date strings (min 1). */
  static monthsBetween(checkIn: string, checkOut: string): number {
    const a = new Date(checkIn);
    const b = new Date(checkOut);
    return Math.max(1, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
  }

  /** Human-readable room availability label. */
  static availabilityLabel(available: number, total: number): string {
    if (available <= 0)           return 'Complet';
    if (available <= total * 0.2) return 'Presque complet';
    return `${available} chambre(s) disponible(s)`;
  }
}




