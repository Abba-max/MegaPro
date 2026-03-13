// src/app/services/auth.interceptor.ts
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const injector = inject(Injector);
  // ⚠️ Direct localStorage access to avoid circular dependency with AuthService at startup
  const token = localStorage.getItem('access_token');

  // Broaden check for local development environments
  const isApiUrl = req.url.includes('localhost:8000') || req.url.includes('127.0.0.1:8000');

  const authReq = token && isApiUrl
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/api/token/')) {
        // Resolve AuthService lazily only when needed
        const authService = injector.get(AuthService);
        return authService.refreshToken().pipe(
          switchMap((tokens: { access: string; refresh?: string }) => {
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${tokens.access}` }
            });
            return next(retryReq);
          }),
          catchError(refreshError => {
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};