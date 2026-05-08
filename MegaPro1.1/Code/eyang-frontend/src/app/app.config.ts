// src/app/app.config.ts
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZoneChangeDetection } from '@angular/core';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';

import { routes } from './app.routes';
import { authInterceptor } from './services/auth.interceptor';
import { httpCacheInterceptor } from './services/http-cache.interceptor';
import { BundledTranslateLoader } from './services/bundled-translate-loader';

export function HttpLoaderFactory() {
  return new BundledTranslateLoader();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, httpCacheInterceptor])),
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'fr',
        loader: {
          provide:    TranslateLoader,
          useFactory: HttpLoaderFactory,
        },
      })
    ),
  ],
};
