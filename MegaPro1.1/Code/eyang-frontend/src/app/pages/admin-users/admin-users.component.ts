import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule, Users, Search, Loader,
  ToggleLeft, ToggleRight, CheckCircle, XCircle, Info, AlertCircle,
  Plus, Pencil, Trash2, X, Save, Eye, EyeOff, ChevronLeft, ChevronRight
} from 'lucide-angular';
import { EstateService, AdminUser } from '../../services/estate.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, of } from 'rxjs';

export interface Toast { id: number; type: 'success'|'error'|'info'|'warning'; message: string; }

interface UserForm {
  username: string;
  email:    string;
  password: string;
  firstName: string;
  lastName:  string;
  role:     'Student' | 'Parent' | 'Owner' | 'Admin';
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css'
})
export class AdminUsersComponent implements OnInit {
  readonly UsersIcon       = Users;
  readonly SearchIcon      = Search;
  readonly LoaderIcon      = Loader;
  readonly ToggleOnIcon    = ToggleRight;
  readonly ToggleOffIcon   = ToggleLeft;
  readonly CheckCircleIcon = CheckCircle;
  readonly XCircleIcon     = XCircle;
  readonly InfoIcon        = Info;
  readonly AlertIcon       = AlertCircle;
  readonly PlusIcon        = Plus;
  readonly PencilIcon      = Pencil;
  readonly TrashIcon       = Trash2;
  readonly CloseIcon       = X;
  readonly SaveIcon        = Save;
  readonly EyeIcon         = Eye;
  readonly EyeOffIcon      = EyeOff;
  readonly PrevIcon        = ChevronLeft;
  readonly NextIcon        = ChevronRight;

  private readonly API = 'http://localhost:8000';

  isLoading   = signal(true);
  allUsers    = signal<AdminUser[]>([]);
  searchQuery = signal('');
  filterType  = signal('');

  // Pagination state
  currentPage = signal(1);
  pageSize    = signal(10);

