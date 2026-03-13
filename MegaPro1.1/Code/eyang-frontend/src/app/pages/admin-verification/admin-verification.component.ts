import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, RefreshCw, CheckCircle, X, Eye } from 'lucide-angular';
import { EstateService } from '../../services/estate.service';

@Component({
    selector: 'app-admin-verification',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    templateUrl: './admin-verification.component.html',
    styleUrl: './admin-verification.component.css'
})
export class AdminVerificationComponent implements OnInit {

    // Icons
    readonly RefreshIcon = RefreshCw;
    readonly CheckCircleIcon = CheckCircle;
    readonly XIcon = X;
    readonly EyeIcon = Eye;

    pendingOwners: any[] = [];
    isLoading = signal(true);
    selectedOwner: any | null = null;

    constructor(private estateService: EstateService) { }

    ngOnInit(): void {
        this.loadPendingOwners();
    }

    loadPendingOwners(): void {
        this.isLoading.set(true);
        this.estateService.getPendingOwners().subscribe({
            next: (owners) => {
                this.pendingOwners = owners;
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to load pending owners:', err);
                this.isLoading.set(false);
            }
        });
    }

    getInitials(name: string): string {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    formatDate(dateStr: string): string {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    }

    viewIdCard(owner: any): void {
        this.selectedOwner = owner;
    }

    closeModal(): void {
        this.selectedOwner = null;
    }

    verifyOwner(userId: number, action: 'approve' | 'reject'): void {
        const confirmMsg = action === 'approve'
            ? 'Approuver ce propriétaire ? Il pourra alors publier des logements.'
            : 'Rejeter cette demande ? Le compte restera non vérifié.';

        if (!confirm(confirmMsg)) return;

        this.estateService.verifyOwner(userId, action).subscribe({
            next: () => {
                this.pendingOwners = this.pendingOwners.filter(o => o.id !== userId);
                if (this.selectedOwner?.id === userId) {
                    this.closeModal();
                }
            },
            error: (err) => {
                console.error(`Failed to ${action} owner:`, err);
                alert(`Erreur lors de l'action: ${action}`);
            }
        });
    }
}
