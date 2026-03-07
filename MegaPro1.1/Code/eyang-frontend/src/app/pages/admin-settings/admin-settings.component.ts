import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Save, Loader, CheckCircle, XCircle, Info, AlertCircle, Globe } from 'lucide-angular';
import { TranslateService } from '@ngx-translate/core';
import { SiteSettingsService, SiteSettings } from '../../services/site-settings.service';

export interface Toast { id: number; type: 'success'|'error'|'info'|'warning'; message: string; }

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.css'
})
export class AdminSettingsComponent implements OnInit {
  readonly SaveIcon        = Save;
  readonly LoaderIcon      = Loader;
  readonly CheckCircleIcon = CheckCircle;
  readonly XCircleIcon     = XCircle;
  readonly InfoIcon        = Info;
  readonly AlertIcon       = AlertCircle;
  readonly GlobeIcon       = Globe;

  isSaving = false;

  // Working copy — edited by the form
  siteSettings = {
    siteName:    '',
    siteEmail:   '',
    sitePhone:   '',
    siteAddress: '',
    description: '',
  };

  notifSettings = {
    emailOnOrder:   true,
    emailOnReview:  true,
    emailOnContact: true,
  };

  selectedLang: 'fr' | 'en' = 'fr';

  toasts: Toast[] = [];
  private toastCounter = 0;

  constructor(
    private siteSettingsService: SiteSettingsService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    // Load persisted settings into the form
    const s = this.siteSettingsService.current;
    this.siteSettings = {
      siteName:    s.siteName,
      siteEmail:   s.siteEmail,
      sitePhone:   s.sitePhone,
      siteAddress: s.siteAddress,
      description: s.description,
    };
    this.notifSettings = {
      emailOnOrder:   s.emailOnOrder,
      emailOnReview:  s.emailOnReview,
      emailOnContact: s.emailOnContact,
    };
    this.selectedLang = s.language;
  }

  save(): void {
    this.isSaving = true;

    // Build new settings object
    const updated: SiteSettings = {
      ...this.siteSettings,
      language:       this.selectedLang,
      emailOnOrder:   this.notifSettings.emailOnOrder,
      emailOnReview:  this.notifSettings.emailOnReview,
      emailOnContact: this.notifSettings.emailOnContact,
    };

    // Persist to localStorage + broadcast via BehaviorSubject
    this.siteSettingsService.save(updated);

    // Apply language change immediately site-wide
    this.translate.use(this.selectedLang);
    localStorage.setItem('lang', this.selectedLang);

    setTimeout(() => {
      this.isSaving = false;
      this.showToast('Paramètres enregistrés et appliqués !', 'success');
    }, 600);
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  showToast(message: string, type: Toast['type'] = 'success'): void {
    const id = ++this.toastCounter;
    this.toasts.push({ id, type, message });
    setTimeout(() => this.dismissToast(id), 4000);
  }
}