import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Calendar, Loader, Phone, Trash2, Search, CheckCircle, XCircle, Info, AlertCircle, Eye, FileText, ChevronLeft, ChevronRight } from 'lucide-angular';
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

  readonly PrevIcon        = ChevronLeft;
  readonly NextIcon        = ChevronRight;

  isLoading    = signal(true);
  allBookings  = signal<Reservation[]>([]);
  searchQuery  = signal('');
  statusFilter = signal('ALL');

  // Pagination state
  currentPage = signal(1);
  pageSize    = signal(10);

  filtered = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const s = this.statusFilter();

    return this.allBookings().filter(b => {
      const matchSearch = !q || (
        (b.client_name || '').toLowerCase().includes(q) ||
        (b.estate_name || '').toLowerCase().includes(q) ||
        (b.client_phone || '').includes(q)
      );
      const matchStatus = s === 'ALL' || b.status === s;
      return matchSearch && matchStatus;
    });
  });

  totalPages = computed(() => Math.ceil(this.filtered().length / this.pageSize()));

  pagedBookings = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

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
        this.allBookings.set(data);
        this.isLoading.set(false);
      });
  }

  onSearch(val: string): void {
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  onFilter(val: string): void {
    this.statusFilter.set(val);
    this.currentPage.set(1);
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p);
  }

  nextPage(): void { if (this.currentPage() < this.totalPages()) this.currentPage.update(n => n + 1); }
  prevPage(): void { if (this.currentPage() > 1) this.currentPage.update(n => n - 1); }


  getPendingPayments(): Reservation[] {
    // For Reservations, 'PENDING' might need a receipt check if implemented, 
    // otherwise we use the status field.
    return this.allBookings().filter(b => b.status === 'PENDING');
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
    if (booking.is_legacy) {
      this.estateService.acceptQuickOrder(booking.id).subscribe({
        next: () => {
          this.updateBookingInList(booking.id, 'ACCEPTED', true);
          this.showToast(this.translate.instant('dashboard.status_accepted_toast'), 'success');
        },
        error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
      });
      return;
    }
    this.estateService.acceptReservation(booking.id).subscribe({
      next: (updated) => {
        this.updateBookingInList(booking.id, updated, false);
        this.showToast(this.translate.instant('dashboard.status_accepted_toast'), 'success');
      },
      error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
    });
  }

  reject(booking: Reservation): void {
    if (!booking.id) return;
    if (booking.is_legacy) {
      this.estateService.rejectQuickOrder(booking.id).subscribe({
        next: () => {
          this.updateBookingInList(booking.id, 'REJECTED', true);
          this.showToast(this.translate.instant('dashboard.status_rejected_toast'), 'warning');
        },
        error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
      });
      return;
    }
    this.estateService.rejectReservation(booking.id).subscribe({
      next: (updated) => {
        this.updateBookingInList(booking.id, updated, false);
        this.showToast(this.translate.instant('dashboard.status_rejected_toast'), 'warning');
      },
      error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
    });
  }

  private updateBookingInList(id: number, data: any, isLegacy: boolean): void {
    this.allBookings.update(list => {
      const idx = list.findIndex(b => b.id === id && b.is_legacy === isLegacy);
      if (idx !== -1) {
        if (typeof data === 'string') {
          list[idx] = { ...list[idx], status: data as any };
        } else {
          list[idx] = data;
        }
      }
      return [...list];
    });
  }

  delete(booking: Reservation): void {
    const msg = this.translate.instant('admin.delete_confirm_booking', { name: booking.client_name });
    if (!confirm(msg || `Supprimer la réservation de "${booking.client_name}" ?`)) return;
    
    if (booking.is_legacy) {
      this.estateService.deleteAdminBooking(booking.id).subscribe({
        next: () => {
          this.allBookings.update(list => list.filter(b => !(b.id === booking.id && b.is_legacy)));
          this.showToast(this.translate.instant('admin.delete_success'), 'info');
        },
        error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
      });
      return;
    }

    this.estateService.cancelReservation(booking.id).subscribe({
      next: () => {
        this.allBookings.update(list => list.filter(b => !(b.id === booking.id && !b.is_legacy)));
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




