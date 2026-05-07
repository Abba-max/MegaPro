import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Calendar, Loader, Phone, Trash2, Search, CheckCircle, XCircle, Info, AlertCircle, Eye } from 'lucide-angular';
import { EstateService, QuickOrder } from '../../services/estate.service';
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

  isLoading    = signal(true);
  allBookings: QuickOrder[] = [];
  filtered:    QuickOrder[] = [];
  searchQuery  = '';

  toasts: Toast[]      = [];
  private toastCounter = 0;

  // View Modal state
  showViewModal = false;
  viewBooking: QuickOrder | null = null;

  constructor(
    private estateService: EstateService,
    private translate:     TranslateService
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    // Uses the admin endpoint — returns ALL bookings, not just owner's
    this.estateService.getAdminBookings()
      .pipe(catchError(() => of([])))
      .subscribe(data => {
        this.allBookings = data as QuickOrder[];
        this.applyFilter();
        this.isLoading.set(false);
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

  // ── View modal ──────────────────────────────────────────────────────────
  openView(booking: QuickOrder): void {
    this.viewBooking = booking;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewBooking = null;
  }

  accept(booking: QuickOrder): void {
    if (!booking.id) return;
    this.estateService.acceptReservation(booking.id).subscribe({
      next: (updated) => {
        const idx = this.allBookings.findIndex(b => b.id === booking.id);
        if (idx !== -1) {
          this.allBookings[idx] = { ...this.allBookings[idx], status: 'accepted' };
          this.applyFilter();
        }
        this.showToast(this.translate.instant('dashboard.status_accepted_toast'), 'success');
      },
      error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
    });
  }

  reject(booking: QuickOrder): void {
    if (!booking.id) return;
    this.estateService.rejectReservation(booking.id).subscribe({
      next: (updated) => {
        const idx = this.allBookings.findIndex(b => b.id === booking.id);
        if (idx !== -1) {
          this.allBookings[idx] = { ...this.allBookings[idx], status: 'rejected' };
          this.applyFilter();
        }
        this.showToast(this.translate.instant('dashboard.status_rejected_toast'), 'warning');
      },
      error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
    });
  }

  delete(booking: QuickOrder): void {
    const msg = this.translate.instant('admin.delete_confirm_booking', { name: booking.name });
    if (!confirm(msg || `Supprimer la réservation de "${booking.name}" ?`)) return;
    this.estateService.deleteAdminBooking(booking.id!).subscribe({
      next: () => {
        this.allBookings = this.allBookings.filter(b => b.id !== booking.id);
        this.applyFilter();
        this.showToast(this.translate.instant('admin.delete_success'), 'info');
      },
      error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
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




