import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, FileText, RefreshCw, Filter, ChevronLeft, ChevronRight } from 'lucide-angular';
import { EstateService } from '../../services/estate.service';
import { catchError, of, forkJoin } from 'rxjs';

@Component({
  selector: 'app-admin-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './admin-logs.component.html',
  styleUrl: './admin-logs.component.css'
})
export class AdminLogsComponent implements OnInit {
  readonly FileIcon    = FileText;
  readonly RefreshIcon = RefreshCw;
  readonly FilterIcon  = Filter;
  readonly PrevIcon    = ChevronLeft;
  readonly NextIcon    = ChevronRight;

  activeTab = signal<'system' | 'audit'>('system');

  // System logs
  isLoadingSys  = signal(true);
  systemLogs    = signal<any[]>([]);
  sysLevelFilter = signal('');
  sysCatFilter   = signal('');

  // Audit logs
  isLoadingAudit = signal(true);
  auditLogs      = signal<any[]>([]);
  auditAction    = signal('');
  auditResult    = signal('');

  // Pagination
  page     = signal(1);
  pageSize = 20;

  filteredSystem = computed(() => {
    let list = this.systemLogs();
    const lv = this.sysLevelFilter().toUpperCase();
    const cat = this.sysCatFilter().toLowerCase();
    if (lv)  list = list.filter(l => l.level === lv);
    if (cat) list = list.filter(l => l.category?.toLowerCase().includes(cat));
    return list;
  });

  filteredAudit = computed(() => {
    let list = this.auditLogs();
    const act = this.auditAction().toLowerCase();
    const res = this.auditResult().toUpperCase();
    if (act) list = list.filter(l => l.action?.toLowerCase().includes(act));
    if (res) list = list.filter(l => l.result === res);
    return list;
  });

  pagedSystem = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredSystem().slice(start, start + this.pageSize);
  });
  pagedAudit = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredAudit().slice(start, start + this.pageSize);
  });

  totalPagesSys   = computed(() => Math.max(1, Math.ceil(this.filteredSystem().length / this.pageSize)));
  totalPagesAudit = computed(() => Math.max(1, Math.ceil(this.filteredAudit().length / this.pageSize)));

  constructor(private svc: EstateService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoadingSys.set(true);
    this.isLoadingAudit.set(true);
    this.svc.getSystemLogs({ limit: 200 })
      .pipe(catchError(() => of([])))
      .subscribe(d => { this.systemLogs.set(d); this.isLoadingSys.set(false); });
    this.svc.getAuditLogs({ limit: 200 })
      .pipe(catchError(() => of([])))
      .subscribe(d => { this.auditLogs.set(d); this.isLoadingAudit.set(false); });
  }

  setTab(t: 'system' | 'audit'): void { this.activeTab.set(t); this.page.set(1); }
  prevPage(): void { if (this.page() > 1) this.page.update(p => p - 1); }
  nextPage(total: number): void { if (this.page() < total) this.page.update(p => p + 1); }

  getLevelClass(level: string): string {
    return { ERROR: 'badge-error', WARNING: 'badge-warning', INFO: 'badge-info', CRITICAL: 'badge-critical' }[level] ?? '';
  }
  getResultClass(r: string): string { return r === 'SUCCESS' ? 'badge-ok' : 'badge-error'; }
  fmt(iso: string): string { try { return new Date(iso).toLocaleString('fr-FR'); } catch { return iso; } }
}
