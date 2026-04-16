import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../environments/environment';

const LS_TORNEO_KEY = 'torneo360_publico_torneo_id';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [FormsModule, RouterLink, MatButtonModule, MatIconModule, MatSelectModule],
  template: `
    <div class="animate-fade-in">

      <!-- ═══ A) HERO ═══ -->
      @if (torneo) {
        <div class="min-h-[200px] flex items-center justify-center px-6 py-10"
          [style.background]="'linear-gradient(135deg, ' + (torneo.color_primario || '#762c7e') + ', ' + (torneo.color_secundario || '#4f2f7d') + ')'">
          <div class="text-center">
            @if (torneo.logo_url) {
              <img [src]="resolveUrl(torneo.logo_url)" class="w-20 h-20 mx-auto mb-4 rounded-xl object-contain bg-white/10 p-2" alt="Logo">
            } @else {
              <div class="w-20 h-20 mx-auto mb-4 rounded-xl flex items-center justify-center bg-white/10">
                <mat-icon class="!text-5xl !w-12 !h-12 text-white/80">emoji_events</mat-icon>
              </div>
            }
            <h1 class="text-3xl md:text-4xl font-extrabold text-white tracking-tight">{{ torneo.nombre }}</h1>
            @if (torneo.anio) {
              <p class="text-white/70 text-sm font-medium mt-1">Temporada {{ torneo.anio }}</p>
            }
            <div class="mt-3">
              @if (torneo.estado === 'en_curso') {
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-200 border border-green-400/30">
                  <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  En Curso
                </span>
              } @else if (torneo.estado === 'finalizado') {
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white/60 border border-white/20">
                  Finalizado
                </span>
              } @else if (torneo.estado === 'planificacion') {
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-200 border border-yellow-400/30">
                  Planificacion
                </span>
              }
            </div>
          </div>
        </div>
      }

      <!-- ═══ B) TABS ═══ -->
      <div class="sticky top-16 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div class="max-w-6xl mx-auto flex">
          <button (click)="selectTab('posiciones')"
            class="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors border-b-2"
            [class]="activeTab === 'posiciones' ? 'border-[var(--color-primario)] text-[var(--color-primario)]' : 'border-transparent text-gray-500 hover:text-gray-700'">
            <mat-icon class="!text-lg">leaderboard</mat-icon>
            <span class="hidden sm:inline">Posiciones</span>
          </button>
          <button (click)="selectTab('goleadores')"
            class="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors border-b-2"
            [class]="activeTab === 'goleadores' ? 'border-[var(--color-primario)] text-[var(--color-primario)]' : 'border-transparent text-gray-500 hover:text-gray-700'">
            <mat-icon class="!text-lg">sports_soccer</mat-icon>
            <span class="hidden sm:inline">Goleadores</span>
          </button>
          <button (click)="selectTab('fixture')"
            class="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors border-b-2"
            [class]="activeTab === 'fixture' ? 'border-[var(--color-primario)] text-[var(--color-primario)]' : 'border-transparent text-gray-500 hover:text-gray-700'">
            <mat-icon class="!text-lg">calendar_month</mat-icon>
            <span class="hidden sm:inline">Fixture</span>
          </button>
        </div>
      </div>

      <!-- ═══ CONTENIDO DE TABS ═══ -->
      <div class="max-w-6xl mx-auto px-4 md:px-6 py-6">

        <!-- ═══ C) TAB POSICIONES ═══ -->
        @if (activeTab === 'posiciones') {
          <div class="animate-fade-in">
            <!-- Chips de categoria -->
            <div class="flex gap-2 overflow-x-auto pb-4">
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
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              @for (zona of zonas; track zona.id) {
                <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <!-- Barra de color de la zona -->
                  <div class="h-1" [style.background-color]="zona.color || 'var(--color-primario)'"></div>
                  <div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full" [style.background-color]="zona.color || '#6b7280'"></span>
                    <span class="text-xs font-bold text-gray-700 uppercase tracking-wide">{{ zona.nombre }}</span>
                  </div>

                  <div class="overflow-x-auto">
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
                            <tr class="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
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
                </div>
              }
            </div>
          </div>
        }

        <!-- ═══ D) TAB GOLEADORES ═══ -->
        @if (activeTab === 'goleadores') {
          <div class="animate-fade-in">
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div class="px-5 py-4 border-b border-gray-100">
                <h2 class="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <mat-icon class="!text-lg text-amber-500">emoji_events</mat-icon>
                  Top 20 Goleadores
                </h2>
              </div>

              @if (goleadores.length) {
                <div class="divide-y divide-gray-100">
                  @for (g of goleadores; track g.persona_id || $index; let i = $index) {
                    <div class="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50/50 transition-colors">
                      <!-- Posicion -->
                      <div class="w-6 text-center shrink-0">
                        @if (i < 3) {
                          <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold"
                            [class]="i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-600' : 'bg-amber-100 text-amber-700'">
                            {{ i + 1 }}
                          </span>
                        } @else {
                          <span class="text-xs text-gray-400 font-medium">{{ i + 1 }}</span>
                        }
                      </div>
                      <!-- Foto -->
                      @if (g.foto_url) {
                        <img [src]="resolveUrl(g.foto_url)" class="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200" alt="">
                      } @else {
                        <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          [style.background-color]="g.club?.color_primario || 'var(--color-primario)'">
                          {{ initials(g.apellido || g.nombre) }}
                        </div>
                      }
                      <!-- Nombre + Club -->
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 truncate">{{ g.apellido }}, {{ g.nombre }}</p>
                        <div class="flex items-center gap-1.5 mt-0.5">
                          @if (g.club?.escudo_url) {
                            <img [src]="resolveUrl(g.club.escudo_url)" class="w-4 h-4 object-contain" alt="">
                          }
                          <span class="text-[10px] text-gray-500">{{ g.club?.nombre_corto || g.club?.nombre }}</span>
                          @if (g.categoria?.nombre) {
                            <span class="inline-flex px-1.5 py-0 rounded text-[9px] font-medium bg-blue-50 text-blue-600">{{ g.categoria.nombre }}</span>
                          }
                        </div>
                      </div>
                      <!-- Goles -->
                      <div class="shrink-0 text-right">
                        <span class="text-lg font-extrabold text-gray-900">{{ g.goles }}</span>
                        <p class="text-[9px] text-gray-400 uppercase">goles</p>
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
          </div>
        }

        <!-- ═══ E) TAB FIXTURE ═══ -->
        @if (activeTab === 'fixture') {
          <div class="animate-fade-in">
            <!-- Chips de jornadas -->
            <div class="flex gap-1.5 overflow-x-auto pb-4">
              @for (j of jornadas; track j.id) {
                <button (click)="selectJornada(j)"
                  class="shrink-0 w-9 h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center"
                  [class]="selectedJornadaId === j.id ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
                  {{ j.numero_jornada }}
                </button>
              }
            </div>

            @if (partidosFecha.length) {
              <div class="space-y-3">
                @for (grupo of partidosAgrupados; track grupo.categoria) {
                  <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <!-- Separator categoria -->
                    <div class="px-5 py-2 bg-gray-50 border-b border-gray-100">
                      <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{{ grupo.categoria }}</span>
                    </div>
                    <div class="divide-y divide-gray-100">
                      @for (p of grupo.partidos; track p.id) {
                        <div class="flex items-center gap-2 px-5 py-3">
                          <!-- Local -->
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

                          <!-- Marcador -->
                          <div class="shrink-0 w-16 text-center">
                            @if (p.estado === 'finalizado' || p.estado === 'en_curso') {
                              <span class="text-sm font-extrabold text-gray-900">{{ p.goles_local ?? 0 }} - {{ p.goles_visitante ?? 0 }}</span>
                            } @else {
                              <span class="text-xs font-medium text-gray-400">vs</span>
                            }
                          </div>

                          <!-- Visitante -->
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
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="bg-white rounded-xl border border-gray-200 shadow-sm py-12 text-center">
                <mat-icon class="!text-5xl text-gray-200 mb-3">event_busy</mat-icon>
                <p class="text-sm text-gray-500">{{ jornadas.length ? 'No hay partidos en esta fecha' : 'Sin jornadas aun' }}</p>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class LandingComponent implements OnInit, OnDestroy {
  private apiUrl = environment.apiUrl;
  torneoId: number | null = null;
  torneo: any = null;
  zonas: any[] = [];
  categorias: any[] = [];

  // Tab
  activeTab: 'posiciones' | 'goleadores' | 'fixture' = 'posiciones';

  // Posiciones
  posCategoriaId: number | null = null;
  posiciones: any[] = [];

  // Goleadores
  goleadores: any[] = [];
  goleadoresLoaded = false;

  // Fixture
  jornadas: any[] = [];
  selectedJornadaId: number | null = null;
  partidosFecha: any[] = [];
  partidosAgrupados: { categoria: string; partidos: any[] }[] = [];
  fixtureLoaded = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    // Leer torneo_id de localStorage o cargar lista
    const savedId = localStorage.getItem(LS_TORNEO_KEY);
    if (savedId) {
      this.torneoId = +savedId;
      this.loadTorneo(this.torneoId);
    } else {
      this.http.get<any>(`${this.apiUrl}/publico/torneos`).subscribe({
        next: res => {
          const torneos = res.data || res || [];
          if (!torneos.length) return;
          const activo = torneos.find((t: any) => t.estado === 'en_curso') || torneos[0];
          this.torneoId = activo.id;
          localStorage.setItem(LS_TORNEO_KEY, String(activo.id));
          this.loadTorneo(this.torneoId!);
        },
        error: () => {},
      });
    }
  }

  ngOnDestroy() {}

  // ─── Torneo ──────────────────────────────────────────────────────────

  private loadTorneo(id: number) {
    this.http.get<any>(`${this.apiUrl}/publico/torneos/${id}`).subscribe({
      next: res => {
        const t = res.data || res;
        this.torneo = t;
        this.zonas = t.zonas || [];
        this.categorias = t.categorias || [];

        // Branding CSS vars
        if (t.color_primario) {
          document.documentElement.style.setProperty('--color-primario', t.color_primario);
        }
        if (t.color_secundario) {
          document.documentElement.style.setProperty('--color-secundario', t.color_secundario);
        }

        // Cargar posiciones por default
        this.loadPosiciones();
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  // ─── Tab switching ──────────────────────────────────────────────────

  selectTab(tab: 'posiciones' | 'goleadores' | 'fixture') {
    this.activeTab = tab;
    if (tab === 'goleadores' && !this.goleadoresLoaded) {
      this.loadGoleadores();
    }
    if (tab === 'fixture' && !this.fixtureLoaded) {
      this.loadFixture();
    }
  }

  // ─── C) Posiciones ─────────────────────────────────────────────────

  selectPosCategoria(catId: number | null) {
    this.posCategoriaId = catId;
    this.loadPosiciones();
  }

  private loadPosiciones() {
    if (!this.torneoId) return;
    let url = `${this.apiUrl}/publico/torneos/${this.torneoId}/posiciones`;
    const params: string[] = [];
    if (this.posCategoriaId) params.push(`categoria_id=${this.posCategoriaId}`);
    if (params.length) url += '?' + params.join('&');

    this.http.get<any>(url).subscribe({
      next: res => {
        this.posiciones = res.data || res || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.posiciones = [];
        this.cdr.detectChanges();
      },
    });
  }

  getPosZona(zonaId: number): any[] {
    return this.posiciones.filter((r: any) => r.zona_id === zonaId);
  }

  // ─── D) Goleadores ────────────────────────────────────────────────

  private loadGoleadores() {
    if (!this.torneoId) return;
    this.http.get<any>(`${this.apiUrl}/publico/torneos/${this.torneoId}/goleadores?limit=20`).subscribe({
      next: res => {
        this.goleadores = res.data || res || [];
        this.goleadoresLoaded = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.goleadores = [];
        this.goleadoresLoaded = true;
        this.cdr.detectChanges();
      },
    });
  }

  // ─── E) Fixture ───────────────────────────────────────────────────

  private loadFixture() {
    if (!this.torneoId) return;
    this.http.get<any>(`${this.apiUrl}/publico/torneos/${this.torneoId}/fixture`).subscribe({
      next: res => {
        this.jornadas = res.data || res || [];
        this.fixtureLoaded = true;

        // Auto-seleccionar la ultima jornada con partidos finalizados
        const conFinalizados = this.jornadas.filter((j: any) =>
          j.partidos?.some((p: any) => p.estado === 'finalizado')
        );
        const auto = conFinalizados.length ? conFinalizados[conFinalizados.length - 1] : this.jornadas[0];
        if (auto) this.selectJornada(auto);
        this.cdr.detectChanges();
      },
      error: () => {
        this.jornadas = [];
        this.fixtureLoaded = true;
        this.cdr.detectChanges();
      },
    });
  }

  selectJornada(jornada: any) {
    this.selectedJornadaId = jornada.id;

    // Si la jornada ya tiene partidos embebidos, usarlos
    if (jornada.partidos?.length) {
      this.partidosFecha = jornada.partidos;
      this.agruparPartidos();
      this.cdr.detectChanges();
      return;
    }

    // Si no, cargar del endpoint
    this.http.get<any>(`${this.apiUrl}/publico/torneos/${this.torneoId}/fixture?jornada_id=${jornada.id}`).subscribe({
      next: res => {
        const data = res.data || res || [];
        // Puede venir como array de jornadas con partidos, o directo
        if (Array.isArray(data) && data.length && data[0].partidos) {
          this.partidosFecha = data[0].partidos;
        } else if (Array.isArray(data)) {
          this.partidosFecha = data;
        } else {
          this.partidosFecha = data.partidos || [];
        }
        this.agruparPartidos();
        this.cdr.detectChanges();
      },
      error: () => {
        this.partidosFecha = [];
        this.partidosAgrupados = [];
        this.cdr.detectChanges();
      },
    });
  }

  private agruparPartidos() {
    const map = new Map<string, any[]>();
    for (const p of this.partidosFecha) {
      const cat = p.categoria?.nombre || 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    this.partidosAgrupados = Array.from(map.entries()).map(([categoria, partidos]) => ({ categoria, partidos }));
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  esGanador(partido: any, lado: 'local' | 'visitante'): boolean {
    if (partido.estado !== 'finalizado') return false;
    const gl = partido.goles_local ?? 0;
    const gv = partido.goles_visitante ?? 0;
    return lado === 'local' ? gl > gv : gv > gl;
  }

  initials(name: string | undefined): string {
    if (!name) return '?';
    return name.split(' ').map(w => w.charAt(0)).join('').substring(0, 2).toUpperCase();
  }

  resolveUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${this.apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }
}
