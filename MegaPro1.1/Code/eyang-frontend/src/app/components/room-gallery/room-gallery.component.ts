import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, ChevronLeft, ChevronRight } from 'lucide-angular';
import { RoomImage } from '../../services/estate.service';

@Component({
  selector: 'app-room-gallery',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="gallery-overlay" (click)="close.emit()">
      <div class="gallery-content" (click)="$event.stopPropagation()">
        <button class="close-btn" (click)="close.emit()">
          <lucide-icon [img]="XIcon"></lucide-icon>
        </button>

        <div class="main-image-container">
          <button class="nav-btn prev" (click)="prev()" *ngIf="images.length > 1">
            <lucide-icon [img]="PrevIcon"></lucide-icon>
          </button>
          
          <img [src]="images[currentIndex].image" alt="Room image" 
               class="main-image fade-in" 
               loading="lazy"
               [class.scale-150]="isZoomed"
               (click)="toggleZoom()">
          
          <button class="nav-btn next" (click)="next()" *ngIf="images.length > 1">
            <lucide-icon [img]="NextIcon"></lucide-icon>
          </button>

          <div class="caption" *ngIf="images[currentIndex].caption">
            {{ images[currentIndex].caption }}
          </div>
        </div>

        <div class="thumbnails" *ngIf="images.length > 1">
          <div 
            *ngFor="let img of images; let i = index" 
            class="thumb" 
            [class.active]="i === currentIndex"
            (click)="currentIndex = i"
          >
            <img [src]="img.image" alt="Thumbnail" loading="lazy">
          </div>
        </div>

        <div class="counter" *ngIf="images.length > 1">
          {{ currentIndex + 1 }} / {{ images.length }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gallery-overlay {
      position: fixed; inset: 0;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(10px);
      display: flex; align-items: center; justify-content: center;
      z-index: 3000; padding: 2rem;
    }
    .gallery-content {
      position: relative; width: 100%; max-width: 1000px;
      display: flex; flex-direction: column; gap: 1.5rem;
      align-items: center;
    }
    .close-btn {
      position: absolute; top: -3rem; right: 0;
      background: none; border: none; color: white;
      cursor: pointer; padding: 0.5rem;
      transition: transform 0.3s ease;
    }
    .close-btn:hover { transform: rotate(90deg); }

    .main-image-container {
      position: relative; width: 100%; aspect-ratio: 16 / 9;
      background: #000; border-radius: 16px; overflow: hidden;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .main-image {
      max-width: 100%; max-height: 100%; object-fit: contain;
      transition: transform 0.3s ease;
      cursor: zoom-in;
    }
    .main-image.scale-150 {
      transform: scale(1.5);
      cursor: zoom-out;
    }
    .nav-btn {
      position: absolute; top: 50%; transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(4px);
      border: none; color: white; width: 48px; height: 48px;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.3s ease; z-index: 10;
    }
    .nav-btn:hover { background: rgba(255, 255, 255, 0.2); scale: 1.1; }
    .nav-btn.prev { left: 1rem; }
    .nav-btn.next { right: 1rem; }

    .caption {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: linear-gradient(transparent, rgba(0,0,0,0.8));
      color: white; padding: 2rem 1.5rem 1rem;
      font-size: 14px; text-align: center;
    }

    .thumbnails {
      display: flex; gap: 0.75rem; overflow-x: auto;
      padding: 0.5rem; max-width: 100%;
    }
    .thumb {
      width: 64px; height: 64px; border-radius: 8px;
      overflow: hidden; cursor: pointer; opacity: 0.5;
      transition: all 0.3s ease; border: 2px solid transparent;
      flex-shrink: 0;
    }
    .thumb:hover { opacity: 0.8; }
    .thumb.active { opacity: 1; border-color: white; transform: scale(1.1); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }

    .counter {
      color: rgba(255, 255, 255, 0.6); font-size: 14px; font-weight: 600;
    }

    .fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

    @media (max-width: 768px) {
      .gallery-overlay {
        padding: 0.5rem;
      }
      .gallery-content {
        gap: 0.75rem;
      }
      .main-image-container {
        aspect-ratio: 4 / 3;
        border-radius: 8px;
      }
      .close-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 50;
      }
      .nav-btn {
        width: 36px;
        height: 36px;
      }
      .nav-btn.prev { left: 0.5rem; }
      .nav-btn.next { right: 0.5rem; }
      .thumb {
        width: 48px;
        height: 48px;
      }
    }
  `]
})
export class RoomGalleryComponent {
  @Input() images: RoomImage[] = [];
  @Input() currentIndex = 0;
  @Output() close = new EventEmitter<void>();

  isZoomed = false;

  readonly XIcon = X;
  readonly PrevIcon = ChevronLeft;
  readonly NextIcon = ChevronRight;

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'ArrowRight') this.next();
    if (event.key === 'ArrowLeft') this.prev();
    if (event.key === 'Escape') this.close.emit();
  }

  next(): void {
    this.isZoomed = false;
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
  }

  prev(): void {
    this.isZoomed = false;
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
  }
  
  toggleZoom(): void {
    this.isZoomed = !this.isZoomed;
  }
}




