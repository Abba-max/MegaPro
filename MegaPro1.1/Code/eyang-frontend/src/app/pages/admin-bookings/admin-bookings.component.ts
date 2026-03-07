import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Calendar, Loader, Phone, Trash2, Search, CheckCircle, XCircle, Info, AlertCircle } from 'lucide-angular';
import { EstateService, QuickOrder } from '../../services/estate.service';
import { catchError, of } from 'rxjs';

export interface Toast { id: number; type: 'success'|'error'|'info'|'warning'; message: string; }

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './admin-bookings.component.html',
  styleUrl: './admin-bookings.component.css'
})
export class AdminBookingsComponent implements OnInit {
  readonly CalendarIcon    = Calendar;
  readonly LoaderIcon      = Loader;
  readonly PhoneIcon       = Phone;
  readonly TrashIcon       = Trash2;
  readonly SearchIcon      = Search;
  readonly CheckCircleIcon = CheckCircle;
  readonly XCircleIcon     = XCircle;
  readonly InfoIcon        = Info;
  readonly AlertIcon       = AlertCircle;

  isLoading    = true;
  allBookings: QuickOrder[] = [];
  filtered:    QuickOrder[] = [];
  searchQuery  = '';

  toasts: Toast[]      = [];
  private toastCounter = 0;

  constructor(private estateService: EstateService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading = true;
    // Uses the admin endpoint — returns ALL bookings, not just owner's
    this.estateService.getAdminBookings()
      .pipe(catchError(() => of([])))
      .subscribe(data => {
        this.allBookings = data as QuickOrder[];
        this.applyFilter();
        this.isLoading = false;
      });
  }

  applyFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    this.filtered = q
      ? this.allBookings.filter(b =>
          b.name.toLowerCase().includes(q) ||
          (b.estate_name ?? '').toLowerCase().includes(q) ||
          b.phone.includes(q))
      : [...this.allBookings];
  }

  delete(booking: QuickOrder): void {
    if (!confirm(`Supprimer la réservation de "${booking.name}" ?`)) return;
    this.estateService.deleteAdminBooking(booking.id!).subscribe({
      next: () => {
        this.allBookings = this.allBookings.filter(b => b.id !== booking.id);
        this.applyFilter();
        this.showToast('Réservation supprimée.', 'info');
      },
      error: () => this.showToast('Erreur lors de la suppression.', 'error')
    });
  }

  formatDate(d: string): string {
    if (!d) return '–';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  dismissToast(id: number): void { this.toasts = this.toasts.filter(t => t.id !== id); }

  showToast(message: string, type: Toast['type'] = 'success'): void {
    const id = ++this.toastCounter;
    this.toasts.push({ id, type, message });
    setTimeout(() => this.toasts = this.toasts.filter(t => t.id !== id), 4000);
  }
}