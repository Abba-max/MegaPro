import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LucideAngularModule, Plus, Search, Home, MoreVertical, Edit2, Trash2, CheckCircle, XCircle, Info, AlertCircle, Upload, X, MapPin, Ruler, Users, Check, Globe, LayoutGrid, FileText, Settings, LogOut, ChevronRight, Menu, Eye, EyeOff, Star, Filter, ArrowUpDown, Clock, Building2, Package, Mail, RefreshCw, Loader, Archive, Pencil, Save, ChevronLeft } from 'lucide-angular';
import { EstateService, Estate, EstateRaw, EstateImage, RoomCategory, RoomImage } from '../../services/estate.service';
import { environment } from '../../../environments/environment';
import { catchError, of, forkJoin, Observable, finalize } from 'rxjs';

export interface Toast { id: number; type: 'success' | 'error' | 'info' | 'warning'; message: string; }

interface EstateForm {
  name:        string;
  location:    string;
  distance:    number;
  status:      'draft' | 'published' | 'archived';
  description: string;
  generator:   '0' | '1';
  forage:      '0' | '1';
  restaurant:  '0' | '1';
}

@Component({
  selector: 'app-admin-logements',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './admin-logements.component.html',
  styleUrl: './admin-logements.component.css'
})
export class AdminLogementsComponent implements OnInit {

  // Icons
  readonly SearchIcon      = Search;
  readonly StarIcon        = Star;
  readonly TrashIcon       = Trash2;
  readonly LoaderIcon      = Loader;
  readonly CheckCircleIcon = CheckCircle;
  readonly XCircleIcon     = XCircle;
  readonly InfoIcon        = Info;
  readonly AlertIcon       = AlertCircle;
  readonly PublishIcon     = Globe;
  readonly UnpublishIcon   = EyeOff;
  readonly ArchiveIcon     = Archive;
  readonly PlusIcon        = Plus;
  readonly PencilIcon      = Pencil;
  readonly CloseIcon       = X;
  readonly SaveIcon        = Save;
  readonly HomeIcon        = Home;
  readonly UploadIcon      = Upload;
  readonly PrevIcon        = ChevronLeft;
  readonly NextIcon        = ChevronRight;
  readonly BuildingIcon    = Building2;

  private readonly API = environment.apiUrl;

  // List state
  isLoading    = signal(true);
  allHousings  = signal<Estate[]>([]);
  searchQuery  = signal('');
  filterStatus = signal('');

  // Pagination state
  currentPage = signal(1);
  pageSize    = signal(10);

