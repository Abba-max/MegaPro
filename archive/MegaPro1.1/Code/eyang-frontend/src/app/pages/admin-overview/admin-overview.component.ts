import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Users, Home, Calendar, DollarSign, Calendar as CalendarIcon, Star } from 'lucide-angular';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './admin-overview.component.html',
  styleUrl: './admin-overview.component.css'
})
export class AdminOverviewComponent {
  readonly UsersIcon = Users;
  readonly HomeIcon = Home;
  readonly CalendarIcon = Calendar;
  readonly DollarSignIcon = DollarSign;
  readonly StarIcon = Star;

  stats = [
    {
      title: 'Total utilisateurs',
      value: '6',
      change: '+ 12% ce mois',
      changeType: 'positive',
      icon: Users,
      iconColor: '#3B82F6'
    },
    {
      title: 'Logements',
      value: '6',
      change: '+ 5 nouveaux',
      changeType: 'positive',
      icon: Home,
      iconColor: '#10B981'
    },
    {
      title: 'Réservations',
      value: '3',
      change: '3 en attente',
      changeType: 'warning',
      icon: Calendar,
      iconColor: '#F59E0B'
    },
    {
      title: 'Revenus (FCFA)',
      value: '40 000',
      change: '+ 8% ce mois',
      changeType: 'positive',
      icon: DollarSign,
      iconColor: '#8B5CF6'
    }
  ];

  recentActivities = [
    {
      type: 'reservation',
      title: 'Nouvelle réservation: Cité Universitaire Soa',
      date: '22/01/2024',
      icon: CalendarIcon,
      iconColor: '#EF4444'
    },
    {
      type: 'reservation',
      title: 'Nouvelle réservation: Résidence Les Palmiers',
      date: '20/01/2024',
      icon: CalendarIcon,
      iconColor: '#EF4444'
    },
    {
      type: 'reservation',
      title: 'Nouvelle réservation: Studio Ngoa-Ekelle',
      date: '18/01/2024',
      icon: CalendarIcon,
      iconColor: '#EF4444'
    },
    {
      type: 'review',
      title: 'Nouvel avis de Paul N.',
      date: '03/01/2024',
      icon: Star,
      iconColor: '#F59E0B'
    },
    {
      type: 'review',
      title: 'Nouvel avis de Sophie M.',
      date: '02/01/2024',
      icon: Star,
      iconColor: '#F59E0B'
    }
  ];

  monthlyReservations = [
    { month: 'Jan', value: 12 },
    { month: 'Fév', value: 15 },
    { month: 'Mar', value: 10 },
    { month: 'Avr', value: 18 },
    { month: 'Mai', value: 20 },
    { month: 'Juin', value: 22 }
  ];
}

