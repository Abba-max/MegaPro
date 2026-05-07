import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { SiteSettingsService } from './services/site-settings.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
  constructor(
    private translate: TranslateService,
    private siteSettings: SiteSettingsService
  ) {}

  ngOnInit(): void {
    // 1. Apply saved language from settings (falls back to localStorage → 'fr')
    const savedLang = this.siteSettings.language
      || localStorage.getItem('lang') as 'fr' | 'en'
      || 'fr';
    this.translate.setDefaultLang('fr');
    this.translate.use(savedLang);
  }
}




