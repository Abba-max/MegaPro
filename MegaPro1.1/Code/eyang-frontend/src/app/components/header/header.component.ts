import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  LucideAngularModule,
  Search,
  Bell,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Home,
  Settings,
  LayoutDashboard,
  LogOut,
  X,
  GraduationCap,
  Users,
  Building
} from 'lucide-angular';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() isPublic = false;
  @Input() isAdmin = false;

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

  currentUser: User | null = null;
  showMenu = false;
  showLoginModal = false;
  showSignupModal = false;

  // Login Form
  loginEmail = '';
  loginPassword = '';
  loginError = '';

  // Signup Form
  signupForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    accountType: 'Student' as 'Student' | 'Parent' | 'Owner'
  };
  signupError = '';

  private loginSub: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.loginSub = this.authService.showLoginModal$.subscribe(show => {
      this.showLoginModal = show;
      if (!show) {
        this.loginError = '';
        this.loginEmail = '';
        this.loginPassword = '';
      }
    });
  }

  ngOnDestroy() {
    if (this.loginSub) {
      this.loginSub.unsubscribe();
    }
  }

  toggleMenu() {
    this.showMenu = !this.showMenu;
  }

  onLogout() {
    this.authService.logout();
    this.showMenu = false;
    this.router.navigate(['/']);
  }

  openLogin() {
    this.authService.openLogin();
  }

  closeLogin() {
    this.authService.closeLogin();
  }

  openSignup() {
    this.showSignupModal = true;
    this.showLoginModal = false;
  }

  closeSignup() {
    this.showSignupModal = false;
    this.signupError = '';
    this.signupForm = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      accountType: 'Student'
    };
  }

  switchToLogin() {
    this.closeSignup();
    this.openLogin();
  }

  switchToSignup() {
    this.closeLogin();
    this.openSignup();
  }

  handleSignup() {
    if (!this.signupForm.firstName || !this.signupForm.lastName || !this.signupForm.email || !this.signupForm.phone || !this.signupForm.password) {
      this.signupError = 'Veuillez remplir tous les champs';
      return;
    }

    // Simulate registration
    const fullName = `${this.signupForm.firstName} ${this.signupForm.lastName}`;
    const initials = `${this.signupForm.firstName[0]}${this.signupForm.lastName[0]}`.toUpperCase();
    
    // Create user based on account type
    const user: User = {
      name: fullName,
      email: this.signupForm.email,
      role: this.signupForm.accountType === 'Student' ? 'Student' : this.signupForm.accountType === 'Parent' ? 'Student' : 'Owner',
      initials: initials
    };

    // Auto-login after signup
    this.authService.setUser(user);
    this.closeSignup();
    
    // Redirect based on role
    if (user.role === 'Admin') {
      this.router.navigate(['/admin/overview']);
    } else if (user.role === 'Owner') {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  handleLogin() {
    if (this.authService.login(this.loginEmail, this.loginPassword)) {
      this.authService.closeLogin();
      // Role-based redirection logic
      if (this.currentUser?.role === 'Admin') {
        this.router.navigate(['/admin/overview']);
      } else if (this.currentUser?.role === 'Owner') {
        this.router.navigate(['/dashboard']);
      } else {
        // Student stays on current page or goes to dashboard
        this.router.navigate(['/dashboard']);
      }
    } else {
      this.loginError = 'Identifiants invalides';
    }
  }
}
