import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-reports.component.html',
  styleUrl: './admin-reports.component.css'
})
export class AdminReportsComponent {
  months = [
    { name: 'Jan', value: '2.5M' },
    { name: 'Fév', value: '3.2M' },
    { name: 'Mar', value: '2.1M' },
    { name: 'Avr', value: '3.8M' },
    { name: 'Mai', value: '3.4M' },
    { name: 'Juin', value: '4.2M' }
  ];
}
