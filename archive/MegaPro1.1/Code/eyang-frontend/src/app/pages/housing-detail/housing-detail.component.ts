import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
    LucideAngularModule,
    ChevronLeft,
    Building,
    MapPin,
    Star,
    Home,
    X,
    Wifi,
    Droplets,
    Zap,
    Calendar,
    MessageSquare,
    Send
} from 'lucide-angular';
import { AuthService, User } from '../../services/auth.service';

@Component({
    selector: 'app-housing-detail',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, FormsModule],
    templateUrl: './housing-detail.component.html',
    styleUrl: './housing-detail.component.css'
})
export class HousingDetailComponent implements OnInit {
    readonly ChevronLeftIcon = ChevronLeft;
    readonly BuildingIcon = Building;
    readonly MapPinIcon = MapPin;
    readonly StarIcon = Star;
    readonly HomeIcon = Home;
    readonly XIcon = X;
    readonly WifiIcon = Wifi;
    readonly DropletsIcon = Droplets;
    readonly ZapIcon = Zap;
    readonly CalendarIcon = Calendar;
    readonly MessageIcon = MessageSquare;
    readonly SendIcon = Send;

    currentUser: User | null = null;
    showContactModal = false;
    housingId: string | null = null;

    // Contact form
    contactForm = {
        name: '',
        phone: '',
        message: ''
    };

    housing = {
        title: 'Résidence Les Palmiers',
        distance: 0.5,
        price: 45000,
        image: '',
        rating: 4.5,
        places: 2,
        minMonths: 2,
        description: 'Grande cité avec espaces verts.',
        equipments: [
            { name: 'WiFi', icon: Wifi, color: 'orange' },
            { name: 'Forage', icon: Droplets, color: 'blue' }
        ]
    };

    reviews = [
        { name: 'Marie K.', date: '15/01/2024', comment: 'Excellent!', initials: 'M' },
        { name: 'Paul N.', date: '10/01/2024', comment: 'Très bien situé et propre.', initials: 'P' }
    ];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private location: Location,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.housingId = this.route.snapshot.paramMap.get('id');

        this.authService.currentUser$.subscribe(user => {
            this.currentUser = user;
            if (user) {
                this.updateHousingData();
                this.contactForm.name = user.name;
            }
        });

        this.updateHousingData();
    }

    updateHousingData() {
        if (this.housingId === 'ngoa') {
            this.housing = {
                title: 'Studio Ngoa-Ekelle',
                distance: 0.3,
                price: 55000,
                image: '',
                rating: 5.0,
                places: 1,
                minMonths: 1,
                description: 'Studios individuels tout équipés.',
                equipments: [
                    { name: 'WiFi', icon: Wifi, color: 'orange' },
                    { name: 'Générateur', icon: Zap, color: 'yellow' },
                    { name: 'Forage', icon: Droplets, color: 'blue' }
                ]
            };
            this.reviews = [
                { name: 'Marie K.', date: '05/01/2024', comment: 'Excellent studio, très bien équipé et proche du campus.', initials: 'M' }
            ];
        } else if (this.housingId === 'soa') {
            this.housing = {
                title: 'Cité Universitaire Soa',
                distance: 1.2,
                price: 35000,
                image: '',
                rating: 4.0,
                places: 0,
                minMonths: 2,
                description: 'Grande cité avec espaces verts.',
                equipments: [
                    { name: 'WiFi', icon: Wifi, color: 'orange' },
                    { name: 'Forage', icon: Droplets, color: 'blue' }
                ]
            };
            this.reviews = [
                { name: 'Sophie M.', date: '08/01/2024', comment: 'Propre et calme.', initials: 'S' }
            ];
        }
    }

    goBack() {
        this.location.back();
    }

    openLogin() {
        this.authService.openLogin();
    }

    openContact() {
        if (!this.currentUser) {
            this.openLogin();
            return;
        }
        this.showContactModal = true;
    }

    closeContact() {
        this.showContactModal = false;
    }

    handleSendRequest() {
        // Simulate sending and redirect to messages
        this.router.navigate(['/messages']);
    }

    getStarArray(rating: number): number[] {
        const fullStars = Math.floor(rating);
        return Array(fullStars).fill(0).map((_, i) => i + 1);
    }
}
