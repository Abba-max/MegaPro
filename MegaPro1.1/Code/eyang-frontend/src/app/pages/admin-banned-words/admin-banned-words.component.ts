import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ShieldAlert, Plus, Trash2, RefreshCw } from 'lucide-angular';
import { EstateService } from '../../services/estate.service';
import { catchError, of } from 'rxjs';

export interface Toast { id: number; type: 'success'|'error'; message: string; }

@Component({
  selector: 'app-admin-banned-words',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './admin-banned-words.component.html',
  styleUrl: './admin-banned-words.component.css'
})
export class AdminBannedWordsComponent implements OnInit {
  readonly BanIcon     = ShieldAlert;
  readonly PlusIcon    = Plus;
  readonly TrashIcon   = Trash2;
  readonly RefreshIcon = RefreshCw;

  isLoading = signal(true);
  words     = signal<{ id: number; word: string; created_at: string }[]>([]);
  newWord   = '';
  isSaving  = false;

  toasts: Toast[]      = [];
  private toastCounter = 0;

  constructor(private svc: EstateService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    this.svc.getBannedWords()
      .pipe(catchError(() => of([])))
      .subscribe(d => { this.words.set(d); this.isLoading.set(false); });
  }

  add(): void {
    const w = this.newWord.trim().toLowerCase();
    if (!w) return;
    if (this.words().some(x => x.word === w)) {
      this.showToast('Ce mot est déjà dans la liste.', 'error'); return;
    }
    this.isSaving = true;
    this.svc.addBannedWord(w).subscribe({
      next: res => {
        this.words.update(list => [...list, res]);
        this.newWord = '';
        this.isSaving = false;
        this.showToast(`"${res.word}" ajouté avec succès.`, 'success');
      },
      error: () => { this.isSaving = false; this.showToast('Erreur lors de l\'ajout.', 'error'); }
    });
  }

  delete(word: { id: number; word: string }): void {
    if (!confirm(`Supprimer le mot interdit "${word.word}" ?`)) return;
    this.svc.deleteBannedWord(word.id).subscribe({
      next: () => {
        this.words.update(list => list.filter(w => w.id !== word.id));
        this.showToast(`"${word.word}" supprimé.`, 'success');
      },
      error: () => this.showToast('Erreur lors de la suppression.', 'error')
    });
  }

  showToast(message: string, type: Toast['type']): void {
    const id = ++this.toastCounter;
    this.toasts.push({ id, type, message });
    setTimeout(() => this.toasts = this.toasts.filter(t => t.id !== id), 4000);
  }

  fmt(iso: string): string {
    try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return iso; }
  }
}
