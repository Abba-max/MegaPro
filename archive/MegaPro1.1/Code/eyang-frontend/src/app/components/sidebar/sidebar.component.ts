import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
  Globe
} from 'lucide-angular';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  readonly DashboardIcon = LayoutDashboard;
  readonly UsersIcon = Users;
  readonly HomeIcon = Home;
  readonly CalendarIcon = Calendar;
  readonly StarIcon = Star;
  readonly ReportsIcon = BarChart2;
  readonly SettingsIcon = Settings;
  readonly LogOutIcon = LogOut;
  readonly GlobeIcon = Globe;
}
