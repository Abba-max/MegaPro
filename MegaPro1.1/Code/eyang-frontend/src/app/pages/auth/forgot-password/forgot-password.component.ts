import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Mail, ArrowLeft, ArrowRight } from 'lucide-angular';
import { AuthService } from '../../../services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, TranslateModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['../login/login.component.css'] // Reuse login styles
})
export class ForgotPasswordComponent {
  readonly MailIcon     = Mail;
  readonly ArrowLeftIcon = ArrowLeft;
  readonly ArrowRightIcon = ArrowRight;

  email = '';
  error = '';
  successMessage = '';
  isLoading = signal(false);

  constructor(
    private authService: AuthService,
    private translate: TranslateService
  ) {}

  handleSubmit(): void {
    if (!this.email) {
      this.error = this.translate.instant('auth.error_missing_email');
      return;
    }

    this.error = '';
    this.successMessage = '';
    this.isLoading.set(true);

    this.authService.forgotPassword(this.email).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage = res.message || this.translate.instant('auth.forgot_password_success');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error = err.error?.error || this.translate.instant('auth.error_generic');
      }
    });
  }
}




