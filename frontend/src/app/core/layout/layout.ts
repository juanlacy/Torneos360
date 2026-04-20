import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';
import { BrandingService } from '../services/branding.service';
import { NotificacionesService } from '../services/notificaciones.service';

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

        <!-- Espacio vacio (usuario y logout estan en el header superior derecho) -->
        <div class="border-t border-white/10 p-2"></div>
      </aside>

      <!-- ═══ CONTENIDO PRINCIPAL ═══ -->
      <div class="flex-1 flex flex-col min-w-0">

        <!-- Top bar -->
        <header class="flex items-center h-14 px-4 bg-white border-b border-gray-200 flex-shrink-0">
          <button (click)="sidebarOpen = !sidebarOpen" class="text-gray-500 hover:text-gray-700 mr-3">
            <mat-icon>menu</mat-icon>
          </button>

          <!-- Selector de torneo -->
          @if ((branding.torneos$ | async); as torneos) {
            @if (torneos.length > 1) {
              <div class="relative">
                <button (click)="torneoDropdown = !torneoDropdown"
                  class="flex items-center gap-2 px-3 py-1.5 border border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors">
                  <mat-icon class="!text-base" [style.color]="(branding.branding$ | async)?.color_primario">emoji_events</mat-icon>
                  <span class="text-gray-700 font-medium hidden sm:inline">{{ (branding.branding$ | async)?.nombre }}</span>
                  <mat-icon class="!text-sm text-gray-400">expand_more</mat-icon>
                </button>
                @if (torneoDropdown) {
                  <div class="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                    @for (t of torneos; track t.id) {
                      <button (click)="cambiarTorneo(t.id)"
                        class="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between transition-colors first:rounded-t-lg last:rounded-b-lg"
                        [class.font-semibold]="t.id === branding.torneoActivoId"
                        [style.color]="t.id === branding.torneoActivoId ? (branding.branding$ | async)?.color_primario : ''">
                        <span>{{ t.nombre }}</span>
                        @if (t.id === branding.torneoActivoId) {
                          <mat-icon class="!text-base">check</mat-icon>
                        }
                      </button>
                    }
                  </div>
                  <div class="fixed inset-0 z-40" (click)="torneoDropdown = false"></div>
                }
              </div>
            } @else if (torneos.length === 1) {
              <span class="text-sm text-gray-500 font-medium hidden sm:inline">{{ torneos[0].nombre }}</span>
            }
          }

          <span class="flex-1"></span>

          @if (auth.getUser(); as user) {
            <!-- Notificaciones (badge + dropdown) -->
            @if ((notifs.data$ | async); as notif) {
              <div class="relative mr-1">
                <button (click)="notifOpen = !notifOpen"
                  class="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                  title="Notificaciones">
                  <mat-icon class="text-gray-500">notifications</mat-icon>
                  @if (notif.total > 0) {
                    <span class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {{ notif.total > 99 ? '99+' : notif.total }}
                    </span>
                  }
                </button>
                @if (notifOpen) {
                  <div class="absolute top-full right-0 mt-1 w-[360px] max-w-[90vw] bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h3 class="text-sm font-semibold text-gray-900">Pendientes</h3>
                        <p class="text-[11px] text-gray-500">
                          @if (notif.total) {
                            {{ notif.total }} {{ notif.total === 1 ? 'item' : 'items' }} requieren atencion
                          } @else {
                            Todo al dia
                          }
                        </p>
                      </div>
                      <button (click)="notifs.refresh(); notifOpen = false" class="text-gray-400 hover:text-gray-600" title="Actualizar">
                        <mat-icon class="!text-base !w-5 !h-5">refresh</mat-icon>
                      </button>
                    </div>

                    @if (notif.total === 0) {
                      <div class="py-8 text-center">
                        <mat-icon class="!text-4xl text-green-500 mb-1">check_circle</mat-icon>
                        <p class="text-sm text-gray-500">No hay nada pendiente</p>
                      </div>
                    } @else {
                      <div class="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
                        @for (n of notif.items; track n.partido_id + '-' + n.tipo) {
                          <a routerLink="/fixture" [queryParams]="{ jornada: n.jornada_id, partido: n.partido_id }" (click)="notifOpen = false"
                            class="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer">
                            <mat-icon class="!text-lg shrink-0 mt-0.5"
                              [class.text-red-500]="n.severidad === 'danger'"
                              [class.text-amber-500]="n.severidad === 'warning'"
                              [class.text-blue-500]="n.severidad === 'info'">
                              {{ n.tipo === 'partido_sin_confirmar' ? 'pending_actions' : n.tipo === 'partido_sin_arbitro' ? 'sports' : 'visibility_off' }}
                            </mat-icon>
                            <div class="flex-1 min-w-0">
                              <p class="text-xs font-semibold text-gray-900">
                                {{ n.tipo === 'partido_sin_arbitro' ? 'Sin arbitro asignado' : n.tipo === 'partido_sin_veedor' ? 'Sin veedor asignado' : 'Sin confirmar por arbitro' }}
                              </p>
                              <p class="text-xs text-gray-600 truncate">
                                {{ n.categoria }} · {{ n.local }} vs {{ n.visitante }}
                              </p>
                              <p class="text-[10px] text-gray-400 mt-0.5">
                                Fecha {{ n.numero_jornada }} ({{ n.fase }})
                                @if (n.dias_hasta !== null) {
                                  @if (n.dias_hasta < 0) { · hace {{ -n.dias_hasta }}d }
                                  @else if (n.dias_hasta === 0) { · HOY }
                                  @else if (n.dias_hasta === 1) { · manana }
                                  @else { · en {{ n.dias_hasta }}d }
                                }
                              </p>
                            </div>
                          </a>
                        }
                      </div>
                    }
                  </div>
                  <div class="fixed inset-0 z-40" (click)="notifOpen = false"></div>
                }
              </div>
            }

            <div class="flex items-center gap-1">
              <a routerLink="/perfil" class="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors cursor-pointer" title="Mi perfil">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  [style.background-color]="'var(--color-primario)'">
                  {{ user.nombre.charAt(0) }}{{ user.apellido.charAt(0) }}
                </div>
                <div class="hidden sm:block text-right min-w-0">
                  <p class="text-xs font-medium text-gray-700 truncate leading-tight">{{ user.nombre }} {{ user.apellido }}</p>
                  <p class="text-[10px] text-gray-400 leading-tight">
                    @for (rol of auth.rolesActivos; track rol; let last = $last) {
                      {{ rol }}{{ last ? '' : ' · ' }}
                    }
                  </p>
                </div>
              </a>
              <button (click)="auth.logout()" class="action-btn text-gray-400 hover:text-red-500" title="Cerrar sesion">
                <mat-icon>logout</mat-icon>
              </button>
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
export class LayoutComponent implements OnInit {
  sidebarOpen = false;
  torneoDropdown = false;
  notifOpen = false;

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
        { label: 'Staff', icon: 'support_agent', route: '/staff', permiso: { modulo: 'staff', accion: 'ver' } },
        { label: 'Arbitros', icon: 'sports', route: '/arbitros', permiso: { modulo: 'arbitros', accion: 'ver' } },
        { label: 'Veedores', icon: 'visibility', route: '/veedores', permiso: { modulo: 'veedores', accion: 'ver' } },
      ],
    },
    {
      title: 'Competencia',
      items: [
        { label: 'Fixture', icon: 'calendar_month', route: '/fixture', permiso: { modulo: 'fixture', accion: 'ver' } },
        { label: 'En Vivo', icon: 'live_tv', route: '/partidos/en-vivo', permiso: { modulo: 'partidos', accion: 'ver' }, highlight: true },
        { label: 'Posiciones', icon: 'leaderboard', route: '/posiciones', permiso: { modulo: 'posiciones', accion: 'ver' } },
        { label: 'Estadisticas', icon: 'bar_chart', route: '/estadisticas', permiso: { modulo: 'posiciones', accion: 'ver' } },
      ],
    },
    {
      title: 'Administracion',
      items: [
        { label: 'Usuarios', icon: 'manage_accounts', route: '/admin/usuarios', adminOnly: true },
        { label: 'Permisos', icon: 'security', route: '/admin/permisos', adminOnly: true },
        { label: 'Roles de Staff', icon: 'badge', route: '/admin/roles-staff', adminOnly: true },
        { label: 'Instituciones', icon: 'account_balance', route: '/admin/instituciones', adminOnly: true },
        { label: 'Transicion', icon: 'swap_horiz', route: '/admin/transicion', adminOnly: true },
        { label: 'Configuracion', icon: 'settings', route: '/admin/configuracion', adminOnly: true },
      ],
    },
  ];

  permisosLoaded = false;

  constructor(
    public auth: AuthService,
    public branding: BrandingService,
    public notifs: NotificacionesService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    // Re-renderizar cuando los permisos terminen de cargar (fix navbar vacio al refresh)
    this.auth.permisos$.subscribe((p) => {
      if (p) {
        this.permisosLoaded = true;
        // Forzar un tick completo para actualizar todos los @if del template
        setTimeout(() => this.cdr.detectChanges(), 0);
      }
    });
  }

  canShow(item: NavItem): boolean {
    if (item.adminOnly) return this.auth.isAdmin();
    if (item.permiso) {
      // Si los permisos no cargaron todavia, mostrar los items por defecto
      // (para que no parpadeen vacios al refresh)
      if (!this.permisosLoaded) return true;
      return this.auth.puede(item.permiso.modulo, item.permiso.accion);
    }
    return true;
  }

  cambiarTorneo(id: number): void {
    this.torneoDropdown = false;
    this.branding.seleccionarTorneo(id);
  }
}
