import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Star, Trash2, Search, Loader, CheckCircle, XCircle, Info, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-angular';
import { EstateService, Review } from '../../services/estate.service';
import { catchError, of } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export interface Toast { id: number; type: 'success'|'error'|'info'|'warning'; message: string; }

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule],
  templateUrl: './admin-reviews.component.html',
  styleUrl: './admin-reviews.component.css'
})
export class AdminReviewsComponent implements OnInit {
  readonly StarIcon        = Star;
  readonly TrashIcon       = Trash2;
  readonly SearchIcon      = Search;
  readonly LoaderIcon      = Loader;
  readonly CheckCircleIcon = CheckCircle;
  readonly XCircleIcon     = XCircle;
  readonly InfoIcon        = Info;
  readonly AlertIcon       = AlertCircle;

  readonly PrevIcon        = ChevronLeft;
  readonly NextIcon        = ChevronRight;

  isLoading    = signal(true);
  allReviews   = signal<Review[]>([]);
  searchQuery  = signal('');
  filterRating = signal('');

  // Pagination state
  currentPage = signal(1);
  pageSize    = signal(10);

  filtered = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const r = this.filterRating();

    return this.allReviews().filter(rv => {
      const matchQ = !q || rv.name.toLowerCase().includes(q) || (rv.estate_name ?? '').toLowerCase().includes(q) || rv.comment.toLowerCase().includes(q);
      const matchR = !r || rv.rating === +r;
      return matchQ && matchR;
    });
  });

  totalPages = computed(() => Math.ceil(this.filtered().length / this.pageSize()));

  pagedReviews = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  toasts: Toast[]      = [];
  private toastCounter = 0;

  constructor(
    private estateService: EstateService,
    private translate:     TranslateService
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    this.estateService.getAdminReviews()
      .pipe(catchError(() => of([])))
      .subscribe(data => {
        this.allReviews.set(data as Review[]);
        this.isLoading.set(false);
      });
  }

  onSearch(val: string): void {
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  onFilter(val: string): void {
    this.filterRating.set(val);
    this.currentPage.set(1);
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p);
  }

  nextPage(): void { if (this.currentPage() < this.totalPages()) this.currentPage.update(n => n + 1); }
  prevPage(): void { if (this.currentPage() > 1) this.currentPage.update(n => n - 1); }


  delete(review: Review): void {
    const msg = this.translate.instant('admin.delete_confirm_review', { name: review.name });
    if (!confirm(msg || `Supprimer l'avis de "${review.name}" ?`)) return;
    this.estateService.deleteAdminReview(review.id).subscribe({
      next: () => {
        this.allReviews.update(list => list.filter(r => r.id !== review.id));
        this.showToast(this.translate.instant('admin.delete_success'), 'info');
      },
      error: () => this.showToast(this.translate.instant('admin.error_load'), 'error')
    });
  }

  getStarArray(r: number): number[] { return Array(Math.round(r)).fill(0); }
  getEmptyStars(r: number): number[] { return Array(5 - Math.round(r)).fill(0); }

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




