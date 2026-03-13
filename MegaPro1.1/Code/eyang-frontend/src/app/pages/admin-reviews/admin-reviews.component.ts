import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Star, Trash2, Search, Loader, CheckCircle, XCircle, Info, AlertCircle } from 'lucide-angular';
import { EstateService, Review } from '../../services/estate.service';
import { catchError, of } from 'rxjs';

export interface Toast { id: number; type: 'success'|'error'|'info'|'warning'; message: string; }

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
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

  isLoading    = signal(true);
  allReviews:  Review[] = [];
  filtered:    Review[] = [];
  searchQuery  = '';
  filterRating = '';

  toasts: Toast[]      = [];
  private toastCounter = 0;

  constructor(private estateService: EstateService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    this.estateService.getAdminReviews()
      .pipe(catchError(() => of([])))
      .subscribe(data => {
        this.allReviews = data as Review[];
        this.applyFilter();
        this.isLoading.set(false);
      });
  }

  applyFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    this.filtered = this.allReviews.filter(r => {
      const matchQ = !q || r.name.toLowerCase().includes(q) || (r.estate_name ?? '').toLowerCase().includes(q) || r.comment.toLowerCase().includes(q);
      const matchR = !this.filterRating || r.rating === +this.filterRating;
      return matchQ && matchR;
    });
  }

  delete(review: Review): void {
    if (!confirm(`Supprimer l'avis de "${review.name}" ?`)) return;
    this.estateService.deleteAdminReview(review.id).subscribe({
      next: () => {
        this.allReviews = this.allReviews.filter(r => r.id !== review.id);
        this.applyFilter();
        this.showToast('Avis supprimé.', 'info');
      },
      error: () => this.showToast('Erreur lors de la suppression.', 'error')
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