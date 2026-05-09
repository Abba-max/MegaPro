import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Calendar, Loader, Phone, Trash2, Search, CheckCircle, XCircle, Info, AlertCircle, Eye, FileText } from 'lucide-angular';
import { EstateService, Reservation } from '../../services/estate.service';
import { catchError, of } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export interface Toast { id: number; type: 'success'|'error'|'info'|'warning'; message: string; }

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule],
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
  readonly EyeIcon         = Eye;
  readonly FileIcon        = FileText;

  isLoading    = signal(true);
  allBookings: Reservation[] = [];
  filtered:    Reservation[] = [];
  searchQuery  = '';
  statusFilter = 'ALL';

  toasts: Toast[]      = [];
  private toastCounter = 0;

  // View Modal state
  showViewModal = false;
  viewBooking: Reservation | null = null;

  constructor(
    private estateService: EstateService,
    private translate:     TranslateService
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    // Uses the admin endpoint — returns ALL bookings, not just owner's
    this.estateService.getUnifiedReservations('admin')
      .subscribe(data => {
        this.allBookings = data;
        this.applyFilter();
        this.isLoading.set(false);
      });
  }

  applyFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    const s = this.statusFilter;

    this.filtered = this.allBookings.filter(b => {
      const matchSearch = !q || (
        (b.client_name || '').toLowerCase().includes(q) ||
        (b.estate_name || '').toLowerCase().includes(q) ||
        (b.client_phone || '').includes(q)
      );
      const matchStatus = s === 'ALL' || b.status === s;
      return matchSearch && matchStatus;
    });
  }

  getPendingPayments(): Reservation[] {
    // For Reservations, 'PENDING' might need a receipt check if implemented, 
    // otherwise we use the status field.
    return this.allBookings.filter(b => b.status === 'PENDING');
  }

  openView(booking: Reservation): void {
    this.viewBooking = booking;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewBooking = null;
  }

  accept(booking: Reservation): void {
    if (!booking.id) return;
    this.estateService.acceptReservation(booking.id).subscribe({
      next: (updated) => {
        const idx = this.allBookings.findIndex(b => b.id === booking.id);
        if (idx !== -1) {
          this.allBookings[idx] = updated;
          this.applyFilter();
        }
        this.showToast(this.translate.instant('dashboard.status_accepted_toast'), 'success');
      },
      error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
    });
  }

  reject(booking: Reservation): void {
    if (!booking.id) return;
    this.estateService.rejectReservation(booking.id).subscribe({
      next: (updated) => {
        const idx = this.allBookings.findIndex(b => b.id === booking.id);
        if (idx !== -1) {
          this.allBookings[idx] = updated;
          this.applyFilter();
        }
        this.showToast(this.translate.instant('dashboard.status_rejected_toast'), 'warning');
      },
      error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
    });
  }

  verifyPayment(booking: Reservation, action: 'approve' | 'reject'): void {
    if (!booking.id) return;
    // For new architecture, verification might involve accepting or a separate call
    // If there's no direct equivalent, we use accept/reject for now
    if (action === 'approve') {
      this.accept(booking);
    } else {
      this.reject(booking);
    }
  }

  delete(booking: Reservation): void {
    const msg = this.translate.instant('admin.delete_confirm_booking', { name: booking.client_name });
    if (!confirm(msg || `Supprimer la réservation de "${booking.client_name}" ?`)) return;
    // Use cancel or delete if service provides it
    this.estateService.cancelReservation(booking.id).subscribe({
      next: () => {
        this.allBookings = this.allBookings.filter(b => b.id !== booking.id);
        this.applyFilter();
        this.showToast(this.translate.instant('admin.delete_success'), 'info');
      },
      error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
    });
  }

  openBill(booking: Reservation): void {
    this.estateService.openBill(booking);
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




