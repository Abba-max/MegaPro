import { HttpInterceptorFn, HttpResponse, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { of, tap } from 'rxjs';

/**
 * A simple in-memory cache for GET requests.
 * Default TTL: 5 minutes.
 */
const cache = new Map<string, { response: HttpResponse<any>, expiry: number }>();
const TTL = 5 * 60 * 1000; // 5 minutes in ms

export const httpCacheInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    // If it's a mutation (POST, PUT, DELETE, PATCH), invalidate related cache entries
    // For simplicity, we invalidate the whole cache on mutations to ensure consistency
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      cache.clear();
    }
    return next(req);
  }

  // Allow bypassing cache with a header
  if (req.headers.has('X-Bypass-Cache')) {
    return next(req);
  }

  const cacheKey = req.urlWithParams;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiry > Date.now()) {
    return of(cached.response.clone());
  }

  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse && event.status === 200) {
        cache.set(cacheKey, {
          response: event.clone(),
          expiry: Date.now() + TTL
        });
      }
    })
  );
};
