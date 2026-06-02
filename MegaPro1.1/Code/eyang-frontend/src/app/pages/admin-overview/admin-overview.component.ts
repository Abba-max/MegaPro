import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import {
  LucideAngularModule, Users, Home, Calendar, Star,
  ShoppingBag, TrendingUp, AlertTriangle, Activity
} from 'lucide-angular';
import { EstateService } from '../../services/estate.service';
import { catchError, of } from 'rxjs';

interface StatCard {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'warning' | 'neutral';
  icon: any;
  iconColor: string;
  link: string;
}

interface DashboardActivity {
  type: string;
  title: string;
  subtitle: string;
  date: string;
  icon: any;
  iconColor: string;
}

interface MonthBar {
  month: string;
  value: number;
}

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslateModule, RouterModule],
  templateUrl: './admin-overview.component.html',
  styleUrl: './admin-overview.component.css'
})
export class AdminOverviewComponent implements OnInit {
  readonly UsersIcon    = Users;
  readonly HomeIcon     = Home;
  readonly CalendarIcon = Calendar;
  readonly StarIcon     = Star;
  readonly OrderIcon    = ShoppingBag;
  readonly TrendIcon    = TrendingUp;
  readonly AlertIcon    = AlertTriangle;
  readonly ActivityIcon = Activity;

  isLoading = signal(true);
  hasError  = signal(false);

  stats: StatCard[]            = [];
  recentActivities: DashboardActivity[] = [];
  monthlyReservations: MonthBar[] = [];
  maxMonthValue = 1;

  pendingPaymentsCount = 0;
  pendingVerificationsCount = 0;

  constructor(private estateService: EstateService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.estateService.getAdminStats()
      .pipe(catchError(() => { this.hasError.set(true); return of(null); }))
      .subscribe(data => {
        this.isLoading.set(false);
        if (!data) return;

        this.pendingPaymentsCount = data.pending_payments ?? 0;
        this.pendingVerificationsCount = data.pending_verifications ?? 0;

        this.stats = [
          {
            title: 'sidebar.users',
            value: String(data.total_users ?? 0),
            change: 'sidebar.users',
            changeType: 'positive',
            icon: Users,
            iconColor: '#3B82F6',
            link: '/app-admin/users'
          },
          {
            title: 'sidebar.logements',
            value: String(data.total_estates ?? 0),
            change: 'sidebar.logements',
            changeType: 'positive',
            icon: Home,
            iconColor: '#10B981',
            link: '/app-admin/logements'
          },
          {
            title: 'sidebar.reservations',
            value: String(data.total_orders ?? 0),
            change: 'sidebar.reservations',
            changeType: 'warning',
            icon: Calendar,
            iconColor: '#F59E0B',
            link: '/app-admin/bookings'
          },
          {
            title: 'sidebar.reviews',
            value: String(data.total_reviews ?? 0),
            change: 'sidebar.reviews',
            changeType: 'neutral',
            icon: Star,
            iconColor: '#8B5CF6',
            link: '/app-admin/reviews'
          }
        ];

        this.recentActivities = (data.recent_activities ?? []).map((a: any) => ({
          type:      a.type,
          title:     a.title,
          subtitle:  a.subtitle || '',
          date:      this.formatDate(a.created_at),
          icon:      a.type === 'order' ? Calendar : Star,
          iconColor: a.type === 'order' ? '#F59E0B' : '#8B5CF6'
        }));

        this.monthlyReservations = (data.monthly_orders ?? []).map((m: any) => ({
          month: m.month,
          value: m.value ?? 0
        }));
        this.maxMonthValue = Math.max(1, ...this.monthlyReservations.map(m => m.value));
      });
  }

  barHeightPct(value: number): number {
    return Math.max(4, Math.round((value / this.maxMonthValue) * 100));
  }

  private formatDate(iso: string): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return iso; }
  }
}
