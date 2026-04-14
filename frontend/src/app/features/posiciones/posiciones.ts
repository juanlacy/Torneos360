import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';

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
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Torneo</mat-label>
            <mat-select [(ngModel)]="torneoId" (selectionChange)="cargar()">
              @for (t of torneos; track t.id) {
                <mat-option [value]="t.id">{{ t.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
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
          <div class="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4">
            @if (posicionesClub.length) {
              <table class="w-full">
                <thead class="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide w-14">#</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Club</th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide w-24">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of posicionesClub; track p.club?.id; let i = $index) {
                    <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <!-- Position -->
                      <td class="px-4 py-3 text-center">
                        @if (i === 0) {
                          <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">1</span>
                        } @else if (i === 1) {
                          <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-600 text-xs font-bold">2</span>
                        } @else if (i === 2) {
                          <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">3</span>
                        } @else {
                          <span class="text-sm text-gray-500 font-medium">{{ i + 1 }}</span>
                        }
                      </td>
                      <!-- Club -->
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-3">
                          @if (p.club?.escudo_url) {
                            <img [src]="resolveUrl(p.club.escudo_url)" class="escudo-md shrink-0" alt="Escudo">
                          } @else {
                            <div class="escudo-md escudo-placeholder text-xs shrink-0"
                              [style.background-color]="p.club?.color_primario || '#762c7e'">
                              {{ (p.club?.nombre_corto || p.club?.nombre || '--').substring(0, 2).toUpperCase() }}
                            </div>
                          }
                          <span class="font-medium text-gray-900">{{ p.club?.nombre }}</span>
                        </div>
                      </td>
                      <!-- Points -->
                      <td class="px-4 py-3 text-center">
                        <span class="text-xl font-bold text-[var(--color-primario)]">{{ p.puntos_totales }}</span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <div class="py-12 text-center">
                <mat-icon class="!text-5xl text-gray-300 mb-3">leaderboard</mat-icon>
                <p class="text-sm text-gray-500">Sin datos de posiciones</p>
                <p class="text-[10px] text-gray-400 mt-1">Los puntos se calculan al finalizar partidos</p>
              </div>
            }
          </div>
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

          <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
            @if (posicionesCategoria.length) {
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide w-14">#</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Club</th>
                      <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">PJ</th>
                      <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">PG</th>
                      <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">PE</th>
                      <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">PP</th>
                      <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">GF</th>
                      <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">GC</th>
                      <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">DG</th>
                      <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide font-bold">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (p of posicionesCategoria; track p.club?.id; let i = $index) {
                      <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <!-- Position -->
                        <td class="px-4 py-3 text-center">
                          @if (i === 0) {
                            <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">1</span>
                          } @else if (i === 1) {
                            <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-600 text-xs font-bold">2</span>
                          } @else if (i === 2) {
                            <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">3</span>
                          } @else {
                            <span class="text-sm text-gray-500 font-medium">{{ i + 1 }}</span>
                          }
                        </td>
                        <!-- Club -->
                        <td class="px-4 py-3">
                          <div class="flex items-center gap-3">
                            @if (p.club?.escudo_url) {
                              <img [src]="resolveUrl(p.club.escudo_url)" class="escudo-sm shrink-0" alt="Escudo">
                            } @else {
                              <div class="escudo-sm escudo-placeholder text-[9px] shrink-0"
                                [style.background-color]="p.club?.color_primario || '#762c7e'">
                                {{ (p.club?.nombre_corto || p.club?.nombre || '--').substring(0, 2).toUpperCase() }}
                              </div>
                            }
                            <span class="font-medium text-gray-900 text-sm">{{ p.club?.nombre_corto || p.club?.nombre }}</span>
                          </div>
                        </td>
                        <!-- Stats -->
                        <td class="px-3 py-3 text-center text-sm text-gray-600">{{ p.pj }}</td>
                        <td class="px-3 py-3 text-center text-sm text-gray-600">{{ p.pg }}</td>
                        <td class="px-3 py-3 text-center text-sm text-gray-600">{{ p.pe }}</td>
                        <td class="px-3 py-3 text-center text-sm text-gray-600">{{ p.pp }}</td>
                        <td class="px-3 py-3 text-center text-sm text-gray-600">{{ p.gf }}</td>
                        <td class="px-3 py-3 text-center text-sm text-gray-600">{{ p.gc }}</td>
                        <td class="px-3 py-3 text-center text-sm font-medium"
                          [class]="(p.dg > 0 ? 'text-green-600' : p.dg < 0 ? 'text-red-600' : 'text-gray-500')">
                          {{ p.dg > 0 ? '+' : '' }}{{ p.dg }}
                        </td>
                        <!-- Points -->
                        <td class="px-3 py-3 text-center">
                          <span class="text-lg font-bold text-[var(--color-primario)]">{{ p.puntos }}</span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="py-12 text-center">
                <mat-icon class="!text-5xl text-gray-300 mb-3">format_list_numbered</mat-icon>
                <p class="text-sm text-gray-500">Selecciona una categoria para ver las posiciones</p>
              </div>
            }
          </div>
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
export class PosicionesComponent implements OnInit {
  torneos: any[] = [];
  categorias: any[] = [];
  torneoId: number | null = null;
  posicionesClub: any[] = [];
  posicionesCategoria: any[] = [];
  filtroCategoria: number | null = null;
  columnasCategoria = ['pos', 'club', 'pj', 'pg', 'pe', 'pp', 'gf', 'gc', 'dg', 'pts'];

  constructor(private http: HttpClient, public auth: AuthService, private toastr: ToastrService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/torneos`).subscribe({
      next: res => {
        this.torneos = res.data;
        if (this.torneos.length) {
          this.torneoId = this.torneos[0].id;
          this.categorias = this.torneos[0].categorias || [];
          this.cargar();
        }
        this.cdr.detectChanges();
      },
    });
  }

  cargar() {
    if (!this.torneoId) return;
    const torneo = this.torneos.find(t => t.id === this.torneoId);
    this.categorias = torneo?.categorias || [];

    this.http.get<any>(`${environment.apiUrl}/posiciones/${this.torneoId}/general`).subscribe({
      next: res => { this.posicionesClub = res.data; this.cdr.detectChanges(); },
    });

    if (this.filtroCategoria) this.cargarPorCategoria();
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
