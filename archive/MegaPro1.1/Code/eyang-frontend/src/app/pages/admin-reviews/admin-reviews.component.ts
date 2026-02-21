import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Star, Trash2, MapPin, Check } from 'lucide-angular';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './admin-reviews.component.html',
  styleUrl: './admin-reviews.component.css'
})
export class AdminReviewsComponent {
  readonly StarIcon = Star;
  readonly TrashIcon = Trash2;
  readonly MapPinIcon = MapPin;
  readonly CheckIcon = Check;

  reviews = [
    { id: 1, location: 'Cité Universitaire Soa', author: 'Sophie M.', date: '08/01/2024', rating: 4, comment: 'Bonne ambiance.', deleted: false },
    { id: 2, location: 'Studio Ngoa-Ekelle', author: 'Marie K.', date: '05/01/2024', rating: 5, comment: 'Studio parfait.', deleted: false },
    { id: 3, location: 'Résidence Académie', author: 'Paul N.', date: '03/01/2024', rating: 3, comment: 'Correct.', deleted: false },
    { id: 4, location: 'Villa Partagée Melen', author: 'Sophie M.', date: '02/01/2024', rating: 5, comment: 'Superbe villa!', deleted: false }
  ];

  getStars(rating: number): number[] {
    return Array(rating).fill(0).map((_, i) => i + 1);
  }

  deleteReview(id: number) {
    const review = this.reviews.find(r => r.id === id);
    if (review) {
      review.deleted = true;
      setTimeout(() => {
        this.reviews = this.reviews.filter(r => r.id !== id);
      }, 2000);
    }
  }
}
