import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface EstateImage {
  id: number;
  image: string;
}

export interface EstateRaw {
  id: number;
  name: string;
  location: string;
  capacity: number;
  free: number;
  rating: string;
  price: number;
  distance: number;
  wifi: '0' | '1';
  restaurant: '0' | '1';
  generator: '0' | '1';
  room_size: '1' | '2' | '3';
  forage: '0' | '1';
  description: string;
  publishedAt: string;
  status: 'draft' | 'published' | 'archived';
  images: EstateImage[];
  owner?: { id: number; username: string; email: string };
}
export interface Estate extends EstateRaw {
  title: string;
  image: string;
  places: number;
  type: string;
  features: string[];
  area: number | null;
  minMonths: number;
  roomInfo: { single: number; double: number } | null;
  equipments: { name: string; icon: any; color: string }[];
}

export interface Review {
  id: number;
  estate: number;
  name: string;
  rating: number;
  comment: string;
  created_at: string;
  parent?: number | null;
  initials?: string;
  date?: string;
}

export interface QuickOrder {
  id?: number;
  estate: number;
  name: string;
  phone: string;
  note?: string;
}

export interface ContactRequest {
  name: string;
  email: string;
  phone?: string;
  message: string;
}


export interface PlatformStats {
  estates:  number;
  users:    number;
  reviews:  number;
  campuses: number;
}

export interface EstateFilters {
  location?: string;
  status?: string;
  wifi?: string;
  generator?: string;
  forage?: string;
  min_price?: number;
  max_price?: number;
}

const ROOM_TYPE_MAP: Record<string, string> = {
  '1': 'Villa',
  '2': 'Studio',
  '3': 'Chambre',
};

export function enrichEstate(raw: EstateRaw): Estate {
  const features: string[] = [];
  if (raw.wifi === '1')       features.push('wifi');
  if (raw.generator === '1')  features.push('zap');
  if (raw.forage === '1')     features.push('droplets');
  if (raw.restaurant === '1') features.push('restaurant');

  return {
    ...raw,
    title: raw.name,
    image: raw.images?.[0]?.image ?? '',
    places: raw.free,
    type: ROOM_TYPE_MAP[raw.room_size] ?? 'Chambre',
    features,
    area: null,
    minMonths: 2,
    roomInfo: null,
    equipments: [],
  };
}

export function enrichReview(r: Review): Review {
  return {
    ...r,
    initials: r.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
    date: new Date(r.created_at).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric'
    }),
  };
}

@Injectable({ providedIn: 'root' })
export class EstateService {
  private readonly BASE = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getEstates(filters?: EstateFilters): Observable<Estate[]> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          params = params.set(key, String(val));
        }
      });
    }
    return this.http.get<EstateRaw[]>(`${this.BASE}/estates/`, { params }).pipe(
      map(list => list.map(enrichEstate))
    );
  }

  getEstate(id: number): Observable<Estate> {
    return this.http.get<EstateRaw>(`${this.BASE}/estates/${id}/`).pipe(
      map(enrichEstate)
    );
  }

  createEstate(data: Partial<EstateRaw>): Observable<Estate> {
    return this.http.post<EstateRaw>(`${this.BASE}/estates/`, data).pipe(
      map(enrichEstate)
    );
  }

  updateEstate(id: number, data: Partial<EstateRaw>): Observable<Estate> {
    return this.http.patch<EstateRaw>(`${this.BASE}/estates/${id}/`, data).pipe(
      map(enrichEstate)
    );
  }

  deleteEstate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/estates/${id}/`);
  }

  getReviews(estateId?: number): Observable<Review[]> {
    let params = new HttpParams();
    if (estateId) params = params.set('estate', String(estateId));
    return this.http.get<Review[]>(`${this.BASE}/reviews/`, { params }).pipe(
      map(list => list.map(enrichReview))
    );
  }

  createReview(data: Omit<Review, 'id' | 'created_at'>): Observable<Review> {
    return this.http.post<Review>(`${this.BASE}/reviews/`, data).pipe(
      map(enrichReview)
    );
  }

  createQuickOrder(data: QuickOrder): Observable<QuickOrder> {
    return this.http.post<QuickOrder>(`${this.BASE}/orders/`, data);
  }

  sendContact(data: ContactRequest): Observable<any> {
    return this.http.post(`${this.BASE}/contact-requests/`, data);
  }

  getStats(): Observable<PlatformStats> {
    return this.http.get<PlatformStats>(`${this.BASE}/stats/`);
  }

}