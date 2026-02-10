import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Send } from 'lucide-angular';

@Component({
    selector: 'app-messages',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    templateUrl: './messages.component.html',
    styleUrl: './messages.component.css'
})
export class MessagesComponent {
    readonly SendIcon = Send;
}
