import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { PublicLayoutComponent } from './components/public-layout/public-layout.component';

export const routes: Routes = [
    {
        path: '',
        component: PublicLayoutComponent,
        children: [
            {
                path: '',
                loadComponent: () => import('./pages/home/home.component').then(c => c.HomeComponent)
            },
            {
                path: 'housing/:id',
                loadComponent: () => import('./pages/housing-detail/housing-detail.component').then(c => c.HousingDetailComponent)
            },
            {
                path: 'messages',
                loadComponent: () => import('./pages/messages/messages.component').then(c => c.MessagesComponent)
            }
        ]
    },
    {
        path: '',
        component: LayoutComponent,
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./pages/dashboard/dashboard.component').then(c => c.DashboardComponent)
            },
            {
                path: 'admin/overview',
                loadComponent: () => import('./pages/admin-overview/admin-overview.component').then(c => c.AdminOverviewComponent)
            },
            {
                path: 'admin/users',
                loadComponent: () => import('./pages/admin-users/admin-users.component').then(c => c.AdminUsersComponent)
            },
            {
                path: 'admin/logements',
                loadComponent: () => import('./pages/admin-logements/admin-logements.component').then(c => c.AdminLogementsComponent)
            },
            {
                path: 'admin/bookings',
                loadComponent: () => import('./pages/admin-bookings/admin-bookings.component').then(c => c.AdminBookingsComponent)
            },
            {
                path: 'admin/settings',
                loadComponent: () => import('./pages/admin-settings/admin-settings.component').then(c => c.AdminSettingsComponent)
            },
            {
                path: 'admin/reports',
                loadComponent: () => import('./pages/admin-reports/admin-reports.component').then(c => c.AdminReportsComponent)
            },
            {
                path: 'admin/reviews',
                loadComponent: () => import('./pages/admin-reviews/admin-reviews.component').then(c => c.AdminReviewsComponent)
            }
        ]
    }
];
