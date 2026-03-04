import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
    LucideAngularModule,
    MapPin,
    Search,
    Wifi,
    Zap,
    Droplets,
    Star,
    Filter,
    Coffee,
    Check,
    Lock,
    Home,
    Building,
    Shield,
    MessageSquare
} from 'lucide-angular';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, RouterModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent {
    readonly MapPinIcon = MapPin;
    readonly SearchIcon = Search;
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
    readonly ShieldIcon = Shield;
    readonly MessageSquareIcon = MessageSquare;

    housings = [
        { id: 'palmiers', image: '', places: 2, rating: '4.5', title: 'Résidence Les Palmiers', distance: '0.5 km du campus', price: 45000, features: ['wifi', 'zap'], type: 'Chambre' },
        { id: 'soa', image: '', places: 5, rating: '4.0', title: 'Cité Universitaire Soa', distance: '1.2 km du campus', price: 35000, features: ['wifi', 'droplets'], type: 'Studio' },
        { id: 'ngoa', image: '', places: 1, rating: '5.0', title: 'Studio Ngoa-Ekelle', distance: '0.3 km du campus', price: 55000, features: ['wifi', 'zap', 'droplets'], type: 'Studio' },
        { id: 'academie', image: '', places: 4, rating: '3.0', title: 'Résidence Académie', distance: '0.8 km du campus', price: 40000, features: ['wifi'], type: 'Chambre' },
        { id: 'foyer', image: '', places: 8, rating: '', title: 'Foyer des Étudiants', distance: '2 km du campus', price: 25000, features: ['droplets'], type: 'Dortoir' },
        { id: 'melen', image: '', places: 2, rating: '5.0', title: 'Villa Partagée Melen', distance: '1.5 km du campus', price: 60000, features: ['wifi', 'zap', 'droplets'], type: 'Villa' }
    ];

    faqs = [
        {
            question: "Comment trouver un logement sur Eyang Estate ?",
            answer: "Parcourez notre liste de logements disponibles, filtrez selon vos critères (wifi, générateur, forage, budget), consultez les détails et envoyez une demande de réservation directement au propriétaire depuis la plateforme.",
            open: false
        },
        {
            question: "Les logements sont-ils vérifiés ?",
            answer: "Oui, chaque logement est inspecté par notre équipe avant d'être publié. Nous vérifions les conditions sanitaires, les équipements annoncés et les informations fournies par les propriétaires.",
            open: false
        },
        {
            question: "Comment fonctionne le système de réservation ?",
            answer: "Une fois votre compte créé, vous pouvez envoyer une demande de réservation au propriétaire. Il vous répond dans les 24h. Après confirmation, vous pouvez effectuer le paiement de la caution et du premier mois de loyer de façon sécurisée.",
            open: false
        },
        {
            question: "Je suis propriétaire, comment mettre mon logement en ligne ?",
            answer: "Créez un compte Propriétaire, renseignez les informations de votre logement (photos, équipements, tarifs, conditions) depuis votre tableau de bord. Votre annonce sera examinée puis publiée sous 48h.",
            open: false
        },
        {
            question: "Quels sont les frais de la plateforme ?",
            answer: "Pour les étudiants, la plateforme est entièrement gratuite. Pour les propriétaires, une commission de 5% est prélevée sur chaque mois de loyer encaissé via la plateforme. Aucun frais d'inscription.",
            open: false
        },
        {
            question: "Comment contacter le support en cas de problème ?",
            answer: "Vous pouvez nous contacter via la page Contact de notre site, par email à support@eyangestate.cm, ou via la messagerie intégrée de la plateforme. Notre équipe répond dans un délai de 2h en semaine.",
            open: false
        }
    ];

    toggleFaq(index: number): void {
        this.faqs[index].open = !this.faqs[index].open;
    }

    scrollToListings(): void {
        const el = document.querySelector('.listings-section');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}