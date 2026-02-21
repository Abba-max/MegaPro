import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
    LucideAngularModule,
    Search,
    MapPin,
    Wifi,
    Zap,
    Droplets,
    Star,
    Filter,
    Coffee,
    Check,
    Lock,
    Home,
    Building
} from 'lucide-angular';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, RouterModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent {
    readonly SearchIcon = Search;
    readonly MapPinIcon = MapPin;
    readonly WifiIcon = Wifi;
    readonly ZapIcon = Zap;
    readonly DropletsIcon = Droplets;
    readonly StarIcon = Star;
    readonly FilterIcon = Filter;
    readonly CoffeeIcon = Coffee;
    readonly CheckIcon = Check;
    readonly LockIcon = Lock;
    readonly HomeIcon = Home;
    readonly BuildingIcon = Building;

    housings = [
        { id: 'palmiers', image: '', places: 2, rating: '4.5', title: 'Résidence Les Palmiers', distance: '0.5 km', price: 45000, features: ['wifi', 'zap'], type: 'Chambre' },
        { id: 'soa', image: '', places: 5, rating: '4.0', title: 'Cité Universitaire Soa', distance: '1.2 km', price: 35000, features: ['wifi', 'droplets'], type: 'Studio' },
        { id: 'ngoa', image: '', places: 1, rating: '5.0', title: 'Studio Ngoa-Ekelle', distance: '0.3 km', price: 55000, features: ['wifi', 'zap', 'droplets'], type: 'Studio' },
        { id: 'academie', image: '', places: 4, rating: '3.0', title: 'Résidence Académie', distance: '0.8 km', price: 40000, features: ['wifi'], type: 'Chambre' },
        { id: 'foyer', image: '', places: 8, rating: '', title: 'Foyer des Étudiants', distance: '2 km', price: 25000, features: ['droplets'], type: 'Dortoir' },
        { id: 'melen', image: '', places: 2, rating: '5.0', title: 'Villa Partagée Melen', distance: '1.5 km', price: 60000, features: ['wifi', 'zap', 'droplets'], type: 'Villa' }
    ];
}
