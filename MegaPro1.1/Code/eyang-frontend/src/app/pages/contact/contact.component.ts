import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
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
    RefreshCw,
    ArrowLeft
} from 'lucide-angular';

@Component({
    selector: 'app-contact',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule],
    templateUrl: './contact.component.html',
    styleUrl: './contact.component.css'
})
export class ContactComponent {
    readonly MailIcon      = Mail;
    readonly PhoneIcon     = Phone;
    readonly MapPinIcon    = MapPin;
    readonly ClockIcon     = Clock;
    readonly SendIcon      = Send;
    readonly HandshakeIcon = Handshake;
    readonly HelpIcon      = HelpCircle;
    readonly MegaphoneIcon = Megaphone;
    readonly MessageIcon   = MessageSquare;
    readonly BuildingIcon  = Building;
    readonly AlertIcon     = AlertCircle;
    readonly RefreshIcon   = RefreshCw;
    readonly ArrowLeftIcon = ArrowLeft;

    constructor(private router: Router) {}

    selectedReason = 'question';
    submitted = false;
    hasError  = false;

    /** Each reason now carries a `labelKey` that goes through the translate pipe in the template */
    reasons = [
        { key: 'question',     labelKey: 'contact.reason_question',    icon: HelpCircle   },
        { key: 'partenariat',  labelKey: 'contact.reason_partnership',  icon: Handshake    },
        { key: 'sponsoring',   labelKey: 'contact.reason_sponsoring',   icon: Megaphone    },
        { key: 'proprietaire', labelKey: 'contact.reason_owner',        icon: Building     },
        { key: 'probleme',     labelKey: 'contact.reason_problem',      icon: AlertCircle  },
        { key: 'autre',        labelKey: 'contact.reason_other',        icon: Mail         },
    ];

    contactForm = {
        name: '', email: '', phone: '',
        organization: '', subject: '', message: ''
    };

    /** Returns an i18n key — the template applies `| translate` to it */
    getSubjectPlaceholder(): string {
        const map: Record<string, string> = {
            question:     'contact.subject_question',
            partenariat:  'contact.subject_partnership',
            sponsoring:   'contact.subject_sponsoring',
            proprietaire: 'contact.subject_owner',
            probleme:     'contact.subject_problem',
            autre:        'contact.subject_other',
        };
        return map[this.selectedReason] ?? 'contact.subject_other';
    }

    /** Returns an i18n key — the template applies `| translate` to it */
    getMessagePlaceholder(): string {
        const map: Record<string, string> = {
            question:     'contact.msg_question',
            partenariat:  'contact.msg_partnership',
            sponsoring:   'contact.msg_sponsoring',
            proprietaire: 'contact.msg_owner',
            probleme:     'contact.msg_problem',
            autre:        'contact.msg_other',
        };
        return map[this.selectedReason] ?? 'contact.msg_other';
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
        this.hasError  = false;
        this.contactForm = { name: '', email: '', phone: '', organization: '', subject: '', message: '' };
        this.selectedReason = 'question';
    }

    goHome(): void {
        this.router.navigate(['/']);
    }
}