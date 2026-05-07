import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  LucideAngularModule, Plus, Search, Home, Trash2, CheckCircle, XCircle,
  Info, AlertCircle, Upload, X, Check, Globe, EyeOff, Archive, Pencil,
  Save, ChevronLeft, ChevronRight, Building2, Loader, Star, ShieldCheck, ShieldX, MapPin, Users,
  LocateFixed, AlertTriangle
} from 'lucide-angular';
import { EstateService, Estate, EstateRaw, EstateImage, RoomCategory, RoomImage, AdminUser } from '../../services/estate.service';
import * as L from 'leaflet';
import { environment } from '../../../environments/environment';
import { catchError, of, forkJoin, Observable, map, switchMap } from 'rxjs';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export interface Toast { id: number; type: 'success' | 'error' | 'info' | 'warning'; message: string; }

interface EstateForm {
  name: string; location: string; distance: number;
  status: 'draft' | 'published' | 'archived'; description: string;
  generator: '0'|'1'; forage: '0'|'1'; restaurant: '0'|'1';
  wifi: '0'|'1'; tv: '0'|'1'; fridge: '0'|'1';
  price: number;
  lat:  number; lng: number; 
  is_verified?: boolean;
  owner_id?: number;
  // New fields from models.py
  etages: number;
  water_bills: boolean;
  electricity_bills: boolean;
  fence: boolean;
  caretaker: boolean;
  security_guard: boolean;
  restaurant_on_site: boolean;
  borehole_forage: boolean;
  generator_available: boolean;
  parking: boolean;
  cctv: boolean;
  cleaning_service: boolean;
  allowed_gender: 'all' | 'male' | 'female';
}

@Component({
  selector: 'app-admin-logements',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LucideAngularModule, TranslateModule],
  templateUrl: './admin-logements.component.html',
  styleUrl: './admin-logements.component.css'
})
export class AdminLogementsComponent implements OnInit {

  // Icons
  readonly SearchIcon       = Search;
  readonly StarIcon         = Star;
  readonly TrashIcon        = Trash2;
  readonly LoaderIcon       = Loader;
  readonly CheckCircleIcon  = CheckCircle;
  readonly XCircleIcon      = XCircle;
  readonly InfoIcon         = Info;
  readonly AlertIcon        = AlertCircle;
  readonly PublishIcon      = Globe;
  readonly UnpublishIcon    = EyeOff;
  readonly ArchiveIcon      = Archive;
  readonly PlusIcon         = Plus;
  readonly PencilIcon       = Pencil;
  readonly CloseIcon        = X;
  readonly SaveIcon         = Save;
  readonly HomeIcon         = Home;
  readonly UploadIcon       = Upload;
  readonly PrevIcon         = ChevronLeft;
  readonly NextIcon         = ChevronRight;
  readonly BuildingIcon     = Building2;
  readonly ShieldCheckIcon  = ShieldCheck;
  readonly ShieldXIcon      = ShieldX;
  readonly CheckIcon        = Check;
  readonly MapPinIcon       = MapPin;
  readonly UsersIcon        = Users;
  readonly LocateIcon       = LocateFixed;
  readonly WarningIcon      = AlertTriangle;

  private readonly API = environment.apiUrl;

