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
