import { Component, Input } from '@angular/core';
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
  ShieldCheck
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
  @Input() isOpen = false;

  readonly DashboardIcon = LayoutDashboard;
  readonly UsersIcon = Users;
  readonly HomeIcon = Home;
  readonly CalendarIcon = Calendar;
  readonly StarIcon = Star;
  readonly ReportsIcon = BarChart2;
  readonly SettingsIcon = Settings;
  readonly LogOutIcon = LogOut;
  readonly GlobeIcon = Globe;
  readonly ShieldIcon = ShieldCheck;

  constructor(private authService: AuthService, private router: Router) { }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}