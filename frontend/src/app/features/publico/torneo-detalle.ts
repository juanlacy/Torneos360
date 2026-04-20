import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../environments/environment';

type Tab = 'general' | 'categoria' | 'goleadores' | 'tarjetas' | 'fixture' | 'sanciones';

@Component({
  selector: 'app-torneo-detalle-publico',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  template: `
    @if (loading) {
      <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <mat-spinner [diameter]="48"></mat-spinner>
      </div>
    } @else if (!torneo) {
      <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <mat-icon class="!text-6xl !w-16 !h-16 text-gray-400 mb-4">search_off</mat-icon>
        <h1 class="text-xl font-bold text-gray-700">Torneo no encontrado</h1>
        <a routerLink="/" class="mt-6 px-5 py-2 rounded-lg bg-purple-700 text-white text-sm font-medium hover:bg-purple-800">Volver al inicio</a>
      </div>
    } @else {
      <div class="min-h-screen bg-gray-50 pb-12">

        <!-- ═══ HEADER con branding ═══ -->
        <header class="text-white shadow-lg"
          [style.background]="'linear-gradient(135deg, ' + (torneo.color_primario || '#762c7e') + ', ' + (torneo.color_secundario || '#4f2f7d') + ')'">
          <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center gap-4">
            <a routerLink="/" class="flex-shrink-0 opacity-80 hover:opacity-100 transition-opacity">
              <mat-icon class="!text-white">arrow_back</mat-icon>
            </a>
            @if (torneo.logo_url) {
              <img [src]="resolveUrl(torneo.logo_url)" class="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-lg bg-white/10 p-1.5" alt="">
            } @else {
              <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-white/15 flex items-center justify-center text-2xl font-bold backdrop-blur">
                {{ (torneo.nombre || '?').charAt(0) }}
              </div>
            }
            <div class="min-w-0 flex-1">
              <h1 class="text-2xl sm:text-3xl font-bold truncate">{{ torneo.nombre }}</h1>
              <p class="text-sm text-white/80">Temporada {{ torneo.anio }} · {{ torneo.estado === 'en_curso' ? 'En curso' : torneo.estado === 'finalizado' ? 'Finalizado' : 'Planificacion' }}</p>
            </div>
          </div>

          <!-- Tabs -->
          <nav class="border-t border-white/10 bg-black/10 backdrop-blur">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
              @for (t of tabs; track t.id) {
                <button (click)="setTab(t.id)"
                  class="px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 flex items-center gap-2"
                  [class.border-white]="tab === t.id"
                  [class.text-white]="tab === t.id"
                  [class.border-transparent]="tab !== t.id"
                  [class.text-white/60]="tab !== t.id"
                  [class.hover:text-white]="tab !== t.id">
                  <mat-icon class="!text-base !w-5 !h-5">{{ t.icon }}</mat-icon>
                  {{ t.label }}
                </button>
              }
            </div>
          </nav>
        </header>

        <main class="max-w-6xl mx-auto px-4 sm:px-6 mt-6">

          <!-- ═══ BANNER: PARTIDOS EN VIVO ═══ -->
          @if (partidosEnVivo.length) {
            <section class="mb-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-lg overflow-hidden animate-fade-in">
              <div class="px-4 py-2.5 flex items-center gap-2 bg-red-800/30 border-b border-red-500/30">
                <span class="relative flex h-2.5 w-2.5">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                </span>
                <span class="text-xs font-bold uppercase tracking-wider">En Vivo Ahora</span>
                <span class="ml-auto text-[11px] text-white/80">{{ partidosEnVivo.length }} partido{{ partidosEnVivo.length === 1 ? '' : 's' }}</span>
              </div>
              <div class="divide-y divide-red-500/30">
                @for (p of partidosEnVivo; track p.id) {
                  <div class="flex items-center gap-3 px-4 py-2.5">
                    @if (p.categoria?.nombre) {
                      <span class="shrink-0 text-[10px] font-bold uppercase bg-white/15 px-2 py-0.5 rounded">{{ p.categoria.nombre }}</span>
                    }
                    <div class="flex items-center gap-2 flex-1 justify-end min-w-0">
                      <span class="text-sm font-semibold truncate text-right">{{ p.clubLocal?.nombre_corto || p.clubLocal?.nombre }}</span>
                      @if (p.clubLocal?.escudo_url) {
                        <img [src]="resolveUrl(p.clubLocal.escudo_url)" class="w-7 h-7 object-contain shrink-0 bg-white/10 rounded p-0.5" alt="">
                      }
                    </div>
                    <div class="shrink-0 px-3 py-1 rounded-lg bg-black/30 text-center min-w-[64px]">
                      <span class="text-lg font-extrabold tabular-nums">{{ p.goles_local ?? 0 }} - {{ p.goles_visitante ?? 0 }}</span>
                    </div>
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                      @if (p.clubVisitante?.escudo_url) {
                        <img [src]="resolveUrl(p.clubVisitante.escudo_url)" class="w-7 h-7 object-contain shrink-0 bg-white/10 rounded p-0.5" alt="">
                      }
                      <span class="text-sm font-semibold truncate">{{ p.clubVisitante?.nombre_corto || p.clubVisitante?.nombre }}</span>
                    </div>
                  </div>
                }
              </div>
            </section>
          }

          <!-- ═══ TAB: TABLA GENERAL ═══ -->
          @if (tab === 'general') {
            <section>
              <div class="mb-4 px-1">
                <h2 class="font-bold text-gray-900">Tabla General</h2>
                <p class="text-xs text-gray-500">Suma de puntos de todas las categorias por club</p>
              </div>

              @if (loadingTab) {
                <div class="bg-white rounded-2xl border border-gray-200 py-12 flex justify-center"><mat-spinner [diameter]="32"></mat-spinner></div>
              } @else if (!posicionesGenerales.length) {
                <div class="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400">
                  <mat-icon class="!text-5xl !w-12 !h-12 mb-2">leaderboard</mat-icon>
                  <p class="text-sm">Sin posiciones todavia</p>
                </div>
              } @else {
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  @for (g of gruposPorZona(posicionesGenerales); track g.zona.id) {
                    <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                      <div class="h-1.5" [style.background-color]="g.zona.color || torneo.color_primario || '#762c7e'"></div>
                      <div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full" [style.background-color]="g.zona.color || '#6b7280'"></span>
                        <span class="text-xs font-bold text-gray-700 uppercase tracking-wide">{{ g.zona.nombre }}</span>
                        <span class="ml-auto text-[10px] text-gray-400">{{ g.rows.length }} clubes</span>
                      </div>
                      <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                          <thead class="bg-gray-50/50 text-gray-400 text-[10px] uppercase tracking-wider">
                            <tr>
                              <th class="px-3 py-2 text-center w-10">#</th>
                              <th class="px-3 py-2 text-left">Club</th>
                              <th class="px-2 py-2 text-center">PJ</th>
                              <th class="px-2 py-2 text-center hidden md:table-cell">PG</th>
                              <th class="px-2 py-2 text-center hidden md:table-cell">PE</th>
                              <th class="px-2 py-2 text-center hidden md:table-cell">PP</th>
                              <th class="px-2 py-2 text-center hidden md:table-cell">GF</th>
                              <th class="px-2 py-2 text-center hidden md:table-cell">GC</th>
                              <th class="px-2 py-2 text-center">DG</th>
                              <th class="px-3 py-2 text-right">PTS</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (p of g.rows; track p.club?.id; let i = $index) {
                              <tr class="border-t border-gray-100 hover:bg-gray-50">
                                <td class="px-3 py-2 text-center">
                                  <span class="inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold"
                                    [class]="i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-amber-100 text-amber-700' : 'text-gray-400'">
                                    {{ i + 1 }}
                                  </span>
                                </td>
                                <td class="px-3 py-2">
                                  <div class="flex items-center gap-2 min-w-0">
                                    @if (p.club?.escudo_url) {
                                      <img [src]="resolveUrl(p.club.escudo_url)" class="w-6 h-6 object-contain flex-shrink-0" alt="">
                                    } @else {
                                      <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                                        [style.background-color]="p.club?.color_primario || '#762c7e'">
                                        {{ (p.club?.nombre_corto || '?').substring(0, 2) }}
                                      </div>
                                    }
                                    <span class="font-semibold text-gray-900 truncate text-xs sm:text-sm">{{ p.club?.nombre_corto || p.club?.nombre }}</span>
                                  </div>
                                </td>
                                <td class="px-2 py-2 text-center text-xs text-gray-700">{{ p.pj ?? 0 }}</td>
                                <td class="px-2 py-2 text-center text-xs text-green-600 hidden md:table-cell">{{ p.pg ?? 0 }}</td>
                                <td class="px-2 py-2 text-center text-xs text-gray-500 hidden md:table-cell">{{ p.pe ?? 0 }}</td>
                                <td class="px-2 py-2 text-center text-xs text-red-500 hidden md:table-cell">{{ p.pp ?? 0 }}</td>
                                <td class="px-2 py-2 text-center text-xs hidden md:table-cell">{{ p.gf ?? 0 }}</td>
                                <td class="px-2 py-2 text-center text-xs hidden md:table-cell">{{ p.gc ?? 0 }}</td>
                                <td class="px-2 py-2 text-center text-xs font-medium" [class.text-green-600]="(p.dg ?? 0) > 0" [class.text-red-500]="(p.dg ?? 0) < 0">
                                  {{ (p.dg ?? 0) > 0 ? '+' : '' }}{{ p.dg ?? 0 }}
                                </td>
                                <td class="px-3 py-2 text-right">
                                  <span class="inline-block min-w-[32px] px-2 py-0.5 rounded text-xs font-bold"
                                    [style.background-color]="(torneo.color_primario || '#762c7e') + '18'"
                                    [style.color]="torneo.color_primario || '#762c7e'">
                                    {{ p.puntos_totales ?? 0 }}
                                  </span>
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                  }
                </div>
              }
            </section>
          }

          <!-- ═══ TAB: POR CATEGORIA ═══ -->
          @if (tab === 'categoria') {
            <section>
              <div class="mb-4 px-1">
                <h2 class="font-bold text-gray-900">Tabla por Categoria</h2>
                <p class="text-xs text-gray-500">Posiciones detalladas, una tabla por zona</p>
              </div>
              <div class="mb-4 flex gap-2 overflow-x-auto">
                @for (c of categorias; track c.id) {
                  <button (click)="selectCategoriaPos(c.id)"
                    class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    [class]="categoriaId === c.id ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'"
                    [style.background-color]="categoriaId === c.id ? (torneo.color_primario || '#762c7e') : ''">
                    {{ c.nombre }}
                  </button>
                }
              </div>

              @if (loadingTab) {
                <div class="bg-white rounded-2xl border border-gray-200 py-12 flex justify-center"><mat-spinner [diameter]="32"></mat-spinner></div>
              } @else if (!posicionesCategoria.length) {
                <div class="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400">
                  <mat-icon class="!text-5xl !w-12 !h-12 mb-2">leaderboard</mat-icon>
                  <p class="text-sm">Sin partidos jugados en esta categoria</p>
                </div>
              } @else {
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  @for (g of gruposPorZona(posicionesCategoria); track g.zona.id) {
                    <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                      <div class="h-1.5" [style.background-color]="g.zona.color || torneo.color_primario || '#762c7e'"></div>
                      <div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full" [style.background-color]="g.zona.color || '#6b7280'"></span>
                        <span class="text-xs font-bold text-gray-700 uppercase tracking-wide">{{ g.zona.nombre }}</span>
                        <span class="ml-auto text-[10px] text-gray-400">{{ g.rows.length }} clubes</span>
                      </div>
                      <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                          <thead class="bg-gray-50/50 text-gray-400 text-[10px] uppercase tracking-wider">
                            <tr>
                              <th class="px-3 py-2 text-center w-10">#</th>
                              <th class="px-3 py-2 text-left">Club</th>
                              <th class="px-2 py-2 text-center">PJ</th>
                              <th class="px-2 py-2 text-center hidden sm:table-cell">PG</th>
                              <th class="px-2 py-2 text-center hidden sm:table-cell">PE</th>
                              <th class="px-2 py-2 text-center hidden sm:table-cell">PP</th>
                              <th class="px-2 py-2 text-center hidden md:table-cell">GF</th>
                              <th class="px-2 py-2 text-center hidden md:table-cell">GC</th>
                              <th class="px-2 py-2 text-center">DG</th>
                              <th class="px-3 py-2 text-right">PTS</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (p of g.rows; track p.club?.id; let i = $index) {
                              <tr class="border-t border-gray-100 hover:bg-gray-50">
                                <td class="px-3 py-2 text-center">
                                  <span class="inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold"
                                    [class]="i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-amber-100 text-amber-700' : 'text-gray-400'">
                                    {{ i + 1 }}
                                  </span>
                                </td>
                                <td class="px-3 py-2">
                                  <div class="flex items-center gap-2 min-w-0">
                                    @if (p.club?.escudo_url) {
                                      <img [src]="resolveUrl(p.club.escudo_url)" class="w-6 h-6 object-contain flex-shrink-0" alt="">
                                    } @else {
                                      <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                                        [style.background-color]="p.club?.color_primario || '#762c7e'">
                                        {{ (p.club?.nombre_corto || '?').substring(0, 2) }}
                                      </div>
                                    }
                                    <span class="font-semibold text-gray-900 truncate text-xs sm:text-sm">{{ p.club?.nombre_corto || p.club?.nombre }}</span>
                                  </div>
                                </td>
                                <td class="px-2 py-2 text-center text-xs text-gray-700">{{ p.pj ?? 0 }}</td>
                                <td class="px-2 py-2 text-center text-xs text-green-600 hidden sm:table-cell">{{ p.pg ?? 0 }}</td>
                                <td class="px-2 py-2 text-center text-xs text-gray-500 hidden sm:table-cell">{{ p.pe ?? 0 }}</td>
                                <td class="px-2 py-2 text-center text-xs text-red-500 hidden sm:table-cell">{{ p.pp ?? 0 }}</td>
                                <td class="px-2 py-2 text-center text-xs hidden md:table-cell">{{ p.gf ?? 0 }}</td>
                                <td class="px-2 py-2 text-center text-xs hidden md:table-cell">{{ p.gc ?? 0 }}</td>
                                <td class="px-2 py-2 text-center text-xs font-medium" [class.text-green-600]="(p.dg ?? 0) > 0" [class.text-red-500]="(p.dg ?? 0) < 0">
                                  {{ (p.dg ?? 0) > 0 ? '+' : '' }}{{ p.dg ?? 0 }}
                                </td>
                                <td class="px-3 py-2 text-right">
                                  <span class="inline-block min-w-[32px] px-2 py-0.5 rounded text-xs font-bold"
                                    [style.background-color]="(torneo.color_primario || '#762c7e') + '18'"
                                    [style.color]="torneo.color_primario || '#762c7e'">
                                    {{ p.puntos ?? 0 }}
                                  </span>
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                  }
                </div>
              }
            </section>
          }

          <!-- ═══ TAB: GOLEADORES ═══ -->
          @if (tab === 'goleadores') {
            <section>
              <div class="mb-4 px-1">
                <h2 class="font-bold text-gray-900">Tabla de Goleadores</h2>
                <p class="text-xs text-gray-500">Maximos goleadores por zona</p>
              </div>
              <div class="mb-4 flex gap-2 overflow-x-auto">
                <button (click)="selectCategoriaGol(null)"
                  class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  [class]="categoriaIdGoleadores === null ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'"
                  [style.background-color]="categoriaIdGoleadores === null ? (torneo.color_primario || '#762c7e') : ''">
                  Todas
                </button>
                @for (c of categorias; track c.id) {
                  <button (click)="selectCategoriaGol(c.id)"
                    class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    [class]="categoriaIdGoleadores === c.id ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'"
                    [style.background-color]="categoriaIdGoleadores === c.id ? (torneo.color_primario || '#762c7e') : ''">
                    {{ c.nombre }}
                  </button>
                }
              </div>

              @if (loadingTab) {
                <div class="bg-white rounded-2xl border border-gray-200 py-12 flex justify-center"><mat-spinner [diameter]="32"></mat-spinner></div>
              } @else if (!goleadores.length) {
                <div class="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400">
                  <mat-icon class="!text-5xl !w-12 !h-12 mb-2">sports_soccer</mat-icon>
                  <p class="text-sm">Sin goles registrados todavia</p>
                </div>
              } @else {
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  @for (g of gruposPorZona(goleadores); track g.zona.id) {
                    <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                      <div class="h-1.5" [style.background-color]="g.zona.color || torneo.color_primario || '#762c7e'"></div>
                      <div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full" [style.background-color]="g.zona.color || '#6b7280'"></span>
                        <span class="text-xs font-bold text-gray-700 uppercase tracking-wide">{{ g.zona.nombre }}</span>
                        <span class="ml-auto text-[10px] text-gray-400">{{ g.rows.length }} jugadores</span>
                      </div>
                      <ul class="divide-y divide-gray-100">
                        @for (j of g.rows; track j.persona_id; let i = $index) {
                          <li class="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50">
                            <span class="inline-flex w-6 h-6 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0"
                              [class]="i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-amber-100 text-amber-700' : 'text-gray-400'">
                              {{ i + 1 }}
                            </span>
                            @if (j.foto_url) {
                              <img [src]="resolveUrl(j.foto_url)" class="w-9 h-9 rounded-full object-cover flex-shrink-0" alt="">
                            } @else {
                              <div class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                                [style.background-color]="j.club?.color_primario || '#762c7e'">
                                {{ (j.nombre || '?').charAt(0) }}{{ (j.apellido || '').charAt(0) }}
                              </div>
                            }
                            <div class="flex-1 min-w-0">
                              <p class="font-semibold text-gray-900 text-sm truncate">{{ j.apellido }}, {{ j.nombre }}</p>
                              <div class="flex items-center gap-1.5 mt-0.5">
                                @if (j.club?.escudo_url) {
                                  <img [src]="resolveUrl(j.club.escudo_url)" class="w-4 h-4 object-contain" alt="">
                                }
                                <span class="text-[11px] text-gray-500 truncate">{{ j.club?.nombre_corto || j.club?.nombre }}</span>
                                @if (j.categoria?.nombre) {
                                  <span class="inline-flex px-1.5 py-0 rounded text-[9px] font-medium bg-blue-50 text-blue-600">{{ j.categoria.nombre }}</span>
                                }
                              </div>
                            </div>
                            <span class="shrink-0 text-right">
                              <span class="text-base font-extrabold text-gray-900">{{ j.goles }}</span>
                              <p class="text-[9px] text-gray-400 uppercase leading-none">goles</p>
                            </span>
                          </li>
                        }
                      </ul>
                    </div>
                  }
                </div>
              }
            </section>
          }

          <!-- ═══ TAB: TARJETAS ═══ -->
          @if (tab === 'tarjetas') {
            <section>
              <div class="mb-4 px-1">
                <h2 class="font-bold text-gray-900">Tabla de Tarjetas</h2>
                <p class="text-xs text-gray-500">Amarillas y rojas acumuladas, ordenadas por total (rojas valen x3)</p>
              </div>
              <div class="mb-4 flex gap-2 overflow-x-auto">
                <button (click)="selectCategoriaTarj(null)"
                  class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  [class]="categoriaIdTarjetas === null ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'"
                  [style.background-color]="categoriaIdTarjetas === null ? (torneo.color_primario || '#762c7e') : ''">
                  Todas
                </button>
                @for (c of categorias; track c.id) {
                  <button (click)="selectCategoriaTarj(c.id)"
                    class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    [class]="categoriaIdTarjetas === c.id ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'"
                    [style.background-color]="categoriaIdTarjetas === c.id ? (torneo.color_primario || '#762c7e') : ''">
                    {{ c.nombre }}
                  </button>
                }
              </div>

              @if (loadingTab) {
                <div class="bg-white rounded-2xl border border-gray-200 py-12 flex justify-center"><mat-spinner [diameter]="32"></mat-spinner></div>
              } @else if (!tarjetas.length) {
                <div class="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400">
                  <mat-icon class="!text-5xl !w-12 !h-12 mb-2">style</mat-icon>
                  <p class="text-sm">Sin tarjetas registradas todavia</p>
                </div>
              } @else {
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  @for (g of gruposPorZona(tarjetas); track g.zona.id) {
                    <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                      <div class="h-1.5" [style.background-color]="g.zona.color || torneo.color_primario || '#762c7e'"></div>
                      <div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full" [style.background-color]="g.zona.color || '#6b7280'"></span>
                        <span class="text-xs font-bold text-gray-700 uppercase tracking-wide">{{ g.zona.nombre }}</span>
                        <span class="ml-auto text-[10px] text-gray-400">{{ g.rows.length }} jugadores</span>
                      </div>
                      <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                          <thead class="bg-gray-50/50 text-gray-400 text-[10px] uppercase tracking-wider">
                            <tr>
                              <th class="px-3 py-2 text-center w-10">#</th>
                              <th class="px-3 py-2 text-left">Jugador</th>
                              <th class="px-2 py-2 text-center">🟡</th>
                              <th class="px-2 py-2 text-center">🔴</th>
                              <th class="px-3 py-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (t of g.rows; track t.persona_id; let i = $index) {
                              <tr class="border-t border-gray-100 hover:bg-gray-50">
                                <td class="px-3 py-2 text-center text-gray-400 text-xs font-medium">{{ i + 1 }}</td>
                                <td class="px-3 py-2">
                                  <div class="flex items-center gap-2 min-w-0">
                                    @if (t.foto_url) {
                                      <img [src]="resolveUrl(t.foto_url)" class="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="">
                                    } @else {
                                      <div class="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
                                        [style.background-color]="t.club?.color_primario || '#762c7e'">
                                        {{ (t.nombre || '?').charAt(0) }}{{ (t.apellido || '').charAt(0) }}
                                      </div>
                                    }
                                    <div class="min-w-0">
                                      <p class="font-semibold text-gray-900 truncate text-xs">{{ t.apellido }}, {{ t.nombre }}</p>
                                      <p class="text-[10px] text-gray-500 truncate">{{ t.club?.nombre_corto || t.club?.nombre }}</p>
                                    </div>
                                  </div>
                                </td>
                                <td class="px-2 py-2 text-center font-bold text-yellow-600 text-xs">{{ t.amarillas }}</td>
                                <td class="px-2 py-2 text-center font-bold text-red-600 text-xs">{{ t.rojas }}</td>
                                <td class="px-3 py-2 text-right">
                                  <span class="inline-block min-w-[28px] px-1.5 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-700">
                                    {{ t.rojas * 3 + t.amarillas }}
                                  </span>
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                  }
                </div>
              }
            </section>
          }

          <!-- ═══ TAB: FIXTURE ═══ -->
          @if (tab === 'fixture') {
            <section class="space-y-3">
              @if (loadingTab) {
                <div class="bg-white rounded-2xl border border-gray-200 py-12 flex justify-center"><mat-spinner [diameter]="32"></mat-spinner></div>
              } @else if (!jornadas.length) {
                <div class="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400">
                  <mat-icon class="!text-5xl !w-12 !h-12 mb-2">event_busy</mat-icon>
                  <p class="text-sm">Fixture todavia no publicado</p>
                </div>
              } @else {
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  @for (col of gruposPorZona(jornadas); track col.zona.id) {
                    <div class="space-y-2">
                      <div class="flex items-center gap-2 px-2">
                        <span class="w-3 h-3 rounded-full" [style.background-color]="col.zona.color || '#6b7280'"></span>
                        <span class="text-sm font-bold text-gray-700 uppercase tracking-wide">Zona {{ col.zona.nombre }}</span>
                        <span class="text-[10px] text-gray-400">{{ col.rows.length }} fechas</span>
                      </div>
                      @for (j of col.rows; track j.id) {
                        <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                          <button (click)="toggleJornada(j)"
                            class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div class="flex items-center gap-3 text-left min-w-0">
                              <div class="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                                [style.background-color]="col.zona.color || torneo.color_primario || '#762c7e'">
                                {{ j.numero_jornada }}
                              </div>
                              <div class="min-w-0">
                                <p class="font-bold text-gray-900 text-sm truncate">Fecha {{ j.numero_jornada }}<span class="text-gray-400 font-normal text-xs ml-1">{{ j.fase ? '(' + j.fase + ')' : '' }}</span></p>
                                <p class="text-xs text-gray-500">{{ j.fecha ? formatFecha(j.fecha) : 'Sin fecha' }}</p>
                              </div>
                            </div>
                            <mat-icon class="text-gray-400 transition-transform shrink-0" [class.rotate-180]="j._expanded">expand_more</mat-icon>
                          </button>

                          @if (j._expanded) {
                            @if (j._loading) {
                              <div class="py-6 flex justify-center"><mat-spinner [diameter]="24"></mat-spinner></div>
                            } @else if (!j._partidos?.length) {
                              <div class="px-4 py-5 text-center text-gray-400 text-sm border-t border-gray-100">Sin partidos en esta jornada</div>
                            } @else {
                              <div class="border-t border-gray-100 divide-y divide-gray-100">
                                @for (p of j._partidos; track p.id) {
                                  <div class="px-3 py-2 flex items-center gap-2">
                                    @if (p.categoria) {
                                      <span class="text-[10px] font-bold uppercase text-gray-400 w-10 flex-shrink-0">{{ p.categoria.nombre }}</span>
                                    }
                                    <div class="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                                      <span class="font-semibold text-gray-800 text-xs truncate text-right">{{ p.clubLocal?.nombre_corto || p.clubLocal?.nombre }}</span>
                                      @if (p.clubLocal?.escudo_url) {
                                        <img [src]="resolveUrl(p.clubLocal.escudo_url)" class="w-5 h-5 object-contain shrink-0" alt="">
                                      }
                                    </div>
                                    <div class="flex-shrink-0 min-w-[52px] text-center">
                                      @if (p.estado === 'finalizado') {
                                        <span class="inline-block px-2 py-0.5 rounded bg-gray-900 text-white text-xs font-bold">{{ p.goles_local }} - {{ p.goles_visitante }}</span>
                                      } @else if (p.estado === 'en_curso') {
                                        <span class="inline-block px-1.5 py-0.5 rounded bg-red-500 text-white text-[10px] font-bold animate-pulse">VIVO</span>
                                        <p class="text-[10px] font-bold text-gray-700 mt-0.5">{{ p.goles_local }} - {{ p.goles_visitante }}</p>
                                      } @else {
                                        <span class="text-[10px] text-gray-400 font-medium">vs</span>
                                      }
                                    </div>
                                    <div class="flex-1 flex items-center gap-1.5 min-w-0">
                                      @if (p.clubVisitante?.escudo_url) {
                                        <img [src]="resolveUrl(p.clubVisitante.escudo_url)" class="w-5 h-5 object-contain shrink-0" alt="">
                                      }
                                      <span class="font-semibold text-gray-800 text-xs truncate">{{ p.clubVisitante?.nombre_corto || p.clubVisitante?.nombre }}</span>
                                    </div>
                                  </div>
                                }
                              </div>
                            }
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </section>
          }

          <!-- ═══ TAB: SANCIONES ═══ -->
          @if (tab === 'sanciones') {
            <section class="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div class="px-5 py-4 border-b border-gray-100">
                <h2 class="font-bold text-gray-900">Sanciones disciplinarias</h2>
                <p class="text-xs text-gray-500">Sanciones publicadas del tribunal de disciplina</p>
              </div>

              @if (loadingTab) {
                <div class="py-12 flex justify-center"><mat-spinner [diameter]="32"></mat-spinner></div>
              } @else if (!sanciones.length) {
                <div class="py-16 text-center text-gray-400">
                  <mat-icon class="!text-5xl !w-12 !h-12 mb-2">gavel</mat-icon>
                  <p class="text-sm">Sin sanciones publicadas</p>
                </div>
              } @else {
                <ul class="divide-y divide-gray-100">
                  @for (s of sanciones; track s.id) {
                    <li class="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                      @if (s.persona?.foto_url) {
                        <img [src]="resolveUrl(s.persona.foto_url)" class="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="">
                      } @else {
                        <div class="w-10 h-10 rounded-full bg-red-700 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {{ (s.persona?.nombre || '?').charAt(0) }}{{ (s.persona?.apellido || '').charAt(0) }}
                        </div>
                      }
                      <div class="flex-1 min-w-0">
                        <p class="font-semibold text-gray-900 truncate">{{ s.persona?.apellido }}, {{ s.persona?.nombre }}</p>
                        <p class="text-xs text-gray-600 capitalize truncate">
                          {{ s.motivo?.replaceAll('_', ' ') }}
                          @if (s.partido?.categoria?.nombre) { · {{ s.partido.categoria.nombre }} }
                        </p>
                        @if (s.detalle) {
                          <p class="text-[11px] text-gray-500 italic mt-0.5 line-clamp-2">{{ s.detalle }}</p>
                        }
                      </div>
                      <div class="text-right shrink-0">
                        <span class="inline-block px-2.5 py-1 rounded-lg text-white font-bold text-sm"
                          [style.background-color]="torneo.color_primario || '#b91c1c'">
                          {{ s.fechas_suspension }}f
                        </span>
                        <p class="text-[10px] text-gray-400 mt-1 capitalize">{{ s.estado }}</p>
                      </div>
                    </li>
                  }
                </ul>
              }
            </section>
          }
        </main>
      </div>
    }
  `,
})
export class TorneoDetallePublicoComponent implements OnInit, OnDestroy {
  loading = true;
  loadingTab = false;
  torneo: any = null;
  zonas: any[] = [];
  categorias: any[] = [];
  jornadas: any[] = [];

