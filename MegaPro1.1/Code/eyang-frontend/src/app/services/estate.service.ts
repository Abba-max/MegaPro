import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EstateImage { id: number; image: string; }

export interface RoomImage { id: number; image: string; caption: string; room_category: number; }

export interface RoomCategory {
  id: number;
  estate: number;
  name: string;
  occupancy: 'single' | 'double' | 'shared';
  price: number;
  quantity_available: number;
  wifi: '0' | '1';
  tv: '0' | '1';
  fridge: '0' | '1';
  room_size: '1' | '2' | '3';
  description: string;
  images: RoomImage[];
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
  restaurant: '0' | '1'; generator: '0' | '1';
  forage: '0' | '1';
  description: string; publishedAt: string;
  status: 'draft' | 'published' | 'archived';
  images: EstateImage[];
  room_categories: RoomCategory[];
  owner?: { id: number; username: string; email: string; first_name: string; last_name: string; };
  reviews_count: number; orders_count: number;
  price: number; capacity: number; free: number;
  wifi: '0' | '1'; tv: '0' | '1'; fridge: '0' | '1';
  lat: number;
  lng: number;
  /** true = admin approved, badge shown on card */
  is_verified?: boolean;
  owner_id?: number;
}

export interface Estate extends EstateRaw {
  title: string; image: string; type: string;
  features: string[]; area: number | null; minMonths: number;
  equipments: { name: string; icon: any; color: string }[];
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
  if (raw.generator === '1') features.push('zap');
  if (raw.forage === '1') features.push('droplets');
  if (raw.restaurant === '1') features.push('restaurant');

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
    features, area: null, minMonths: 2, equipments: [],
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
    return this.http.get<PlatformStats>(`${this.BASE}/stats/`);
  }

  // ── Owner dashboard ───────────────────────────────────────
  getMyEstates(): Observable<Estate[]> { return this.getEstates({ mine: '1' }); }

  getOwnerStats(): Observable<OwnerDashboardStats> {
    return this.http.get<OwnerDashboardStats>(`${this.BASE}/dashboard/stats/`);
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
    return this.http.get<ClientDashboardStats>(`${this.BASE}/client/stats/`);
  }

  getMyReservations(): Observable<QuickOrder[]> {
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
    return this.http.get<AdminStats>(`${this.BASE}/admin/stats/`);
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

  // ── Quick Orders ──────────────────────────────────────────
  createQuickOrder(data: Partial<QuickOrder>): Observable<QuickOrder> {
    return this.http.post<QuickOrder>(`${this.BASE}/orders/`, data);
  }

  deleteQuickOrder(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/orders/${id}/`);
  }

  updateOrderStatus(id: number, status: 'accepted' | 'rejected'): Observable<QuickOrder> {
    return this.http.patch<QuickOrder>(`${this.BASE}/orders/${id}/`, { status });
  }

  acceptReservation(id: number): Observable<QuickOrder> {
    return this.http.patch<QuickOrder>(`${this.BASE}/orders/${id}/accept/`, {});
  }

  rejectReservation(id: number): Observable<QuickOrder> {
    return this.http.patch<QuickOrder>(`${this.BASE}/orders/${id}/reject/`, {});
  }

  uploadReceipt(id: number, file: File): Observable<QuickOrder> {
    const fd = new FormData();
    fd.append('receipt', file, file.name);
    return this.http.post<QuickOrder>(`${this.BASE}/orders/${id}/upload-receipt/`, fd);
  }

  verifyPayment(id: number, action: 'approve' | 'reject'): Observable<any> {
    return this.http.post(`${this.BASE}/orders/${id}/verify-payment/`, { action });
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
}