import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HeaderComponent } from '../header/header.component';
import {
  LucideAngularModule,
  MapPin, Phone, Mail,
  Facebook, Twitter, Instagram, Linkedin,
  ArrowUp, ExternalLink
} from 'lucide-angular';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, TranslateModule, LucideAngularModule],
  template: `
    <div class="public-layout">
      <app-header [isPublic]="true"></app-header>

      <main class="public-content">
        <router-outlet></router-outlet>
      </main>

      <!-- ════════════════ RICH FOOTER ════════════════ -->
      <footer class="site-footer">

        <!-- TOP: columns -->
        <div class="footer-top">
          <div class="footer-grid">

            <!-- ① Brand -->
            <div class="f-col f-brand">
              <div class="f-logo">
                <img src="assets/images/logo.png" alt="Eyang Estate" class="f-logo-img">
                <span class="f-logo-text">Eyang Estate</span>
              </div>
              <p class="f-tagline">{{ 'footer.tagline' | translate }}</p>
              <ul class="f-contact">
                <li>
                  <lucide-icon [img]="MapPinIcon" class="f-contact-icon"></lucide-icon>
                  <span>Yaoundé, Cameroun</span>
                </li>
                <li>
                  <lucide-icon [img]="PhoneIcon" class="f-contact-icon"></lucide-icon>
                  <span>+237 6XX XXX XXX</span>
                </li>
                <li>
                  <lucide-icon [img]="MailIcon" class="f-contact-icon"></lucide-icon>
                  <span>contact&#64;eyangestate.cm</span>
                </li>
              </ul>
            </div>

            <!-- ② Navigation -->
            <div class="f-col">
              <h4 class="f-col-title">{{ 'footer.nav_title' | translate }}</h4>
              <ul class="f-links">
                <li><a routerLink="/">{{ 'footer.home' | translate }}</a></li>
                <li><a routerLink="/" fragment="listings">{{ 'footer.listings' | translate }}</a></li>
                <li><a routerLink="/contact">{{ 'footer.contact' | translate }}</a></li>
              </ul>
            </div>

            <!-- ③ Services -->
            <div class="f-col">
              <h4 class="f-col-title">{{ 'footer.services_title' | translate }}</h4>
              <ul class="f-links">
                <li><a routerLink="/">{{ 'footer.find_housing' | translate }}</a></li>
                <li><a routerLink="/dashboard">{{ 'footer.owner_space' | translate }}</a></li>
                <li><a routerLink="/" fragment="faq">{{ 'footer.faq' | translate }}</a></li>
              </ul>
            </div>

            <!-- ④ Language + Socials -->
            <div class="f-col">
              <h4 class="f-col-title">{{ 'footer.lang_title' | translate }}</h4>
              <div class="f-lang-row">
                <button class="f-lang-btn" [class.active]="currentLang === 'fr'" (click)="setLang('fr')">
                  🇫🇷 Français
                </button>
                <button class="f-lang-btn" [class.active]="currentLang === 'en'" (click)="setLang('en')">
                  🇬🇧 English
                </button>
              </div>

              <h4 class="f-col-title f-social-title">{{ 'footer.follow_us' | translate }}</h4>
              <div class="f-socials">
                <a href="#" class="f-social-btn" aria-label="Facebook">
                  <lucide-icon [img]="FacebookIcon" class="f-social-icon"></lucide-icon>
                </a>
                <a href="#" class="f-social-btn" aria-label="Instagram">
                  <lucide-icon [img]="InstagramIcon" class="f-social-icon"></lucide-icon>
                </a>
                <a href="#" class="f-social-btn" aria-label="Twitter">
                  <lucide-icon [img]="TwitterIcon" class="f-social-icon"></lucide-icon>
                </a>
                <a href="#" class="f-social-btn" aria-label="LinkedIn">
                  <lucide-icon [img]="LinkedinIcon" class="f-social-icon"></lucide-icon>
                </a>
              </div>
            </div>

          </div>
        </div>

        <!-- DIVIDER -->
        <div class="f-divider"></div>

        <!-- BOTTOM BAR -->
        <div class="f-bottom">
          <div class="f-bottom-inner">
            <p class="f-rights">{{ 'footer.rights' | translate }}</p>
            <div class="f-legal">
              <a href="#">{{ 'footer.privacy' | translate }}</a>
              <a href="#">{{ 'footer.terms' | translate }}</a>
            </div>
            <button class="f-top-btn" (click)="scrollTop()" [title]="'footer.back_top' | translate">
              <lucide-icon [img]="ArrowUpIcon" class="f-top-icon"></lucide-icon>
            </button>
          </div>
        </div>

      </footer>
    </div>
  `,
  styles: [`
    /* ── LAYOUT ─────────────────────────────────────────────── */
    .public-layout {
      min-height:     100vh;
      display:        flex;
      flex-direction: column;
      background:     white;
    }
    .public-content { flex: 1; }

    /* ── FOOTER BASE ─────────────────────────────────────────── */
    .site-footer {
      background: linear-gradient(150deg, #0B1120 0%, #122040 55%, #0F1A35 100%);
      color:      rgba(255,255,255,0.82);
      font-size:  14px;
      line-height: 1.6;
    }

    /* ── TOP SECTION ─────────────────────────────────────────── */
    .footer-top {
      padding: 4.5rem 2.5rem 3rem;
    }
    .footer-grid {
      max-width:             1200px;
      margin:                0 auto;
      display:               grid;
      grid-template-columns: 2fr 1fr 1fr 1.5fr;
      gap:                   3rem;
      align-items:           start;
    }

    /* ── BRAND COLUMN ─────────────────────────────────────────── */
    .f-logo {
      display:       flex;
      align-items:   center;
      gap:           10px;
      margin-bottom: 1rem;
    }
    .f-logo-img {
      height:        40px;
      width:         auto;
      object-fit:    contain;
      border-radius: 8px;
    }
    .f-logo-text {
      font-size:      1.15rem;
      font-weight:    800;
      color:          #fff;
      letter-spacing: -0.01em;
    }
    .f-tagline {
      color:         rgba(255,255,255,0.55);
      font-size:     13px;
      margin-bottom: 1.4rem;
      max-width:     270px;
    }
    .f-contact {
      list-style:     none;
      padding:        0;
      margin:         0;
      display:        flex;
      flex-direction: column;
      gap:            0.65rem;
    }
    .f-contact li {
      display:     flex;
      align-items: center;
      gap:         8px;
      color:       rgba(255,255,255,0.65);
      font-size:   13px;
    }
    .f-contact-icon {
      width:       15px;
      height:      15px;
      color:       #60A5FA;
      flex-shrink: 0;
    }

    /* ── LINK COLUMNS ─────────────────────────────────────────── */
    .f-col-title {
      font-size:      11.5px;
      font-weight:    700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color:          rgba(255,255,255,0.38);
      margin-bottom:  1rem;
      margin-top:     0;
    }
    .f-social-title { margin-top: 1.75rem; }

    .f-links {
      list-style:     none;
      padding:        0;
      margin:         0;
      display:        flex;
      flex-direction: column;
      gap:            0.55rem;
    }
    .f-links li a {
      color:           rgba(255,255,255,0.68);
      text-decoration: none;
      font-size:       13.5px;
      cursor:          pointer;
      transition:      color 0.2s ease, padding-left 0.2s ease;
      display:         block;
    }
    .f-links li a:hover {
      color:        #93C5FD;
      padding-left: 5px;
    }

    /* ── LANG BUTTONS ─────────────────────────────────────────── */
    .f-lang-row {
      display:        flex;
      flex-direction: column;
      gap:            0.5rem;
    }
    .f-lang-btn {
      background:    rgba(255,255,255,0.06);
      border:        1px solid rgba(255,255,255,0.12);
      border-radius: 8px;
      padding:       8px 14px;
      color:         rgba(255,255,255,0.6);
      font-size:     13px;
      font-weight:   600;
      cursor:        pointer;
      text-align:    left;
      transition:    background 0.2s, border-color 0.2s, color 0.2s;
    }
    .f-lang-btn:hover { background: rgba(96,165,250,0.1); border-color: rgba(96,165,250,0.4); color: #fff; }
    .f-lang-btn.active { background: rgba(37,99,235,0.2); border-color: #3B82F6; color: #fff; }

    /* ── SOCIAL ICONS ─────────────────────────────────────────── */
    .f-socials {
      display:  flex;
      gap:      0.6rem;
      flex-wrap: wrap;
    }
    .f-social-btn {
      width:           38px;
      height:          38px;
      border-radius:   50%;
      background:      rgba(255,255,255,0.07);
      border:          1px solid rgba(255,255,255,0.12);
      display:         flex;
      align-items:     center;
      justify-content: center;
      color:           rgba(255,255,255,0.6);
      text-decoration: none;
      transition:      background 0.2s, border-color 0.2s, color 0.2s, transform 0.15s;
    }
    .f-social-btn:hover {
      background:   rgba(96,165,250,0.2);
      border-color: #60A5FA;
      color:        #fff;
      transform:    translateY(-3px);
    }
    .f-social-icon { width: 16px; height: 16px; }

    /* ── DIVIDER ──────────────────────────────────────────────── */
    .f-divider {
      height:     1px;
      background: rgba(255,255,255,0.07);
      margin:     0 2.5rem;
    }

    /* ── BOTTOM BAR ───────────────────────────────────────────── */
    .f-bottom { padding: 1.25rem 2.5rem; }
    .f-bottom-inner {
      max-width:       1200px;
      margin:          0 auto;
      display:         flex;
      align-items:     center;
      justify-content: space-between;
      gap:             1rem;
      flex-wrap:       wrap;
    }
    .f-rights {
      color:     rgba(255,255,255,0.38);
      font-size: 12px;
      margin:    0;
    }
    .f-legal { display: flex; gap: 1.5rem; }
    .f-legal a {
      color:           rgba(255,255,255,0.42);
      font-size:       12px;
      text-decoration: none;
      transition:      color 0.2s;
    }
    .f-legal a:hover { color: rgba(255,255,255,0.8); }

    .f-top-btn {
      width:           34px;
      height:          34px;
      border-radius:   50%;
      background:      rgba(37,99,235,0.2);
      border:          1px solid rgba(59,130,246,0.35);
      color:           #93C5FD;
      display:         flex;
      align-items:     center;
      justify-content: center;
      cursor:          pointer;
      transition:      background 0.2s, transform 0.2s;
      flex-shrink:     0;
    }
    .f-top-btn:hover { background: rgba(37,99,235,0.4); transform: translateY(-2px); }
    .f-top-icon { width: 15px; height: 15px; }

    /* ── RESPONSIVE ───────────────────────────────────────────── */
    @media (max-width: 1024px) {
      .footer-grid { grid-template-columns: 1.5fr 1fr 1fr; }
      .f-col:last-child { grid-column: 1 / -1; }
      .f-lang-row { flex-direction: row; }
    }
    @media (max-width: 768px) {
      .footer-top { padding: 3rem 1.5rem 2.5rem; }
      .footer-grid { grid-template-columns: 1fr 1fr; gap: 2rem; }
      .f-brand { grid-column: 1 / -1; }
      .f-col:last-child { grid-column: unset; }
      .f-divider { margin: 0 1.5rem; }
      .f-bottom { padding: 1.1rem 1.5rem; }
      .f-bottom-inner { justify-content: center; text-align: center; }
      .f-legal { justify-content: center; }
    }
    @media (max-width: 480px) {
      .footer-top { padding: 2.5rem 1rem 2rem; }
      .footer-grid { grid-template-columns: 1fr; gap: 1.75rem; }
      .f-brand { grid-column: unset; }
      .f-divider { margin: 0 1rem; }
      .f-bottom { padding: 1rem; }
      .f-lang-row { flex-direction: column; }
    }
  `]
})
export class PublicLayoutComponent implements OnInit {
  readonly MapPinIcon    = MapPin;
  readonly PhoneIcon     = Phone;
  readonly MailIcon      = Mail;
  readonly FacebookIcon  = Facebook;
  readonly TwitterIcon   = Twitter;
  readonly InstagramIcon = Instagram;
  readonly LinkedinIcon  = Linkedin;
  readonly ArrowUpIcon   = ArrowUp;

  currentLang = 'fr';

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    this.currentLang = localStorage.getItem('lang') ?? 'fr';
    this.translate.onLangChange.subscribe(e => {
      this.currentLang = e.lang;
    });
  }

  setLang(lang: string): void {
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }

  scrollTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}