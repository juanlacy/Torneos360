import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';
import { BrandingService } from '../services/branding.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  permiso?: { modulo: string; accion: string };
  adminOnly?: boolean;
  highlight?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe, MatIconModule],
  template: `
    <div class="flex h-screen overflow-hidden">

      <!-- ═══ Overlay mobile ═══ -->
      @if (sidebarOpen) {
        <div class="fixed inset-0 bg-black/40 z-30 lg:hidden" (click)="sidebarOpen = false"></div>
      }

      <!-- ═══ SIDEBAR ═══ -->
      <aside class="fixed lg:static inset-y-0 left-0 z-40 flex flex-col transition-transform duration-300"
        [style.background-color]="(branding.branding$ | async)?.color_secundario || '#4f2f7d'"
        [class.translate-x-0]="sidebarOpen"
        [class.-translate-x-full]="!sidebarOpen"
        [class.lg:translate-x-0]="true"
        [style.width.px]="260">

        <!-- Logo -->
        <div class="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          @if ((branding.branding$ | async)?.logo_url; as logoUrl) {
            <img [src]="branding.resolveUrl(logoUrl)" class="w-9 h-9 rounded-lg object-cover" alt="Logo">
          } @else {
            <div class="w-9 h-9 rounded-lg flex items-center justify-center" [style.background-color]="(branding.branding$ | async)?.color_primario || '#762c7e'">
              <mat-icon class="!text-white !text-xl">sports_soccer</mat-icon>
            </div>
          }
          <div>
            <h1 class="text-white text-sm font-bold tracking-wide">{{ (branding.branding$ | async)?.nombre || 'Torneo360' }}</h1>
            <p class="text-white/60 text-[10px] font-medium">Gestion de Torneos</p>
          </div>
        </div>

        <!-- Navegacion -->
        <nav class="flex-1 overflow-y-auto py-3 px-3 space-y-5">
          @for (group of navGroups; track group.title) {
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-wider text-white/40 px-3 mb-1.5">{{ group.title }}</p>
              @for (item of group.items; track item.route) {
                @if (canShow(item)) {
                  <a [routerLink]="item.route" routerLinkActive="nav-active"
                    (click)="sidebarOpen = false"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors mb-0.5"
                    [class.text-yellow-400]="item.highlight">
                    <mat-icon class="!text-lg !w-5 !h-5 !leading-5"
                      [class.text-red-400]="item.icon === 'live_tv'">{{ item.icon }}</mat-icon>
                    <span>{{ item.label }}</span>
                  </a>
                }
              }
            </div>
          }
        </nav>

        <!-- Usuario -->
        <div class="border-t border-white/10 p-3">
          @if (auth.getUser(); as user) {
            <div class="flex items-center gap-3 px-2">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                [style.background-color]="(branding.branding$ | async)?.color_primario || '#762c7e'">
                {{ user.nombre.charAt(0) }}{{ user.apellido.charAt(0) }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-white text-xs font-medium truncate">{{ user.nombre }} {{ user.apellido }}</p>
                <p class="text-white/50 text-[10px]">{{ user.rol }}</p>
              </div>
              <button (click)="auth.logout()" class="text-gray-400 hover:text-white transition-colors" title="Cerrar sesion">
                <mat-icon class="!text-lg">logout</mat-icon>
              </button>
            </div>
          }
        </div>
      </aside>

      <!-- ═══ CONTENIDO PRINCIPAL ═══ -->
      <div class="flex-1 flex flex-col min-w-0">

        <!-- Top bar -->
        <header class="flex items-center h-14 px-4 bg-white border-b border-gray-200 flex-shrink-0">
          <button (click)="sidebarOpen = !sidebarOpen" class="text-gray-500 hover:text-gray-700 mr-3">
            <mat-icon>menu</mat-icon>
          </button>

          <span class="flex-1"></span>

          @if (auth.getUser(); as user) {
            <div class="flex items-center gap-2 text-sm text-gray-500">
              <span class="hidden sm:inline">{{ user.nombre }} {{ user.apellido }}</span>
              <span class="badge badge-aprobado !text-[10px]">{{ user.rol }}</span>
            </div>
          }
        </header>

        <!-- Main content -->
        <main class="flex-1 overflow-auto p-4 md:p-6 bg-gray-50">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
  `],
})
export class LayoutComponent {
  sidebarOpen = false;

  navGroups: NavGroup[] = [
    {
      title: 'Principal',
      items: [
        { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
      ],
    },
    {
      title: 'Torneo',
      items: [
        { label: 'Torneos', icon: 'emoji_events', route: '/torneos', permiso: { modulo: 'torneos', accion: 'ver' } },
        { label: 'Clubes', icon: 'groups', route: '/clubes', permiso: { modulo: 'clubes', accion: 'ver' } },
        { label: 'Jugadores', icon: 'sports_soccer', route: '/jugadores', permiso: { modulo: 'jugadores', accion: 'ver' } },
      ],
    },
    {
      title: 'Competencia',
      items: [
        { label: 'Fixture', icon: 'calendar_month', route: '/fixture', permiso: { modulo: 'fixture', accion: 'ver' } },
        { label: 'En Vivo', icon: 'live_tv', route: '/partidos/en-vivo', permiso: { modulo: 'partidos', accion: 'ver' }, highlight: true },
        { label: 'Posiciones', icon: 'leaderboard', route: '/posiciones', permiso: { modulo: 'posiciones', accion: 'ver' } },
      ],
    },
    {
      title: 'Administracion',
      items: [
        { label: 'Usuarios', icon: 'manage_accounts', route: '/admin/usuarios', adminOnly: true },
        { label: 'Permisos', icon: 'security', route: '/admin/permisos', adminOnly: true },
        { label: 'Configuracion', icon: 'settings', route: '/admin/configuracion', adminOnly: true },
      ],
    },
  ];

  constructor(public auth: AuthService, public branding: BrandingService) {}

  canShow(item: NavItem): boolean {
    if (item.adminOnly) return this.auth.isAdmin();
    if (item.permiso) return this.auth.puede(item.permiso.modulo, item.permiso.accion);
    return true;
  }
}
