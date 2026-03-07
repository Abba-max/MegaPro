import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule, Mail, Phone, Trash2, Search,
  Loader, CheckCircle, XCircle, Info, AlertCircle
} from 'lucide-angular';
import { EstateService, ContactRequest } from '../../services/estate.service';
import { catchError, of } from 'rxjs';

export interface Toast { id: number; type: 'success'|'error'|'info'|'warning'; message: string; }

@Component({
  selector: 'app-admin-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
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

  isLoading    = true;
  allContacts: ContactRequest[] = [];
  filtered:    ContactRequest[] = [];
  searchQuery  = '';

  toasts: Toast[] = [];
  private toastCounter = 0;

  constructor(private estateService: EstateService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading = true;
    this.estateService.getAdminContacts()
      .pipe(catchError(() => of([])))
      .subscribe(data => {
        this.allContacts = data as ContactRequest[];
        this.applyFilter();
        this.isLoading = false;
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
    if (!confirm(`Supprimer la demande de "${contact.name}" ?`)) return;
    this.estateService.deleteAdminContact(contact.id!).subscribe({
      next: () => {
        this.allContacts = this.allContacts.filter(c => c.id !== contact.id);
        this.applyFilter();
        this.showToast('Demande supprimée.', 'info');
      },
      error: () => this.showToast('Erreur lors de la suppression.', 'error')
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