  userSearchQuery = signal('');
  filteredOwners  = computed(() => {
    const q = this.userSearchQuery().toLowerCase().trim();
    const all = this.owners();
    if (!q) return all;
    return all.filter(u => 
      u.name.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q) || 
      (u.username && u.username.toLowerCase().includes(q))
    );
  });

  isLoading    = signal(true);
  allHousings  = signal<Estate[]>([]);
  searchQuery  = signal('');
  filterStatus = signal('');
  filterVerified = signal('');   // '' | 'verified' | 'pending'
  allUsers       = signal<AdminUser[]>([]);
  owners         = computed(() => this.allUsers().filter(u => u.type === 'Proprietaire' || u.type === 'Admin'));

  currentPage = signal(1);
  pageSize    = signal(10);

  filtered = computed(() => {
    const q  = this.searchQuery().trim().toLowerCase();
    const s  = this.filterStatus();
    const fv = this.filterVerified();
    return this.allHousings().filter(h => {
      const matchQ  = !q  || h.name.toLowerCase().includes(q) || h.location.toLowerCase().includes(q);
      const matchS  = !s  || h.status === s;
      const matchFV = !fv
        || (fv === 'verified' && h.is_verified === true)
        || (fv === 'pending'  && !h.is_verified);
      return matchQ && matchS && matchFV;
    });
  });

  totalPages    = computed(() => Math.ceil(this.filtered().length / this.pageSize()));
  pagedHousings = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  pendingVerificationCount = computed(() =>
    this.allHousings().filter(h => !h.is_verified && h.status === 'published').length
  );

  // Modal state
  showModal  = false;
  isEditMode = false;
  isSaving   = signal(false);
  editId: number | null = null;

  showDeleteConfirm = false;
  estateToDelete: Estate | null = null;

  selectedFiles:   File[]        = [];
  previewImages:   string[]      = [];
  existingImages:  EstateImage[] = [];
  removedImageIds: number[]      = [];

  toasts: Toast[]      = [];
  private toastCounter = 0;

  // Map picker
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  // Ownership transfer
  showTransferModal = false;
  estateToTransfer: Estate | null = null;
  newOwnerId: number | null = null;

  // Room management
  showRoomModal           = false;
  selectedEstateForRooms: Estate | null = null;
  isLoadingRooms          = signal(false);
  roomCategories          = signal<RoomCategory[]>([]);
  isRoomEditMode          = false;
  isSavingRoom            = signal(false);
  roomEditId: number | null = null;
  roomSelectedFiles: File[] = [];
  roomPreviewImages: string[] = [];
  roomExistingImages: RoomImage[] = [];
  roomRemovedImageIds: number[] = [];
  // Stepper state
  currentStep = 1;
  readonly TOTAL_STEPS = 5; // Increased steps for characteristics and supplements

  // Lists for selection
  globalCharacteristics = signal<any[]>([]);
  globalEquipment       = signal<any[]>([]);
  
  // Temporary state for create/edit
  selectedCharacteristics = signal<number[]>([]);
  estateSupplements       = signal<any[]>([]);
  roomEquipment           = signal<any[]>([]);

  estateForm!: FormGroup;
  roomFormGroup!: FormGroup;

  emptyRoomForm(): Partial<RoomCategory> {
    return { name: '', price: 300000, occupancy: 'single', quantity_available: 1,
             wifi: '0', tv: '0', fridge: '0', room_size: '2', description: '' };
  }

  constructor(
    private estateService: EstateService,
    private http: HttpClient,
    private fb: FormBuilder,
    private translate: TranslateService
  ) {
    this.initForms();
  }

  private initForms(): void {
    this.estateForm = this.fb.group({
      name: ['', [Validators.required]],
      location: ['', [Validators.required]],
      distance: [500],
      price: [0, [Validators.required, Validators.min(0)]],
      status: ['draft'],
      description: [''],
      generator: ['0'],
      forage: ['0'],
      restaurant: ['0'],
      wifi: ['0'],
      tv: ['0'],
      fridge: ['0'],
      lat: [3.884041],
      lng: [11.390736],
      owner_id: [null],
      // New fields
      etages: [1, [Validators.required, Validators.min(0)]],
      water_bills: [false],
      electricity_bills: [false],
      fence: [false],
      caretaker: [false],
      security_guard: [false],
      restaurant_on_site: [false],
      borehole_forage: [false],
      generator_available: [false],
      parking: [false],
      cctv: [false],
      cleaning_service: [false],
      allowed_gender: ['all']
    });

    this.roomFormGroup = this.fb.group({
      name: ['', [Validators.required]],
      price: [300000, [Validators.required, Validators.min(0)]],
      price_per_month: [0, [Validators.required, Validators.min(0)]],
      total_rooms: [1, [Validators.required, Validators.min(1)]],
      dimensions: [''],
      occupancy: ['single'],
      wifi: ['0'],
      tv: ['0'],
      fridge: ['0'],
      room_size: ['2'],
      description: [''],
      surface_area: [null, [Validators.min(0)]]
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    forkJoin({
      estates: this.estateService.getEstates(),
      users: this.estateService.getAdminUsers(),
      characteristics: this.estateService.getCharacteristicList(),
      equipment: this.estateService.getEquipmentList()
    }).subscribe({
      next: (res) => {
        this.allHousings.set(res.estates);
        this.allUsers.set(res.users);
        this.globalCharacteristics.set(res.characteristics);
        this.globalEquipment.set(res.equipment);
        this.isLoading.set(false);
      },
      error: () => {
        this.showToast(this.translate.instant('admin.loading_error'), 'error');
        this.isLoading.set(false);
      }
    });
  }

  onSearch(val: string): void { this.searchQuery.set(val); this.currentPage.set(1); }
  onFilter(val: string): void { this.filterStatus.set(val); this.currentPage.set(1); }
  onFilterVerified(val: string): void { this.filterVerified.set(val); this.currentPage.set(1); }
  setPage(p: number): void { if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p); }
  nextPage(): void { if (this.currentPage() < this.totalPages()) this.currentPage.update(n => n + 1); }
  prevPage(): void { if (this.currentPage() > 1) this.currentPage.update(n => n - 1); }

  // ── Verify estate (approve / reject) ─────────────────────────────────────
  approveEstate(estate: Estate): void {
    this.estateService.verifyEstate(estate.id, 'approve').subscribe({
      next: (updated: any) => {
        this.allHousings.update(list => {
          const idx = list.findIndex(h => h.id === estate.id);
          if (idx !== -1) list[idx] = { ...list[idx], ...updated };
          return [...list];
        });
        this.showToast(this.translate.instant('admin.verify_success', { name: estate.name }), 'success');
      },
      error: () => this.showToast(this.translate.instant('admin.verify_error'), 'error')
    });
  }

  rejectVerification(estate: Estate): void {
    this.estateService.verifyEstate(estate.id, 'reject').subscribe({
      next: (updated: any) => {
        this.allHousings.update(list => {
          const idx = list.findIndex(h => h.id === estate.id);
          if (idx !== -1) list[idx] = { ...list[idx], ...updated };
          return [...list];
        });
        this.showToast(this.translate.instant('admin.verify_cancelled', { name: estate.name }), 'info');
      },
      error: () => this.showToast(this.translate.instant('common.error'), 'error')
    });
  }

  isVerified(estate: Estate): boolean { return !!estate.is_verified; }

  // ── Open create ───────────────────────────────────────────────────────────
  openCreate(): void {
    this.isEditMode = false; this.editId = null;
    this.currentStep = 1;
    this.estateForm.reset({
      name: '', location: '', distance: 500, price: 0, status: 'draft', description: '',
      generator: '0', forage: '0', restaurant: '0', wifi: '0', tv: '0', fridge: '0',
      lat: 3.884041, lng: 11.390736, owner_id: null,
      etages: 1, water_bills: false, electricity_bills: false, fence: false,
      caretaker: false, security_guard: false, restaurant_on_site: false,
      borehole_forage: false, generator_available: false, parking: false,
      cctv: false, cleaning_service: false, allowed_gender: 'all'
    });
    this.selectedFiles = []; this.previewImages = [];
    this.existingImages = []; this.removedImageIds = [];
    this.selectedCharacteristics.set([]);
    this.estateSupplements.set([]);
    this.showModal = true;
    setTimeout(() => this.initMap(), 100);
  }

  // ── Open edit ─────────────────────────────────────────────────────────────
  openEdit(estate: Estate): void {
    this.isEditMode = true; this.editId = estate.id;
    this.currentStep = 1;
    this.estateForm.patchValue({
      name: estate.name, location: estate.location, distance: estate.distance,
      price: estate.price, status: estate.status, description: estate.description,
      generator: estate.generator, forage: estate.forage, restaurant: estate.restaurant,
      wifi: estate.wifi, tv: estate.tv, fridge: estate.fridge,
      lat: Number(estate.lat), lng: Number(estate.lng),
      owner_id: estate.owner?.id || null,
      // New fields
      etages: (estate as any).etages || 1,
      water_bills: (estate as any).water_bills || false,
      electricity_bills: (estate as any).electricity_bills || false,
      fence: (estate as any).fence || false,
      caretaker: (estate as any).caretaker || false,
      security_guard: (estate as any).security_guard || false,
      restaurant_on_site: (estate as any).restaurant_on_site || false,
      borehole_forage: (estate as any).borehole_forage || false,
      generator_available: (estate as any).generator_available || false,
      parking: (estate as any).parking || false,
      cctv: (estate as any).cctv || false,
      cleaning_service: (estate as any).cleaning_service || false,
      allowed_gender: (estate as any).allowed_gender || 'all'
    });
    this.existingImages = [...(estate.images ?? [])];
    this.selectedFiles = []; this.previewImages = []; this.removedImageIds = [];
    
    // Load existing characteristics and supplements
    this.estateService.getEstateCharacteristics(estate.id).subscribe(chars => {
      this.selectedCharacteristics.set(chars.map(c => c.characteristic));
    });
    this.estateService.getEstateSupplements(estate.id).subscribe(supps => {
      this.estateSupplements.set(supps);
    });

    this.showModal = true;
    setTimeout(() => this.initMap(), 100);
  }

  switchToRoomManagerFromEdit(): void {
    if (!this.editId) return;
    const est = this.allHousings().find(h => h.id === this.editId);
    if (est) { this.closeModal(); this.openManageRooms(est); }
  }

  closeModal(): void {
    this.showModal = false;
    if (this.map) { this.map.remove(); this.map = null; this.marker = null; }
  }

  // ── Image handling ────────────────────────────────────────────────────────
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

  removePreview(index: number): void { this.selectedFiles.splice(index, 1); this.previewImages.splice(index, 1); }
  removeExisting(index: number): void {
    const img = this.existingImages.splice(index, 1)[0];
    if (img?.id) this.removedImageIds.push(img.id);
  }

  // ── Save (create or update) ───────────────────────────────────────────────
  save(): void {
    if (this.estateForm.invalid) {
      this.estateForm.markAllAsTouched();
      this.showToast(this.translate.instant('admin.fill_required'), 'warning');
      return;
    }

    this.isSaving.set(true);
    const payload = this.estateForm.value;

    if (this.isEditMode && this.editId) {
      this.estateService.updateEstate(this.editId, payload)
        .pipe(catchError(err => { this.showToast(err?.error?.detail ?? this.translate.instant('common.error'), 'error'); this.isSaving.set(false); return of(null); }))
        .subscribe(updated => {
          if (!updated) return;
          this.syncEstateDetails(updated.id).subscribe(() => {
            this.showToast(this.translate.instant('admin.update_success', { name: updated.name }), 'info');
            if (this.selectedFiles.length) {
              this.uploadImages(this.editId!).subscribe(() => { this.isSaving.set(false); this.showModal = false; this.load(); });
            } else { this.isSaving.set(false); this.showModal = false; this.load(); }
          });
        });
    } else {
      this.estateService.createEstate(payload)
        .pipe(catchError(err => { this.showToast(err?.error?.detail ?? this.translate.instant('common.error'), 'error'); this.isSaving.set(false); return of(null); }))
        .subscribe(created => {
          if (!created) return;
          this.syncEstateDetails(created.id).subscribe(() => {
            this.showToast(this.translate.instant('admin.create_success', { name: created.name }), 'success');
            const finalize = () => { this.isSaving.set(false); this.showModal = false; this.load(); this.openManageRooms(created); };
            if (this.selectedFiles.length) {
              this.estateService.uploadEstateImages(created.id, this.selectedFiles).subscribe({
                next: () => finalize(),
                error: () => { this.showToast(this.translate.instant('admin.upload_error'), 'error'); finalize(); }
              });
            } else finalize();
          });
        });
    }
  }

  private syncEstateDetails(estateId: number): Observable<any> {
    const chars = this.selectedCharacteristics();
    const supps = this.estateSupplements();

    // 1. Characteristics Sync
    const charObs = this.estateService.getEstateCharacteristics(estateId).pipe(
      switchMap((existing: any[]) => {
        // Use Characteristic ID for deletion, matching backend action expectations
        const toDelete = existing.map((e: any) => this.estateService.deleteEstateCharacteristic(estateId, e.characteristic));
        const toAdd = chars.map((c: number) => this.estateService.addEstateCharacteristic(estateId, c));
        const all = [...toDelete, ...toAdd];
        return all.length ? forkJoin(all) : of([]);
      })
    );

    // 2. Supplements Sync
    const suppObs = this.estateService.getEstateSupplements(estateId).pipe(
      switchMap((existing: any[]) => {
        const toDelete = existing.map((e: any) => this.estateService.deleteSupplement(e.id));
        const toAdd = supps.map((s: any) => this.estateService.addEstateSupplement(estateId, s));
        const all = [...toDelete, ...toAdd];
        return all.length ? forkJoin(all) : of([]);
      })
    );

    return forkJoin({
      chars: charObs,
      supps: suppObs
    });
  }

  nextStep(): void {
    if (this.currentStep === 1) {
      const step1Fields = ['name', 'location', 'owner_id'];
      if (this.isEditMode) step1Fields.pop();
      
      if (!this.validateFields(step1Fields)) {
        this.showToast(this.translate.instant('admin.step1_invalid'), 'warning');
        return;
      }
    } else if (this.currentStep === 4) { // GPS Step is now 4
      if (!this.estateForm.get('lat')?.value || !this.estateForm.get('lng')?.value) {
        this.showToast(this.translate.instant('admin.location_required'), 'warning');
        return;
      }
    }

    if (this.currentStep < this.TOTAL_STEPS) {
      this.currentStep++;
      if (this.currentStep === 4) { // Map Init on step 4
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
          } else {
            this.initMap();
          }
        }, 100);
      }
    }
  }

  private validateFields(fields: string[]): boolean {
    let isValid = true;
    fields.forEach(f => {
      const ctrl = this.estateForm.get(f);
      if (ctrl?.invalid) {
        ctrl.markAsTouched();
        isValid = false;
      }
    });
    return isValid;
  }

  // ── Characteristics & Supplements management ──────────────────────────────
  toggleCharacteristic(id: number): void {
    this.selectedCharacteristics.update(list => 
      list.includes(id) ? list.filter(item => item !== id) : [...list, id]
    );
  }

  addSupplement(): void {
    this.estateSupplements.update(list => [...list, { name: '', price: 0, is_paid_service: true, is_available: true }]);
  }

  removeSupplement(index: number): void {
    this.estateSupplements.update(list => list.filter((_, i) => i !== index));
  }

  addRoomEquipment(): void {
    this.roomEquipment.update(list => [...list, { equipment: null, quantity: 1, condition: 'GOOD', note: '' }]);
  }

  removeRoomEquipment(index: number): void {
    this.roomEquipment.update(list => list.filter((_, i) => i !== index));
  }

  prevStep(): void {
    if (this.currentStep > 1) this.currentStep--;
  }

  private uploadImages(estateId: number): Observable<any> {
    if (!this.selectedFiles.length) return of([]);
    return this.estateService.uploadEstateImages(estateId, this.selectedFiles).pipe(
      catchError(err => {
        console.error('Upload failed:', err);
        return of(null);
      })
    );
  }

  getImageUrl(url: string | null): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const base = this.API.endsWith('/api') ? this.API.replace('/api', '') : '';
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  togglePublish(estate: Estate): void {
    const newStatus = estate.status === 'published' ? 'draft' : 'published';
    this.estateService.updateEstate(estate.id, { status: newStatus } as any)
      .pipe(catchError(() => { this.showToast('Erreur.', 'error'); return of(null); }))
      .subscribe(updated => {
        if (!updated) return;
        this.allHousings.update(list => {
          const idx = list.findIndex(h => h.id === estate.id);
          if (idx !== -1) list[idx] = { ...list[idx], status: newStatus };
          return [...list];
        });
        const msg = newStatus === 'published' ? 'admin.published_success' : 'admin.draft_success';
        this.showToast(this.translate.instant(msg, { name: estate.name }), 'success');
      });
  }

  confirmDelete(estate: Estate): void { this.estateToDelete = estate; this.showDeleteConfirm = true; }

  deleteConfirmed(): void {
    if (!this.estateToDelete) return;
    this.isSaving.set(true);
    this.estateService.deleteEstate(this.estateToDelete.id)
      .pipe(catchError(() => { this.showToast(this.translate.instant('common.error'), 'error'); this.isSaving.set(false); return of(null); }))
      .subscribe(() => {
        this.allHousings.update(list => list.filter(h => h.id !== this.estateToDelete!.id));
        this.showToast(this.translate.instant('admin.delete_success_msg', { name: this.estateToDelete!.name }), 'info');
        this.isSaving.set(false); this.cancelDelete();
      });
  }

  cancelDelete(): void { this.estateToDelete = null; this.showDeleteConfirm = false; }

  // ── Map logic ─────────────────────────────────────────────────────────────
  searchAddressQuery = '';
  isGeocoding = false;
  addressResults: any[] = [];

  searchAddress(): void {
    const q = this.searchAddressQuery.trim();
    if (!q) return;
    this.isGeocoding = true;
    this.http.get<any[]>(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`)
      .subscribe({
        next: results => {
          this.addressResults = results.slice(0, 5);
          this.isGeocoding = false;
          if (this.addressResults.length === 0) {
            this.showToast(this.translate.instant('admin.no_results_found'), 'info');
          } else {
            this.selectAddress(this.addressResults[0]);
          }
        },
        error: (err) => {
          console.error('Geocoding error:', err);
          this.isGeocoding = false;
          this.showToast(this.translate.instant('admin.geocoding_error'), 'error');
        }
      });
  }

  selectAddress(result: any): void {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    this.estateForm.patchValue({ lat, lng: lon });
    if (this.map && this.marker) {
      this.marker.setLatLng([lat, lon]);
      this.map.setView([lat, lon], 15);
    }
    this.addressResults = [];
    this.searchAddressQuery = result.display_name;
  }

  private initMap(): void {
    const el = document.getElementById('map-picker');
    if (!el) return;
    
    const lat = this.estateForm.get('lat')?.value || 3.884041;
    const lng = this.estateForm.get('lng')?.value || 11.390736;

    this.map = L.map(el).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    const icon = L.icon({
      iconUrl: 'assets/leaflet/marker-icon.png',
      iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
      shadowUrl: 'assets/leaflet/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });

    this.marker = L.marker([lat, lng], { icon, draggable: true }).addTo(this.map);
    
    this.marker.on('dragend', () => {
      const pos = this.marker!.getLatLng();
      this.estateForm.patchValue({ lat: pos.lat, lng: pos.lng });
    });

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.marker!.setLatLng(e.latlng);
      this.estateForm.patchValue({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
  }

  onLatLngInput(): void {
    const lat = Number(this.estateForm.get('lat')?.value);
    const lng = Number(this.estateForm.get('lng')?.value);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return;
    }

    if (this.map && this.marker) {
      this.marker.setLatLng([lat, lng]);
      this.map.setView([lat, lng], 16);
    }
  }

  centerOnEyang(): void {
    const eyangPos: L.LatLngExpression = [3.884041, 11.390736];
    if (this.map && this.marker) {
      this.marker.setLatLng(eyangPos);
      this.map.setView(eyangPos, 15);
      this.estateForm.patchValue({ lat: 3.884041, lng: 11.390736 });
    }
  }

  // ── Ownership transfer ─────────────────────────────────────────────────────
  openTransfer(estate: Estate): void {
    this.estateToTransfer = estate;
    this.newOwnerId = estate.owner?.id || null;
    this.showTransferModal = true;
  }

  closeTransfer(): void {
    this.showTransferModal = false;
    this.estateToTransfer = null;
    this.newOwnerId = null;
  }

  confirmTransfer(): void {
    if (!this.estateToTransfer || !this.newOwnerId) return;
    this.isSaving.set(true);
    this.estateService.transferOwnership(this.estateToTransfer.id, this.newOwnerId).subscribe({
      next: () => {
        this.showToast(`Propriété de "${this.estateToTransfer!.name}" transférée.`, 'success');
        this.isSaving.set(false);
        this.closeTransfer();
        this.load();
      },
      error: () => {
        this.showToast('Erreur lors du transfert.', 'error');
        this.isSaving.set(false);
      }
    });
  }

  // ── Room management ───────────────────────────────────────────────────────
  openManageRooms(estate: Estate): void {
    this.selectedEstateForRooms = estate; this.showRoomModal = true;
    this.isRoomEditMode = false; this.loadRooms(estate.id);
  }

  closeRoomModal(): void { this.showRoomModal = false; this.selectedEstateForRooms = null; }

  loadRooms(estateId: number): void {
    this.isLoadingRooms.set(true);
    this.estateService.getRoomCategories(estateId).subscribe({
      next: rooms => { this.roomCategories.set(rooms); this.isLoadingRooms.set(false); },
      error: () => { this.showToast('Erreur chargement chambres.', 'error'); this.isLoadingRooms.set(false); }
    });
  }

  openCreateRoom(): void {
    this.roomFormGroup.reset({
      name: '', price: 300000, price_per_month: 0, total_rooms: 1, dimensions: '',
      occupancy: 'single', wifi: '0', tv: '0', fridge: '0', room_size: '2', description: '', surface_area: null
    });
    this.roomSelectedFiles = []; this.roomPreviewImages = [];
    this.roomExistingImages = []; this.roomRemovedImageIds = [];
    this.roomEquipment.set([]);
  }

  openEditRoom(room: RoomCategory): void {
    this.isRoomEditMode = true; this.roomEditId = room.id;
    this.roomFormGroup.patchValue({ ...room });
    this.roomExistingImages = [...(room.images || [])];
    this.roomSelectedFiles = []; this.roomPreviewImages = []; this.roomRemovedImageIds = [];
    
    this.estateService.getRoomEquipment(room.id).subscribe(equip => {
      this.roomEquipment.set(equip.map(e => ({
        equipment: e.equipment,
        quantity: e.quantity,
        condition: e.condition,
        note: e.note,
        id: e.id
      })));
    });
  }

  deleteRoom(room: RoomCategory): void {
    if (confirm(this.translate.instant('admin.delete_room_confirm', { name: room.name }))) {
      this.estateService.deleteRoomCategory(room.id).subscribe(() => {
        this.showToast(this.translate.instant('admin.delete_room_success'), 'info');
        if (this.selectedEstateForRooms) this.loadRooms(this.selectedEstateForRooms.id);
      });
    }
  }

  saveRoom(): void {
    if (!this.selectedEstateForRooms) return;
    if (this.roomFormGroup.invalid) {
      this.roomFormGroup.markAllAsTouched();
      this.showToast('Veuillez remplir tous les champs obligatoires.', 'warning');
      return;
    }
    this.isSavingRoom.set(true);
    const payload = { ...this.roomFormGroup.value, estate: this.selectedEstateForRooms.id };
    const req = this.roomEditId
      ? this.estateService.updateRoomCategory(this.roomEditId, payload)
      : this.estateService.createRoomCategory(payload);
    req.subscribe({
      next: saved => {
        this.syncRoomEquipment(saved.id).subscribe(() => {
          const afterSave = () => {
            this.isSavingRoom.set(false); this.isRoomEditMode = false;
            const msg = this.roomEditId ? 'admin.room_update_success' : 'admin.room_create_success';
            this.showToast(this.translate.instant(msg), 'success');
            this.loadRooms(this.selectedEstateForRooms!.id);
          };
          if (this.roomSelectedFiles.length > 0) {
            this.estateService.uploadRoomImages(saved.id, this.roomSelectedFiles).subscribe(afterSave);
          } else afterSave();
        });
      },
      error: () => { this.showToast('Erreur.', 'error'); this.isSavingRoom.set(false); }
    });
  }

  private syncRoomEquipment(categoryId: number): Observable<any> {
    const equip = this.roomEquipment();
    return this.estateService.getRoomEquipment(categoryId).pipe(
      map((existing: any[]) => {
        const toDelete = existing.map((e: any) => this.estateService.deleteRoomEquipment(e.id));
        const toAdd = equip.map((e: any) => this.estateService.addRoomEquipment({
          room_category: categoryId,
          equipment: e.equipment,
          quantity: e.quantity,
          condition: e.condition,
          note: e.note
        }));
        return [...toDelete, ...toAdd];
      }),
      map((obs: Observable<any>[]) => obs.length ? forkJoin(obs) : of([]))
    );
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

  removeRoomPreview(idx: number): void { this.roomSelectedFiles.splice(idx, 1); this.roomPreviewImages.splice(idx, 1); }
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




