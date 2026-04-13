import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './core/layout/layout';

export const routes: Routes = [
  // ─── Auth (guest only) ────────────────────────────────────────────────────
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      { path: 'login', loadComponent: () => import('./auth/login/login').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./auth/register/register').then(m => m.RegisterComponent) },
      { path: 'verify-email', loadComponent: () => import('./auth/verify-email/verify-email').then(m => m.VerifyEmailComponent) },
      { path: 'forgot-password', loadComponent: () => import('./auth/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent) },
      { path: 'reset-password', loadComponent: () => import('./auth/reset-password/reset-password').then(m => m.ResetPasswordComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // ─── App (authenticated, con layout) ──────────────────────────────────────
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent),
      },

      // ─── Admin ───────────────────────────────────────────────────────────
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
      },

      // ─── Default redirect ────────────────────────────────────────────────
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // ─── Fallback ─────────────────────────────────────────────────────────────
  { path: '**', redirectTo: 'dashboard' },
];
