// src/app/services/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { filter, map, take } from 'rxjs';
import { of } from 'rxjs';

/**
 * Waits for currentUser$ to resolve before checking role.
 *
 * THE BUG: On page reload, the token exists so isAuthenticated() = true,
 * but currentUser$ is still null while fetchMe() is in-flight.
 * The old synchronous guards checked isAdminUser / isOwnerUser immediately,
 * got null, and redirected to '/' — disconnecting the user.
 *
 * THE FIX: If the user object isn't loaded yet, wait for the first non-null
 * emission from currentUser$ before evaluating the role predicate.
 */
function guardWithRole(
  auth: AuthService,
  router: Router,
  predicate: (a: AuthService) => boolean,
  fallbackRoute: string
) {
  // No token at all — go home immediately
  if (!auth.isAuthenticated()) {
    router.navigate(['/']);
    return of(false);
  }

  // User already loaded (subsequent navigations, not first reload)
  if (auth.currentUser !== null) {
    if (predicate(auth)) return of(true);
    router.navigate([fallbackRoute]);
    return of(false);
  }

  // Token exists but fetchMe() still running — wait for it
  return auth.currentUser$.pipe(
    filter(user => user !== null),  // skip the initial null
    take(1),                        // unsubscribe after first real value
    map(() => {
      if (predicate(auth)) return true;
      router.navigate([fallbackRoute]);
      return false;
    })
  );
}

// ── authGuard: just needs a valid token, no role check ───────────────────
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  router.navigate(['/']);
  return false;
};

// ── adminGuard: must be Admin ────────────────────────────────────────────
export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return guardWithRole(auth, router, a => a.isAdminUser, '/dashboard');
};

// ── ownerGuard: must be Owner or Admin ───────────────────────────────────
export const ownerGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return guardWithRole(auth, router, a => a.isAdminUser || a.isOwnerUser, '/dashboard');
};