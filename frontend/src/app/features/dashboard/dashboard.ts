import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { Subscription, forkJoin } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';
import { BrandingService } from '../../core/services/branding.service';
import { NotificacionesService } from '../../core/services/notificaciones.service';
import { environment } from '../../../environments/environment';

interface WidgetConfig {
  id: string;
  label: string;
  active: boolean;
}

const WIDGETS_KEY = 'torneo360_dashboard_widgets';
const DEFAULT_WIDGETS = ['kpis', 'posiciones_zona', 'goleadores', 'resultados_fecha'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink, AsyncPipe, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule],
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- ═══ A) HEADER + CONFIG ═══ -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          @if (brandingLogo) {
            <img [src]="resolveUrl(brandingLogo)" class="h-12 w-12 rounded-lg object-contain bg-white shadow-sm border border-gray-200" alt="Logo">
          } @else {
            <div class="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm"
              [style.background-color]="'var(--color-primario)'">
              {{ (brandingNombre || 'T').charAt(0) }}
            </div>
          }
          <div>
            <h1 class="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">{{ brandingNombre || 'Torneo360' }}</h1>
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wider">{{ brandingAnio ? 'Temporada ' + brandingAnio : 'Dashboard' }}</p>
          </div>
        </div>
        <button mat-icon-button (click)="showConfig = !showConfig" class="!text-gray-500 hover:!text-gray-700"
          matTooltip="Configurar widgets">
          <mat-icon>settings</mat-icon>
        </button>
      </div>

      <!-- Config panel -->
      @if (showConfig) {
        <div class="bg-white rounded-xl border border-gray-200 p-4 shadow-sm animate-fade-in">
          <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <mat-icon class="!text-base text-gray-400">dashboard_customize</mat-icon>
            Widgets visibles
          </h3>
          <div class="flex flex-wrap gap-4">
            @for (w of widgetConfigs; track w.id) {
              <label class="flex items-center gap-2 cursor-pointer">
                <mat-slide-toggle [checked]="w.active" (change)="toggleWidget(w.id, $event.checked)" color="primary"></mat-slide-toggle>
                <span class="text-sm text-gray-600">{{ w.label }}</span>
              </label>
            }
          </div>
        </div>
      }

      <!-- ═══ TABS: General / Mi Club ═══ -->
      <div class="bg-white rounded-xl border border-gray-200 p-1 inline-flex gap-1 shadow-sm">
        <button (click)="activeTab = 'general'"
          class="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
          [class]="activeTab === 'general' ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'"
          [style.background-color]="activeTab === 'general' ? 'var(--color-primario)' : ''">
          <mat-icon class="!text-base !w-5 !h-5">dashboard</mat-icon>
          General
        </button>
        @if (userClubId) {
          <button (click)="activeTab = 'mi-club'"
            class="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
            [class]="activeTab === 'mi-club' ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'"
            [style.background-color]="activeTab === 'mi-club' ? 'var(--color-primario)' : ''">
            <mat-icon class="!text-base !w-5 !h-5">shield</mat-icon>
            Mi Club
          </button>
        }
      </div>

      @if (activeTab === 'general') {

      <!-- ═══ Pendientes (admin/coordinador) ═══ -->
      @if (puedeVerPendientes() && (notifs.data$ | async); as notif) {
        @if (notif.total > 0) {
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 class="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <mat-icon class="!text-lg text-red-500">notifications_active</mat-icon>
                  Pendientes
                </h2>
                <p class="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Accion requerida</p>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                @if (notif.por_tipo.sin_arbitro > 0) {
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                    <mat-icon class="!text-xs !w-3.5 !h-3.5">sports</mat-icon>
                    {{ notif.por_tipo.sin_arbitro }} sin arbitro
                  </span>
                }
                @if (notif.por_tipo.sin_veedor > 0) {
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                    <mat-icon class="!text-xs !w-3.5 !h-3.5">visibility_off</mat-icon>
                    {{ notif.por_tipo.sin_veedor }} sin veedor
                  </span>
                }
                @if (notif.por_tipo.sin_confirmar > 0) {
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                    <mat-icon class="!text-xs !w-3.5 !h-3.5">pending_actions</mat-icon>
                    {{ notif.por_tipo.sin_confirmar }} sin confirmar
                  </span>
                }
              </div>
            </div>
            <div class="max-h-[280px] overflow-y-auto divide-y divide-gray-100">
              @for (n of notif.items.slice(0, 20); track n.partido_id + '-' + n.tipo) {
                <a routerLink="/fixture" [queryParams]="{ jornada: n.jornada_id, partido: n.partido_id }"
                  class="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors">
                  <mat-icon class="!text-lg shrink-0"
                    [class.text-red-500]="n.severidad === 'danger'"
                    [class.text-amber-500]="n.severidad === 'warning'"
                    [class.text-blue-500]="n.severidad === 'info'">
                    {{ n.tipo === 'partido_sin_confirmar' ? 'pending_actions' : n.tipo === 'partido_sin_arbitro' ? 'sports' : 'visibility_off' }}
                  </mat-icon>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-semibold text-gray-900 truncate">
                      {{ n.tipo === 'partido_sin_arbitro' ? 'Sin arbitro' : n.tipo === 'partido_sin_veedor' ? 'Sin veedor' : 'Sin confirmar' }}
                      · {{ n.categoria }} · {{ n.local }} vs {{ n.visitante }}
                    </p>
                    <p class="text-[10px] text-gray-500">
                      Fecha {{ n.numero_jornada }} ({{ n.fase }})
                      @if (n.dias_hasta != null) {
                        @let dh = n.dias_hasta;
                        @if (dh < 0) { · hace {{ -dh }}d }
                        @else if (dh === 0) { · HOY }
                        @else if (dh === 1) { · manana }
                        @else { · en {{ dh }}d }
                      }
                    </p>
                  </div>
                  <mat-icon class="text-gray-400 shrink-0">chevron_right</mat-icon>
                </a>
              }
              @if (notif.total > 20) {
                <div class="px-5 py-2 text-center text-[11px] text-gray-500">
                  + {{ notif.total - 20 }} mas
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- ═══ B) KPIs ═══ -->
      @if (isWidgetActive('kpis')) {
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
      }

      <!-- ═══ C) POSICIONES POR ZONA ═══ -->
      @if (isWidgetActive('posiciones_zona')) {
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 class="text-base font-semibold text-gray-900 flex items-center gap-2">
                <mat-icon class="!text-lg text-[var(--color-primario)]">leaderboard</mat-icon>
                Tabla de Posiciones
              </h2>
              <p class="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Clasificacion por zona</p>
            </div>
            <a routerLink="/posiciones" class="text-xs text-[var(--color-primario)] hover:underline font-medium">Ver completa →</a>
          </div>

          <!-- Chips de categoria -->
          <div class="px-5 py-3 border-b border-gray-100 flex gap-2 overflow-x-auto">
            <button (click)="selectPosCategoria(null)"
              class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              [class]="posCategoriaId === null ? 'bg-[var(--color-primario)] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
              General
            </button>
            @for (cat of categorias; track cat.id) {
              <button (click)="selectPosCategoria(cat.id)"
                class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                [class]="posCategoriaId === cat.id ? 'bg-[var(--color-primario)] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
                {{ cat.nombre }}
              </button>
            }
          </div>

          <!-- Tablas por zona -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-gray-200 max-h-[640px] overflow-y-auto">
            @for (zona of zonas; track zona.id) {
              <div class="overflow-x-auto">
                <!-- Barra de color de la zona -->
                <div class="h-1" [style.background-color]="zona.color || 'var(--color-primario)'"></div>
                <div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full" [style.background-color]="zona.color || '#6b7280'"></span>
                  <span class="text-xs font-bold text-gray-700 uppercase tracking-wide">{{ zona.nombre }}</span>
                </div>

                @if (getPosZona(zona.id).length) {
                  <table class="w-full text-sm">
                    <thead class="bg-gray-50/50">
                      <tr>
                        <th class="px-3 py-2 text-center text-[10px] font-medium text-gray-400 uppercase w-10">#</th>
                        <th class="px-3 py-2 text-left text-[10px] font-medium text-gray-400 uppercase">Club</th>
                          <th class="px-2 py-2 text-center text-[10px] font-medium text-gray-400 uppercase">PJ</th>
                          <th class="px-2 py-2 text-center text-[10px] font-medium text-gray-400 uppercase">PG</th>
                          <th class="px-2 py-2 text-center text-[10px] font-medium text-gray-400 uppercase">PE</th>
                          <th class="px-2 py-2 text-center text-[10px] font-medium text-gray-400 uppercase">PP</th>
                          <th class="px-2 py-2 text-center text-[10px] font-medium text-gray-400 uppercase">GF</th>
                          <th class="px-2 py-2 text-center text-[10px] font-medium text-gray-400 uppercase">GC</th>
                          <th class="px-2 py-2 text-center text-[10px] font-medium text-gray-400 uppercase">DG</th>
                        <th class="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of getPosZona(zona.id); track row.club?.id; let i = $index) {
                        <tr class="border-t border-gray-100 hover:bg-gray-50/50 transition-colors"
                          [class.bg-amber-50/40]="row.club?.id === userClubId">
                          <td class="px-3 py-2 text-center">
                            @if (i < 3) {
                              <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold"
                                [class]="i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-600' : 'bg-amber-100 text-amber-700'">
                                {{ i + 1 }}
                              </span>
                            } @else {
                              <span class="text-xs text-gray-500">{{ i + 1 }}</span>
                            }
                          </td>
                          <td class="px-3 py-2">
                            <div class="flex items-center gap-2">
                              @if (row.club?.escudo_url) {
                                <img [src]="resolveUrl(row.club.escudo_url)" class="w-6 h-6 object-contain shrink-0" alt="">
                              } @else {
                                <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0"
                                  [style.background-color]="row.club?.color_primario || '#762c7e'">
                                  {{ initials(row.club?.nombre_corto || row.club?.nombre) }}
                                </div>
                              }
                              <span class="text-xs font-medium text-gray-800 truncate">{{ row.club?.nombre_corto || row.club?.nombre }}</span>
                            </div>
                          </td>
                            <td class="px-2 py-2 text-center text-xs text-gray-600">{{ row.pj }}</td>
                            <td class="px-2 py-2 text-center text-xs text-gray-600">{{ row.pg }}</td>
                            <td class="px-2 py-2 text-center text-xs text-gray-600">{{ row.pe }}</td>
                            <td class="px-2 py-2 text-center text-xs text-gray-600">{{ row.pp }}</td>
                            <td class="px-2 py-2 text-center text-xs text-gray-600">{{ row.gf }}</td>
                            <td class="px-2 py-2 text-center text-xs text-gray-600">{{ row.gc }}</td>
                            <td class="px-2 py-2 text-center text-xs font-medium"
                              [class]="row.dg > 0 ? 'text-green-600' : row.dg < 0 ? 'text-red-600' : 'text-gray-400'">
                              {{ row.dg > 0 ? '+' : '' }}{{ row.dg }}
                            </td>
                          <td class="px-3 py-2 text-center">
                            <span class="inline-block min-w-[28px] px-1.5 py-0.5 rounded text-xs font-bold bg-[var(--color-primario)]/10 text-[var(--color-primario)]">
                              {{ row.puntos ?? row.puntos_totales }}
                            </span>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                } @else {
                  <div class="py-8 text-center">
                    <p class="text-xs text-gray-400">Sin datos</p>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- ═══ D) GOLEADORES + E) RESULTADOS ═══ -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <!-- D) Goleadores -->
        @if (isWidgetActive('goleadores')) {
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
            <div class="px-5 py-4 border-b border-gray-100">
              <h2 class="text-base font-semibold text-gray-900 flex items-center gap-2">
                <mat-icon class="!text-lg text-amber-500">emoji_events</mat-icon>
                Goleadores
              </h2>
              <p class="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Top 15</p>
            </div>

            <!-- Chips categoria goleadores -->
            <div class="px-5 py-2.5 border-b border-gray-100 flex gap-2 overflow-x-auto">
              <button (click)="selectGolCategoria(null)"
                class="shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
                [class]="golCategoriaId === null ? 'bg-amber-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
                Todas
              </button>
              @for (cat of categorias; track cat.id) {
                <button (click)="selectGolCategoria(cat.id)"
                  class="shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
                  [class]="golCategoriaId === cat.id ? 'bg-amber-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
                  {{ cat.nombre }}
                </button>
              }
            </div>

            @if (goleadores.length) {
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-gray-200 max-h-[520px] overflow-y-auto">
                @for (g of gruposPorZonaGol(goleadores); track g.zona.id) {
                  <div>
                    <div class="h-1" [style.background-color]="g.zona.color || 'var(--color-primario)'"></div>
                    <div class="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                      <span class="w-2.5 h-2.5 rounded-full" [style.background-color]="g.zona.color || '#6b7280'"></span>
                      <span class="text-[10px] font-bold text-gray-700 uppercase tracking-wide">{{ g.zona.nombre }}</span>
                    </div>
                    <div class="divide-y divide-gray-100">
                      @for (j of g.rows; track j.persona_id; let i = $index) {
                        <div class="flex items-center gap-2 px-4 py-2 hover:bg-gray-50/50 transition-colors">
                          <div class="w-5 text-center shrink-0">
                            @if (i < 3) {
                              <span class="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold"
                                [class]="i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-600' : 'bg-amber-100 text-amber-700'">
                                {{ i + 1 }}
                              </span>
                            } @else {
                              <span class="text-[10px] text-gray-400 font-medium">{{ i + 1 }}</span>
                            }
                          </div>
                          @if (j.foto_url) {
                            <img [src]="resolveUrl(j.foto_url)" class="w-7 h-7 rounded-full object-cover shrink-0 border border-gray-200" alt="">
                          } @else {
                            <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                              [style.background-color]="j.club?.color_primario || 'var(--color-primario)'">
                              {{ initials(j.apellido || j.nombre) }}
                            </div>
                          }
                          <div class="flex-1 min-w-0">
                            <p class="text-xs font-medium text-gray-900 truncate">{{ j.apellido }}, {{ j.nombre }}</p>
                            <div class="flex items-center gap-1 mt-0.5">
                              @if (j.club?.escudo_url) {
                                <img [src]="resolveUrl(j.club.escudo_url)" class="w-3 h-3 object-contain" alt="">
                              }
                              <span class="text-[10px] text-gray-500 truncate">{{ j.club?.nombre_corto || j.club?.nombre }}</span>
                              @if (j.categoria?.nombre) {
                                <span class="inline-flex px-1 py-0 rounded text-[9px] font-medium bg-blue-50 text-blue-600">{{ j.categoria.nombre }}</span>
                              }
                            </div>
                          </div>
                          <div class="shrink-0 text-right">
                            <span class="text-base font-extrabold text-gray-900">{{ j.goles }}</span>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="py-12 text-center">
                <mat-icon class="!text-5xl text-gray-200 mb-3">sports_soccer</mat-icon>
                <p class="text-sm text-gray-500">Sin goleadores registrados</p>
              </div>
            }
          </div>
        }

        <!-- E) Resultados por Fecha -->
        @if (isWidgetActive('resultados_fecha')) {
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 class="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <mat-icon class="!text-lg text-green-600">calendar_month</mat-icon>
                  Resultados
                </h2>
                <p class="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Partidos por fecha</p>
              </div>
              <a routerLink="/fixture" class="text-xs text-[var(--color-primario)] hover:underline font-medium">Ver fixture →</a>
            </div>

            <!-- Chips de fechas (una por fase+numero, une las 2 zonas) -->
            <div class="px-5 py-2.5 border-b border-gray-100 space-y-2">
              @for (fase of fechasPorFase; track fase.fase) {
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider w-14 shrink-0">{{ fase.label }}</span>
                  <div class="flex gap-1.5 overflow-x-auto">
                    @for (f of fase.fechas; track f.key) {
                      <button (click)="selectFecha(f)"
                        class="shrink-0 w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center"
                        [class]="selectedFechaKey === f.key ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
                        {{ f.numero }}
                      </button>
                    }
                  </div>
                </div>
              }
            </div>

            @if (partidosFecha.length) {
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-gray-200 max-h-[520px] overflow-y-auto">
                @for (z of partidosPorZona; track z.zona.id) {
                  <div>
                    <div class="h-1 sticky top-0 z-10" [style.background-color]="z.zona.color || 'var(--color-primario)'"></div>
                    <div class="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2 sticky top-1 z-10">
                      <span class="w-2.5 h-2.5 rounded-full" [style.background-color]="z.zona.color || '#6b7280'"></span>
                      <span class="text-[10px] font-bold text-gray-700 uppercase tracking-wide">{{ z.zona.nombre }}</span>
                      <span class="ml-auto text-[10px] text-gray-400">{{ z.totalPartidos }} partidos</span>
                    </div>
                    <div class="divide-y divide-gray-100">
                      @for (grupo of z.categorias; track grupo.categoria) {
                        <div class="px-4 py-1 bg-gray-50/70 border-b border-gray-100">
                          <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{{ grupo.categoria }}</span>
                        </div>
                        @for (p of grupo.partidos; track p.id) {
                          <a [routerLink]="['/partidos', p.id]"
                            class="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors cursor-pointer">
                            <div class="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                              <span class="text-xs truncate text-right"
                                [class]="esGanador(p, 'local') ? 'font-bold text-gray-900' : 'font-medium text-gray-600'">
                                {{ p.clubLocal?.nombre_corto || p.clubLocal?.nombre }}
                              </span>
                              @if (p.clubLocal?.escudo_url) {
                                <img [src]="resolveUrl(p.clubLocal.escudo_url)" class="w-5 h-5 object-contain shrink-0" alt="">
                              } @else {
                                <div class="w-5 h-5 rounded-full flex items-center justify-center text-white text-[7px] font-bold shrink-0"
                                  [style.background-color]="p.clubLocal?.color_primario || '#762c7e'">
                                  {{ initials(p.clubLocal?.nombre_corto || p.clubLocal?.nombre) }}
                                </div>
                              }
                            </div>
                            <div class="shrink-0 w-12 text-center">
                              @if (p.estado === 'finalizado' || p.estado === 'en_curso') {
                                <span class="text-sm font-extrabold text-gray-900">{{ p.goles_local ?? 0 }} - {{ p.goles_visitante ?? 0 }}</span>
                              } @else {
                                <span class="text-[10px] font-medium text-gray-400">vs</span>
                              }
                            </div>
                            <div class="flex items-center gap-1.5 flex-1 min-w-0">
                              @if (p.clubVisitante?.escudo_url) {
                                <img [src]="resolveUrl(p.clubVisitante.escudo_url)" class="w-5 h-5 object-contain shrink-0" alt="">
                              } @else {
                                <div class="w-5 h-5 rounded-full flex items-center justify-center text-white text-[7px] font-bold shrink-0"
                                  [style.background-color]="p.clubVisitante?.color_primario || '#762c7e'">
                                  {{ initials(p.clubVisitante?.nombre_corto || p.clubVisitante?.nombre) }}
                                </div>
                              }
                              <span class="text-xs truncate"
                                [class]="esGanador(p, 'visitante') ? 'font-bold text-gray-900' : 'font-medium text-gray-600'">
                                {{ p.clubVisitante?.nombre_corto || p.clubVisitante?.nombre }}
                              </span>
                            </div>
                            @if (p.estado === 'en_curso') {
                              <span class="shrink-0 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            }
                          </a>
                        }
                      }
                      @if (!z.categorias.length) {
                        <div class="px-4 py-6 text-center">
                          <p class="text-xs text-gray-400">Sin partidos</p>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="py-12 text-center">
                <mat-icon class="!text-5xl text-gray-200 mb-3">event_busy</mat-icon>
                <p class="text-sm text-gray-500">{{ fechas.length ? 'No hay partidos en esta fecha' : 'Sin jornadas aun' }}</p>
              </div>
            }
          </div>
        }
      </div>

      }
      <!-- fin de solapa General -->

      @if (activeTab === 'mi-club' && userClubId) {
        @if (!miClubData) {
          <div class="bg-white rounded-xl border border-gray-200 py-12 text-center">
            <mat-icon class="!text-5xl text-gray-300 mb-2">shield</mat-icon>
            <p class="text-sm text-gray-500">Cargando datos del club...</p>
          </div>
        }
      }

      <!-- ═══ F) MI CLUB ═══ -->
      @if (activeTab === 'mi-club' && userClubId && miClubData) {
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
          <div class="h-1" [style.background-color]="miClubData.color_primario || 'var(--color-primario)'"></div>
          <div class="p-5">
            <div class="flex flex-col md:flex-row md:items-center gap-5">
              <!-- Escudo + nombre -->
              <div class="flex items-center gap-4 shrink-0">
                @if (miClubData.escudo_url) {
                  <img [src]="resolveUrl(miClubData.escudo_url)" class="w-16 h-16 object-contain" alt="Escudo">
                } @else {
                  <div class="w-16 h-16 rounded-xl flex items-center justify-center text-white text-xl font-bold"
                    [style.background-color]="miClubData.color_primario || 'var(--color-primario)'">
                    {{ initials(miClubData.nombre_corto || miClubData.nombre) }}
                  </div>
                }
                <div>
                  <h3 class="text-lg font-bold text-gray-900">{{ miClubData.nombre }}</h3>
                  @if (miClubPosicion !== null) {
                    <p class="text-sm text-gray-500">
                      Posicion general:
                      <span class="font-bold text-[var(--color-primario)]">{{ miClubPosicion }}°</span>
                      — <span class="font-semibold">{{ miClubPuntos }} pts</span>
                    </p>
                  }
                </div>
              </div>

              <!-- Ultimos resultados -->
              @if (miClubUltimos.length) {
                <div class="flex-1">
                  <p class="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-2">Ultimos resultados</p>
                  <div class="flex gap-1.5">
                    @for (r of miClubUltimos; track $index) {
                      <span class="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold"
                        [class]="r === 'V' ? 'bg-green-500' : r === 'E' ? 'bg-gray-400' : 'bg-red-500'">
                        {{ r }}
                      </span>
                    }
                  </div>
                </div>
              }

              <!-- Proximos -->
              @if (miClubProximos.length) {
                <div class="flex-1">
                  <p class="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-2">Proximos partidos</p>
                  <div class="space-y-1.5">
                    @for (px of miClubProximos; track px.id) {
                      <div class="flex items-center gap-2 text-xs">
                        <span class="text-gray-400 w-14 shrink-0">{{ formatFechaCorta(px.fecha) }}</span>
                        <span class="text-gray-400">vs</span>
                        @if (px.rival_escudo) {
                          <img [src]="resolveUrl(px.rival_escudo)" class="w-4 h-4 object-contain" alt="">
                        }
                        <span class="font-medium text-gray-700">{{ px.rival }}</span>
                        <span class="inline-flex px-1.5 py-0 rounded text-[9px] font-medium bg-blue-50 text-blue-600">{{ px.categoria }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

    </div>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  // ─── State ──────────────────────────────────────────────────────────
  activeTab: 'general' | 'mi-club' = 'general';
  brandingNombre = '';
  brandingAnio: number | null = null;
  brandingLogo: string | null = null;
  showConfig = false;

  // Widget config
  widgetConfigs: WidgetConfig[] = [
    { id: 'kpis', label: 'KPIs', active: true },
    { id: 'posiciones_zona', label: 'Posiciones', active: true },
    { id: 'goleadores', label: 'Goleadores', active: true },
    { id: 'resultados_fecha', label: 'Resultados', active: true },
  ];

  // KPIs
  kpis: { label: string; value: string | number; icon: string; gradient: string; iconColor: string }[] = [];

  // Torneo meta
  zonas: any[] = [];
  categorias: any[] = [];
  torneoId: number | null = null;
  userClubId: number | null = null;

  // Posiciones
  posCategoriaId: number | null = null;
  posicionesGeneral: any[] = [];
  posicionesCategoria: any[] = [];

  // Goleadores
  golCategoriaId: number | null = null;
  goleadores: any[] = [];

  // Resultados
  jornadas: any[] = [];
  fechas: { key: string; fase: string; numero: number; jornadaIds: number[]; hasFinalizada?: boolean }[] = [];
  fechasPorFase: { fase: string; label: string; fechas: any[] }[] = [];
  selectedFechaKey: string | null = null;
  partidosFecha: any[] = [];
  partidosPorZona: { zona: any; categorias: { categoria: string; partidos: any[] }[]; totalPartidos: number }[] = [];

  // Mi Club
  miClubData: any = null;
  miClubPosicion: number | null = null;
  miClubPuntos: number | null = null;
  miClubUltimos: string[] = [];
  miClubProximos: any[] = [];

  private subs: Subscription[] = [];

  constructor(
    public auth: AuthService,
    public branding: BrandingService,
    public notifs: NotificacionesService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
  ) {}

  puedeVerPendientes(): boolean {
    if (this.auth.isAdmin()) return true;
    return (this.auth.rolesActivos || []).includes('coordinador');
  }

  ngOnInit() {
    this.userClubId = this.auth.getUser()?.club_id || null;
    this.loadWidgetPrefs();

    // Branding
    const brandSub = this.branding.branding$.subscribe(b => {
      this.brandingNombre = b.nombre || 'Torneo360';
      this.brandingLogo = b.logo_url || null;
      this.cdr.detectChanges();
    });
    this.subs.push(brandSub);

    // Torneo change -> reload all
    const torneoSub = this.branding.torneoActivoId$.pipe(
      filter((id): id is number => id !== null),
    ).subscribe(id => {
      this.torneoId = id;
      this.loadTorneoMeta(id);
      this.loadStats(id);
      this.loadJornadas(id);
      this.cdr.detectChanges();
    });
    this.subs.push(torneoSub);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ─── Widget config ──────────────────────────────────────────────────

  private loadWidgetPrefs() {
    try {
      const raw = localStorage.getItem(WIDGETS_KEY);
      if (raw) {
        const ids: string[] = JSON.parse(raw);
        this.widgetConfigs.forEach(w => w.active = ids.includes(w.id));
      } else {
        // defaults
        const hasClub = !!this.userClubId;
        const defaults = hasClub ? [...DEFAULT_WIDGETS, 'mi_club'] : DEFAULT_WIDGETS;
        this.widgetConfigs.forEach(w => w.active = defaults.includes(w.id));
      }
    } catch {
      this.widgetConfigs.forEach(w => w.active = DEFAULT_WIDGETS.includes(w.id));
    }
  }

  private saveWidgetPrefs() {
    const active = this.widgetConfigs.filter(w => w.active).map(w => w.id);
    localStorage.setItem(WIDGETS_KEY, JSON.stringify(active));
  }

  toggleWidget(id: string, active: boolean) {
    const w = this.widgetConfigs.find(x => x.id === id);
    if (w) w.active = active;
    this.saveWidgetPrefs();
    this.cdr.detectChanges();
  }

  isWidgetActive(id: string): boolean {
    return this.widgetConfigs.find(w => w.id === id)?.active ?? false;
  }

  // ─── Load torneo meta ───────────────────────────────────────────────

  private loadTorneoMeta(torneoId: number) {
    this.http.get<any>(`${environment.apiUrl}/torneos/${torneoId}`).subscribe({
      next: res => {
        const t = res.data || res;
        this.zonas = t.zonas || [];
        this.categorias = t.categorias || [];
        this.brandingAnio = t.anio || null;
        // Load posiciones after we have zonas
        this.loadPosiciones(torneoId);
        this.loadGoleadores(torneoId);
        if (this.userClubId) this.loadMiClub(torneoId);
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  // ─── B) KPIs ────────────────────────────────────────────────────────

  private loadStats(torneoId: number) {
    this.http.get<any>(`${environment.apiUrl}/torneos/${torneoId}/stats`).subscribe({
      next: res => {
        const d = res.data || res;
        this.kpis = [
          { label: 'Clubes', value: d.clubes ?? d.total_clubes ?? 0, icon: 'groups', gradient: 'bg-gradient-to-r from-blue-500 to-cyan-500', iconColor: 'bg-blue-50 text-blue-600' },
          { label: 'Jugadores', value: d.jugadores ?? d.total_jugadores ?? 0, icon: 'sports_soccer', gradient: 'bg-gradient-to-r from-amber-500 to-yellow-500', iconColor: 'bg-amber-50 text-amber-600' },
          { label: 'Partidos', value: d.partidos ?? d.total_partidos ?? 0, icon: 'scoreboard', gradient: 'bg-gradient-to-r from-purple-500 to-violet-500', iconColor: 'bg-purple-50 text-purple-600' },
          { label: 'Finalizados', value: d.finalizados ?? d.partidos_finalizados ?? 0, icon: 'check_circle', gradient: 'bg-gradient-to-r from-green-500 to-emerald-500', iconColor: 'bg-green-50 text-green-600' },
          { label: 'En Curso', value: d.enCurso ?? d.en_curso ?? 0, icon: 'play_circle', gradient: 'bg-gradient-to-r from-emerald-500 to-teal-500', iconColor: 'bg-emerald-50 text-emerald-600' },
          { label: 'Pendientes', value: d.pendientes ?? d.partidos_pendientes ?? 0, icon: 'pending', gradient: 'bg-gradient-to-r from-orange-500 to-red-500', iconColor: 'bg-orange-50 text-orange-600' },
        ];
        this.cdr.detectChanges();
      },
      error: () => {
        this.kpis = [];
        this.cdr.detectChanges();
      },
    });
  }

  // ─── C) Posiciones ──────────────────────────────────────────────────

  selectPosCategoria(catId: number | null) {
    this.posCategoriaId = catId;
    if (this.torneoId) this.loadPosiciones(this.torneoId);
  }

  private loadPosiciones(torneoId: number) {
    if (this.posCategoriaId === null) {
      // General por zona
      const requests: any = {};
      for (const zona of this.zonas) {
        requests[zona.id] = this.http.get<any>(`${environment.apiUrl}/posiciones/${torneoId}/general`, {
          params: { zona_id: zona.id },
        });
      }
      if (Object.keys(requests).length) {
        forkJoin(requests).subscribe({
          next: (results: any) => {
            this.posicionesGeneral = [];
            for (const zonaId of Object.keys(results)) {
              const data = results[zonaId]?.data || [];
              data.forEach((r: any) => r._zona_id = parseInt(zonaId));
              this.posicionesGeneral.push(...data);
            }
            this.posicionesCategoria = [];
            this.cdr.detectChanges();
          },
          error: () => { this.cdr.detectChanges(); },
        });
      }
    } else {
      // Por categoria + zona
      const requests: any = {};
      for (const zona of this.zonas) {
        requests[zona.id] = this.http.get<any>(`${environment.apiUrl}/posiciones/${torneoId}/categorias`, {
          params: { zona_id: zona.id, categoria_id: this.posCategoriaId },
        });
      }
      if (Object.keys(requests).length) {
        forkJoin(requests).subscribe({
          next: (results: any) => {
            this.posicionesCategoria = [];
            for (const zonaId of Object.keys(results)) {
              const data = results[zonaId]?.data || [];
              data.forEach((r: any) => r._zona_id = parseInt(zonaId));
              this.posicionesCategoria.push(...data);
            }
            this.posicionesGeneral = [];
            this.cdr.detectChanges();
          },
          error: () => { this.cdr.detectChanges(); },
        });
      }
    }
  }

  getPosZona(zonaId: number): any[] {
    if (this.posCategoriaId === null) {
      return this.posicionesGeneral.filter(r => r._zona_id === zonaId || r.zona?.id === zonaId);
    }
    return this.posicionesCategoria.filter(r => r._zona_id === zonaId || r.zona?.id === zonaId);
  }

  // ─── D) Goleadores ─────────────────────────────────────────────────

  selectGolCategoria(catId: number | null) {
    this.golCategoriaId = catId;
    if (this.torneoId) this.loadGoleadores(this.torneoId);
  }

  private loadGoleadores(torneoId: number) {
    const params: any = { limit: 15 };
    if (this.golCategoriaId) params.categoria_id = this.golCategoriaId;
    this.http.get<any>(`${environment.apiUrl}/estadisticas/${torneoId}/goleadores`, { params }).subscribe({
      next: res => {
        this.goleadores = res.data || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.goleadores = [];
        this.cdr.detectChanges();
      },
    });
  }

  // ─── E) Resultados por Fecha ────────────────────────────────────────

  private loadJornadas(torneoId: number) {
    this.http.get<any>(`${environment.apiUrl}/fixture/${torneoId}/jornadas`).subscribe({
      next: res => {
        this.jornadas = (res.data || []).sort((a: any, b: any) =>
          (a.fase === b.fase ? a.numero_jornada - b.numero_jornada : (a.fase === 'ida' ? -1 : 1)),
        );

        // Consolidar jornadas en "fechas" (una fecha = misma fase+numero, junta ambas zonas)
        const fechasMap = new Map<string, { key: string; fase: string; numero: number; jornadaIds: number[]; hasFinalizada: boolean }>();
        for (const j of this.jornadas) {
          const key = `${j.fase}-${j.numero_jornada}`;
          if (!fechasMap.has(key)) {
            fechasMap.set(key, { key, fase: j.fase, numero: j.numero_jornada, jornadaIds: [], hasFinalizada: false });
          }
          const f = fechasMap.get(key)!;
          f.jornadaIds.push(j.id);
          if (j.estado === 'finalizada' || j.estado === 'finalizado') f.hasFinalizada = true;
        }
        this.fechas = [...fechasMap.values()].sort((a, b) =>
          a.fase === b.fase ? a.numero - b.numero : (a.fase === 'ida' ? -1 : 1),
        );

        // Agrupar por fase para la UI
        const ida    = this.fechas.filter(f => f.fase === 'ida');
        const vuelta = this.fechas.filter(f => f.fase === 'vuelta');
        this.fechasPorFase = [];
        if (ida.length)    this.fechasPorFase.push({ fase: 'ida',    label: 'Ida',    fechas: ida });
        if (vuelta.length) this.fechasPorFase.push({ fase: 'vuelta', label: 'Vuelta', fechas: vuelta });

        // Auto-select ultima fecha con al menos una jornada finalizada, o la ultima
        const conFinalizada = this.fechas.filter(f => f.hasFinalizada);
        const selected = conFinalizada.length ? conFinalizada[conFinalizada.length - 1] : (this.fechas.length ? this.fechas[this.fechas.length - 1] : null);
        if (selected) this.selectFecha(selected);
        this.cdr.detectChanges();
      },
      error: () => {
        this.jornadas = [];
        this.fechas = [];
        this.fechasPorFase = [];
        this.cdr.detectChanges();
      },
    });
  }

  selectFecha(f: { key: string; jornadaIds: number[] }) {
    this.selectedFechaKey = f.key;
    if (!this.torneoId || !f.jornadaIds.length) return;

    // Fetch partidos de cada jornada y mergear
    const calls = f.jornadaIds.map(jid =>
      this.http.get<any>(`${environment.apiUrl}/fixture/${this.torneoId}/partidos`, { params: { jornada_id: jid } }),
    );
    forkJoin(calls).subscribe({
      next: (results: any[]) => {
        this.partidosFecha = results.flatMap(r => r?.data || []);
        this.agruparPartidos();
        this.cdr.detectChanges();
      },
      error: () => {
        this.partidosFecha = [];
        this.partidosPorZona = [];
        this.cdr.detectChanges();
      },
    });
  }

  private agruparPartidos() {
    // Agrupar por zona (via clubLocal.zona_id) y dentro por categoria
    const zonaMap = new Map<number, { zona: any; categorias: { categoria: string; partidos: any[] }[]; totalPartidos: number }>();
    for (const z of this.zonas) zonaMap.set(z.id, { zona: z, categorias: [], totalPartidos: 0 });

    const porZonaPartidos = new Map<number, any[]>();
    for (const p of this.partidosFecha) {
      const zid = p.clubLocal?.zona_id ?? p.clubVisitante?.zona_id ?? 0;
      if (!porZonaPartidos.has(zid)) porZonaPartidos.set(zid, []);
      porZonaPartidos.get(zid)!.push(p);
    }

    for (const [zid, partidos] of porZonaPartidos.entries()) {
      const entry = zonaMap.get(zid) || { zona: { id: zid, nombre: 'Sin zona', color: '#94a3b8' }, categorias: [], totalPartidos: 0 };
      // Ordenar por orden de categoria (si existe) o nombre
      const catMap = new Map<string, any[]>();
      for (const p of partidos) {
        const cat = p.categoria?.nombre || 'Sin categoria';
        if (!catMap.has(cat)) catMap.set(cat, []);
        catMap.get(cat)!.push(p);
      }
      entry.categorias = [...catMap.entries()].map(([categoria, ps]) => ({ categoria, partidos: ps }));
      entry.totalPartidos = partidos.length;
      zonaMap.set(zid, entry);
    }

    this.partidosPorZona = [...zonaMap.values()].filter(z => z.totalPartidos > 0);
  }

  esGanador(p: any, side: 'local' | 'visitante'): boolean {
    if (p.estado !== 'finalizado') return false;
    const gl = p.goles_local ?? 0;
    const gv = p.goles_visitante ?? 0;
    if (side === 'local') return gl > gv;
    return gv > gl;
  }

  // ─── F) Mi Club ─────────────────────────────────────────────────────

  private loadMiClub(torneoId: number) {
    if (!this.userClubId) return;

    // Get club info from posiciones general
    this.http.get<any>(`${environment.apiUrl}/posiciones/${torneoId}/general`).subscribe({
      next: res => {
        const all = res.data || [];
        const sorted = [...all].sort((a: any, b: any) => (b.puntos_totales ?? 0) - (a.puntos_totales ?? 0));
        const idx = sorted.findIndex((r: any) => r.club?.id === this.userClubId);
        if (idx >= 0) {
          this.miClubData = sorted[idx].club;
          this.miClubPosicion = idx + 1;
          this.miClubPuntos = sorted[idx].puntos_totales ?? 0;
        }
        this.cdr.detectChanges();
      },
      error: () => { this.cdr.detectChanges(); },
    });

    // Get stats for ultimos resultados y proximos -- from stats endpoint
    this.http.get<any>(`${environment.apiUrl}/torneos/${torneoId}/stats`).subscribe({
      next: res => {
        const d = res.data || res;
        const proximos = d.proximos_partidos || d.proximosPartidos || [];
        // Filter proximos for my club
        this.miClubProximos = proximos
          .filter((p: any) => {
            const localId = p.clubLocal?.id || p.club_local?.id || p.club_local_id;
            const visitId = p.clubVisitante?.id || p.club_visitante?.id || p.club_visitante_id;
            return localId === this.userClubId || visitId === this.userClubId;
          })
          .slice(0, 3)
          .map((p: any) => {
            const localId = p.clubLocal?.id || p.club_local?.id || p.club_local_id;
            const isLocal = localId === this.userClubId;
            const rival = isLocal
              ? (p.clubVisitante || p.club_visitante)
              : (p.clubLocal || p.club_local);
            return {
              id: p.id,
              fecha: p.jornada?.fecha || p.hora_inicio,
              rival: rival?.nombre_corto || rival?.nombre || '?',
              rival_escudo: rival?.escudo_url,
              categoria: p.categoria?.nombre || '',
            };
          });

        // Last 5 results based on all finished matches for my club
        // We'll derive from the fixture. For simplicity, set empty (can enhance later)
        this.miClubUltimos = [];
        this.cdr.detectChanges();
      },
      error: () => { this.cdr.detectChanges(); },
    });

    // Load last results by checking finished partidos
    this.http.get<any>(`${environment.apiUrl}/fixture/${torneoId}/jornadas`).subscribe({
      next: res => {
        const jornadas = (res.data || []).filter((j: any) => j.estado === 'finalizada' || j.estado === 'finalizado');
        if (!jornadas.length) return;
        // Load partidos of last 3 jornadas to find 5 results
        const lastJornadas = jornadas.slice(-3);
        const requests = lastJornadas.map((j: any) =>
          this.http.get<any>(`${environment.apiUrl}/fixture/${torneoId}/partidos`, { params: { jornada_id: j.id } })
        );
        forkJoin(requests).subscribe({
          next: (results) => {
            const resultsArr = results as any[];
            const allPartidos: any[] = [];
            resultsArr.forEach(r => allPartidos.push(...(r.data || [])));
            const mine = allPartidos.filter((p: any) => {
              if (p.estado !== 'finalizado') return false;
              const lid = p.clubLocal?.id || p.club_local_id;
              const vid = p.clubVisitante?.id || p.club_visitante_id;
              return lid === this.userClubId || vid === this.userClubId;
            });
            this.miClubUltimos = mine.slice(-5).map((p: any) => {
              const lid = p.clubLocal?.id || p.club_local_id;
              const isLocal = lid === this.userClubId;
              const gl = p.goles_local ?? 0;
              const gv = p.goles_visitante ?? 0;
              const myGoals = isLocal ? gl : gv;
              const theirGoals = isLocal ? gv : gl;
              if (myGoals > theirGoals) return 'V';
              if (myGoals === theirGoals) return 'E';
              return 'D';
            });
            this.cdr.detectChanges();
          },
          error: () => { this.cdr.detectChanges(); },
        });
      },
      error: () => {},
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  /** Agrupa goleadores por zona via g.club.zona_id respetando orden de this.zonas. */
  gruposPorZonaGol(rows: any[]): { zona: any; rows: any[] }[] {
    const map = new Map<number, { zona: any; rows: any[] }>();
    for (const z of this.zonas) map.set(z.id, { zona: z, rows: [] });
    const sinZona: any[] = [];
    for (const r of rows) {
      const zid = r.club?.zona_id;
      if (zid && map.has(zid)) map.get(zid)!.rows.push(r);
      else sinZona.push(r);
    }
    const result = [...map.values()].filter(g => g.rows.length);
    if (sinZona.length) result.push({ zona: { id: 0, nombre: 'Sin zona', color: '#94a3b8' }, rows: sinZona });
    return result;
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

  formatFechaCorta(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    return `${dia}/${mes}`;
  }
}
