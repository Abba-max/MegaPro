import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Calendar } from 'lucide-angular';

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './admin-bookings.component.html',
  styleUrl: './admin-bookings.component.css'
})
export class AdminBookingsComponent {
  readonly CalendarIcon = Calendar;

  bookings = [
    { property: 'Résidence Les Palmiers', client: 'Marie Kamga', date: '20/01/2024', status: 'En attente' },
    { property: 'Studio Ngoa-Ekelle', client: 'Sophie Mballa', date: '18/01/2024', status: 'Acceptée' },
    { property: 'Cité Universitaire Soa', client: 'Paul Nkolo', date: '22/01/2024', status: 'En attente' }
  ];
}

