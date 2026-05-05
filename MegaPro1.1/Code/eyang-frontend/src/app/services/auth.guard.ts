// src/app/services/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { filter, map, take } from 'rxjs/operators';
import { of, timer, race } from 'rxjs';

/**
 * Waits for currentUser$ to resolve before checking role.
 *
 * PROBLEMS FIXED:
 * 1. On page reload, token exists but currentUser$ is null while fetchMe() is
 *    in-flight. Old guards checked role immediately, got null, redirected away.
 * 2. If fetchMe() errors for a non-401 reason (network, 500…), currentUser$
 *    never emits non-null and the guard hung forever. Fixed with a 6-second
 *    race timeout that redirects home if the user never loads.
 */
function guardWithRole(
  auth: AuthService,
  router: Router,
  predicate: (a: AuthService) => boolean,
  fallbackRoute: string
) {
  // No token at all → go home immediately
  if (!auth.isAuthenticated()) {
    router.navigate(['/']);
    return of(false);
  }

  // User already loaded (subsequent navigations after the first page load)
  if (auth.currentUser !== null) {
    if (predicate(auth)) return of(true);
    router.navigate([fallbackRoute]);
    return of(false);
  }

  // Token exists but fetchMe() still running — race between:
  //   A) currentUser$ emitting a real (non-null) user
  //   B) a 6-second safety timeout (prevents hanging if fetchMe() errors)
  const userLoaded$ = auth.currentUser$.pipe(
    filter(user => user !== null),
    take(1),
    map(() => {
      if (predicate(auth)) return true;
      router.navigate([fallbackRoute]);
      return false;
    })
  );

  const timeout$ = timer(6000).pipe(
    map(() => {
      // fetchMe() didn't complete in 6 s → treat as unauthenticated
      router.navigate(['/']);
      return false;
    })
  );

  // race() takes the first observable that emits
  return race(userLoaded$, timeout$);
}

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  router.navigate(['/']);
  return false;
};

// ── adminGuard: must be Admin ─────────────────────────────────────────────
export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return guardWithRole(auth, router, a => a.isAdminUser, '/');
};

// ── ownerGuard: must be Owner or Admin ───────────────────────────────────
export const ownerGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return guardWithRole(auth, router, a => a.isAdminUser || a.isOwnerUser, '/dashboard');
};