  filtered = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const s = this.filterStatus();
    return this.allHousings().filter(h => {
      const matchQ = !q || h.name.toLowerCase().includes(q) || h.location.toLowerCase().includes(q);
      const matchS = !s || h.status === s;
      return matchQ && matchS;
    });
  });

  totalPages = computed(() => Math.ceil(this.filtered().length / this.pageSize()));

  pagedHousings = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  // Modal state
  showModal  = false;
  isEditMode = false;
  isSaving   = signal(false);
  editId: number | null = null;

  // Delete state
  showDeleteConfirm = false;
  estateToDelete: Estate | null = null;

  // Image state
  selectedFiles:   File[]   = [];
  previewImages:   string[] = [];
  existingImages:  EstateImage[] = [];
  removedImageIds: number[] = [];

  form: EstateForm = this.emptyForm();

  toasts: Toast[]      = [];
  private toastCounter = 0;

  // ── Room management state ───────────────────────────────
  showRoomModal = false;
  selectedEstateForRooms: Estate | null = null;
  isLoadingRooms = signal(false);
  roomCategories = signal<RoomCategory[]>([]);
  
  isRoomEditMode = false;
  isSavingRoom = signal(false);
  roomEditId: number | null = null;
  roomForm: Partial<RoomCategory> = this.emptyRoomForm();
  
  roomSelectedFiles: File[] = [];
  roomPreviewImages: string[] = [];
  roomExistingImages: RoomImage[] = [];
  roomRemovedImageIds: number[] = [];

  emptyRoomForm(): Partial<RoomCategory> {
    return { name: '', price: 300000, occupancy: 'single', quantity_available: 1, wifi: '0', tv: '0', fridge: '0', room_size: '2', description: '' };
  }

  constructor(
    private estateService: EstateService,
    private http: HttpClient
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    this.estateService.getEstates()
      .pipe(catchError(() => { this.showToast('Erreur de chargement.', 'error'); return of([]); }))
      .subscribe(data => {
        this.allHousings.set(data as Estate[]);
        this.isLoading.set(false);
      });
  }

  onSearch(val: string): void {
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  onFilter(val: string): void {
    this.filterStatus.set(val);
    this.currentPage.set(1);
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p);
  }

  nextPage(): void { if (this.currentPage() < this.totalPages()) this.currentPage.update(n => n + 1); }
  prevPage(): void { if (this.currentPage() > 1) this.currentPage.update(n => n - 1); }

  // ── Open create ───────────────────────────────────────────
  openCreate(): void {
    this.isEditMode      = false;
    this.editId          = null;
    this.form            = this.emptyForm();
    this.selectedFiles   = [];
    this.previewImages   = [];
    this.existingImages  = [];
    this.removedImageIds = [];
    this.showModal       = true;
  }

  // ── Open edit ─────────────────────────────────────────────
  openEdit(estate: Estate): void {
    this.isEditMode = true;
    this.editId     = estate.id;
    this.form = {
      name:        estate.name,
      location:    estate.location,
      distance:    estate.distance,
      status:      estate.status,
      description: estate.description,
      generator:   estate.generator  as '0' | '1',
      forage:      estate.forage     as '0' | '1',
      restaurant:  estate.restaurant as '0' | '1',
    };
    this.existingImages  = [...(estate.images ?? [])];
    this.selectedFiles   = [];
    this.previewImages   = [];
    this.removedImageIds = [];
    this.showModal       = true;
  }
  
  switchToRoomManagerFromEdit(): void {
      if (!this.editId) return;
      const est = this.allHousings().find(h => h.id === this.editId);
      if (est) {
          this.closeModal();
          this.openManageRooms(est);
      }
  }

  closeModal(): void { this.showModal = false; }

  // ── Image handling ────────────────────────────────────────
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    Array.from(input.files).forEach(file => {
      this.selectedFiles.push(file);
      const reader = new FileReader();
      reader.onload = e => this.previewImages.push(e.target!.result as string);
      reader.readAsDataURL(file);
    });
    input.value = '';
  }

  removePreview(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.previewImages.splice(index, 1);
  }

  removeExisting(index: number): void {
    const img = this.existingImages.splice(index, 1)[0];
    if (img?.id) this.removedImageIds.push(img.id);
  }

  // ── Save (create or update) ───────────────────────────────
  save(): void {
    if (!this.form.name.trim())     { this.showToast('Le nom est obligatoire.', 'warning'); return; }
    if (!this.form.location.trim()) { this.showToast('La localisation est obligatoire.', 'warning'); return; }

    this.isSaving.set(true);

    // Build payload as plain JSON (images handled separately)
    const payload: Partial<EstateRaw> = {
      name:        this.form.name,
      location:    this.form.location,
      distance:    this.form.distance,
      status:      this.form.status,
      description: this.form.description,
      generator:   this.form.generator,
      forage:      this.form.forage,
      restaurant:  this.form.restaurant,
    };

    if (this.isEditMode && this.editId) {
      this.estateService.updateEstate(this.editId, payload)
        .pipe(catchError(err => {
          this.showToast(err?.error?.detail ?? 'Erreur de mise à jour.', 'error');
          this.isSaving.set(false);
          return of(null);
        }))
        .subscribe(updated => {
          if (!updated) return;
          this.showToast(`"${updated.name}" mis à jour.`, 'success');
          
          if (this.selectedFiles.length) {
            this.uploadImages(this.editId!).subscribe(() => {
              this.isSaving.set(false);
              this.showModal = false;
              this.load();
            });
          } else {
            this.isSaving.set(false);
            this.showModal = false;
            this.load();
          }
        });
    } else {
      this.estateService.createEstate(payload)
        .pipe(catchError(err => {
          this.showToast(err?.error?.detail ?? 'Erreur de création.', 'error');
          this.isSaving.set(false);
          return of(null);
        }))
        .subscribe(created => {
          if (!created) return;
          this.showToast(`"${created.name}" créé avec succès. Veuillez maintenant configurer les chambres.`, 'success');
          
          const finalizeCreation = () => {
            this.isSaving.set(false);
            this.showModal = false;
            this.load();
            // Automatically switch to room manager!
            this.openManageRooms(created);
          };

          if (this.selectedFiles.length) {
            this.uploadImages(created.id).subscribe(() => finalizeCreation());
          } else {
            finalizeCreation();
          }
        });
    }
  }

  // ── Upload images separately ──────────────────────────────
  private uploadImages(estateId: number): Observable<any> {
    if (this.selectedFiles.length === 0) return of([]);

    const token   = localStorage.getItem('access_token') ?? '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    
    const uploads = this.selectedFiles.map(file => {
      const fd = new FormData();
      fd.append('estate', String(estateId));
      fd.append('image', file);
      return this.http.post(`${this.API}/api/estate-images/`, fd, { headers }).pipe(
        catchError(err => {
          console.error('Image upload failed:', err);
          return of(null);
        })
      );
    });

    return forkJoin(uploads);
  }

  getImageUrl(url: string | null): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const base = this.API.replace('/api', '');
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  // ── Toggle publish ────────────────────────────────────────
  togglePublish(estate: Estate): void {
    const newStatus = estate.status === 'published' ? 'draft' : 'published';
    const label     = newStatus === 'published' ? 'publié' : 'repassé en brouillon';
    this.estateService.updateEstate(estate.id, { status: newStatus } as any)
      .pipe(catchError(() => { this.showToast('Erreur lors de la mise à jour.', 'error'); return of(null); }))
      .subscribe(updated => {
        if (!updated) return;
        this.allHousings.update(list => {
          const idx = list.findIndex(h => h.id === estate.id);
          if (idx !== -1) list[idx] = { ...list[idx], status: newStatus };
          return [...list];
        });
        this.showToast(`"${estate.name}" ${label}.`, 'success');
      });
  }

  // ── Delete ────────────────────────────────────────────────
  confirmDelete(estate: Estate): void {
    this.estateToDelete    = estate;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.estateToDelete    = null;
    this.showDeleteConfirm = false;
  }

  deleteConfirmed(): void {
    if (!this.estateToDelete) return;
    this.isSaving.set(true);
    this.estateService.deleteEstate(this.estateToDelete.id)
      .pipe(catchError(() => { this.showToast('Erreur lors de la suppression.', 'error'); this.isSaving.set(false); return of(null); }))
      .subscribe(() => {
        this.allHousings.update(list => list.filter(h => h.id !== this.estateToDelete!.id));
        this.showToast(`"${this.estateToDelete!.name}" supprimé.`, 'info');
        this.isSaving.set(false);
        this.cancelDelete();
      });
  }

  getOccupied(e: Estate): number { return 0; } // Placeholder since free moved to RoomCategory

  private emptyForm(): EstateForm {
    return {
      name: '', location: '', distance: 500,
      status: 'draft', description: '',
      generator: '0', forage: '0', restaurant: '0'
    };
  }

  // ── Room Category Methods ────────────────────────────────────────────────
  openManageRooms(estate: Estate): void {
    this.selectedEstateForRooms = estate;
    this.showRoomModal = true;
    this.isRoomEditMode = false;
    this.loadRooms(estate.id);
  }

  closeRoomModal(): void {
    this.showRoomModal = false;
    this.selectedEstateForRooms = null;
  }

  loadRooms(estateId: number): void {
    this.isLoadingRooms.set(true);
    this.estateService.getRoomCategories(estateId).subscribe({
      next: (rooms) => {
        this.roomCategories.set(rooms);
        this.isLoadingRooms.set(false);
      },
      error: () => {
        this.showToast('Erreur chargement chambres.', 'error');
        this.isLoadingRooms.set(false);
      }
    });
  }

  openCreateRoom(): void {
    this.isRoomEditMode = true;
    this.roomEditId = null;
    this.roomForm = this.emptyRoomForm();
    this.roomSelectedFiles = [];
    this.roomPreviewImages = [];
    this.roomExistingImages = [];
    this.roomRemovedImageIds = [];
  }

  openEditRoom(room: RoomCategory): void {
    this.isRoomEditMode = true;
    this.roomEditId = room.id;
    this.roomForm = { ...room };
    this.roomExistingImages = [...(room.images || [])];
    this.roomSelectedFiles = [];
    this.roomPreviewImages = [];
    this.roomRemovedImageIds = [];
  }

  deleteRoom(room: RoomCategory): void {
    if (confirm(`Supprimer la catégorie "${room.name}" ?`)) {
      this.estateService.deleteRoomCategory(room.id).subscribe(() => {
        this.showToast('Chambre supprimée.', 'info');
        if (this.selectedEstateForRooms) this.loadRooms(this.selectedEstateForRooms.id);
      });
    }
  }

  saveRoom(): void {
    if (!this.selectedEstateForRooms) return;
    if (!this.roomForm.name) { this.showToast('Le nom est obligatoire.', 'warning'); return; }
    
    this.isSavingRoom.set(true);
    const payload = { ...this.roomForm, estate: this.selectedEstateForRooms.id };
    
    const req = this.roomEditId 
      ? this.estateService.updateRoomCategory(this.roomEditId, payload)
      : this.estateService.createRoomCategory(payload);
      
    req.subscribe({
      next: (saved) => {
        const afterSave = () => {
          this.isSavingRoom.set(false);
          this.isRoomEditMode = false;
          this.showToast(`Chambre ${this.roomEditId ? 'mise à jour' : 'ajoutée'}.`, 'success');
          this.loadRooms(this.selectedEstateForRooms!.id);
        };
        
        if (this.roomSelectedFiles.length > 0) {
          this.estateService.uploadRoomImages(saved.id, this.roomSelectedFiles).subscribe(afterSave);
        } else {
          afterSave();
        }
      },
      error: () => {
        this.showToast('Erreur lors de l’enregistrement de la chambre.', 'error');
        this.isSavingRoom.set(false);
      }
    });
  }

  onRoomFilesSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach(f => {
        this.roomSelectedFiles.push(f);
        const reader = new FileReader();
        reader.onload = ev => this.roomPreviewImages.push(ev.target!.result as string);
        reader.readAsDataURL(f);
      });
    }
    input.value = '';
  }

  removeRoomPreview(idx: number): void {
    this.roomSelectedFiles.splice(idx, 1);
    this.roomPreviewImages.splice(idx, 1);
  }

  removeExistingRoomImage(idx: number): void {
    const img = this.roomExistingImages.splice(idx, 1)[0];
    if (img.id) this.roomRemovedImageIds.push(img.id);
  }

  dismissToast(id: number): void { this.toasts = this.toasts.filter(t => t.id !== id); }

  showToast(message: string, type: Toast['type'] = 'success'): void {
    const id = ++this.toastCounter;
    this.toasts.push({ id, type, message });
    setTimeout(() => this.toasts = this.toasts.filter(t => t.id !== id), 4000);
  }
}