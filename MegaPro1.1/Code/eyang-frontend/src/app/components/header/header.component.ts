import { Component, Input, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideAngularModule,
  Search, Bell, MessageSquare, ChevronDown, ChevronRight,
  Home, Settings, LayoutDashboard, X,
  GraduationCap, Users, Building, Globe,
  CheckCheck, Trash2, MessageCircle, Star, Calendar, Shield, Info,
  ArrowLeft, Eye, EyeOff, Upload, CheckCircle, Check, MapPin
} from 'lucide-angular';
import { AuthService, User } from '../../services/auth.service';
import { NotificationService, AppNotification } from '../../services/notification.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule, FormsModule, TranslateModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() isPublic = false;
  @Input() isAdmin = false;

  // Icons
  readonly SearchIcon = Search;
  readonly BellIcon = Bell;
  readonly MessageIcon = MessageSquare;
  readonly ChevronDownIcon = ChevronDown;
  readonly ChevronRightIcon = ChevronRight;
  readonly HomeIcon = Home;
  readonly SettingsIcon = Settings;
  readonly DashboardIcon = LayoutDashboard;
  readonly XIcon = X;
  readonly GraduationCapIcon = GraduationCap;
  readonly UsersIcon = Users;
  readonly BuildingIcon = Building;
  readonly GlobeIcon = Globe;
  readonly CheckCheckIcon = CheckCheck;
  readonly Trash2Icon = Trash2;
  readonly MessageCircleIcon = MessageCircle;
  readonly StarIcon = Star;
  readonly CalendarIcon = Calendar;
  readonly ShieldIcon = Shield;
  readonly InfoIcon = Info;
  readonly ArrowLeftIcon = ArrowLeft;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly UploadIcon = Upload;
  readonly CheckCircleIcon = CheckCircle;
  readonly CheckIcon = Check;
  readonly MapPinIcon = MapPin;

  // User state
  currentUser: User | null = null;
  showMenu = false;
  showMobileMenu = false;
  showNotifPanel = false;
  currentLang = 'fr';

  // Track whether we are on the home page so scroll-to links know to navigate first
  isHomePage = false;

  // Notifications
  notifications: AppNotification[] = [];
  unreadCount = 0;

  private subs: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private notifService: NotificationService,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    const saved = localStorage.getItem('lang') ?? 'fr';
    this.currentLang = saved;
    this.translate.use(saved);

    // Detect current route so we can decide whether to scroll or navigate
    this.isHomePage = this.router.url === '/' || this.router.url === '';
    this.subs.push(
      this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
        this.isHomePage = e.urlAfterRedirects === '/' || e.urlAfterRedirects === '';
        // Close mobile drawer and restore scroll on every navigation
        this.showMobileMenu = false;
        document.body.style.overflow = '';
      }),

      this.authService.currentUser$.subscribe(u => { this.currentUser = u; }),

      this.notifService.notifications$.subscribe(n => {
        this.notifications = n;
        this.unreadCount = this.notifService.unreadCount;
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    // Always restore scroll when component is destroyed
    document.body.style.overflow = '';
  }

  // ── Language ───────────────────────────────────────────────────
  toggleLang(): void {
    this.currentLang = this.currentLang === 'fr' ? 'en' : 'fr';
    this.translate.use(this.currentLang);
    localStorage.setItem('lang', this.currentLang);
  }

  /**
   * If we are already on the home page, scroll to the section immediately.
   * If we are on any other page (e.g. /contact), navigate to home first and
   * then scroll after the navigation completes.
   */
  scrollTo(id: string): void {
    const selector = '.' + id + '-section';
    if (this.isHomePage) {
      document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      this.router.navigate(['/']).then(() => {
        // Give Angular a tick to render the home component before scrolling
        setTimeout(() => {
          document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      });
    }
  }

  toggleMenu(): void {
    this.showMenu = !this.showMenu;
    this.showNotifPanel = false;
  }

  toggleNotifPanel(): void {
    this.showNotifPanel = !this.showNotifPanel;
    this.showMenu = false;
    if (this.showNotifPanel) this.notifService.markAllRead();
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
    document.body.style.overflow = this.showMobileMenu ? 'hidden' : '';
  }

  closeMobileMenu(): void {
    this.showMobileMenu = false;
    document.body.style.overflow = '';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: Event): void {
    const t = e.target as HTMLElement;
    if (!t.closest('.user-profile-container')) this.showMenu = false;
    if (!t.closest('.notif-container')) this.showNotifPanel = false;
    if (!t.closest('.hamburger-btn') && !t.closest('.mobile-nav-drawer')) {
      this.showMobileMenu = false;
    }
  }

  // ── Notifications ──────────────────────────────────────────────
  onNotifClick(n: AppNotification): void {
    this.notifService.markRead(n.id);
    this.showNotifPanel = false;
    if (n.link) this.router.navigate([n.link]);
  }

  clearAllNotifs(): void { this.notifService.clearAll(); }

  getNotifIcon(type: AppNotification['type']): string {
    const map: Record<string, string> = {
      new_message: '💬', new_booking: '📋',
      new_review: '⭐', verification_status: '🛡️',
      new_contact: '📩', info: 'ℹ️'
    };
    return map[type] ?? 'ℹ️';
  }

  formatNotifTime(dateStr: string): string {
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return this.currentLang === 'fr' ? 'À l\'instant' : 'Just now';
    if (diff < 60) return this.currentLang === 'fr' ? `Il y a ${diff} min` : `${diff} min ago`;
    const h = Math.floor(diff / 60);
    if (h < 24) return this.currentLang === 'fr' ? `Il y a ${h}h` : `${h}h ago`;
    return d.toLocaleDateString(this.currentLang === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short' });
  }

  // ── Auth ───────────────────────────────────────────────────────
  openLogin(): void { this.router.navigate(['/login']); }

  onLogout(): void {
    this.authService.logout();
    this.showMenu = false;
    this.router.navigate(['/']);
  }

  getRoleLabel(role: string): string {
    const labels: Record<string, Record<string, string>> = {
      fr: { Student: 'Étudiant', Parent: 'Parent', Owner: 'Bailleur', Admin: 'Admin' },
      en: { Student: 'Student', Parent: 'Parent', Owner: 'Owner', Admin: 'Admin' },
    };
    return labels[this.currentLang]?.[role] ?? role;
  }
}




