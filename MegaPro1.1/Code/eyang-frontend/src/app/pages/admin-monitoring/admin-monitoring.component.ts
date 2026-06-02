import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Activity, Database, Wifi, AlertTriangle, CheckCircle, Users, RefreshCw, Circle } from 'lucide-angular';
import { EstateService } from '../../services/estate.service';
import { catchError, of, interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-monitoring',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './admin-monitoring.component.html',
  styleUrl: './admin-monitoring.component.css'
})
export class AdminMonitoringComponent implements OnInit, OnDestroy {
  readonly ActivityIcon   = Activity;
  readonly DbIcon         = Database;
  readonly WifiIcon       = Wifi;
  readonly WarningIcon    = AlertTriangle;
  readonly OkIcon         = CheckCircle;
  readonly UsersIcon      = Users;
  readonly RefreshIcon    = RefreshCw;
  readonly CircleIcon     = Circle;

  isLoading = signal(true);
  data: any  = null;
  lastRefresh: Date | null = null;
  private refreshSub?: Subscription;

  constructor(private svc: EstateService) {}

  ngOnInit(): void {
    this.load();
    // Auto-refresh every 30s
    this.refreshSub = interval(30000).subscribe(() => this.load());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  load(): void {
    this.isLoading.set(true);
    this.svc.getAdminMonitoring()
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        this.data = res;
        this.lastRefresh = new Date();
        this.isLoading.set(false);
      });
  }

  getLevelClass(level: string): string {
    return { ERROR: 'log-error', WARNING: 'log-warning', INFO: 'log-info', CRITICAL: 'log-critical' }[level] ?? '';
  }

  formatTime(iso: string): string {
    try { return new Date(iso).toLocaleString('fr-FR'); } catch { return iso; }
  }
}
