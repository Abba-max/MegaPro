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
  ArrowLeft, Eye, EyeOff, Upload, CheckCircle, Check
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

  // Track whether we are on the home page so scroll-to links know to navigate first
  isHomePage = false;

  // Notifications
  notifications: AppNotification[] = [];
  unreadCount = 0;

  // Login form
  loginEmail = '';
  loginPassword = '';
  loginError = '';

  // Signup form
  signupStep = 1;
  showPassword = false;
  idCardPreview: string | null = null;

  signupForm = {
    firstName: '', lastName: '', email: '',
    phone: '', password: '', username: '',
    address: '', idCardFile: null as File | null,
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

    // Detect current route so we can decide whether to scroll or navigate
    this.isHomePage = this.router.url === '/' || this.router.url === '';
    this.subs.push(
      this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
        this.isHomePage = e.urlAfterRedirects === '/' || e.urlAfterRedirects === '';
      }),

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
    if (diff < 1) return this.currentLang === 'fr' ? 'À l\'instant' : 'Just now';
    if (diff < 60) return this.currentLang === 'fr' ? `Il y a ${diff} min` : `${diff} min ago`;
    const h = Math.floor(diff / 60);
    if (h < 24) return this.currentLang === 'fr' ? `Il y a ${h}h` : `${h}h ago`;
    return d.toLocaleDateString(this.currentLang === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short' });
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
  closeSignup(): void {
    this.showSignupModal = false;
    this.signupError = '';
    this.signupStep = 1;
    this.showPassword = false;
    this.idCardPreview = null;
    this.resetSignupForm();
  }
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
          this.notifService.success(
            this.currentLang === 'fr' ? 'Connexion réussie' : 'Login successful',
            this.currentLang === 'fr' ? `Bienvenue, ${user!.name} !` : `Welcome, ${user!.name}!`
          );
          this.router.navigate([user!.role === 'Admin' ? '/admin/overview' : '/dashboard']);
        });
      },
      error: (err: any) => {
        this.isLoggingIn = false;
        // Show the exact Django error if available, otherwise generic message
        const detail = err?.error?.detail || err?.error?.non_field_errors?.[0];
        this.loginError = detail
          ?? (this.currentLang === 'fr'
            ? 'Email ou mot de passe incorrect.'
            : 'Invalid email or password.');
      }
    });
  }

  // ── Password strength ──────────────────────────────────────────
  get passwordStrength(): { level: string; label: string; pct: number } {
    const pw = this.signupForm.password;
    if (!pw) return { level: 'empty', label: '', pct: 0 };
    let score = 0;
    if (pw.length >= 8)             score++;
    if (/[A-Z]/.test(pw))           score++;
    if (/[0-9]/.test(pw))           score++;
    if (/[^A-Za-z0-9]/.test(pw))   score++;
    const levels = [
      { level: 'weak',   label: 'Faible',    pct: 25 },
      { level: 'fair',   label: 'Moyen',     pct: 50 },
      { level: 'good',   label: 'Bien',      pct: 75 },
      { level: 'strong', label: 'Fort',      pct: 100 },
    ];
    return levels[Math.max(0, score - 1)];
  }

  // ── Step navigation ────────────────────────────────────────────
  nextStep(): void {
    this.signupError = '';
    if (this.signupStep === 1) {
      if (!this.signupForm.email || !this.signupForm.username || !this.signupForm.password) {
        this.signupError = 'Veuillez remplir tous les champs obligatoires.';
        return;
      }
      this.signupStep = 2;
    } else if (this.signupStep === 2) {
      if (!this.signupForm.firstName || !this.signupForm.lastName) {
        this.signupError = 'Veuillez renseigner votre prénom et nom.';
        return;
      }
      if (this.signupForm.accountType === 'Owner') {
        this.signupStep = 3;
      } else {
        this.handleSignup();
      }
    }
  }

  prevStep(): void {
    if (this.signupStep > 1) this.signupStep--;
    this.signupError = '';
  }

  // ── ID card upload ─────────────────────────────────────────────
  onIdCardChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.setIdCardFile(file);
  }

  onIdCardDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setIdCardFile(file);
  }

  private setIdCardFile(file: File): void {
    if (file.size > 5 * 1024 * 1024) {
      this.signupError = 'Le fichier dépasse la taille maximale de 5 Mo.';
      return;
    }
    this.signupForm.idCardFile = file;
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => { this.idCardPreview = e.target?.result as string; };
      reader.readAsDataURL(file);
    } else {
      this.idCardPreview = null;
    }
  }

  removeIdCard(): void {
    this.signupForm.idCardFile = null;
    this.idCardPreview = null;
  }

  handleSignup(): void {
    this.signupError = '';
    const f = this.signupForm;

    if (f.accountType === 'Owner' && !f.idCardFile) {
      this.signupError = 'Veuillez télécharger votre pièce d\'identité.';
      return;
    }

    this.isSigningUp = true;

    // Build FormData so the id_card image can be sent as multipart
    const formData = new FormData();
    formData.append('email',      f.email);
    formData.append('username',   f.username);
    formData.append('password',   f.password);
    formData.append('first_name', f.firstName);
    formData.append('last_name',  f.lastName);
    formData.append('phone',      f.phone);
    formData.append('role',       f.accountType);
    if (f.address)    formData.append('address', f.address);
    if (f.idCardFile) formData.append('id_card', f.idCardFile, f.idCardFile.name);

    this.authService.registerFormData(formData).subscribe({
      next: () => {
        this.closeSignup();
        this.authService.currentUser$.pipe(filter(u => u !== null), take(1)).subscribe(user => {
          this.isSigningUp = false;
          this.notifService.success(
            this.currentLang === 'fr' ? 'Compte créé !' : 'Account created!',
            this.currentLang === 'fr' ? `Bienvenue, ${user!.name} !` : `Welcome, ${user!.name}!`
          );
          this.router.navigate([user!.role === 'Admin' ? '/admin/overview' : '/dashboard']);
        });
      },
      error: (err: any) => {
        this.isSigningUp = false;
        const errors = err?.error;
        if (errors && typeof errors === 'object') {
          const messages = Object.entries(errors)
            .map(([k, v]: [string, any]) => {
              const label: Record<string, string> = {
                email: 'Email', username: 'Nom d\'utilisateur',
                password: 'Mot de passe', id_card: 'Pièce d\'identité'
              };
              return `${label[k] ?? k} : ${Array.isArray(v) ? v[0] : v}`;
            }).join(' | ');
          this.signupError = messages;
        } else {
          this.signupError = this.currentLang === 'fr'
            ? 'Erreur lors de l\'inscription.'
            : 'Registration error.';
        }
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
      phone: '', password: '', username: '',
      address: '', idCardFile: null,
      accountType: 'Student'
    };
  }
}