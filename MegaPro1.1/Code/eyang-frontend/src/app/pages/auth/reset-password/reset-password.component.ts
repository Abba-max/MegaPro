import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-angular';
import { AuthService } from '../../../services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, TranslateModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['../login/login.component.css'] // Reuse login styles
})
export class ResetPasswordComponent implements OnInit {
  readonly LockIcon = Lock;
  readonly ArrowLeftIcon = ArrowLeft;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;

  uid = '';
  token = '';
  newPassword = '';
  confirmPassword = '';
  
  showPassword = false;
  showConfirmPassword = false;

  error = '';
  successMessage = '';
  isLoading = signal(false);

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    // Extract uid and token from the URL query params
    this.route.queryParams.subscribe(params => {
      this.uid = params['uid'] || '';
      this.token = params['token'] || '';
    });
  }

  handleSubmit(): void {
    if (!this.uid || !this.token) {
      this.error = this.translate.instant('auth.reset_invalid_link');
      return;
    }

    if (!this.newPassword || !this.confirmPassword) {
      this.error = 'Veuillez remplir tous les champs.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Les mots de passe ne correspondent pas.';
      return;
    }

    if (this.newPassword.length < 8) {
      this.error = 'Le mot de passe doit contenir au moins 8 caractères.';
      return;
    }

    this.error = '';
    this.successMessage = '';
    this.isLoading.set(true);

    this.authService.resetPassword(this.uid, this.token, this.newPassword).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage = res.message || this.translate.instant('auth.reset_success_body');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error = err.error?.error || this.translate.instant('auth.error_generic');
      }
    });
  }
}
