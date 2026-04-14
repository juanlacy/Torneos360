import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { BrandingService } from '../../core/services/branding.service';
import { environment } from '../../../environments/environment';
import { Subscription } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { DatePipe, AsyncPipe } from '@angular/common';

interface KpiCard {
  label: string;
  value: string | number;
  icon: string;
  gradient: string;
  iconColor: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatIconModule, RouterLink, DatePipe, AsyncPipe],
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- Hero Header -->
      <div class="relative overflow-hidden rounded-2xl p-6 md:p-8 text-white shadow-lg animate-fade-in-down"
        [style.background]="'linear-gradient(135deg, ' + primaryColor + ' 0%, ' + secondaryColor + ' 100%)'">
        <!-- Decorative circles -->
        <div class="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl"></div>
        <div class="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/5 blur-3xl"></div>

        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-2">
            <mat-icon class="!text-lg opacity-80">waving_hand</mat-icon>
            <p class="text-sm font-medium opacity-90">Bienvenido, {{ auth.getUser()?.nombre }}</p>
          </div>
          <h1 class="text-3xl md:text-4xl font-bold mb-1">{{ (branding.branding$ | async)?.nombre || 'Torneo360' }}</h1>
          <p class="text-sm md:text-base opacity-80">Panel de gestion del torneo</p>

          <div class="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-semibold">
            <mat-icon class="!text-sm !w-4 !h-4">badge</mat-icon>
            {{ auth.getUser()?.rol }}
          </div>
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 stagger-children">
        @for (kpi of kpis; track kpi.label) {
          <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-1" [class]="kpi.gradient"></div>
            <div class="flex items-start justify-between mb-2">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center" [class]="kpi.iconColor">
                <mat-icon class="!text-xl !w-6 !h-6">{{ kpi.icon }}</mat-icon>
              </div>
            </div>
            <p class="text-3xl font-bold text-gray-900 leading-tight">{{ kpi.value }}</p>
            <p class="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-1">{{ kpi.label }}</p>
          </div>
        }
      </div>

      <!-- Grid 2 columnas: Proximos Partidos + Acciones Rapidas -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <!-- Proximos Partidos -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm animate-fade-in-up">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 class="text-base font-semibold text-gray-900 flex items-center gap-2">
                <mat-icon class="!text-lg text-[var(--color-primario)]">sports_soccer</mat-icon>
                Proximos Partidos
              </h2>
              <p class="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Agenda de la jornada</p>
            </div>
            <a routerLink="/fixture" class="text-xs text-[var(--color-primario)] hover:underline font-medium">Ver fixture →</a>
          </div>

          @if (proximosPartidos.length) {
            <div class="divide-y divide-gray-100">
              @for (p of proximosPartidos; track p.id) {
                <a [routerLink]="['/partidos', p.id]"
                  class="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">

                  <!-- Fecha badge -->
                  <div class="text-center shrink-0 w-12">
                    <p class="text-[10px] text-gray-400 uppercase font-semibold">{{ formatMes(p.jornada?.fecha || p.hora_inicio) }}</p>
                    <p class="text-xl font-bold text-gray-900 leading-none">{{ formatDia(p.jornada?.fecha || p.hora_inicio) }}</p>
                  </div>

                  <div class="w-px h-10 bg-gray-200"></div>

                  <!-- Partido -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <!-- Escudo local -->
                      @if (p.clubLocal?.escudo_url || p.club_local?.escudo_url) {
                        <img [src]="resolveUrl(p.clubLocal?.escudo_url || p.club_local?.escudo_url)" class="escudo-sm shrink-0" alt="">
                      } @else {
                        <div class="escudo-sm escudo-placeholder text-[8px]"
                          [style.background-color]="p.clubLocal?.color_primario || p.club_local?.color_primario || '#762c7e'">
                          {{ initials(p.clubLocal?.nombre_corto || p.club_local?.nombre_corto || p.clubLocal?.nombre || p.club_local?.nombre) }}
                        </div>
                      }
                      <span class="text-sm font-medium text-gray-900 truncate">
                        {{ p.clubLocal?.nombre_corto || p.club_local?.nombre_corto || p.clubLocal?.nombre || p.club_local?.nombre }}
                      </span>
                      <span class="text-[10px] text-gray-400 mx-1">vs</span>
                      <!-- Escudo visitante -->
                      @if (p.clubVisitante?.escudo_url || p.club_visitante?.escudo_url) {
                        <img [src]="resolveUrl(p.clubVisitante?.escudo_url || p.club_visitante?.escudo_url)" class="escudo-sm shrink-0" alt="">
                      } @else {
                        <div class="escudo-sm escudo-placeholder text-[8px]"
                          [style.background-color]="p.clubVisitante?.color_primario || p.club_visitante?.color_primario || '#762c7e'">
                          {{ initials(p.clubVisitante?.nombre_corto || p.club_visitante?.nombre_corto || p.clubVisitante?.nombre || p.club_visitante?.nombre) }}
                        </div>
                      }
                      <span class="text-sm font-medium text-gray-900 truncate">
                        {{ p.clubVisitante?.nombre_corto || p.club_visitante?.nombre_corto || p.clubVisitante?.nombre || p.club_visitante?.nombre }}
                      </span>
                    </div>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span class="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
                        Cat {{ p.categoria?.nombre }}
                      </span>
                      @if (p.hora_inicio) {
                        <span class="text-[10px] text-gray-500">{{ p.hora_inicio | date:'HH:mm':'-0300' }}</span>
                      }
                    </div>
                  </div>

                  <mat-icon class="!text-base text-gray-300">chevron_right</mat-icon>
                </a>
              }
            </div>
          } @else {
            <div class="py-12 text-center">
              <mat-icon class="!text-5xl text-gray-200 mb-3">sports_soccer</mat-icon>
              <p class="text-sm text-gray-500">No hay partidos proximos</p>
              <p class="text-[10px] text-gray-400 mt-1">Los partidos apareceran cuando se generen las jornadas</p>
            </div>
          }
        </div>

        <!-- Accesos Rapidos -->
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm animate-fade-in-up">
          <div class="px-5 py-4 border-b border-gray-100">
            <h2 class="text-base font-semibold text-gray-900 flex items-center gap-2">
              <mat-icon class="!text-lg text-[var(--color-primario)]">bolt</mat-icon>
              Accesos Rapidos
            </h2>
            <p class="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Navegacion rapida</p>
          </div>
          <div class="p-3 space-y-2">
            <a routerLink="/clubes" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
              <div class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                <mat-icon class="!text-lg text-blue-600">groups</mat-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">Clubes</p>
                <p class="text-[10px] text-gray-500">Gestion de equipos</p>
              </div>
              <mat-icon class="!text-base text-gray-300 group-hover:text-gray-500 transition-colors">chevron_right</mat-icon>
            </a>
            <a routerLink="/jugadores" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
              <div class="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                <mat-icon class="!text-lg text-yellow-600">sports_soccer</mat-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">Jugadores</p>
                <p class="text-[10px] text-gray-500">Fichajes y fichas</p>
              </div>
              <mat-icon class="!text-base text-gray-300 group-hover:text-gray-500 transition-colors">chevron_right</mat-icon>
            </a>
            <a routerLink="/fixture" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
              <div class="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                <mat-icon class="!text-lg text-green-600">calendar_month</mat-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">Fixture</p>
                <p class="text-[10px] text-gray-500">Jornadas del torneo</p>
              </div>
              <mat-icon class="!text-base text-gray-300 group-hover:text-gray-500 transition-colors">chevron_right</mat-icon>
            </a>
            <a routerLink="/partidos/en-vivo" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
              <div class="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                <mat-icon class="!text-lg text-red-600 animate-pulse">live_tv</mat-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">En Vivo</p>
                <p class="text-[10px] text-gray-500">Marcador en tiempo real</p>
              </div>
              <mat-icon class="!text-base text-gray-300 group-hover:text-gray-500 transition-colors">chevron_right</mat-icon>
            </a>
            <a routerLink="/posiciones" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
              <div class="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                <mat-icon class="!text-lg text-purple-600">leaderboard</mat-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">Posiciones</p>
                <p class="text-[10px] text-gray-500">Tabla general</p>
              </div>
              <mat-icon class="!text-base text-gray-300 group-hover:text-gray-500 transition-colors">chevron_right</mat-icon>
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats: any = {};
  proximosPartidos: any[] = [];
  kpis: KpiCard[] = [];
  private sub?: Subscription;
  private brandSub?: Subscription;
  primaryColor = '#762c7e';
  secondaryColor = '#4f2f7d';

  constructor(
    public auth: AuthService,
    public branding: BrandingService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.brandSub = this.branding.branding$.subscribe(b => {
      this.primaryColor = b.color_primario || '#762c7e';
      this.secondaryColor = b.color_secundario || '#4f2f7d';
      this.cdr.detectChanges();
    });

    this.sub = this.branding.torneoActivoId$.pipe(
      filter((id): id is number => id !== null),
      switchMap(id => this.http.get<any>(`${environment.apiUrl}/torneos/${id}/stats`)),
    ).subscribe({
      next: res => {
        const d = res.data || res;
        this.stats = {
          clubes: d.clubes ?? d.total_clubes ?? 0,
          jugadores: d.jugadores ?? d.total_jugadores ?? 0,
          jornadas: d.jornadas ?? d.total_jornadas ?? 0,
          partidos: d.partidos ?? d.total_partidos ?? 0,
          finalizados: d.finalizados ?? d.partidos_finalizados ?? 0,
          pendientes: d.pendientes ?? d.partidos_pendientes ?? 0,
        };
        this.proximosPartidos = d.proximos_partidos || d.proximosPartidos || d.proximosPartidos || [];
        this.updateKpis();
        this.cdr.detectChanges();
      },
      error: () => {
        this.stats = { clubes: 0, jugadores: 0, jornadas: 0, partidos: 0, finalizados: 0, pendientes: 0 };
        this.proximosPartidos = [];
        this.updateKpis();
        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.brandSub?.unsubscribe();
  }

  private updateKpis() {
    this.kpis = [
      { label: 'Clubes',      value: this.stats.clubes ?? '—',      icon: 'groups',        gradient: 'bg-gradient-to-r from-blue-500 to-cyan-500',       iconColor: 'bg-blue-50 text-blue-600' },
      { label: 'Jugadores',   value: this.stats.jugadores ?? '—',   icon: 'sports_soccer', gradient: 'bg-gradient-to-r from-yellow-500 to-orange-500',   iconColor: 'bg-yellow-50 text-yellow-600' },
      { label: 'Jornadas',    value: this.stats.jornadas ?? '—',    icon: 'calendar_month', gradient: 'bg-gradient-to-r from-green-500 to-emerald-500',   iconColor: 'bg-green-50 text-green-600' },
      { label: 'Partidos',    value: this.stats.partidos ?? '—',    icon: 'scoreboard',    gradient: 'bg-gradient-to-r from-purple-500 to-violet-500',   iconColor: 'bg-purple-50 text-purple-600' },
      { label: 'Finalizados', value: this.stats.finalizados ?? '—', icon: 'check_circle',  gradient: 'bg-gradient-to-r from-teal-500 to-green-500',      iconColor: 'bg-teal-50 text-teal-600' },
      { label: 'Pendientes',  value: this.stats.pendientes ?? '—',  icon: 'pending',       gradient: 'bg-gradient-to-r from-red-500 to-pink-500',        iconColor: 'bg-red-50 text-red-600' },
    ];
  }

  resolveUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return url;
    return `${environment.apiUrl}${url}`;
  }

  initials(name: string | null | undefined): string {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  }

  formatMes(date: any): string {
    if (!date) return '';
    const meses = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
    const d = new Date(date);
    return meses[d.getMonth()] || '';
  }

  formatDia(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    return String(d.getDate()).padStart(2, '0');
  }
}
