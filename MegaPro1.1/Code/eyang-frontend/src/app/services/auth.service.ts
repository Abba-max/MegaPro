// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, tap, throwError, catchError } from 'rxjs';
import { Router } from '@angular/router';

export interface User {
  id?: number;
  name: string;
  email: string;
  role: 'Admin' | 'Student' | 'Owner' | 'Parent';
  user_type?: 'visitor' | 'owner';
  visitor_category?: string;
  is_verified?: boolean;
  id_card?: string;
  initials: string;
  phone?: string;
  address?: string;
}

export type CurrentUser = User;
export type UserRole = 'Admin' | 'Student' | 'Owner' | 'Parent';

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly BASE = 'http://localhost:8000/api';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  private showLoginModalSubject = new Subject<boolean>();
  showLoginModal$ = this.showLoginModalSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
  // FIX: Restore session on page reload.
  // If a token is stored, call fetchMe() to rebuild the user object.
  // We no longer use NgZone here — with provideZoneChangeDetection()
  // HTTP observables run inside the zone automatically.
    if (this.getAccessToken()) {
      this.fetchMe().subscribe({
        error: (err) => {
          // Only force-logout on explicit auth errors (401/403).
          // Network errors, 500s, etc. should NOT clear the session so the
          // user isn't kicked out just because the backend is momentarily down.
          if (err.status === 401 || err.status === 403) {
            this.logout();
          }
        }
      });
    }
  }

  // ── Token helpers ──────────────────────────────────────────────────────

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  private storeTokens(access: string, refresh: string): void {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  }

  private clearTokens(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }

  // ── Auth actions ───────────────────────────────────────────────────────

  login(email: string, password: string): Observable<any> {
    return this.http
      .post<{ access: string; refresh: string }>(
        `${this.BASE}/token/`,
        { username: email, password }
      )
      .pipe(
        tap(tokens => {
          this.storeTokens(tokens.access, tokens.refresh);
          this.fetchMe().subscribe();
        })
      );
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/auth/register/`, userData).pipe(
      tap(res => {
        if (res.access) {
          this.storeTokens(res.access, res.refresh);
          this.fetchMe().subscribe();
        }
      })
    );
  }

  refreshToken(): Observable<{ access: string; refresh?: string }> {
    return this.http
      .post<{ access: string; refresh?: string }>(
        `${this.BASE}/token/refresh/`,
        { refresh: this.getRefreshToken() }
      )
      .pipe(
        tap(tokens => {
          localStorage.setItem(ACCESS_KEY, tokens.access);
          if (tokens.refresh) localStorage.setItem(REFRESH_KEY, tokens.refresh);
        })
      );
  }

  fetchMe(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/auth/me/`).pipe(
      tap(data => {
        const name =
          data.name ||
          `${data.first_name || ''} ${data.last_name || ''}`.trim() ||
          data.username;
        const initials = name
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || '??';

        const rawRole: string = data.role || 'Student';
        const knownRoles: User['role'][] = ['Admin', 'Owner', 'Student', 'Parent'];
        const role = (
          knownRoles.find(r => r.toLowerCase() === rawRole.toLowerCase()) ?? 'Student'
        ) as User['role'];

        const id_card = data.id_card
          ? data.id_card.startsWith('http')
            ? data.id_card
            : `http://localhost:8000${data.id_card.startsWith('/') ? '' : '/'}${data.id_card}`
          : undefined;

        const user: User = {
          id: data.id,
          name,
          initials,
          email: data.email || data.username,
          role,
          user_type: data.user_type || undefined,
          visitor_category: data.visitor_category || undefined,
          is_verified: data.is_verified,
          id_card,
          phone: data.phone || '',
          address: data.address || '',
        };

        // No NgZone.run() needed — HTTP runs inside the zone with zone-based CD
        this.currentUserSubject.next(user);
      }),
      catchError(err => {
        if (err.status === 401 || err.status === 403) {
          this.logout();
        }
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    this.clearTokens();
    this.currentUserSubject.next(null);
    this.router.navigate(['/']);
  }

  // ── State helpers ──────────────────────────────────────────────────────

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken() && this.currentUserSubject.value !== null;
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // ── Role helpers ───────────────────────────────────────────────────────

  get isAdminUser(): boolean { return this.currentUser?.role === 'Admin'; }
  get isOwnerUser(): boolean { return this.currentUser?.role === 'Owner'; }
  get isClientUser(): boolean {
    const r = this.currentUser?.role;
    return r === 'Student' || r === 'Parent';
  }

  canActivateAdmin(): boolean { return this.isAdminUser; }
  canActivateOwner(): boolean { return this.isAdminUser || this.isOwnerUser; }
  canActivateClient(): boolean { return this.isClientUser || this.isAdminUser; }

  // ── Modal control ──────────────────────────────────────────────────────

  openLogin(): void { this.showLoginModalSubject.next(true); }
  closeLogin(): void { this.showLoginModalSubject.next(false); }

  setUser(user: User): void { this.currentUserSubject.next(user); }
}