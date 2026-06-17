import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  User, Mail, Phone, MapPin, Calendar, Camera, Save, Loader, ArrowLeft,
  Lock, Eye, EyeOff, ShieldCheck, UserCog, Key
} from 'lucide-angular';
import { AuthService, User as AuthUser } from '../../services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';

export interface Toast { id: number; type: 'success' | 'error'; message: string; }

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  readonly UserIcon = User;
  readonly MailIcon = Mail;
  readonly PhoneIcon = Phone;
  readonly MapPinIcon = MapPin;
  readonly CalendarIcon = Calendar;
  readonly CameraIcon = Camera;
  readonly SaveIcon = Save;
  readonly LoaderIcon = Loader;
  readonly ArrowLeftIcon = ArrowLeft;
  readonly LockIcon = Lock;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly ShieldCheckIcon = ShieldCheck;
  readonly UserCogIcon = UserCog;
  readonly KeyIcon = Key;

  currentUser: AuthUser | null = null;
  activeTab: 'profile' | 'security' = 'profile';

  isSaving = signal(false);
  isChangingPassword = signal(false);
  avatarPreview: string | null = null;
  avatarFile: File | null = null;

  // Profile fields
  firstName = '';
  lastName = '';
  phone = '';
  address = '';
  bio = '';
  gender = '';
  birthDate = '';

  // Password fields
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  showOldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  toasts: Toast[] = [];
  private toastCounter = 0;

  constructor(
    private authService: AuthService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.firstName = user.name.split(' ')[0] || '';
        this.lastName = user.name.split(' ').slice(1).join(' ') || '';
        this.phone = user.phone || '';
        this.address = user.address || '';
        if (user.profile) {
          this.bio = user.profile.bio || '';
          this.gender = user.profile.gender || '';
          this.birthDate = user.profile.birth_date || '';
          this.avatarPreview = user.profile.avatar || null;
        }
      }
    });
  }

  setTab(tab: 'profile' | 'security'): void {
    this.activeTab = tab;
  }

  onAvatarChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.avatarFile = file;
      const reader = new FileReader();
      reader.onload = () => { this.avatarPreview = reader.result as string; };
      reader.readAsDataURL(file);
    }
  }

  saveProfile(): void {
    if (!this.currentUser) return;
    this.isSaving.set(true);

    const formData = new FormData();
    formData.append('first_name', this.firstName);
    formData.append('last_name', this.lastName);
    formData.append('contact', this.phone);
    formData.append('address', this.address);
    formData.append('bio', this.bio);
    formData.append('gender', this.gender);
    formData.append('birth_date', this.birthDate);
    if (this.avatarFile) formData.append('avatar', this.avatarFile);

    this.authService.updateProfile(formData).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showToast('Profil enregistré avec succès !', 'success');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.showToast('Erreur lors de l\'enregistrement.', 'error');
      }
    });
  }

  changePassword(): void {
    if (!this.newPassword || !this.oldPassword) {
      this.showToast('Veuillez remplir tous les champs.', 'error');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.showToast('Les nouveaux mots de passe ne correspondent pas.', 'error');
      return;
    }
    if (this.newPassword.length < 8) {
      this.showToast('Le mot de passe doit contenir au moins 8 caractères.', 'error');
      return;
    }

    this.isChangingPassword.set(true);
    this.authService.changePassword(this.oldPassword, this.newPassword).subscribe({
      next: () => {
        this.isChangingPassword.set(false);
        this.oldPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.showToast('Mot de passe modifié avec succès !', 'success');
      },
      error: (err) => {
        this.isChangingPassword.set(false);
        const msg = err?.error?.detail || 'Erreur lors du changement de mot de passe.';
        this.showToast(msg, 'error');
      }
    });
  }

  get passwordStrength(): { level: number; label: string; color: string } {
    const p = this.newPassword;
    if (!p) return { level: 0, label: '', color: '' };
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { level: 1, label: 'Faible', color: '#ef4444' };
    if (score <= 3) return { level: 2, label: 'Moyen', color: '#f59e0b' };
    return { level: 3, label: 'Fort', color: '#10b981' };
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  showToast(message: string, type: Toast['type'] = 'success'): void {
    const id = ++this.toastCounter;
    this.toasts.push({ id, type, message });
    setTimeout(() => this.dismissToast(id), 4500);
  }
}
