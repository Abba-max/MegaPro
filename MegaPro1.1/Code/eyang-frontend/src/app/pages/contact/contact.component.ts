import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    LucideAngularModule,
    Mail,
    Phone,
    MapPin,
    Clock,
    Send,
    Handshake,
    HelpCircle,
    Megaphone,
    MessageSquare,
    Building,
    AlertCircle,
    RefreshCw
} from 'lucide-angular';

@Component({
    selector: 'app-contact',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './contact.component.html',
    styleUrl: './contact.component.css'
})
export class ContactComponent {
    readonly MailIcon = Mail;
    readonly PhoneIcon = Phone;
    readonly MapPinIcon = MapPin;
    readonly ClockIcon = Clock;
    readonly SendIcon = Send;
    readonly HandshakeIcon = Handshake;
    readonly HelpIcon = HelpCircle;
    readonly MegaphoneIcon = Megaphone;
    readonly MessageIcon = MessageSquare;
    readonly BuildingIcon = Building;
    readonly AlertIcon = AlertCircle;
    readonly RefreshIcon = RefreshCw;

    selectedReason = 'question';
    submitted = false;
    hasError = false;

    reasons = [
        { key: 'question', label: 'Question générale', icon: HelpCircle },
        { key: 'partenariat', label: 'Partenariat', icon: Handshake },
        { key: 'sponsoring', label: 'Sponsoring', icon: Megaphone },
        { key: 'proprietaire', label: 'Je suis propriétaire', icon: Building },
        { key: 'probleme', label: 'Signaler un problème', icon: AlertCircle },
        { key: 'autre', label: 'Autre', icon: Mail }
    ];

    contactForm = {
        name: '',
        email: '',
        phone: '',
        organization: '',
        subject: '',
        message: ''
    };

    getSubjectPlaceholder(): string {
        const map: Record<string, string> = {
            question: 'Ex: Question sur les réservations',
            partenariat: 'Ex: Proposition de partenariat commercial',
            sponsoring: 'Ex: Sponsoring d\'événement étudiant',
            proprietaire: 'Ex: Je souhaite publier mon logement',
            probleme: 'Ex: Problème avec ma réservation',
            autre: 'Objet de votre message'
        };
        return map[this.selectedReason] || 'Objet de votre message';
    }

    getMessagePlaceholder(): string {
        const map: Record<string, string> = {
            question: 'Décrivez votre question en détail...',
            partenariat: 'Décrivez votre proposition de partenariat, votre entreprise et vos objectifs communs...',
            sponsoring: 'Décrivez l\'événement ou le projet à sponsoriser, votre audience et les retombées attendues...',
            proprietaire: 'Décrivez votre logement, sa localisation, les équipements disponibles et vos conditions...',
            probleme: 'Décrivez le problème rencontré et votre identifiant utilisateur si disponible...',
            autre: 'Écrivez votre message ici...'
        };
        return map[this.selectedReason] || 'Écrivez votre message ici...';
    }

    handleSubmit(): void {
        this.hasError = false;
        if (!this.contactForm.name || !this.contactForm.email || !this.contactForm.message) {
            this.hasError = true;
            return;
        }
        // TODO: POST /api/contact/ (Django backend)
        console.log('Submitted:', { reason: this.selectedReason, ...this.contactForm });
        this.submitted = true;
    }

    resetForm(): void {
        this.submitted = false;
        this.hasError = false;
        this.contactForm = { name: '', email: '', phone: '', organization: '', subject: '', message: '' };
        this.selectedReason = 'question';
    }
}