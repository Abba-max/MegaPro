import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  LucideAngularModule,
  LayoutDashboard,
  Users,
  Home,
  Calendar,
  Star,
  BarChart2,
  Settings,
  LogOut,
  Globe,
  ShieldCheck,
  X
} from 'lucide-angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, TranslateModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  @Input()  isOpen = false;
  /** Emits when a nav link is clicked on mobile so the layout can close the sidebar */
  @Output() closeRequest = new EventEmitter<void>();

  readonly DashboardIcon = LayoutDashboard;
  readonly UsersIcon     = Users;
  readonly HomeIcon      = Home;
  readonly CalendarIcon  = Calendar;
  readonly StarIcon      = Star;
  readonly ReportsIcon   = BarChart2;
  readonly SettingsIcon  = Settings;
  readonly LogOutIcon    = LogOut;
  readonly GlobeIcon     = Globe;
  readonly ShieldIcon    = ShieldCheck;
  readonly XIcon         = X;

  constructor(private authService: AuthService, private router: Router) {}

  /** Call after every navigation link click on mobile */
  navClick(): void { this.closeRequest.emit(); }

  onLogout(): void {
    this.authService.logout();
    this.closeRequest.emit();
    this.router.navigate(['/']);
  }
}




