
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, tap, throwError, catchError, switchMap, map, of } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

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

const ACCESS_KEY  = 'access_token';
const REFRESH_KEY = 'refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly BASE = environment.apiUrl;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // Restore session on page reload: if a token is stored, rebuild the user object.
    if (this.getAccessToken()) {
      this.fetchMe().subscribe({
        error: (err) => {
          // Only force-logout on explicit auth errors. Network errors / 500s should
          // NOT clear the session so the user isn't kicked on a momentary backend hiccup.
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
        // Django SimpleJWT uses 'username' field even for email-based auth
        { username: email, password }
      )
      .pipe(
        tap(tokens => {
          this.storeTokens(tokens.access, tokens.refresh);
          // Fetch user profile in background
          this.fetchMe().subscribe();
        })
      );
  }

  /**
   * Register a new user.
   * Payload shape matches the Django backend:
   *   email, password, first_name, last_name, phone, role
   *
   * On success the backend returns { access, refresh, user } or just tokens.
   * We store the tokens and call fetchMe() to populate currentUser$.
   */
  register(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role: 'Student' | 'Parent' | 'Owner';
  }): Observable<any> {
    return this.http.post<any>(`${this.BASE}/auth/register/`, userData).pipe(
      tap(res => {
        if (res.access && res.refresh) {
          this.storeTokens(res.access, res.refresh);
          this.fetchMe().subscribe();
        }
      })
    );
  }

  /**
   * Register using FormData (multipart) — required when id_card file is included.
   * Used for Owner registrations; falls back gracefully for other roles too.
   */
  registerFormData(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.BASE}/auth/register/`, formData).pipe(
      tap(res => {
        if (res.access && res.refresh) {
          this.storeTokens(res.access, res.refresh);
          this.fetchMe().subscribe();
        }
      })
    );
  }

  verifyEmail(uid: string, token: string): Observable<any> {
    return this.http.post<any>(`${this.BASE}/auth/verify/`, { uid, token });
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.BASE}/auth/password-reset/`, { email });
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
            : `${environment.apiUrl.replace('/api', '')}${data.id_card.startsWith('/') ? '' : '/'}${data.id_card}`
          : undefined;

        const user: User = {
          id: data.id,
          name,
          initials,
          email: data.email || data.username,
          role,
          user_type:        data.user_type        || undefined,
          visitor_category: data.visitor_category || undefined,
          is_verified:      data.is_verified,
          id_card,
          phone:   data.phone   || '',
          address: data.address || '',
        };

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
    // Use window.location so all services/subscriptions are cleanly torn down
    window.location.href = '/';
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

  get isAdminUser(): boolean  { return this.currentUser?.role === 'Admin'; }
  get isOwnerUser(): boolean  { return this.currentUser?.role === 'Owner'; }
  get isClientUser(): boolean {
    const r = this.currentUser?.role;
    return r === 'Student' || r === 'Parent';
  }

  canActivateAdmin():  boolean { return this.isAdminUser; }
  canActivateOwner():  boolean { return this.isAdminUser || this.isOwnerUser; }
  canActivateClient(): boolean { return this.isClientUser || this.isAdminUser; }

  setUser(user: User): void { this.currentUserSubject.next(user); }
}




