import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { LucideAngularModule, BarChart3, Users, Home, Star, Calendar, Loader } from 'lucide-angular';
import { EstateService, AdminStats } from '../../services/estate.service';
import { catchError, of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, DatePipe, LucideAngularModule, TranslateModule],
  templateUrl: './admin-reports.component.html',
  styleUrl: './admin-reports.component.css'
})
export class AdminReportsComponent implements OnInit {
  readonly BarChartIcon = BarChart3;
  readonly UsersIcon    = Users;
  readonly HomeIcon     = Home;
  readonly StarIcon     = Star;
  readonly CalendarIcon = Calendar;
  readonly LoaderIcon   = Loader;

  isLoading = signal(true);
  data     = signal<AdminStats | null>(null);
  chartMax = signal(1);

  constructor(private estateService: EstateService) {}

  ngOnInit(): void {
    this.estateService.getAdminStats()
      .pipe(catchError(() => of(null)))
      .subscribe(d => {
        this.data.set(d as AdminStats | null);
        this.chartMax.set(Math.max(...(d?.monthly_orders?.map(m => m.value) ?? [1]), 1));
        this.isLoading.set(false);
      });
  }

  getBarHeight(value: number): number {
    return Math.round((value / this.chartMax()) * 100);
  }

  getAvgOrders(): string {
    const d = this.data();
    if (!d || d.monthly_orders.length === 0) return '–';
    const total = d.monthly_orders.reduce((acc, m) => acc + m.value, 0);
    return (total / d.monthly_orders.length).toFixed(1);
  }

  getPeakMonth(): string {
    const d = this.data();
    if (!d || d.monthly_orders.length === 0) return '–';
    const peak = d.monthly_orders.reduce((a, b) => a.value > b.value ? a : b);
    return `${peak.month} (${peak.value})`;
  }
}




