import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../environments/environment';

type Tab = 'general' | 'categoria' | 'goleadores' | 'tarjetas' | 'fixture';

@Component({
  selector: 'app-torneo-detalle-publico',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
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
              <div class="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
                <div>
                  <h2 class="font-bold text-gray-900">Tabla por Categoria</h2>
                  <p class="text-xs text-gray-500">Posiciones detalladas, una tabla por zona</p>
                </div>
                <select [(ngModel)]="categoriaId" (change)="cargarPosicionesCategoria()"
                  class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                  @for (c of categorias; track c.id) {
                    <option [ngValue]="c.id">{{ c.nombre }}</option>
                  }
                </select>
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
            <section class="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div class="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
                <div class="flex-1 min-w-[200px]">
                  <h2 class="font-bold text-gray-900">Tabla de Goleadores</h2>
                  <p class="text-xs text-gray-500">Top {{ goleadores.length || '20' }} maximos goleadores</p>
                </div>
                <select [(ngModel)]="categoriaIdGoleadores" (change)="cargarGoleadores()"
                  class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option [ngValue]="null">Todas las categorias</option>
                  @for (c of categorias; track c.id) {
                    <option [ngValue]="c.id">{{ c.nombre }}</option>
                  }
                </select>
              </div>

              @if (loadingTab) {
                <div class="py-12 flex justify-center"><mat-spinner [diameter]="32"></mat-spinner></div>
              } @else if (!goleadores.length) {
                <div class="py-16 text-center text-gray-400">
                  <mat-icon class="!text-5xl !w-12 !h-12 mb-2">sports_soccer</mat-icon>
                  <p class="text-sm">Sin goles registrados todavia</p>
                </div>
              } @else {
                <ul class="divide-y divide-gray-100">
                  @for (g of goleadores; track g.persona_id; let i = $index) {
                    <li class="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                      <span class="inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                        [class]="i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-amber-100 text-amber-700' : 'text-gray-400'">
                        {{ i + 1 }}
                      </span>
                      @if (g.foto_url) {
                        <img [src]="resolveUrl(g.foto_url)" class="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="">
                      } @else {
                        <div class="w-10 h-10 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {{ (g.nombre || '?').charAt(0) }}{{ (g.apellido || '').charAt(0) }}
                        </div>
                      }
                      <div class="flex-1 min-w-0">
                        <p class="font-bold text-gray-900 truncate">{{ g.apellido }}, {{ g.nombre }}</p>
                        <div class="flex items-center gap-2 mt-0.5">
                          @if (g.club?.escudo_url) {
                            <img [src]="resolveUrl(g.club.escudo_url)" class="w-4 h-4 object-contain" alt="">
                          }
                          <span class="text-xs text-gray-500 truncate">{{ g.club?.nombre_corto || g.club?.nombre }}</span>
                          @if (g.categoria) {
                            <span class="text-[10px] text-gray-400">· {{ g.categoria.nombre }}</span>
                          }
                        </div>
                      </div>
                      <span class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white font-bold text-sm flex-shrink-0"
                        [style.background-color]="torneo.color_primario || '#762c7e'">
                        ⚽ {{ g.goles }}
                      </span>
                    </li>
                  }
                </ul>
              }
            </section>
          }

          <!-- ═══ TAB: TARJETAS ═══ -->
          @if (tab === 'tarjetas') {
            <section class="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div class="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
                <div class="flex-1 min-w-[200px]">
                  <h2 class="font-bold text-gray-900">Tabla de Tarjetas</h2>
                  <p class="text-xs text-gray-500">Amarillas y rojas acumuladas, ordenadas por total (rojas valen x3)</p>
                </div>
                <select [(ngModel)]="categoriaIdTarjetas" (change)="cargarTarjetas()"
                  class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option [ngValue]="null">Todas las categorias</option>
                  @for (c of categorias; track c.id) {
                    <option [ngValue]="c.id">{{ c.nombre }}</option>
                  }
                </select>
              </div>

              @if (loadingTab) {
                <div class="py-12 flex justify-center"><mat-spinner [diameter]="32"></mat-spinner></div>
              } @else if (!tarjetas.length) {
                <div class="py-16 text-center text-gray-400">
                  <mat-icon class="!text-5xl !w-12 !h-12 mb-2">style</mat-icon>
                  <p class="text-sm">Sin tarjetas registradas todavia</p>
                </div>
              } @else {
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead class="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th class="px-3 py-2.5 text-center w-10">#</th>
                        <th class="px-3 py-2.5 text-left">Jugador</th>
                        <th class="px-3 py-2.5 text-left hidden sm:table-cell">Club</th>
                        <th class="px-2 py-2.5 text-center">🟡</th>
                        <th class="px-2 py-2.5 text-center">🔴</th>
                        <th class="px-3 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (t of tarjetas; track t.persona_id; let i = $index) {
                        <tr class="border-t border-gray-100 hover:bg-gray-50">
                          <td class="px-3 py-2.5 text-center text-gray-400 font-medium">{{ i + 1 }}</td>
                          <td class="px-3 py-2.5">
                            <div class="flex items-center gap-2.5 min-w-0">
                              @if (t.foto_url) {
                                <img [src]="resolveUrl(t.foto_url)" class="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="">
                              } @else {
                                <div class="w-8 h-8 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                                  {{ (t.nombre || '?').charAt(0) }}{{ (t.apellido || '').charAt(0) }}
                                </div>
                              }
                              <div class="min-w-0">
                                <p class="font-semibold text-gray-900 truncate text-sm">{{ t.apellido }}, {{ t.nombre }}</p>
                                <p class="sm:hidden text-xs text-gray-500 truncate">{{ t.club?.nombre_corto || t.club?.nombre }}</p>
                              </div>
                            </div>
                          </td>
                          <td class="px-3 py-2.5 hidden sm:table-cell">
                            <div class="flex items-center gap-2">
                              @if (t.club?.escudo_url) {
                                <img [src]="resolveUrl(t.club.escudo_url)" class="w-5 h-5 object-contain" alt="">
                              }
                              <span class="text-xs text-gray-700 truncate">{{ t.club?.nombre_corto || t.club?.nombre }}</span>
                            </div>
                          </td>
                          <td class="px-2 py-2.5 text-center font-bold text-yellow-600">{{ t.amarillas }}</td>
                          <td class="px-2 py-2.5 text-center font-bold text-red-600">{{ t.rojas }}</td>
                          <td class="px-3 py-2.5 text-right">
                            <span class="inline-block min-w-[32px] px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700">
                              {{ t.rojas * 3 + t.amarillas }}
                            </span>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
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
                @for (j of jornadas; track j.id) {
                  <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <button (click)="toggleJornada(j)"
                      class="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div class="flex items-center gap-3 text-left">
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                          [style.background-color]="torneo.color_primario || '#762c7e'">
                          {{ j.numero_jornada }}
                        </div>
                        <div>
                          <p class="font-bold text-gray-900 text-sm">Jornada {{ j.numero_jornada }}<span class="text-gray-400 font-normal text-xs ml-1">{{ j.fase ? '(' + j.fase + ')' : '' }}</span></p>
                          <p class="text-xs text-gray-500">{{ j.fecha ? formatFecha(j.fecha) : 'Sin fecha' }}</p>
                        </div>
                      </div>
                      <mat-icon class="text-gray-400 transition-transform" [class.rotate-180]="j._expanded">expand_more</mat-icon>
                    </button>

                    @if (j._expanded) {
                      @if (j._loading) {
                        <div class="py-6 flex justify-center"><mat-spinner [diameter]="24"></mat-spinner></div>
                      } @else if (!j._partidos?.length) {
                        <div class="px-5 py-6 text-center text-gray-400 text-sm border-t border-gray-100">Sin partidos en esta jornada</div>
                      } @else {
                        <div class="border-t border-gray-100 divide-y divide-gray-100">
                          @for (p of j._partidos; track p.id) {
                            <div class="px-4 py-3 flex items-center gap-3">
                              @if (p.categoria) {
                                <span class="text-[10px] font-bold uppercase text-gray-400 w-12 flex-shrink-0">{{ p.categoria.nombre }}</span>
                              }
                              <!-- Local -->
                              <div class="flex-1 flex items-center justify-end gap-2 min-w-0">
                                <span class="font-semibold text-gray-800 text-sm truncate text-right">{{ p.clubLocal?.nombre_corto || p.clubLocal?.nombre }}</span>
                                @if (p.clubLocal?.escudo_url) {
                                  <img [src]="resolveUrl(p.clubLocal.escudo_url)" class="w-6 h-6 object-contain" alt="">
                                }
                              </div>
                              <!-- Marcador / hora -->
                              <div class="flex-shrink-0 min-w-[64px] text-center">
                                @if (p.estado === 'finalizado') {
                                  <span class="inline-block px-2.5 py-1 rounded-md bg-gray-900 text-white text-sm font-bold">{{ p.goles_local }} - {{ p.goles_visitante }}</span>
                                } @else if (p.estado === 'en_curso') {
                                  <span class="inline-block px-2 py-1 rounded-md bg-red-500 text-white text-xs font-bold animate-pulse">EN VIVO</span>
                                  <p class="text-xs font-bold text-gray-700 mt-0.5">{{ p.goles_local }} - {{ p.goles_visitante }}</p>
                                } @else {
                                  <span class="text-xs text-gray-400 font-medium">vs</span>
                                }
                              </div>
                              <!-- Visitante -->
                              <div class="flex-1 flex items-center gap-2 min-w-0">
                                @if (p.clubVisitante?.escudo_url) {
                                  <img [src]="resolveUrl(p.clubVisitante.escudo_url)" class="w-6 h-6 object-contain" alt="">
                                }
                                <span class="font-semibold text-gray-800 text-sm truncate">{{ p.clubVisitante?.nombre_corto || p.clubVisitante?.nombre }}</span>
                              </div>
                            </div>
                          }
                        </div>
                      }
                    }
                  </div>
                }
              }
            </section>
          }
        </main>
      </div>
    }
  `,
})
export class TorneoDetallePublicoComponent implements OnInit {
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
  ];

  // Filtros por tab
  categoriaId: number | null = null;
  categoriaIdGoleadores: number | null = null;
  categoriaIdTarjetas: number | null = null;

  posicionesGenerales: any[] = [];
  posicionesCategoria: any[] = [];
  goleadores: any[] = [];
  tarjetas: any[] = [];

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
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); },
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

  /** Agrupa filas de posiciones por zona, respetando el orden de this.zonas. */
  gruposPorZona(rows: any[]): { zona: any; rows: any[] }[] {
    const map = new Map<number, { zona: any; rows: any[] }>();
    for (const z of this.zonas) map.set(z.id, { zona: z, rows: [] });
    const sinZona: any[] = [];
    for (const r of rows) {
      const zid = r.zona?.id;
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
    try {
      const d = new Date(iso);
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
