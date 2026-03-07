// src/app/services/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  router.navigate(['/']);
  return false;
};

export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated() && auth.isAdminUser) return true;
  if (auth.isAuthenticated()) router.navigate(['/dashboard']);
  else router.navigate(['/']);
  return false;
};

export const ownerGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated() && (auth.isAdminUser || auth.isOwnerUser)) return true;
  if (auth.isAuthenticated()) router.navigate(['/dashboard']);
  else router.navigate(['/']);
  return false;
};