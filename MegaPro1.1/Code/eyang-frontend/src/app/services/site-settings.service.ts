// src/app/services/site-settings.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface SiteSettings {
  siteName:    string;
  siteEmail:   string;
  sitePhone:   string;
  siteAddress: string;
  description: string;
  language:    'fr' | 'en';
  emailOnOrder:   boolean;
  emailOnReview:  boolean;
  emailOnContact: boolean;
}

const STORAGE_KEY = 'eyang_site_settings';

const DEFAULTS: SiteSettings = {
  siteName:       'Eyang Estate',
  siteEmail:      'contact@eyangEstate.cm',
  sitePhone:      '+237 6XX XXX XXX',
  siteAddress:    'Yaoundé, Cameroun',
  description:    'Plateforme de logements pour étudiants près du campus.',
  language:       'fr',
  emailOnOrder:   true,
  emailOnReview:  true,
  emailOnContact: true,
};

@Injectable({ providedIn: 'root' })
export class SiteSettingsService {

  private _settings$ = new BehaviorSubject<SiteSettings>(this.load());
  readonly settings$ = this._settings$.asObservable();

  get current(): SiteSettings { return this._settings$.value; }

  private load(): SiteSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {}
    return { ...DEFAULTS };
  }

  save(settings: SiteSettings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    this._settings$.next({ ...settings });
  }

  get siteName(): string    { return this.current.siteName; }
  get language(): 'fr'|'en' { return this.current.language; }
}