import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-angular';
import { AuthService } from '../../../services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, TranslateModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  readonly MailIcon     = Mail;
  readonly LockIcon     = Lock;
  readonly EyeIcon     = Eye;
  readonly EyeOffIcon  = EyeOff;
  readonly ArrowIcon   = ArrowRight;

  email = '';
  password = '';
  showPassword = false;
  error = '';
  isLoading = signal(false);

  // ── Password Strength ───────────────────────────────────────
  get passwordStrength() {
    if (!this.password) return { level: 'none', pct: 0, label: '' };
    
    let score = 0;
    if (this.password.length >= 8) score += 25;
    if (/[A-Z]/.test(this.password)) score += 25;
    if (/[0-9]/.test(this.password)) score += 25;
    if (/[^A-Za-z0-9]/.test(this.password)) score += 25;

    if (score <= 25) return { level: 'weak', pct: 25, label: this.translate.instant('auth.pw_weak') };
    if (score <= 50) return { level: 'fair', pct: 50, label: this.translate.instant('auth.pw_fair') };
    if (score <= 75) return { level: 'good', pct: 75, label: this.translate.instant('auth.pw_good') };
    return { level: 'strong', pct: 100, label: this.translate.instant('auth.pw_strong') };
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService
  ) {}

  handleLogin(): void {
    if (!this.email || !this.password) {
      this.error = this.translate.instant('auth.error_missing_fields');
      return;
    }

    this.error = '';
    this.isLoading.set(true);

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        // Smooth transition to dashboard
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const detail = err.error?.detail || err.error?.message;
        this.error = detail || this.translate.instant('auth.error_invalid_credentials');
      }
    });
  }
}
