// src/app/components/header/header.component.ts
import { Component, Input, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
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
  ArrowLeft   // ← ADDED
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
  readonly ArrowLeftIcon = ArrowLeft;  // ← ADDED

  // User state
  currentUser: User | null = null;
  showMenu = false;
  showLoginModal = false;
  showSignupModal = false;
  showMobileMenu = false;
  showNotifPanel = false;
  isLoggingIn = false;
  isSigningUp = false;
  currentLang = 'fr';

  // Notifications
  notifications: AppNotification[] = [];
  unreadCount = 0;

  // Login form
  loginEmail = '';
  loginPassword = '';
  loginError = '';

  // Signup form
  signupForm = {
    firstName: '', lastName: '', email: '',
    phone: '', password: '',
    accountType: 'Student' as 'Student' | 'Parent' | 'Owner'
  };
  signupError = '';

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

    this.subs.push(
      this.authService.currentUser$.subscribe(u => { this.currentUser = u; }),

      this.authService.showLoginModal$.subscribe(show => {
        this.showLoginModal = show;
        if (!show) { this.loginError = ''; this.loginEmail = ''; this.loginPassword = ''; }
      }),

      this.notifService.notifications$.subscribe(n => {
        this.notifications = n;
        this.unreadCount = this.notifService.unreadCount;
      })
    );
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  // ── Language ───────────────────────────────────────────────────
  toggleLang(): void {
    this.currentLang = this.currentLang === 'fr' ? 'en' : 'fr';
    this.translate.use(this.currentLang);
    localStorage.setItem('lang', this.currentLang);
  }

  scrollTo(id: string): void {
    document.querySelector('.' + id + '-section')?.scrollIntoView({ behavior: 'smooth' });
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

  toggleMobileMenu(): void { this.showMobileMenu = !this.showMobileMenu; }
  closeMobileMenu(): void { this.showMobileMenu = false; }

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
    if (diff < 1) return 'À l\'instant';
    if (diff < 60) return `Il y a ${diff} min`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `Il y a ${h}h`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  // ── Auth ───────────────────────────────────────────────────────
  onLogout(): void {
    this.authService.logout();
    this.showMenu = false;
    this.router.navigate(['/']);
  }

  openLogin(): void { this.authService.openLogin(); }
  closeLogin(): void { this.authService.closeLogin(); }
  openSignup(): void { this.showSignupModal = true; this.authService.closeLogin(); }
  closeSignup(): void { this.showSignupModal = false; this.signupError = ''; this.resetSignupForm(); }
  switchToSignup(): void { this.closeLogin(); this.openSignup(); }
  switchToLogin(): void { this.closeSignup(); this.openLogin(); }

  handleLogin(): void {
    this.loginError = '';
    if (!this.loginEmail || !this.loginPassword) {
      this.loginError = this.currentLang === 'fr'
        ? 'Veuillez remplir tous les champs.' : 'Please fill in all fields.';
      return;
    }
    this.isLoggingIn = true;
    this.authService.login(this.loginEmail, this.loginPassword).subscribe({
      next: () => {
        this.authService.closeLogin();
        this.loginEmail = ''; this.loginPassword = '';
        this.authService.currentUser$.pipe(filter(u => u !== null), take(1)).subscribe(user => {
          this.isLoggingIn = false;
          this.notifService.success('Connexion réussie', `Bienvenue, ${user!.name} !`);
          this.router.navigate([user!.role === 'Admin' ? '/admin/overview' : '/dashboard']);
        });
      },
      error: () => {
        this.isLoggingIn = false;
        this.loginError = this.currentLang === 'fr'
          ? 'Email ou mot de passe incorrect.' : 'Invalid email or password.';
      }
    });
  }

  handleSignup(): void {
    this.signupError = '';
    const f = this.signupForm;
    if (!f.firstName || !f.lastName || !f.email || !f.password) {
      this.signupError = this.currentLang === 'fr'
        ? 'Veuillez remplir tous les champs obligatoires.'
        : 'Please fill in all required fields.';
      return;
    }
    this.isSigningUp = true;
    this.authService.register({
      email: f.email, password: f.password,
      firstName: f.firstName, lastName: f.lastName,
      phone: f.phone, accountType: f.accountType
    }).subscribe({
      next: () => {
        this.closeSignup();
        this.authService.currentUser$.pipe(filter(u => u !== null), take(1)).subscribe(user => {
          this.isSigningUp = false;
          this.notifService.success('Compte créé !', `Bienvenue, ${user!.name} !`);
          this.router.navigate([user!.role === 'Admin' ? '/admin/overview' : '/dashboard']);
        });
      },
      error: (err: any) => {
        this.isSigningUp = false;
        this.signupError = err?.error?.email?.[0]
          ?? err?.error?.username?.[0]
          ?? (this.currentLang === 'fr' ? 'Erreur lors de l\'inscription.' : 'Registration error.');
      }
    });
  }

  getRoleLabel(role: string): string {
    const labels: Record<string, Record<string, string>> = {
      fr: { Student: 'Étudiant', Parent: 'Parent', Owner: 'Bailleur', Admin: 'Admin' },
      en: { Student: 'Student', Parent: 'Parent', Owner: 'Owner', Admin: 'Admin' },
    };
    return labels[this.currentLang]?.[role] ?? role;
  }

  private resetSignupForm(): void {
    this.signupForm = {
      firstName: '', lastName: '', email: '',
      phone: '', password: '', accountType: 'Student'
    };
  }
}