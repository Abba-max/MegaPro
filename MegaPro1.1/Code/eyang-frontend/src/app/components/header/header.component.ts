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
  Home, Settings, LayoutDashboard, LogOut, X,
  GraduationCap, Users, Building, Globe
} from 'lucide-angular';
import { AuthService, User } from '../../services/auth.service';

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
  readonly LogOutIcon = LogOut;
  readonly XIcon = X;
  readonly GraduationCapIcon = GraduationCap;
  readonly UsersIcon = Users;
  readonly BuildingIcon = Building;
  readonly GlobeIcon = Globe;

  // State
  currentUser: User | null = null;
  showMenu = false;
  showLoginModal = false;
  showSignupModal = false;
  isLoggingIn = false;
  isSigningUp = false;
  currentLang = 'fr';

  // Login form
  loginEmail = '';
  loginPassword = '';
  loginError = '';

  // Signup form
  signupForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    accountType: 'Student' as 'Student' | 'Parent' | 'Owner'
  };
  signupError = '';

  private subs: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    const saved = localStorage.getItem('lang') ?? 'fr';
    this.currentLang = saved;
    this.translate.use(saved);

    this.subs.push(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
      })
    );

    this.subs.push(
      this.authService.showLoginModal$.subscribe(show => {
        this.showLoginModal = show;
        if (!show) {
          this.loginError = '';
          this.loginEmail = '';
          this.loginPassword = '';
        }
      })
    );
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  // ── Language ──────────────────────────────────────────────────────────
  toggleLang(): void {
    this.currentLang = this.currentLang === 'fr' ? 'en' : 'fr';
    this.translate.use(this.currentLang);
    localStorage.setItem('lang', this.currentLang);
  }

  scrollTo(id: string): void {
    document.querySelector('.' + id + '-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  toggleMenu(): void { this.showMenu = !this.showMenu; }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: Event): void {
    if (!(e.target as HTMLElement).closest('.user-profile-container')) {
      this.showMenu = false;
    }
  }

  onLogout(): void {
    this.authService.logout();
    this.showMenu = false;
    this.router.navigate(['/']);
  }

  // ── Modal controls ────────────────────────────────────────────────────
  openLogin(): void { this.authService.openLogin(); }
  closeLogin(): void { this.authService.closeLogin(); }
  openSignup(): void { this.showSignupModal = true; this.authService.closeLogin(); }
  closeSignup(): void { this.showSignupModal = false; this.signupError = ''; this.resetSignupForm(); }
  switchToSignup(): void { this.closeLogin(); this.openSignup(); }
  switchToLogin(): void { this.closeSignup(); this.openLogin(); }

  // ── Login — wait for fetchMe() to complete before redirecting ─────────
  handleLogin(): void {
    this.loginError = '';
    if (!this.loginEmail || !this.loginPassword) {
      this.loginError = this.currentLang === 'fr'
        ? 'Veuillez remplir tous les champs.'
        : 'Please fill in all fields.';
      return;
    }

    this.isLoggingIn = true;
    this.authService.login(this.loginEmail, this.loginPassword).subscribe({
      next: () => {
        this.authService.closeLogin();
        this.loginEmail = '';
        this.loginPassword = '';

        // Wait for fetchMe() to resolve, then route based on role
        this.authService.currentUser$.pipe(
          filter(user => user !== null),
          take(1)
        ).subscribe(user => {
          this.isLoggingIn = false;
          this.navigateByRole(user!.role);
        });
      },
      error: () => {
        this.isLoggingIn = false;
        this.loginError = this.currentLang === 'fr'
          ? 'Email ou mot de passe incorrect.'
          : 'Invalid email or password.';
      }
    });
  }

  // ── Sign up ───────────────────────────────────────────────────────────
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
      email: f.email,
      password: f.password,
      firstName: f.firstName,
      lastName: f.lastName,
      phone: f.phone,
      accountType: f.accountType,
    }).subscribe({
      next: () => {
        this.closeSignup();
        this.authService.currentUser$.pipe(
          filter(user => user !== null),
          take(1)
        ).subscribe(user => {
          this.isSigningUp = false;
          this.navigateByRole(user!.role);
        });
      },
      error: (err: any) => {
        this.isSigningUp = false;
        const msg = err?.error?.email?.[0]
          ?? err?.error?.username?.[0]
          ?? (this.currentLang === 'fr' ? 'Erreur lors de l\'inscription.' : 'Registration error.');
        this.signupError = msg;
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  /** Route the user to the correct dashboard based on their role */
  private navigateByRole(role: string): void {
    if (role === 'Admin') {
      this.router.navigate(['/admin/overview']);
    } else {
      // Owner → /dashboard shows owner management view
      // Student / Parent → /dashboard shows client/visitor view
      this.router.navigate(['/dashboard']);
    }
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