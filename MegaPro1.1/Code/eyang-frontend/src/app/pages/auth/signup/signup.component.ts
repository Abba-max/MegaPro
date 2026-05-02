import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { 
  LucideAngularModule, Mail, Lock, Eye, EyeOff, User, 
  Phone, ArrowRight, ArrowLeft, Check, GraduationCap, 
  Users, Building, Shield, Upload, X, CheckCircle 
} from 'lucide-angular';
import { AuthService } from '../../../services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, TranslateModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
  // Icons
  readonly MailIcon     = Mail;
  readonly LockIcon     = Lock;
  readonly EyeIcon      = Eye;
  readonly EyeOffIcon   = EyeOff;
  readonly UserIcon     = User;
  readonly PhoneIcon    = Phone;
  readonly ArrowRIcon   = ArrowRight;
  readonly ArrowLIcon   = ArrowLeft;
  readonly CheckIcon    = Check;
  readonly StudentIcon  = GraduationCap;
  readonly ParentIcon   = Users;
  readonly OwnerIcon    = Building;
  readonly ShieldIcon   = Shield;
  readonly UploadIcon   = Upload;
  readonly XIcon        = X;
  readonly SuccessIcon  = CheckCircle;

  // Step state
  currentStep = 1;
  totalSteps = 3;
  isLoading = signal(false);
  error = '';
  showPassword = false;

  // Form data
  signupForm = {
    role: 'Student', // 'Student', 'Parent', 'Owner'
    email: '',
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    idCardFile: null as File | null
  };

  idCardPreview: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService
  ) {}

  // ── Password Strength ───────────────────────────────────────
  passwordStrength = computed(() => {
    const pw = this.signupForm.password;
    if (!pw) return { level: 'none', pct: 0, label: '' };
    
    let score = 0;
    if (pw.length >= 8) score += 25;
    if (/[A-Z]/.test(pw)) score += 25;
    if (/[0-9]/.test(pw)) score += 25;
    if (/[^A-Za-z0-9]/.test(pw)) score += 25;

    if (score <= 25) return { level: 'weak', pct: 25, label: this.translate.instant('auth.pw_weak') };
    if (score <= 50) return { level: 'fair', pct: 50, label: this.translate.instant('auth.pw_fair') };
    if (score <= 75) return { level: 'good', pct: 75, label: this.translate.instant('auth.pw_good') };
    return { level: 'strong', pct: 100, label: this.translate.instant('auth.pw_strong') };
  });

  // ── Step Navigation ─────────────────────────────────────────
  nextStep(): void {
    if (this.currentStep === 1) {
      if (!this.signupForm.email || !this.signupForm.username || !this.signupForm.password) {
        this.error = this.translate.instant('auth.error_missing_fields');
        return;
      }
    }

    if (this.currentStep === 2) {
      if (!this.signupForm.firstName || !this.signupForm.lastName) {
        this.error = this.translate.instant('auth.error_missing_fields');
        return;
      }
      
      // If not owner, skip step 3 and submit
      if (this.signupForm.role !== 'Owner') {
        this.handleSignup();
        return;
      }
    }

    this.error = '';
    this.currentStep++;
  }

  prevStep(): void {
    this.error = '';
    this.currentStep--;
  }

  // ── File Handling ───────────────────────────────────────────
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.signupForm.idCardFile = file;
      const reader = new FileReader();
      reader.onload = () => this.idCardPreview = reader.result as string;
      reader.readAsDataURL(file);
    }
  }

  removeFile(): void {
    this.signupForm.idCardFile = null;
    this.idCardPreview = null;
  }

  // ── Submit ──────────────────────────────────────────────────
  handleSignup(): void {
    if (this.signupForm.role === 'Owner' && !this.signupForm.idCardFile) {
        this.error = this.translate.instant('auth.error_id_required');
        return;
    }

    this.isLoading.set(true);
    this.error = '';

    // Prepare FormData
    const fd = new FormData();
    fd.append('username', this.signupForm.username);
    fd.append('email', this.signupForm.email);
    fd.append('password', this.signupForm.password);
    fd.append('first_name', this.signupForm.firstName);
    fd.append('last_name', this.signupForm.lastName);
    fd.append('phone', this.signupForm.phone);
    fd.append('address', this.signupForm.address);
    fd.append('role', this.signupForm.role);
    if (this.signupForm.idCardFile) {
      fd.append('id_card', this.signupForm.idCardFile);
    }

    this.authService.registerFormData(fd).subscribe({
      next: (res) => {
        // Handle success (Verification email sent)
        this.currentStep = 4; // Success step
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        const errors = err.error;
        if (typeof errors === 'object') {
          const firstKey = Object.keys(errors)[0];
          this.error = errors[firstKey][0] || errors[firstKey];
        } else {
          this.error = this.translate.instant('auth.error_signup_failed');
        }
      }
    });
  }
}
