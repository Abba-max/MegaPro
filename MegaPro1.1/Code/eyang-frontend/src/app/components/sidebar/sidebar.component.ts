import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  LucideAngularModule,
  LayoutDashboard, Users, Home, Calendar, Star,
  BarChart2, Settings, LogOut, Globe, ShieldCheck, X,
  Mail, Activity, FileText, ShieldAlert
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
  @Output() closeRequest = new EventEmitter<void>();

  readonly DashboardIcon  = LayoutDashboard;
  readonly UsersIcon      = Users;
  readonly HomeIcon       = Home;
  readonly CalendarIcon   = Calendar;
  readonly StarIcon       = Star;
  readonly ReportsIcon    = BarChart2;
  readonly SettingsIcon   = Settings;
  readonly LogOutIcon     = LogOut;
  readonly GlobeIcon      = Globe;
  readonly ShieldIcon     = ShieldCheck;
  readonly XIcon          = X;
  readonly MailIcon       = Mail;
  readonly MonitoringIcon = Activity;
  readonly LogsIcon       = FileText;
  readonly BanIcon        = ShieldAlert;

  constructor(private authService: AuthService, private router: Router) {}

  navClick(): void { this.closeRequest.emit(); }

  onLogout(): void {
    this.authService.logout();
    this.closeRequest.emit();
    this.router.navigate(['/']);
  }
}
