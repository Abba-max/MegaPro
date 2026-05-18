import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule, Users, Search, Loader,
  ToggleLeft, ToggleRight, CheckCircle, XCircle, Info, AlertCircle,
  Plus, Pencil, Trash2, X, Save, Eye, EyeOff, ChevronLeft, ChevronRight
} from 'lucide-angular';
import { EstateService, AdminUser } from '../../services/estate.service';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

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
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule],
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

  private readonly API = environment.apiUrl;

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
      const matchT = !t || u.type.toLowerCase() === t.toLowerCase();
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

  // View Modal state
  showViewModal = false;
  viewUser: AdminUser | null = null;

  // Delete confirm
  showDeleteConfirm = false;
  userToDelete: AdminUser | null = null;

  form: UserForm = this.emptyForm();

  toasts: Toast[] = [];
  private toastCounter = 0;

  constructor(
    private estateService: EstateService,
    private http: HttpClient,
    private translate:     TranslateService
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    this.estateService.getAdminUsers()
      .pipe(catchError(() => { 
        this.showToast(this.translate.instant('admin.error_load'), 'error'); 
        return of([]); 
      }))
      .subscribe(data => {
        const enriched = (data as AdminUser[]).map(u => ({
          ...u,
          initials: u.initials || u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
          color: u.color || this.getRandomColor(u.id)
        }));
        this.allUsers.set(enriched);
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
        const msgKey = res.active ? 'admin.user_activated' : 'admin.user_deactivated';
        this.showToast(
          this.translate.instant(msgKey, { name: user.name }),
          res.active ? 'success' : 'info'
        );
      },
      error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
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
    
    let roleVal: 'Student' | 'Parent' | 'Owner' | 'Admin' = 'Student';
    const t = (user.type || '').toLowerCase();
    if (t === 'proprietaire' || t === 'owner') roleVal = 'Owner';
    else if (t === 'parent') roleVal = 'Parent';
    else if (t === 'admin') roleVal = 'Admin';
    else roleVal = 'Student';

    this.form = {
      username:  user.email.split('@')[0],
      email:     user.email,
      password:  '',
      firstName: nameParts[0] ?? '',
      lastName:  nameParts.slice(1).join(' ') ?? '',
      role:      roleVal,
    };
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  // ── View modal ──────────────────────────────────────────────────────────
  openView(user: AdminUser): void {
    this.viewUser = user;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewUser = null;
  }

  openEditFromView(): void {
    if (this.viewUser) {
      const u = this.viewUser;
      this.closeViewModal();
      this.openEdit(u);
    }
  }

  // ── Save (create or update) ───────────────────────────────────────────
  saveUser(): void {
    if (!this.form.email) {
      this.showToast(this.translate.instant('auth.error_missing_fields'), 'warning'); return;
    }
    if (!this.isEditMode && !this.form.password) {
      this.showToast(this.translate.instant('auth.error_missing_fields'), 'warning'); return;
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
        role:       this.form.role,
      };
      if (this.form.password && this.form.password.trim() !== '') {
        payload.password = this.form.password;
      }

      this.http.patch(`${this.API}/admin/users/${this.editUserId}/update/`, payload, { headers })
        .pipe(catchError(err => {
          this.showToast(err?.error?.detail ?? this.translate.instant('admin.error_load'), 'error');
          this.isSaving.set(false);
          return of(null);
        }))
        .subscribe(res => {
          if (!res) return;
          this.isSaving.set(false);
          this.showModal = false;
          this.showToast(this.translate.instant('admin.housing_update_success'), 'success');
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
      this.http.post(`${this.API}/auth/register/`, payload)
        .pipe(catchError(err => {
          const msg = err?.error?.email?.[0] ?? err?.error?.username?.[0] ?? this.translate.instant('admin.error_load');
          this.showToast(msg, 'error');
          this.isSaving.set(false);
          return of(null);
        }))
        .subscribe(res => {
          if (!res) return;
          this.isSaving.set(false);
          this.showModal = false;
          this.showToast(this.translate.instant('admin.housing_create_success'), 'success');
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

    this.http.delete(`${this.API}/admin/users/${this.userToDelete.id}/delete/`, { headers })
      .pipe(catchError(err => {
        this.showToast(err?.error?.detail ?? this.translate.instant('admin.error_load'), 'error');
        return of(null);
      }))
      .subscribe(res => {
        if (res === null && !this.toasts.find(t => t.type === 'error')) return;
        this.allUsers.update(list => list.filter(u => u.id !== this.userToDelete!.id));
        this.showToast(this.translate.instant('admin.delete_success'), 'success');
        this.cancelDelete();
      });
  }

  get userTypes(): string[] {
    return [...new Set(this.allUsers().map(u => u.type))];
  }

  getRoleLabel(role: string): string {
    if (!role) return 'auth.student';
    const t = role.toLowerCase();
    if (t === 'proprietaire' || t === 'owner') return 'auth.owner';
    if (t === 'etudiant' || t === 'student') return 'auth.student';
    if (t === 'parent') return 'auth.parent';
    if (t === 'admin') return 'auth.role_badge_admin';
    if (t === 'resident') return 'auth.resident';
    if (t === 'visiteur' || t === 'visitor') return 'auth.visitor';
    return role; // Fallback to raw string if no translation key
  }

  private getRandomColor(id: number): string {
    const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];
    return colors[id % colors.length];
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




