import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

// Bundle all translation files statically — no HTTP requests at runtime
import * as enTranslations from '../../../public/assets/i18n/en.json';
import * as frTranslations from '../../../public/assets/i18n/fr.json';

const TRANSLATIONS: Record<string, unknown> = {
  en: enTranslations,
  fr: frTranslations,
};

export class BundledTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    // Fall back to English if the requested language is not bundled
    return of(TRANSLATIONS[lang] ?? TRANSLATIONS['en']);
  }
}
