import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideAngularModule,
  MapPin, Star, Building, ChevronLeft, ChevronRight, Users, Bed, BedDouble,
  LayoutDashboard, Wifi, Zap, Droplets, Utensils, Calendar,
  MessageSquare, Send, X, Images, Loader, CheckCircle, XCircle, AlertCircle
} from 'lucide-angular';
import { EstateService, Estate, Review } from '../../services/estate.service';
import { AuthService, User } from '../../services/auth.service';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

@Component({
  selector: 'app-housing-detail',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule, FormsModule, TranslateModule],
  templateUrl: './housing-detail.component.html',
  styleUrl: './housing-detail.component.css'
})
export class HousingDetailComponent implements OnInit {
  readonly ChevronLeftIcon  = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly MapPinIcon       = MapPin;
  readonly StarIcon         = Star;
  readonly BuildingIcon     = Building;
  readonly UsersIcon        = Users;
  readonly BedIcon          = Bed;
  readonly BedDoubleIcon    = BedDouble;
  readonly LayoutIcon       = LayoutDashboard;
  readonly MessageIcon      = MessageSquare;
  readonly CalendarIcon     = Calendar;
  readonly SendIcon         = Send;
  readonly XIcon            = X;
  readonly ZapIconRef       = Zap;
  readonly ImagesIcon       = Images;
  readonly LoaderIcon       = Loader;
  readonly WifiIcon         = Wifi;
  readonly DropletsIcon     = Droplets;
  readonly UtensilsIcon     = Utensils;
  readonly CheckCircleIcon  = CheckCircle;
  readonly XCircleIcon      = XCircle;
  readonly AlertCircleIcon  = AlertCircle;

  housing: Estate | null = null;
  photos: string[] = [];
  reviews: Review[] = [];
  currentUser: User | null = null;
  isLoading    = true;
  errorMessage = '';
  isSubmitting = false;
  submitSuccess = false;

  activePhotoIndex = 0;
  showLightbox     = false;
  showContactModal = false;

  contactForm = { name: '', phone: '', message: '' };

  // ── Toast ──────────────────────────────────────────────────
  toasts: Toast[] = [];
  private toastCounter = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private estateService: EstateService,
    private authService: AuthService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => this.currentUser = u);
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadEstate(Number(id));
      this.loadReviews(Number(id));
    }
  }

  showToast(message: string, type: Toast['type'] = 'success'): void {
    const id = ++this.toastCounter;
    this.toasts.push({ id, type, message });
    setTimeout(() => this.dismissToast(id), 4000);
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  loadEstate(id: number): void {
    this.isLoading = true;
    this.estateService.getEstate(id).subscribe({
      next: (data) => {
        data.equipments = this.buildEquipments(data);
        this.housing = data;
        this.photos  = data.images.map(img => img.image).filter(Boolean);
        if (this.photos.length === 0) this.photos = ['assets/images/placeholder.jpg'];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Logement introuvable.';
        this.isLoading    = false;
        this.showToast('Logement introuvable', 'error');
      }
    });
  }

  loadReviews(estateId: number): void {
    this.estateService.getReviews(estateId).subscribe({
      next: (data) => { this.reviews = data; },
      error: () => {}
    });
  }

  private buildEquipments(h: Estate): { name: string; icon: any; color: string }[] {
    const eq: { name: string; icon: any; color: string }[] = [];
    if (h.wifi === '1')       eq.push({ name: 'WiFi',       icon: this.WifiIcon,     color: 'orange' });
    if (h.generator === '1')  eq.push({ name: 'Générateur', icon: this.ZapIconRef,   color: 'yellow' });
    if (h.forage === '1')     eq.push({ name: 'Forage',     icon: this.DropletsIcon, color: 'blue'   });
    if (h.restaurant === '1') eq.push({ name: 'Restaurant', icon: this.UtensilsIcon, color: 'gray'   });
    return eq;
  }

  getStarArray(rating: number | string): number[] {
    const n = Math.round(Number(rating));
    return Array(n > 0 ? n : 0).fill(0);
  }

  getRatingAsNumber(rating: string): number { return Number(rating); }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (!this.showLightbox) return;
    if (event.key === 'ArrowLeft')  this.prevPhoto();
    if (event.key === 'ArrowRight') this.nextPhoto();
    if (event.key === 'Escape')     this.closeLightbox();
  }

  goBack(): void { this.router.navigate(['/']); }
  setActivePhoto(i: number): void { this.activePhotoIndex = i; }
  prevPhoto(): void { this.activePhotoIndex = (this.activePhotoIndex - 1 + this.photos.length) % this.photos.length; }
  nextPhoto(): void { this.activePhotoIndex = (this.activePhotoIndex + 1) % this.photos.length; }
  openLightbox(i: number): void { this.activePhotoIndex = i; this.showLightbox = true; }
  closeLightbox(): void { this.showLightbox = false; }
  openContact(): void { this.showContactModal = true; }
  closeContact(): void { this.showContactModal = false; }
  openLogin(): void { this.authService.openLogin(); }

  handleSendRequest(): void {
    if (!this.contactForm.name || !this.contactForm.phone || !this.housing) {
      this.showToast('Veuillez remplir votre nom et téléphone', 'warning');
      return;
    }
    this.isSubmitting = true;

    this.estateService.createQuickOrder({
      estate: this.housing.id,
      name:   this.contactForm.name,
      phone:  this.contactForm.phone,
      note:   this.contactForm.message
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitSuccess = true;
        this.showToast('Demande envoyée avec succès ! Le propriétaire vous contactera bientôt.', 'success');
        setTimeout(() => {
          this.closeContact();
          this.submitSuccess = false;
          this.contactForm = { name: '', phone: '', message: '' };
        }, 2000);
      },
      error: () => {
        this.isSubmitting = false;
        this.showToast('Erreur lors de l\'envoi. Veuillez réessayer.', 'error');
      }
    });
  }
}