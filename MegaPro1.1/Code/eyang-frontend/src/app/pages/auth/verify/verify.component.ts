import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-angular';
import { AuthService } from '../../../services/auth.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, TranslateModule],
  templateUrl: './verify.component.html',
  styleUrl: './verify.component.css'
})
export class VerifyComponent implements OnInit {
  readonly CheckIcon   = CheckCircle;
  readonly ErrorIcon   = XCircle;
  readonly LoaderIcon  = Loader2;
  readonly ArrowIcon   = ArrowRight;

  status = signal<'loading' | 'success' | 'error'>('loading');
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    const uid = this.route.snapshot.queryParamMap.get('uid');

    if (!token || !uid) {
      this.status.set('error');
      this.errorMessage = 'Lien de vérification invalide ou expiré.';
      return;
    }

    // Call backend to verify
    this.authService.verifyEmail(uid, token).subscribe({
      next: () => {
        this.status.set('success');
      },
      error: (err) => {
        this.status.set('error');
        this.errorMessage = err?.error?.error || 'Lien de vérification invalide ou expiré.';
      }
    });
  }
}




