import { Component, OnInit, HostListener } from '@angular/core';
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

   
      <footer class="site-footer">

        <!-- TOP: columns -->
        <div class="footer-top">
          <div class="footer-grid">

            <!-- ① Brand -->
            <div class="f-col f-brand">
              <div class="f-logo">
                <img src="/assets/images/logo.png" alt="Eyang Estate" class="f-logo-img">
                <span class="f-logo-text">Eyang Estate</span>
              </div>
              <p class="f-tagline">{{ 'footer.tagline' | translate }}</p>
              <ul class="f-contact">
                <li>
                  <lucide-icon [img]="MapPinIcon" class="f-contact-icon"></lucide-icon>
                  <span>{{ 'footer.location' | translate }}</span>
                </li>
                <li>
                  <lucide-icon [img]="PhoneIcon" class="f-contact-icon"></lucide-icon>
                  <span>+237 675193603/652552561</span>
                </li>
                <li>
                  <lucide-icon [img]="MailIcon" class="f-contact-icon"></lucide-icon>
                  <span>eyangestate@gmail.com</span>
                </li>
              </ul>
            </div>

            <!-- ② Navigation -->
            <div class="f-col">
              <h4 class="f-col-title">{{ 'footer.nav_title' | translate }}</h4>
              <ul class="f-links">
                <li><a routerLink="/" (click)="scrollTop()">{{ 'footer.hero' | translate }}</a></li>
                <li><a (click)="scrollToSection('listings')">{{ 'footer.listings' | translate }}</a></li>
                <li><a (click)="scrollToSection('why')">{{ 'nav.why' | translate }}</a></li>
                <li><a routerLink="/contact">{{ 'footer.contact' | translate }}</a></li>
              </ul>
            </div>

            <!-- ③ Services -->
            <div class="f-col">
              <h4 class="f-col-title">{{ 'footer.services_title' | translate }}</h4>
              <ul class="f-links">
                <li><a (click)="scrollToSection('listings')">{{ 'footer.find_housing' | translate }}</a></li>
                <li><a routerLink="/dashboard">{{ 'footer.owner_space' | translate }}</a></li>
                <li><a (click)="scrollToSection('faq')">{{ 'footer.faq' | translate }}</a></li>
                <li><a href="mailto:eyangestate@gmail.com">eyangestate@gmail.com</a></li>
              </ul>
            </div>

            <!-- ④ Language + Socials -->
            <div class="f-col">
              <h4 class="f-col-title">{{ 'footer.lang_title' | translate }}</h4>
              <div class="f-lang-row">
                <button class="f-lang-btn" [class.active]="currentLang === 'fr'" (click)="setLang('fr')">
                  🇫🇷 {{ 'lang.switch_to_fr' | translate }}
                </button>
                <button class="f-lang-btn" [class.active]="currentLang === 'en'" (click)="setLang('en')">
                  🇬🇧 {{ 'lang.switch_to_en' | translate }}
                </button>
              </div>

              <h4 class="f-col-title f-social-title">{{ 'footer.follow_us' | translate }}</h4>
              <div class="f-socials">
                <a href="https://facebook.com/eyangestate" target="_blank" rel="noopener" class="f-social-btn" aria-label="Facebook">
                  <lucide-icon [img]="FacebookIcon" class="f-social-icon"></lucide-icon>
                </a>
                <a href="https://instagram.com/eyangestate" target="_blank" rel="noopener" class="f-social-btn" aria-label="Instagram">
                  <lucide-icon [img]="InstagramIcon" class="f-social-icon"></lucide-icon>
                </a>
                <a href="https://twitter.com/eyangestate" target="_blank" rel="noopener" class="f-social-btn" aria-label="Twitter">
                  <lucide-icon [img]="TwitterIcon" class="f-social-icon"></lucide-icon>
                </a>
                <a href="https://wa.me/237675193603" target="_blank" rel="noopener" class="f-social-btn" aria-label="WhatsApp">
                  <lucide-icon [img]="LinkedinIcon" class="f-social-icon"></lucide-icon>
                </a>
              </div>
            </div>

          </div>
        </div>

        <div class="f-mobile-minimal">
          <div class="f-mob-contact">
             <a href="tel:+237675193603">
               <lucide-icon [img]="PhoneIcon" class="f-mob-icon"></lucide-icon>
               +237 675193603
             </a>
             <a href="mailto:eyangestate@gmail.com">
               <lucide-icon [img]="MailIcon" class="f-mob-icon"></lucide-icon>
               eyangestate@gmail.com
             </a>
          </div>
          <div class="f-mob-legal">
             <a routerLink="/privacy" (click)="scrollTop()">{{ 'footer.privacy' | translate }}</a>
             <a routerLink="/terms" (click)="scrollTop()">{{ 'footer.terms' | translate }}</a>
          </div>
        </div>

        <!-- DIVIDER -->
        <div class="f-divider"></div>

        <!-- BOTTOM BAR -->
        <div class="f-bottom">
          <div class="f-bottom-inner">
            <p class="f-rights">{{ 'footer.rights' | translate }}</p>
            <div class="f-legal">
              <a routerLink="/privacy" (click)="scrollTop()">{{ 'footer.privacy' | translate }}</a>
              <span class="f-legal-sep">·</span>
              <a routerLink="/terms" (click)="scrollTop()">{{ 'footer.terms' | translate }}</a>
            </div>
          </div>
        </div>

      </footer>

      <!-- ════ FLOATING SCROLL-TO-TOP ════ -->
      <button
        class="scroll-top-fab"
        [class.visible]="showScrollTop"
        (click)="scrollTop()"
        [title]="'footer.back_top' | translate"
        aria-label="Scroll to top">
        <lucide-icon [img]="ArrowUpIcon" class="fab-icon"></lucide-icon>
      </button>

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
    /* Offset for fixed header (72px desktop → 64px tablet → 60px mobile) */
    .public-content {
      flex:       1;
      padding-top: 72px;
    }
    @media (max-width: 768px) { .public-content { padding-top: 64px; } }
    @media (max-width: 480px) { .public-content { padding-top: 60px; } }

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
      height:        80px;
      width:         auto;
      object-fit:    contain;
      border-radius: 8px;
    }
    .f-logo-text {
      font-size:      1.8rem;
      font-weight:    900;
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
      line-height: 1.4;
    }
    .f-contact-icon {
      display:         inline-flex !important;
      align-items:     center;
      justify-content: center;
      width:           15px !important;
      height:          15px !important;
      min-width:       15px;
      flex-shrink:     0;
      color:           #60A5FA;
    }
    .f-contact-icon svg {
      width:   15px !important;
      height:  15px !important;
      display: block;
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
    .f-social-icon {
      display:         inline-flex !important;
      align-items:     center;
      justify-content: center;
      width:           16px !important;
      height:          16px !important;
    }
    .f-social-icon svg {
      width:   16px !important;
      height:  16px !important;
      display: block;
    }

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
    .f-legal {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 12px;
    }
    .f-legal a {
      color: rgba(255,255,255,0.45);
      transition: color 0.2s;
    }
    .f-legal a:hover { color: #fff; }
    .f-legal-sep { color: rgba(255,255,255,0.15); }

    /* ── MOBILE MINIMAL ───────────────────────────────────────── */
    .f-mobile-minimal {
      display: none;
      flex-direction: column;
      align-items: center;
      padding: 2.5rem 1.5rem;
      gap: 1.5rem;
      text-align: center;
    }
    .f-mob-contact {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .f-mob-contact a {
      color: #fff;
      text-decoration: none;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .f-mob-icon {
      width: 16px;
      height: 16px;
      color: #60A5FA;
    }
    .f-mob-legal {
      display: flex;
      gap: 1.5rem;
      border-top: 1px solid rgba(255,255,255,0.1);
      padding-top: 1.5rem;
      width: 100%;
      justify-content: center;
    }
    .f-mob-legal a {
      color: rgba(255,255,255,0.5);
      text-decoration: none;
      font-size: 13px;
    }

    .f-top-btn {
      width:           34px;
      height:          34px;
      border-radius:   50%;
      background:      rgba(37,99,235,0.2);
      border:          1px solid rgba(59,130,246,0.35);
      color:           #93C5FD;
      display:         inline-flex;
      align-items:     center;
      justify-content: center;
      cursor:          pointer;
      transition:      background 0.2s, transform 0.2s;
      flex-shrink:     0;
    }
    .f-top-btn:hover { background: rgba(37,99,235,0.4); transform: translateY(-2px); }
    .f-top-icon {
      display:         inline-flex !important;
      align-items:     center;
      justify-content: center;
      width:           15px !important;
      height:          15px !important;
    }
    .f-top-icon svg { width: 15px !important; height: 15px !important; display: block; }

    /* ── FLOATING SCROLL-TO-TOP FAB ───────────────────────────── */
    .scroll-top-fab {
      position:        fixed;
      bottom:          2rem;
      right:           2rem;
      z-index:         999;
      width:           46px;
      height:          46px;
      border-radius:   50%;
      background:      linear-gradient(135deg, #2563EB, #1D4ED8);
      border:          none;
      color:           #fff;
      display:         inline-flex;
      align-items:     center;
      justify-content: center;
      cursor:          pointer;
      box-shadow:      0 4px 20px rgba(37,99,235,0.45);
      opacity:         0;
      transform:       translateY(16px) scale(0.85);
      pointer-events:  none;
      transition:      opacity 0.3s cubic-bezier(.4,0,.2,1),
                       transform 0.3s cubic-bezier(.4,0,.2,1),
                       background 0.2s, box-shadow 0.2s;
    }
    .scroll-top-fab.visible {
      opacity:        1;
      transform:      translateY(0) scale(1);
      pointer-events: auto;
    }
    .scroll-top-fab:hover {
      background:  linear-gradient(135deg, #1D4ED8, #1E40AF);
      box-shadow:  0 6px 28px rgba(37,99,235,0.6);
      transform:   translateY(-3px) scale(1.05);
    }
    .scroll-top-fab:active { transform: translateY(0) scale(0.96); }
    .fab-icon {
      display:         inline-flex !important;
      align-items:     center;
      justify-content: center;
      width:           20px !important;
      height:          20px !important;
    }
    .fab-icon svg { width: 20px !important; height: 20px !important; display: block; }

    @media (max-width: 480px) {
      .scroll-top-fab { bottom: 1.25rem; right: 1.25rem; width: 40px; height: 40px; }
    }

    /* ── RESPONSIVE ───────────────────────────────────────────── */
    @media (max-width: 1024px) {
      .footer-grid { grid-template-columns: 1.5fr 1fr 1fr; }
      .f-col:last-child { grid-column: 1 / -1; }
      .f-lang-row { flex-direction: row; }
    }
    @media (max-width: 768px) {
      .footer-top { padding: 3.5rem 1.5rem 2.5rem; }
      .footer-grid { grid-template-columns: 1fr 1fr; gap: 2.5rem; }
      .f-brand { grid-column: 1 / -1; text-align: center; }
      .f-logo { justify-content: center; }
      .f-tagline { margin: 0 auto 1.5rem; }
      .f-contact { align-items: center; }
      .f-col:last-child { grid-column: unset; }
      .f-divider { margin: 0 1.5rem; }
      .f-bottom { padding: 1.5rem; }
      .f-bottom-inner { flex-direction: column; text-align: center; gap: 1rem; }
    }
    @media (max-width: 480px) {
      .footer-top, .f-divider, .f-bottom { display: none; }
      .f-mobile-minimal { display: flex; }
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
  showScrollTop = false;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.showScrollTop = window.scrollY > 300;
  }

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

  scrollToSection(name: string): void {
    const el = document.querySelector(`.${name}-section`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}