  filtered = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const t = this.filterType();
    return this.allUsers().filter(u => {
      const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchT = !t || u.type === t;
      return matchQ && matchT;
    });
  });

  totalPages = computed(() => Math.ceil(this.filtered().length / this.pageSize()));

  pagedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  // Modal state
  showModal    = false;
  isEditMode   = false;
  isSaving     = signal(false);
  showPassword = false;
  editUserId: number | null = null;

  // Delete confirm
  showDeleteConfirm = false;
  userToDelete: AdminUser | null = null;

  form: UserForm = this.emptyForm();

  toasts: Toast[] = [];
  private toastCounter = 0;

  constructor(
    private estateService: EstateService,
    private http: HttpClient
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    this.estateService.getAdminUsers()
      .pipe(catchError(() => { this.showToast('Erreur de chargement.', 'error'); return of([]); }))
      .subscribe(data => {
        this.allUsers.set(data as AdminUser[]);
        this.isLoading.set(false);
      });
  }

  onSearch(val: string): void {
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  onFilter(val: string): void {
    this.filterType.set(val);
    this.currentPage.set(1);
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p);
  }

  nextPage(): void { if (this.currentPage() < this.totalPages()) this.currentPage.update(n => n + 1); }
  prevPage(): void { if (this.currentPage() > 1) this.currentPage.update(n => n - 1); }

  // ── Toggle active ──────────────────────────────────────────────────────
  toggle(user: AdminUser): void {
    this.estateService.toggleUser(user.id).subscribe({
      next: res => {
        user.active = res.active;
        this.showToast(
          res.active ? `${user.name} activé.` : `${user.name} désactivé.`,
          res.active ? 'success' : 'info'
        );
      },
      error: () => this.showToast('Erreur lors de la mise à jour.', 'error')
    });
  }

  // ── Open create modal ─────────────────────────────────────────────────
  openCreate(): void {
    this.isEditMode   = false;
    this.editUserId   = null;
    this.form         = this.emptyForm();
    this.showPassword = false;
    this.showModal    = true;
  }

  // ── Open edit modal ───────────────────────────────────────────────────
  openEdit(user: AdminUser): void {
    this.isEditMode   = true;
    this.editUserId   = user.id;
    this.showPassword = false;
    const nameParts   = user.name.split(' ');
    this.form = {
      username:  user.email.split('@')[0],
      email:     user.email,
      password:  '',
      firstName: nameParts[0] ?? '',
      lastName:  nameParts.slice(1).join(' ') ?? '',
      role:      (user.type as any) ?? 'Student',
    };
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  // ── Save (create or update) ───────────────────────────────────────────
  saveUser(): void {
    if (!this.form.email) {
      this.showToast('Email obligatoire.', 'warning'); return;
    }
    if (!this.isEditMode && !this.form.password) {
      this.showToast('Mot de passe obligatoire pour un nouvel utilisateur.', 'warning'); return;
    }

    this.isSaving.set(true);
    const token   = localStorage.getItem('access_token') ?? '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    if (this.isEditMode && this.editUserId) {
      // PATCH existing user via Django admin endpoint
      const payload: any = {
        first_name: this.form.firstName,
        last_name:  this.form.lastName,
        email:      this.form.email,
      };
      if (this.form.password) payload.password = this.form.password;

      this.http.patch(`${this.API}/api/admin/users/${this.editUserId}/update/`, payload, { headers })
        .pipe(catchError(err => {
          this.showToast(err?.error?.detail ?? 'Erreur de mise à jour.', 'error');
          this.isSaving.set(false);
          return of(null);
        }))
        .subscribe(res => {
          if (!res) return;
          this.isSaving.set(false);
          this.showModal = false;
          this.showToast('Utilisateur mis à jour.', 'success');
          this.load();
        });
    } else {
      // POST new user via register endpoint
      const payload = {
        username:   this.form.username || this.form.email,
        email:      this.form.email,
        password:   this.form.password,
        first_name: this.form.firstName,
        last_name:  this.form.lastName,
        role:       this.form.role,
      };
      this.http.post(`${this.API}/api/auth/register/`, payload)
        .pipe(catchError(err => {
          const msg = err?.error?.email?.[0] ?? err?.error?.username?.[0] ?? 'Erreur de création.';
          this.showToast(msg, 'error');
          this.isSaving.set(false);
          return of(null);
        }))
        .subscribe(res => {
          if (!res) return;
          this.isSaving.set(false);
          this.showModal = false;
          this.showToast('Utilisateur créé avec succès.', 'success');
          this.load();
        });
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────
  confirmDelete(user: AdminUser): void {
    this.userToDelete    = user;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.userToDelete    = null;
    this.showDeleteConfirm = false;
  }

  deleteUser(): void {
    if (!this.userToDelete) return;
    const token   = localStorage.getItem('access_token') ?? '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.delete(`${this.API}/api/admin/users/${this.userToDelete.id}/delete/`, { headers })
      .pipe(catchError(err => {
        this.showToast(err?.error?.detail ?? 'Erreur de suppression.', 'error');
        return of(null);
      }))
      .subscribe(res => {
        if (res === null && !this.toasts.find(t => t.type === 'error')) return;
        this.allUsers.update(list => list.filter(u => u.id !== this.userToDelete!.id));
        this.showToast(`${this.userToDelete!.name} supprimé.`, 'success');
        this.cancelDelete();
      });
  }

  get userTypes(): string[] {
    return [...new Set(this.allUsers().map(u => u.type))];
  }

  private emptyForm(): UserForm {
    return { username: '', email: '', password: '', firstName: '', lastName: '', role: 'Student' };
  }

  dismissToast(id: number): void { this.toasts = this.toasts.filter(t => t.id !== id); }

  showToast(message: string, type: Toast['type'] = 'success'): void {
    const id = ++this.toastCounter;
    this.toasts.push({ id, type, message });
    setTimeout(() => this.dismissToast(id), 4000);
  }
}