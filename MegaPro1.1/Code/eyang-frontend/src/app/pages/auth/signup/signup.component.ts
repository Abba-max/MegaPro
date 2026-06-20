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

  // ── Step Navigation ─────────────────────────────────────────
  nextStep(): void {
    this.error = '';

    // Validation for Step 1
    if (this.currentStep === 1) {
      if (!this.signupForm.email || !this.signupForm.username || !this.signupForm.password) {
        this.error = this.translate.instant('auth.error_missing_fields') || 'Veuillez remplir tous les champs obligatoires.';
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.signupForm.email)) {
        this.error = 'Veuillez entrer une adresse email valide.';
        return;
      }

      if (this.signupForm.password.length < 8) {
        this.error = this.translate.instant('auth.error_password_too_short') || 'Le mot de passe doit comporter au moins 8 caractères.';
        return;
      }

      this.currentStep = 2;
      return;
    }

    // Validation for Step 2
    if (this.currentStep === 2) {
      if (!this.signupForm.firstName || !this.signupForm.lastName) {
        this.error = this.translate.instant('auth.error_missing_fields') || 'Le prénom et le nom sont requis.';
        return;
      }

      if (this.signupForm.phone && this.signupForm.phone.length < 8) {
        this.error = 'Veuillez entrer un numéro de téléphone valide.';
        return;
      }
      
      // If Student/Parent, Step 2 is final
      if (this.signupForm.role !== 'Owner') {
        this.handleSignup();
        return;
      }
      
      this.currentStep = 3;
      return;
    }

    // Validation for Step 3 (Owner only)
    if (this.currentStep === 3) {
      if (!this.signupForm.idCardFile) {
        this.error = this.translate.instant('auth.error_id_required') || 'La pièce d\'identité est requise pour les propriétaires.';
        return;
      }
      this.handleSignup();
      return;
    }
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
        // Redirection logic: go to home with success flag
        this.isLoading.set(false);
        this.router.navigate(['/'], { queryParams: { registered: 'true' } });
      },
      error: (err) => {
        this.isLoading.set(false);
        const errors = err.error;
        let friendlyMessage = this.translate.instant('auth.error_signup_failed') || 'Une erreur est survenue lors de l\'inscription.';
        
        if (errors && typeof errors === 'object') {
          const firstKey = Object.keys(errors)[0];
          if (firstKey) {
            const firstError = errors[firstKey];
            const rawError = Array.isArray(firstError) ? firstError[0] : firstError;
            
            // Map common backend technical errors to user-friendly messages
            if (rawError.includes('already exists') || rawError.includes('unique')) {
              if (firstKey === 'email') friendlyMessage = 'Cette adresse email est déjà utilisée.';
              else if (firstKey === 'username') friendlyMessage = 'Ce nom d\'utilisateur est déjà pris.';
              else friendlyMessage = 'Ces informations sont déjà utilisées par un autre compte.';
            } else if (rawError.includes('password')) {
              friendlyMessage = 'Le mot de passe ne respecte pas les critères de sécurité.';
            } else {
               friendlyMessage = `Veuillez vérifier le champ: ${firstKey}.`;
            }
          }
        } else if (err.status === 0 || err.status >= 500) {
           friendlyMessage = 'Erreur de connexion au serveur. Veuillez réessayer plus tard.';
        }
        
        this.error = friendlyMessage;
      }
    });
  }

  isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  resendVerification(): void {
    // Logic for resending verification email
    console.log("Resending verification email...");
  }
}




