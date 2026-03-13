import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule, Users, Home, Calendar, Star,
  ShoppingBag, TrendingUp
} from 'lucide-angular';
import { EstateService } from '../../services/estate.service';
import { catchError, of } from 'rxjs';

interface StatCard {
  title: string; value: string; change: string;
  changeType: 'positive' | 'warning' | 'neutral';
  icon: any; iconColor: string;
}
interface Activity {
  type: string; title: string; date: string;
  icon: any; iconColor: string;
}
interface MonthBar { month: string; value: number; }

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
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

  isLoading = signal(true);
  hasError  = signal(false);

  stats: StatCard[]            = [];
  recentActivities: Activity[] = [];
  monthlyReservations: MonthBar[] = [];
  maxMonthValue = 1;

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

        this.stats = [
          {
            title: 'Total utilisateurs',
            value: String(data.total_users ?? 0),
            change: 'Utilisateurs actifs',
            changeType: 'positive',
            icon: Users,
            iconColor: '#3B82F6'
          },
          {
            title: 'Logements',
            value: String(data.total_estates ?? 0),
            change: 'Logements enregistrés',
            changeType: 'positive',
            icon: Home,
            iconColor: '#10B981'
          },
          {
            title: 'Réservations',
            value: String(data.total_orders ?? 0),
            change: 'Total des réservations',
            changeType: 'warning',
            icon: Calendar,
            iconColor: '#F59E0B'
          },
          {
            title: 'Avis',
            value: String(data.total_reviews ?? 0),
            change: 'Total des avis',
            changeType: 'positive',
            icon: Star,
            iconColor: '#8B5CF6'
          }
        ];

        this.recentActivities = (data.recent_activities ?? []).map((a: any) => ({
          type:      a.type,
          title:     a.title,
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
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    } catch { return iso; }
  }
}