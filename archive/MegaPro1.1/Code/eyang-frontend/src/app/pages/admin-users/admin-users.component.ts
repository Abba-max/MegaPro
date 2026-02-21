import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Search, Filter, MoreVertical, Shield, User, Plus } from 'lucide-angular';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css'
})
export class AdminUsersComponent {
  readonly SearchIcon = Search;
  readonly FilterIcon = Filter;
  readonly MoreIcon = MoreVertical;
  readonly ShieldIcon = Shield;
  readonly UserIcon = User;
  readonly PlusIcon = Plus;

  users = [
    { name: 'Marie Kamga', email: 'marie@example.com', type: 'Étudiant', active: true, initials: 'MK', color: '#3B82F6' },
    { name: 'Paul Nkolo', email: 'paul@example.com', type: 'Parent', active: true, initials: 'PN', color: '#8B5CF6' },
    { name: 'Sophie Mballa', email: 'sophie@example.com', type: 'Étudiant', active: true, initials: 'SM', color: '#10B981' },
    { name: 'Jean Eyenga', email: 'owner@example.com', type: 'Propriétaire', active: true, initials: 'JE', color: '#F59E0B' },
    { name: 'Pierre Fouda', email: 'owner2@example.com', type: 'Propriétaire', active: true, initials: 'PF', color: '#EC4899' },
    { name: 'Admin System', email: 'admin@eyangestate.com', type: 'Admin', active: true, initials: 'AS', color: '#EF4444' }
  ];
}
