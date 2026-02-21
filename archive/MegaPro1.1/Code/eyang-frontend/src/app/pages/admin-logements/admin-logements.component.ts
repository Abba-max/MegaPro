import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Search, Filter, Plus, Home, MapPin, MoreHorizontal, Star } from 'lucide-angular';

@Component({
  selector: 'app-admin-logements',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './admin-logements.component.html',
  styleUrl: './admin-logements.component.css'
})
export class AdminLogementsComponent {
  readonly SearchIcon = Search;
  readonly FilterIcon = Filter;
  readonly PlusIcon = Plus;
  readonly HomeIcon = Home;
  readonly MapPinIcon = MapPin;
  readonly MoreIcon = MoreHorizontal;
  readonly StarIcon = Star;

  housings = [
    { title: 'Résidence Les Palmiers', price: 45000, places: '2/8', rating: 4.5, status: 'Actif' },
    { title: 'Cité Universitaire Soa', price: 35000, places: '5/20', rating: 4.0, status: 'Actif' },
    { title: 'Studio Ngoa-Ekelle', price: 55000, places: '1/4', rating: 5.0, status: 'Actif' },
    { title: 'Résidence Académie', price: 40000, places: '4/12', rating: 3.0, status: 'Actif' },
    { title: 'Foyer des Étudiants', price: 25000, places: '8/50', rating: 0.0, status: 'Actif' },
    { title: 'Villa Partagée Melen', price: 60000, places: '2/6', rating: 5.0, status: 'Actif' }
  ];
}
