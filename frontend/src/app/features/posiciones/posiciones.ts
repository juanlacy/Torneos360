import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';
import { BrandingService } from '../../core/services/branding.service';

@Component({
  selector: 'app-posiciones',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatTabsModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Tabla de Posiciones</h1>
          <p class="text-sm text-gray-500 mt-0.5">Clasificacion general y por categoria</p>
        </div>
        <div class="flex gap-3 items-center">
          @if (auth.isAdmin() && torneoId) {
            <button mat-stroked-button (click)="recalcular()" class="!rounded-lg">
              <mat-icon>refresh</mat-icon> Recalcular
            </button>
          }
        </div>
      </div>

      <mat-tab-group class="posiciones-tabs" (selectedTabChange)="onTabChange($event)">
        <!-- Tab General -->
        <mat-tab label="General Club">
          @if (!posicionesClub.length) {
            <div class="bg-white rounded-xl border border-gray-200 py-12 text-center mt-4">
              <mat-icon class="!text-5xl text-gray-300 mb-3">leaderboard</mat-icon>
              <p class="text-sm text-gray-500">Sin datos de posiciones</p>
              <p class="text-[10px] text-gray-400 mt-1">Los puntos se calculan al finalizar partidos</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              @for (g of gruposPorZona(posicionesClub); track g.zona.id) {
                <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div class="h-1.5" [style.background-color]="g.zona.color || 'var(--color-primario)'"></div>
                  <div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full" [style.background-color]="g.zona.color || '#6b7280'"></span>
                    <span class="text-xs font-bold text-gray-700 uppercase tracking-wide">{{ g.zona.nombre }}</span>
                    <span class="ml-auto text-[10px] text-gray-400">{{ g.rows.length }} clubes</span>
                  </div>
                  <table class="w-full">
                    <thead class="bg-gray-50/50 border-b border-gray-100">
                      <tr>
                        <th class="px-3 py-2 text-center text-[10px] font-medium text-gray-400 uppercase w-10">#</th>
                        <th class="px-3 py-2 text-left text-[10px] font-medium text-gray-400 uppercase">Club</th>
                        <th class="px-3 py-2 text-center text-[10px] font-medium text-gray-400 uppercase w-20">Puntos</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (p of g.rows; track p.club?.id; let i = $index) {
                        <tr class="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <td class="px-3 py-2 text-center">
                            @if (i < 3) {
                              <span class="inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold"
                                [class]="i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-600' : 'bg-amber-100 text-amber-700'">
                                {{ i + 1 }}
                              </span>
                            } @else {
                              <span class="text-xs text-gray-500">{{ i + 1 }}</span>
                            }
                          </td>
                          <td class="px-3 py-2">
                            <div class="flex items-center gap-2">
                              @if (p.club?.escudo_url) {
                                <img [src]="resolveUrl(p.club.escudo_url)" class="w-6 h-6 object-contain shrink-0" alt="Escudo">
                              } @else {
                                <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0"
                                  [style.background-color]="p.club?.color_primario || '#762c7e'">
                                  {{ (p.club?.nombre_corto || p.club?.nombre || '--').substring(0, 2).toUpperCase() }}
                                </div>
                              }
                              <span class="text-sm font-medium text-gray-900 truncate">{{ p.club?.nombre }}</span>
                            </div>
                          </td>
                          <td class="px-3 py-2 text-center">
                            <span class="inline-block min-w-[32px] px-2 py-0.5 rounded text-xs font-bold bg-[var(--color-primario)]/10 text-[var(--color-primario)]">
                              {{ p.puntos_totales }}
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
        </mat-tab>

        <!-- Tab por Categoria -->
        <mat-tab label="Por Categoria">
          <div class="mt-4 mb-3">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Categoria</mat-label>
              <mat-select [(ngModel)]="filtroCategoria" (selectionChange)="cargarPorCategoria()">
                @for (cat of categorias; track cat.id) {
                  <mat-option [value]="cat.id">{{ cat.nombre }} {{ cat.es_preliminar ? '(Preliminar)' : '' }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          @if (!posicionesCategoria.length) {
            <div class="bg-white rounded-xl border border-gray-200 py-12 text-center">
              <mat-icon class="!text-5xl text-gray-300 mb-3">format_list_numbered</mat-icon>
              <p class="text-sm text-gray-500">Selecciona una categoria para ver las posiciones</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              @for (g of gruposPorZona(posicionesCategoria); track g.zona.id) {
                <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div class="h-1.5" [style.background-color]="g.zona.color || 'var(--color-primario)'"></div>
                  <div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full" [style.background-color]="g.zona.color || '#6b7280'"></span>
                    <span class="text-xs font-bold text-gray-700 uppercase tracking-wide">{{ g.zona.nombre }}</span>
                    <span class="ml-auto text-[10px] text-gray-400">{{ g.rows.length }} clubes</span>
                  </div>
                  <div class="overflow-x-auto">
                    <table class="w-full">
                      <thead class="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                          <th class="px-3 py-2 text-center text-[10px] font-medium text-gray-400 uppercase w-10">#</th>
                          <th class="px-3 py-2 text-left text-[10px] font-medium text-gray-400 uppercase">Club</th>
                          <th class="px-2 py-2 text-center text-[10px] font-medium text-gray-400 uppercase">PJ</th>
                          <th class="px-2 py-2 text-center text-[10px] font-medium text-gray-400 uppercase hidden md:table-cell">PG</th>
                          <th class="px-2 py-2 text-center text-[10px] font-medium text-gray-400 uppercase hidden md:table-cell">PE</th>
                          <th class="px-2 py-2 text-center text-[10px] font-medium text-gray-400 uppercase hidden md:table-cell">PP</th>
                          <th class="px-2 py-2 text-center text-[10px] font-medium text-gray-400 uppercase hidden sm:table-cell">GF</th>
                          <th class="px-2 py-2 text-center text-[10px] font-medium text-gray-400 uppercase hidden sm:table-cell">GC</th>
                          <th class="px-2 py-2 text-center text-[10px] font-medium text-gray-400 uppercase">DG</th>
                          <th class="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (p of g.rows; track p.club?.id; let i = $index) {
                          <tr class="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                            <td class="px-3 py-2 text-center">
                              @if (i < 3) {
                                <span class="inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold"
                                  [class]="i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-600' : 'bg-amber-100 text-amber-700'">
                                  {{ i + 1 }}
                                </span>
                              } @else {
                                <span class="text-xs text-gray-500">{{ i + 1 }}</span>
                              }
                            </td>
                            <td class="px-3 py-2">
                              <div class="flex items-center gap-2">
                                @if (p.club?.escudo_url) {
                                  <img [src]="resolveUrl(p.club.escudo_url)" class="w-6 h-6 object-contain shrink-0" alt="Escudo">
                                } @else {
                                  <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0"
                                    [style.background-color]="p.club?.color_primario || '#762c7e'">
                                    {{ (p.club?.nombre_corto || p.club?.nombre || '--').substring(0, 2).toUpperCase() }}
                                  </div>
                                }
                                <span class="text-sm font-medium text-gray-900 truncate">{{ p.club?.nombre_corto || p.club?.nombre }}</span>
                              </div>
                            </td>
                            <td class="px-2 py-2 text-center text-xs text-gray-600">{{ p.pj }}</td>
                            <td class="px-2 py-2 text-center text-xs text-gray-600 hidden md:table-cell">{{ p.pg }}</td>
                            <td class="px-2 py-2 text-center text-xs text-gray-600 hidden md:table-cell">{{ p.pe }}</td>
                            <td class="px-2 py-2 text-center text-xs text-gray-600 hidden md:table-cell">{{ p.pp }}</td>
                            <td class="px-2 py-2 text-center text-xs text-gray-600 hidden sm:table-cell">{{ p.gf }}</td>
                            <td class="px-2 py-2 text-center text-xs text-gray-600 hidden sm:table-cell">{{ p.gc }}</td>
                            <td class="px-2 py-2 text-center text-xs font-medium"
                              [class]="(p.dg > 0 ? 'text-green-600' : p.dg < 0 ? 'text-red-600' : 'text-gray-500')">
                              {{ p.dg > 0 ? '+' : '' }}{{ p.dg }}
                            </td>
                            <td class="px-3 py-2 text-center">
                              <span class="inline-block min-w-[32px] px-2 py-0.5 rounded text-xs font-bold bg-[var(--color-primario)]/10 text-[var(--color-primario)]">
                                {{ p.puntos }}
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
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    ::ng-deep .posiciones-tabs .mdc-tab { color: #6b7280 !important; }
    ::ng-deep .posiciones-tabs .mdc-tab--active { color: var(--color-primario, #762c7e) !important; }
    ::ng-deep .posiciones-tabs .mdc-tab-indicator__content--underline { border-color: var(--color-primario, #762c7e) !important; }
  `],
})
export class PosicionesComponent implements OnInit, OnDestroy {
  torneos: any[] = [];
  categorias: any[] = [];
  zonas: any[] = [];
  torneoId: number | null = null;
  torneoActivoId: number | null = null;
  posicionesClub: any[] = [];
  posicionesCategoria: any[] = [];
  filtroCategoria: number | null = null;
  columnasCategoria = ['pos', 'club', 'pj', 'pg', 'pe', 'pp', 'gf', 'gc', 'dg', 'pts'];
  private torneoSub?: Subscription;

  constructor(
    private http: HttpClient,
    public auth: AuthService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    public branding: BrandingService,
  ) {}

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/torneos`).subscribe({
      next: res => {
        this.torneos = res.data;
        if (this.torneoActivoId) {
          const torneo = this.torneos.find(t => t.id === this.torneoActivoId);
          this.categorias = torneo?.categorias || [];
        }
        this.cdr.detectChanges();
      },
    });

    this.torneoSub = this.branding.torneoActivoId$.subscribe(id => {
      this.torneoActivoId = id;
      this.torneoId = id;
      if (id) this.cargar();
    });
  }

  ngOnDestroy() {
    this.torneoSub?.unsubscribe();
  }

  cargar() {
    if (!this.torneoId) return;

    // Cargar torneo fresco (categorias + zonas) — evita race condition
    // cuando torneoActivoId$ emite antes que termine el fetch de /torneos.
    this.http.get<any>(`${environment.apiUrl}/torneos/${this.torneoId}`).subscribe({
      next: res => {
        const t = res.data || {};
        this.categorias = (t.categorias || []).sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
        this.zonas = t.zonas || [];
        this.cdr.detectChanges();
      },
    });

    this.http.get<any>(`${environment.apiUrl}/posiciones/${this.torneoId}/general`).subscribe({
      next: res => { this.posicionesClub = res.data; this.cdr.detectChanges(); },
    });

    if (this.filtroCategoria) this.cargarPorCategoria();
  }

  /** Agrupa filas por zona, respetando el orden de this.zonas. */
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

  cargarPorCategoria() {
    if (!this.torneoId || !this.filtroCategoria) return;
    this.http.get<any>(`${environment.apiUrl}/posiciones/${this.torneoId}/categorias`, {
      params: { categoria_id: this.filtroCategoria },
    }).subscribe({
      next: res => { this.posicionesCategoria = res.data; this.cdr.detectChanges(); },
    });
  }

  onTabChange(event: any) {
    if (event.index === 1 && this.categorias.length && !this.filtroCategoria) {
      this.filtroCategoria = this.categorias[0].id;
      this.cargarPorCategoria();
    }
  }

  recalcular() {
    this.http.post<any>(`${environment.apiUrl}/posiciones/${this.torneoId}/recalcular`, {}).subscribe({
      next: (res) => { this.toastr.success(res.message); this.cargar(); this.cdr.detectChanges(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  resolveUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return url;
    return `${environment.apiUrl}${url}`;
  }
}