  tab: Tab = 'general';
  tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'general',    label: 'Tabla General', icon: 'leaderboard' },
    { id: 'categoria',  label: 'Por Categoria', icon: 'category' },
    { id: 'goleadores', label: 'Goleadores',    icon: 'sports_soccer' },
    { id: 'tarjetas',   label: 'Tarjetas',      icon: 'style' },
    { id: 'fixture',    label: 'Fixture',       icon: 'event' },
    { id: 'sanciones',  label: 'Sanciones',     icon: 'gavel' },
  ];

  // Filtros por tab
  categoriaId: number | null = null;
  categoriaIdGoleadores: number | null = null;
  categoriaIdTarjetas: number | null = null;

  posicionesGenerales: any[] = [];
  posicionesCategoria: any[] = [];
  goleadores: any[] = [];
  tarjetas: any[] = [];
  sanciones: any[] = [];
  partidosEnVivo: any[] = [];
  private vivoSub: any = null;

  private torneoId!: number;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.torneoId = parseInt(this.route.snapshot.paramMap.get('id') || '0');
    if (!this.torneoId) { this.loading = false; return; }
    this.cargarTorneo();
  }

  cargarTorneo() {
    this.http.get<any>(`${environment.apiUrl}/publico/torneos/${this.torneoId}`).subscribe({
      next: (res) => {
        this.torneo = res.data;
        this.zonas = res.data?.zonas || [];
        this.categorias = (res.data?.categorias || []).sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
        if (this.categorias.length) this.categoriaId = this.categorias[0].id;
        this.loading = false;
        this.cargarPosicionesGenerales();
        this.cargarEnVivo();
        // Poll cada 30s mientras la pantalla este abierta
        this.vivoSub = setInterval(() => this.cargarEnVivo(), 30_000);
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); },
    });
  }

  ngOnDestroy() {
    if (this.vivoSub) clearInterval(this.vivoSub);
  }

  cargarEnVivo() {
    this.http.get<any>(`${environment.apiUrl}/publico/torneos/${this.torneoId}/en-vivo`).subscribe({
      next: (res) => {
        this.partidosEnVivo = res.data || [];
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  setTab(t: Tab) {
    this.tab = t;
    this.cdr.detectChanges();
    if (t === 'general' && !this.posicionesGenerales.length) this.cargarPosicionesGenerales();
    if (t === 'categoria' && !this.posicionesCategoria.length) this.cargarPosicionesCategoria();
    if (t === 'goleadores' && !this.goleadores.length) this.cargarGoleadores();
    if (t === 'tarjetas' && !this.tarjetas.length) this.cargarTarjetas();
    if (t === 'fixture' && !this.jornadas.length) this.cargarJornadas();
    if (t === 'sanciones' && !this.sanciones.length) this.cargarSanciones();
  }

  cargarPosicionesGenerales() {
    this.loadingTab = true;
    this.http.get<any>(`${environment.apiUrl}/publico/torneos/${this.torneoId}/posiciones`).subscribe({
      next: (res) => {
        this.posicionesGenerales = res.data || [];
        this.loadingTab = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingTab = false; this.cdr.detectChanges(); },
    });
  }

  selectCategoriaPos(id: number)  { this.categoriaId = id; this.cargarPosicionesCategoria(); }
  selectCategoriaGol(id: number | null)  { this.categoriaIdGoleadores = id; this.cargarGoleadores(); }
  selectCategoriaTarj(id: number | null) { this.categoriaIdTarjetas = id; this.cargarTarjetas(); }

  cargarPosicionesCategoria() {
    if (!this.categoriaId) return;
    this.loadingTab = true;
    this.http.get<any>(`${environment.apiUrl}/publico/torneos/${this.torneoId}/posiciones?categoria_id=${this.categoriaId}`).subscribe({
      next: (res) => {
        this.posicionesCategoria = res.data || [];
        this.loadingTab = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingTab = false; this.cdr.detectChanges(); },
    });
  }

  /**
   * Agrupa filas por zona respetando el orden de this.zonas.
   * Soporta 3 shapes:
   *   - posiciones:  r.zona.id
   *   - goleadores/tarjetas: r.club.zona_id
   *   - jornadas: r.zona_id
   */
  gruposPorZona(rows: any[]): { zona: any; rows: any[] }[] {
    const map = new Map<number, { zona: any; rows: any[] }>();
    for (const z of this.zonas) map.set(z.id, { zona: z, rows: [] });
    const sinZona: any[] = [];
    for (const r of rows) {
      const zid = r.zona?.id ?? r.club?.zona_id ?? r.zona_id;
      if (zid && map.has(zid)) map.get(zid)!.rows.push(r);
      else sinZona.push(r);
    }
    const result = [...map.values()].filter(g => g.rows.length);
    if (sinZona.length) result.push({ zona: { id: 0, nombre: 'Sin zona', color: '#94a3b8' }, rows: sinZona });
    return result;
  }

  cargarGoleadores() {
    this.loadingTab = true;
    const params = new URLSearchParams({ limit: '20' });
    if (this.categoriaIdGoleadores) params.set('categoria_id', String(this.categoriaIdGoleadores));
    this.http.get<any>(`${environment.apiUrl}/publico/torneos/${this.torneoId}/goleadores?${params}`).subscribe({
      next: (res) => {
        this.goleadores = res.data || [];
        this.loadingTab = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingTab = false; this.cdr.detectChanges(); },
    });
  }

  cargarSanciones() {
    this.loadingTab = true;
    this.http.get<any>(`${environment.apiUrl}/publico/torneos/${this.torneoId}/sanciones`).subscribe({
      next: (res) => {
        this.sanciones = res.data || [];
        this.loadingTab = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingTab = false; this.cdr.detectChanges(); },
    });
  }

  cargarTarjetas() {
    this.loadingTab = true;
    const params = new URLSearchParams({ limit: '30' });
    if (this.categoriaIdTarjetas) params.set('categoria_id', String(this.categoriaIdTarjetas));
    this.http.get<any>(`${environment.apiUrl}/publico/torneos/${this.torneoId}/tarjetas?${params}`).subscribe({
      next: (res) => {
        this.tarjetas = res.data || [];
        this.loadingTab = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingTab = false; this.cdr.detectChanges(); },
    });
  }

  cargarJornadas() {
    this.loadingTab = true;
    this.http.get<any>(`${environment.apiUrl}/publico/torneos/${this.torneoId}/fixture`).subscribe({
      next: (res) => {
        this.jornadas = (res.data || []).map((j: any) => ({ ...j, _expanded: false, _partidos: null, _loading: false }));
        this.loadingTab = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingTab = false; this.cdr.detectChanges(); },
    });
  }

  toggleJornada(j: any) {
    j._expanded = !j._expanded;
    if (j._expanded && !j._partidos) {
      j._loading = true;
      this.http.get<any>(`${environment.apiUrl}/publico/torneos/${this.torneoId}/fixture?jornada_id=${j.id}`).subscribe({
        next: (res) => {
          j._partidos = res.data || [];
          j._loading = false;
          this.cdr.detectChanges();
        },
        error: () => { j._loading = false; this.cdr.detectChanges(); },
      });
    }
  }

  formatFecha(iso: string): string {
    if (!iso) return '';
    try {
      // Forzar mediodia UTC para evitar que el timezone local reste un dia
      const d = new Date(iso.length <= 10 ? iso + 'T12:00:00Z' : iso);
      return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  }

  resolveUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return url;
    return `${environment.apiUrl}${url}`;
  }
}
