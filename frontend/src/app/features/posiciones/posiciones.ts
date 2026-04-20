import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';
import { BrandingService } from '../../core/services/branding.service';

@Component({
  selector: 'app-posiciones',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="space-y-4 animate-fade-in">
      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Tabla de Posiciones</h1>
          <p class="text-sm text-gray-500 mt-0.5">Clasificacion general y por categoria</p>
        </div>
        @if (auth.isAdmin() && torneoId) {
          <button (click)="recalcular()"
            class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <mat-icon class="!text-lg !w-5 !h-5">refresh</mat-icon> Recalcular
          </button>
        }
      </div>

      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <!-- Chips de categoria -->
        <div class="px-5 py-3 border-b border-gray-100 flex gap-2 overflow-x-auto">
          <button (click)="selectCategoria(null)"
            class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            [class]="filtroCategoria === null ? 'bg-[var(--color-primario)] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
            General
          </button>
          @for (cat of categorias; track cat.id) {
            <button (click)="selectCategoria(cat.id)"
              class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              [class]="filtroCategoria === cat.id ? 'bg-[var(--color-primario)] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
              {{ cat.nombre }}
            </button>
          }
        </div>

        <!-- Tablas por zona -->
        @if (!datos.length) {
          <div class="py-12 text-center">
            <mat-icon class="!text-5xl text-gray-300 mb-3">leaderboard</mat-icon>
            <p class="text-sm text-gray-500">Sin datos de posiciones</p>
            <p class="text-[10px] text-gray-400 mt-1">Los puntos se calculan al finalizar partidos</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-gray-200">
            @for (g of gruposPorZona(datos); track g.zona.id) {
              <div class="overflow-x-auto">
                <div class="h-1" [style.background-color]="g.zona.color || 'var(--color-primario)'"></div>
                <div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full" [style.background-color]="g.zona.color || '#6b7280'"></span>
                  <span class="text-xs font-bold text-gray-700 uppercase tracking-wide">{{ g.zona.nombre }}</span>
                  <span class="ml-auto text-[10px] text-gray-400">{{ g.rows.length }} clubes</span>
                </div>

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
                    @for (row of g.rows; track row.club?.id; let i = $index) {
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
                        <td class="px-2 py-2 text-center text-xs text-gray-600">{{ row.pj ?? 0 }}</td>
                        <td class="px-2 py-2 text-center text-xs text-gray-600">{{ row.pg ?? 0 }}</td>
                        <td class="px-2 py-2 text-center text-xs text-gray-600">{{ row.pe ?? 0 }}</td>
                        <td class="px-2 py-2 text-center text-xs text-gray-600">{{ row.pp ?? 0 }}</td>
                        <td class="px-2 py-2 text-center text-xs text-gray-600">{{ row.gf ?? 0 }}</td>
                        <td class="px-2 py-2 text-center text-xs text-gray-600">{{ row.gc ?? 0 }}</td>
                        <td class="px-2 py-2 text-center text-xs font-medium"
                          [class]="(row.dg ?? 0) > 0 ? 'text-green-600' : (row.dg ?? 0) < 0 ? 'text-red-600' : 'text-gray-500'">
                          {{ (row.dg ?? 0) > 0 ? '+' : '' }}{{ row.dg ?? 0 }}
                        </td>
                        <td class="px-3 py-2 text-center">
                          <span class="inline-block min-w-[28px] px-1.5 py-0.5 rounded text-xs font-bold bg-[var(--color-primario)]/10 text-[var(--color-primario)]">
                            {{ row.puntos ?? row.puntos_totales ?? 0 }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class PosicionesComponent implements OnInit, OnDestroy {
  categorias: any[] = [];
  zonas: any[] = [];
  torneoId: number | null = null;
  filtroCategoria: number | null = null; // null = General
  posicionesClub: any[] = [];
  posicionesCategoria: any[] = [];
  userClubId: number | null = null;
  private torneoSub?: Subscription;

  constructor(
    private http: HttpClient,
    public auth: AuthService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    public branding: BrandingService,
  ) {}

  ngOnInit() {
    this.userClubId = this.auth.getUser()?.club_id || null;
    this.torneoSub = this.branding.torneoActivoId$.subscribe(id => {
      this.torneoId = id;
      if (id) this.cargar();
    });
  }

  ngOnDestroy() {
    this.torneoSub?.unsubscribe();
  }

  get datos(): any[] {
    return this.filtroCategoria === null ? this.posicionesClub : this.posicionesCategoria;
  }

  selectCategoria(catId: number | null) {
    this.filtroCategoria = catId;
    if (catId === null) {
      if (!this.posicionesClub.length) this.cargarGeneral();
    } else {
      this.cargarPorCategoria();
    }
    this.cdr.detectChanges();
  }

  cargar() {
    if (!this.torneoId) return;
    // Cargar torneo fresco (categorias + zonas)
    this.http.get<any>(`${environment.apiUrl}/torneos/${this.torneoId}`).subscribe({
      next: res => {
        const t = res.data || {};
        this.categorias = (t.categorias || []).sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
        this.zonas = t.zonas || [];
        this.cdr.detectChanges();
      },
    });
    this.cargarGeneral();
  }

  cargarGeneral() {
    if (!this.torneoId) return;
    this.http.get<any>(`${environment.apiUrl}/posiciones/${this.torneoId}/general`).subscribe({
      next: res => { this.posicionesClub = res.data || []; this.cdr.detectChanges(); },
    });
  }

  cargarPorCategoria() {
    if (!this.torneoId || !this.filtroCategoria) return;
    this.http.get<any>(`${environment.apiUrl}/posiciones/${this.torneoId}/categorias`, {
      params: { categoria_id: this.filtroCategoria },
    }).subscribe({
      next: res => { this.posicionesCategoria = res.data || []; this.cdr.detectChanges(); },
    });
  }

  recalcular() {
    this.http.post<any>(`${environment.apiUrl}/posiciones/${this.torneoId}/recalcular`, {}).subscribe({
      next: (res) => {
        this.toastr.success(res.message || 'Posiciones recalculadas');
        this.cargar();
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  /** Agrupa filas por zona respetando el orden de this.zonas. */
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

  initials(name: string | null | undefined): string {
    if (!name) return '??';
    return name.substring(0, 2).toUpperCase();
  }

  resolveUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return url;
    return `${environment.apiUrl}${url}`;
  }
}
