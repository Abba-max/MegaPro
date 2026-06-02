import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, User, Mail, Phone, MapPin, Calendar, Camera, Save, Loader, ArrowLeft } from 'lucide-angular';
import { AuthService, User as AuthUser } from '../../services/auth.service';
import { catchError, of } from 'rxjs';
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

  currentUser: AuthUser | null = null;
  isSaving = signal(false);
  avatarPreview: string | null = null;
  avatarFile: File | null = null;

  // Form fields
  firstName = '';
  lastName = '';
  phone = '';
  address = '';
  bio = '';
  gender = '';
  birthDate = '';

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

  onAvatarChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.avatarFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.avatarPreview = reader.result as string;
      };
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

    if (this.avatarFile) {
      formData.append('avatar', this.avatarFile);
    }

    this.authService.updateProfile(formData).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showToast(this.translate.instant('admin.save_success') || 'Profil enregistré avec succès !', 'success');
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error(err);
        this.showToast('Une erreur est survenue lors de l\'enregistrement.', 'error');
      }
    });
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  showToast(message: string, type: Toast['type'] = 'success'): void {
    const id = ++this.toastCounter;
    this.toasts.push({ id, type, message });
    setTimeout(() => this.dismissToast(id), 4000);
  }
}
