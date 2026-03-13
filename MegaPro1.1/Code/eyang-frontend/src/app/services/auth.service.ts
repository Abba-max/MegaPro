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
    // On app start: if a token exists, restore the session
    if (this.getAccessToken()) {
      this.fetchMe().subscribe({ error: () => this.logout() });
    }
  }

  // ── Token helpers ─────────────────────────────────────────────────────

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

  // ── Auth actions ──────────────────────────────────────────────────────

  login(email: string, password: string): Observable<any> {
    return this.http.post<{ access: string; refresh: string }>(
      `${this.BASE}/token/`, { username: email, password }
    ).pipe(
      tap(tokens => {
        this.storeTokens(tokens.access, tokens.refresh);
        // fetchMe() sets currentUser$ — callers should wait on currentUser$
        this.fetchMe().subscribe();
      })
    );
  }

  register(data: {
    username?: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    role?: string;
    accountType?: 'Student' | 'Parent' | 'Owner';
  }): Observable<any> {
    const payload = {
      username: data.username ?? data.email,
      email: data.email,
      password: data.password,
      first_name: data.first_name ?? data.firstName ?? '',
      last_name: data.last_name ?? data.lastName ?? '',
      phone: data.phone ?? '',
      role: data.role ?? data.accountType ?? 'Student',
    };
    return this.http.post(`${this.BASE}/auth/register/`, payload).pipe(
      tap((res: any) => {
        if (res.access && res.refresh) {
          this.storeTokens(res.access, res.refresh);
          this.fetchMe().subscribe();
        }
      })
    );
  }

  refreshToken(): Observable<{ access: string; refresh?: string }> {
    return this.http.post<{ access: string; refresh?: string }>(
      `${this.BASE}/token/refresh/`, { refresh: this.getRefreshToken() }
    ).pipe(
      tap(tokens => {
        localStorage.setItem(ACCESS_KEY, tokens.access);
        if (tokens.refresh) localStorage.setItem(REFRESH_KEY, tokens.refresh);
      })
    );
  }

  fetchMe(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/auth/me/`).pipe(
      tap(data => {
        const name = data.name
          || `${data.first_name || ''} ${data.last_name || ''}`.trim()
          || data.username;

        const initials = name
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || '??';

        // ✅ Normalize role — backend sends 'Admin'|'Owner'|'Student'|'Parent' already capitalised
        const rawRole: string = data.role || 'Student';
        const knownRoles: User['role'][] = ['Admin', 'Owner', 'Student', 'Parent'];
        const role = (knownRoles.find(r => r.toLowerCase() === rawRole.toLowerCase()) ?? 'Student') as User['role'];

        const user: User = {
          id: data.id,
          name,
          initials,
          email: data.email || data.username,
          role,
          user_type: data.user_type || undefined,
          visitor_category: data.visitor_category || undefined,
          phone: data.phone || '',
          address: data.address || '',
        };

        this.currentUserSubject.next(user);
      }),
      catchError(err => {
        this.clearTokens();
        this.currentUserSubject.next(null);
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    this.clearTokens();
    this.currentUserSubject.next(null);
    this.router.navigate(['/']);
  }

  // ── State helpers ─────────────────────────────────────────────────────

  /** True if a token exists in storage (user object may still be loading) */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /** True only when token exists AND user profile is loaded */
  isLoggedIn(): boolean {
    return !!this.getAccessToken() && this.currentUserSubject.value !== null;
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // ── Role helpers ──────────────────────────────────────────────────────

  get isAdminUser(): boolean { return this.currentUser?.role === 'Admin'; }
  get isOwnerUser(): boolean { return this.currentUser?.role === 'Owner'; }
  get isClientUser(): boolean {
    const r = this.currentUser?.role;
    return r === 'Student' || r === 'Parent';
  }

  canActivateAdmin(): boolean { return this.isAdminUser; }
  canActivateOwner(): boolean { return this.isAdminUser || this.isOwnerUser; }
  canActivateClient(): boolean { return this.isClientUser || this.isAdminUser; }

  // ── Modal control ─────────────────────────────────────────────────────

  openLogin(): void { this.showLoginModalSubject.next(true); }
  closeLogin(): void { this.showLoginModalSubject.next(false); }

  // ── Legacy compat ──────────────────────────────────────────────────────

  setUser(user: User): void { this.currentUserSubject.next(user); }
}