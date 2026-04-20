import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard, isLoggedInMatch, requirePerfilCompleto } from './core/guards/auth.guard';
import { LayoutComponent } from './core/layout/layout';
import { PublicLayoutComponent } from './core/layout/public-layout';

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

  // ─── Completar perfil (authenticated, SIN layout, SIN guard de perfil) ──────
  {
    path: 'perfil/completar',
    canActivate: [authGuard],
    loadComponent: () => import('./auth/completar-perfil/completar-perfil').then(m => m.CompletarPerfilComponent),
  },

  // ─── App (authenticated, con layout) — canMatch: si no esta logueado, cae al publico
  {
    path: '',
    component: LayoutComponent,
    canMatch: [isLoggedInMatch],
    canActivateChild: [requirePerfilCompleto],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent),
      },

      // ─── Torneo ──────────────────────────────────────────────────────────
      {
        path: 'torneos',
        loadComponent: () => import('./features/torneos/torneos').then(m => m.TorneosComponent),
      },
      {
        path: 'clubes',
        loadComponent: () => import('./features/clubes/clubes').then(m => m.ClubesComponent),
      },
      {
        path: 'jugadores',
        loadComponent: () => import('./features/jugadores/jugadores').then(m => m.JugadoresComponent),
      },
      {
        path: 'staff',
        loadComponent: () => import('./features/staff/staff').then(m => m.StaffComponent),
      },
      {
        path: 'arbitros',
        loadComponent: () => import('./features/arbitros/arbitros').then(m => m.ArbitrosComponent),
      },
      {
        path: 'veedores',
        loadComponent: () => import('./features/veedores/veedores').then(m => m.VeedoresComponent),
      },

      // ─── Competencia ─────────────────────────────────────────────────────
      {
        path: 'fixture',
        loadComponent: () => import('./features/fixture/fixture').then(m => m.FixtureComponent),
      },
      {
        path: 'partidos/en-vivo',
        loadComponent: () => import('./features/partidos/marcador-vivo').then(m => m.MarcadorVivoComponent),
      },
      {
        path: 'partidos/:id',
        loadComponent: () => import('./features/partidos/partido-detalle').then(m => m.PartidoDetalleComponent),
      },
      {
        path: 'partidos/:id/control',
        loadComponent: () => import('./features/partidos/panel-control').then(m => m.PanelControlComponent),
      },
      {
        path: 'posiciones',
        loadComponent: () => import('./features/posiciones/posiciones').then(m => m.PosicionesComponent),
      },
      {
        path: 'estadisticas',
        loadComponent: () => import('./features/estadisticas/estadisticas').then(m => m.EstadisticasComponent),
      },

      // ─── Admin ───────────────────────────────────────────────────────────
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
      },

      // ─── Perfil ────────────────────────────────────────────────────────────
      {
        path: 'perfil',
        loadComponent: () => import('./features/perfil/perfil').then(m => m.PerfilComponent),
      },

      // ─── Default redirect ────────────────────────────────────────────────
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // ─── Detalle publico de torneo (accesible esten o no logueados) ───────────
  {
    path: 'torneo/:id',
    loadComponent: () => import('./features/publico/torneo-detalle').then(m => m.TorneoDetallePublicoComponent),
  },

  // ─── Vista Publica (sin auth) — matchea cuando no esta logueado ───────────
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./features/publico/landing').then(m => m.LandingComponent),
      },
    ],
  },

  // ─── Fallback ─────────────────────────────────────────────────────────────
  { path: '**', redirectTo: '' },
];
