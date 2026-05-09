import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule, Mail, Phone, Trash2, Search,
  Loader, CheckCircle, XCircle, Info, AlertCircle, Eye, ChevronLeft, ChevronRight
} from 'lucide-angular';
import { EstateService, ContactRequest } from '../../services/estate.service';
import { catchError, of } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export interface Toast { id: number; type: 'success'|'error'|'info'|'warning'; message: string; }

@Component({
  selector: 'app-admin-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule],
  templateUrl: './admin-contacts.component.html',
  styleUrl: './admin-contacts.component.css'
})
export class AdminContactsComponent implements OnInit {
  readonly MailIcon        = Mail;
  readonly PhoneIcon       = Phone;
  readonly TrashIcon       = Trash2;
  readonly SearchIcon      = Search;
  readonly LoaderIcon      = Loader;
  readonly CheckCircleIcon = CheckCircle;
  readonly XCircleIcon     = XCircle;
  readonly InfoIcon        = Info;
  readonly AlertIcon       = AlertCircle;
  readonly EyeIcon         = Eye;

  readonly PrevIcon        = ChevronLeft;
  readonly NextIcon        = ChevronRight;

  isLoading    = signal(true);
  allContacts  = signal<ContactRequest[]>([]);
  searchQuery  = signal('');

  // Pagination state
  currentPage = signal(1);
  pageSize    = signal(10);

  filtered = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const all = this.allContacts();
    if (!q) return all;
    return all.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.estate_name ?? '').toLowerCase().includes(q) ||
      c.message.toLowerCase().includes(q)
    );
  });

  totalPages = computed(() => Math.ceil(this.filtered().length / this.pageSize()));

  pagedContacts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  toasts: Toast[] = [];
  private toastCounter = 0;

  // View Modal state
  showViewModal = false;
  viewContact: ContactRequest | null = null;

  constructor(
    private estateService: EstateService,
    private translate:     TranslateService
  ) {}

  ngOnInit(): void { this.load(); }

  // ── View modal ──────────────────────────────────────────────────────────
  openView(contact: ContactRequest): void {
    this.viewContact = contact;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewContact = null;
  }

  load(): void {
    this.isLoading.set(true);
    this.estateService.getAdminContacts()
      .pipe(catchError(() => of([])))
      .subscribe(data => {
        this.allContacts.set(data as ContactRequest[]);
        this.isLoading.set(false);
      });
  }

  onSearch(val: string): void {
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p);
  }

  nextPage(): void { if (this.currentPage() < this.totalPages()) this.currentPage.update(n => n + 1); }
  prevPage(): void { if (this.currentPage() > 1) this.currentPage.update(n => n - 1); }


  delete(contact: ContactRequest): void {
    const msg = this.translate.instant('admin.delete_confirm_contact', { name: contact.name });
    if (!confirm(msg || `Supprimer la demande de "${contact.name}" ?`)) return;
    this.estateService.deleteAdminContact(contact.id!).subscribe({
      next: () => {
        this.allContacts.update(list => list.filter(c => c.id !== contact.id));
        this.showToast(this.translate.instant('admin.delete_success'), 'info');
      },
      error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
    });
  }

  formatDate(d: string | undefined): string {
    if (!d) return '–';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
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




