import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const injector = inject(Injector);
  // ⚠️ Direct localStorage access to avoid circular dependency with AuthService at startup
  const token = localStorage.getItem('access_token');

  // Check if the request is going to our backend API
  const isApiUrl = req.url.startsWith(environment.apiUrl);

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