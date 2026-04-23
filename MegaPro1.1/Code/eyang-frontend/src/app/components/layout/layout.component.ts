import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, HeaderComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit {
  sidebarOpen  = false;
  currentUser: User | null = null;
  isAdmin      = false;
  isDashboard  = false;          // true when on /dashboard — suppresses header & padding
  readonly isPublic = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Track current user & role
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAdmin = user?.role === 'Admin';
    });

    // Detect dashboard route (no app-header, no padding)
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const url: string = (e as NavigationEnd).urlAfterRedirects;
        this.isDashboard = url.startsWith('/dashboard');
      });

    // Seed on first load
    this.isDashboard = this.router.url.startsWith('/dashboard');

    // Collapse overlay sidebar on wide screens
    if (window.innerWidth > 1024) this.sidebarOpen = false;
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 1024) this.sidebarOpen = false;
  }

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar():  void { this.sidebarOpen = false; }
}