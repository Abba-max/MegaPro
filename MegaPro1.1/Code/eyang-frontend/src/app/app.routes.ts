import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { PublicLayoutComponent } from './components/public-layout/public-layout.component';
import { authGuard, adminGuard, ownerGuard } from './services/auth.guard';

export const routes: Routes = [
  // ── Public routes (no auth required) ──────────────────────────────
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
      },
      {
        path: 'contact',
        loadComponent: () => import('./pages/contact/contact.component').then(c => c.ContactComponent)
      },
      {
        path: 'login',
        loadComponent: () => import('./pages/auth/login/login.component').then(c => c.LoginComponent)
      },
      {
        path: 'signup',
        loadComponent: () => import('./pages/auth/signup/signup.component').then(c => c.SignupComponent)
      },
      {
        path: 'verify',
        loadComponent: () => import('./pages/auth/verify/verify.component').then(c => c.VerifyComponent)
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./pages/auth/forgot-password/forgot-password.component').then(c => c.ForgotPasswordComponent)
      },
      {
        path: 'privacy',
        loadComponent: () => import('./pages/legal/privacy.component').then(c => c.PrivacyComponent)
      },
      {
        path: 'terms',
        loadComponent: () => import('./pages/legal/terms.component').then(c => c.TermsComponent)
      },
      {
        path: 'verify-invoice/:id',
        loadComponent: () => import('./pages/verify-invoice/verify-invoice.component').then(c => c.VerifyInvoiceComponent)
      }
    ]
  },

  // ── Authenticated routes (any logged-in user) ─────────────────────
  // Both owners and visitors land here; DashboardComponent branches
  // internally using user.role === 'Owner' to show the correct view.
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(c => c.DashboardComponent)
      }
    ]
  },
  {
    path: 'map-search',
    loadComponent: () =>
      import('./pages/map-search/map.search.component')
        .then(c => c.MapSearchComponent),
 
  },
  // ── Admin-only routes ──────────────────────────────────────────────
  {
    path: 'app-admin',
    component: LayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' }, 
      {
        path: 'overview',
        loadComponent: () => import('./pages/admin-overview/admin-overview.component').then(c => c.AdminOverviewComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/admin-users/admin-users.component').then(c => c.AdminUsersComponent)
      },
      {
        path: 'verification',
        loadComponent: () => import('./pages/admin-verification/admin-verification.component').then(c => c.AdminVerificationComponent)
      },
      {
        path: 'logements',
        loadComponent: () => import('./pages/admin-logements/admin-logements.component').then(c => c.AdminLogementsComponent)
      },
      {
        path: 'bookings',
        loadComponent: () => import('./pages/admin-bookings/admin-bookings.component').then(c => c.AdminBookingsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/admin-settings/admin-settings.component').then(c => c.AdminSettingsComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/admin-reports/admin-reports.component').then(c => c.AdminReportsComponent)
      },
      {
        path: 'reviews',
        loadComponent: () => import('./pages/admin-reviews/admin-reviews.component').then(c => c.AdminReviewsComponent)
      },
      {
        path: 'contacts',
        loadComponent: () => import('./pages/admin-contacts/admin-contacts.components').then(c => c.AdminContactsComponent)
      },
      {
        path: 'monitoring',
        loadComponent: () => import('./pages/admin-monitoring/admin-monitoring.component').then(c => c.AdminMonitoringComponent)
      },
      {
        path: 'logs',
        loadComponent: () => import('./pages/admin-logs/admin-logs.component').then(c => c.AdminLogsComponent)
      },
      {
        path: 'banned-words',
        loadComponent: () => import('./pages/admin-banned-words/admin-banned-words.component').then(c => c.AdminBannedWordsComponent)
      }
    ]
  },

  // ── Fallback ───────────────────────────────────────────────────────
  { path: '**', redirectTo: '' }
];




