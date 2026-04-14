import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { BrandingService } from '../../core/services/branding.service';
import { environment } from '../../../environments/environment';
import { Subscription } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatIconModule, DatePipe],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p class="text-sm text-gray-500 mt-0.5">Bienvenido, {{ auth.getUser()?.nombre }}</p>
        <div class="h-1 w-24 rounded-full bg-gradient-to-r from-[var(--color-primario)] to-[var(--color-acento)] mt-3"></div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <!-- Clubes -->
        <div class="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <mat-icon class="!text-2xl text-emerald-600">groups</mat-icon>
            </div>
          </div>
          <p class="text-3xl font-bold text-gray-900">{{ stats.clubes ?? '--' }}</p>
          <p class="text-xs text-gray-500 uppercase tracking-wide mt-1">Clubes</p>
        </div>

        <!-- Jugadores -->
        <div class="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <mat-icon class="!text-2xl text-amber-600">sports_soccer</mat-icon>
            </div>
          </div>
          <p class="text-3xl font-bold text-gray-900">{{ stats.jugadores ?? '--' }}</p>
          <p class="text-xs text-gray-500 uppercase tracking-wide mt-1">Jugadores</p>
        </div>

        <!-- Jornadas -->
        <div class="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <mat-icon class="!text-2xl text-blue-600">calendar_month</mat-icon>
            </div>
          </div>
          <p class="text-3xl font-bold text-gray-900">{{ stats.jornadas ?? '--' }}</p>
          <p class="text-xs text-gray-500 uppercase tracking-wide mt-1">Jornadas</p>
        </div>

        <!-- Partidos -->
        <div class="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <mat-icon class="!text-2xl text-purple-600">scoreboard</mat-icon>
            </div>
          </div>
          <p class="text-3xl font-bold text-gray-900">{{ stats.partidos ?? '--' }}</p>
          <p class="text-xs text-gray-500 uppercase tracking-wide mt-1">Partidos</p>
        </div>

        <!-- Finalizados -->
        <div class="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <mat-icon class="!text-2xl text-green-600">check_circle</mat-icon>
            </div>
          </div>
          <p class="text-3xl font-bold text-gray-900">{{ stats.finalizados ?? '--' }}</p>
          <p class="text-xs text-gray-500 uppercase tracking-wide mt-1">Finalizados</p>
        </div>

        <!-- Pendientes -->
        <div class="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <mat-icon class="!text-2xl text-red-600">pending</mat-icon>
            </div>
          </div>
          <p class="text-3xl font-bold text-gray-900">{{ stats.pendientes ?? '--' }}</p>
          <p class="text-xs text-gray-500 uppercase tracking-wide mt-1">Pendientes</p>
        </div>
      </div>

      <!-- Proximos Partidos -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100">
          <h2 class="text-lg font-semibold text-gray-900">Proximos Partidos</h2>
          <p class="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Agenda de la jornada</p>
        </div>

        @if (proximosPartidos.length) {
          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Partido</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Categoria</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (p of proximosPartidos; track p.id) {
                <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td class="px-4 py-3 text-sm text-gray-900 font-medium">
                    {{ p.club_local?.nombre_corto || p.club_local?.nombre || 'Local' }}
                    <span class="text-gray-400 mx-1">vs</span>
                    {{ p.club_visitante?.nombre_corto || p.club_visitante?.nombre || 'Visitante' }}
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {{ p.categoria?.nombre || '-' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600">{{ p.fecha_hora | date:'dd/MM HH:mm' }}</td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      [class]="p.estado === 'finalizado' ? 'bg-green-100 text-green-700' : p.estado === 'en_curso' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'">
                      {{ p.estado || 'programado' }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div class="py-12 text-center">
            <mat-icon class="!text-5xl text-gray-300 mb-3">sports_soccer</mat-icon>
            <p class="text-sm text-gray-500">No hay partidos proximos programados</p>
            <p class="text-[10px] text-gray-400 mt-1">Los partidos apareceran cuando se generen las jornadas</p>
          </div>
        }
      </div>

      <!-- Role info -->
      <div class="bg-white rounded-xl border border-gray-200 px-6 py-4">
        <p class="text-sm text-gray-500">
          Rol actual:
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 ml-1">
            {{ auth.getUser()?.rol }}
          </span>
        </p>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats: any = {};
  proximosPartidos: any[] = [];
  private sub?: Subscription;

  constructor(
    public auth: AuthService,
    private http: HttpClient,
    private branding: BrandingService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
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
        this.proximosPartidos = d.proximos_partidos || d.proximosPartidos || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.stats = { clubes: 0, jugadores: 0, jornadas: 0, partidos: 0, finalizados: 0, pendientes: 0 };
        this.proximosPartidos = [];
        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
