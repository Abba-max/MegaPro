import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule, Mail, Phone, Trash2, Search,
  Loader, CheckCircle, XCircle, Info, AlertCircle, Eye
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

  isLoading    = signal(true);
  allContacts: ContactRequest[] = [];
  filtered:    ContactRequest[] = [];
  searchQuery  = '';

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
        this.allContacts = data as ContactRequest[];
        this.applyFilter();
        this.isLoading.set(false);
      });
  }

  applyFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    this.filtered = q
      ? this.allContacts.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.estate_name ?? '').toLowerCase().includes(q) ||
          c.message.toLowerCase().includes(q))
      : [...this.allContacts];
  }

  delete(contact: ContactRequest): void {
    const msg = this.translate.instant('admin.delete_confirm_contact', { name: contact.name });
    if (!confirm(msg || `Supprimer la demande de "${contact.name}" ?`)) return;
    this.estateService.deleteAdminContact(contact.id!).subscribe({
      next: () => {
        this.allContacts = this.allContacts.filter(c => c.id !== contact.id);
        this.applyFilter();
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