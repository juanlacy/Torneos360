import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { UpperCasePipe } from '@angular/common';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';
import { BrandingService } from '../../core/services/branding.service';

@Component({
  selector: 'app-fixture',
  standalone: true,
  imports: [FormsModule, RouterLink, UpperCasePipe, MatCardModule, MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatChipsModule, MatExpansionModule, MatDividerModule],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h1 class="text-2xl font-bold text-gray-900">Fixture</h1>
        <div class="flex gap-2 items-center flex-wrap">
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-40">
            <mat-label>Zona</mat-label>
            <mat-select [(ngModel)]="filtroZona" (selectionChange)="filtrar()">
              <mat-option value="">Todas</mat-option>
              @for (z of zonas; track z.id) {
                <mat-option [value]="z.id">{{ z.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-32">
            <mat-label>Fase</mat-label>
            <mat-select [(ngModel)]="filtroFase" (selectionChange)="filtrar()">
              <mat-option value="">Todas</mat-option>
              <mat-option value="ida">Ida</mat-option>
              <mat-option value="vuelta">Vuelta</mat-option>
            </mat-select>
          </mat-form-field>
          @if (auth.isAdmin()) {
            <button mat-flat-button color="primary" (click)="mostrarFormJornada = !mostrarFormJornada">
              <mat-icon>add</mat-icon> Nueva Fecha
            </button>
          }
        </div>
      </div>

      <!-- ═══ Formulario nueva jornada ═══ -->
      @if (mostrarFormJornada && auth.isAdmin()) {
        <mat-card class="bg-white rounded-xl border border-gray-200">
          <mat-card-content>
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Nueva Fecha</h3>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
              <mat-form-field appearance="outline">
                <mat-label>N° Fecha</mat-label>
                <input matInput type="number" [(ngModel)]="formJornada.numero_jornada" min="1">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Zona</mat-label>
                <mat-select [(ngModel)]="formJornada.zona_id">
                  @for (z of zonas; track z.id) {
                    <mat-option [value]="z.id">{{ z.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fase</mat-label>
                <mat-select [(ngModel)]="formJornada.fase">
                  <mat-option value="ida">Ida</mat-option>
                  <mat-option value="vuelta">Vuelta</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fecha</mat-label>
                <input matInput type="date" [(ngModel)]="formJornada.fecha">
              </mat-form-field>
              <div class="flex gap-2 items-center">
                <button mat-flat-button color="primary" (click)="crearJornada()">Crear</button>
                <button mat-stroked-button (click)="mostrarFormJornada = false">Cancelar</button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      }

      <!-- ═══ Jornadas ═══ -->
      @for (jornada of jornadasFiltradas; track jornada.id) {
        <mat-expansion-panel class="bg-white rounded-xl border border-gray-200 !shadow-none">
          <mat-expansion-panel-header>
            <mat-panel-title class="text-gray-900 font-semibold">
              Fecha {{ jornada.numero_jornada }} — {{ jornada.fase | uppercase }}
            </mat-panel-title>
            <mat-panel-description class="text-gray-500">
              @if (jornada.zona) {
                <span class="mr-3">Zona {{ jornada.zona.nombre }}</span>
              }
              <span class="badge" [class]="'badge-' + jornada.estado">{{ jornada.estado }}</span>
              @if (jornada.fecha) {
                <span class="ml-3">{{ jornada.fecha }}</span>
              }
            </mat-panel-description>
          </mat-expansion-panel-header>

          <div class="mt-2">
            <!-- Boton cargar partidos -->
            @if (!jornada._partidos) {
              <button mat-stroked-button (click)="cargarPartidos(jornada)">
                <mat-icon>sports_soccer</mat-icon> Ver partidos
              </button>
            } @else {
              <!-- Cruces agrupados -->
              @for (cruce of jornada._cruces; track cruce.key) {
                <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 mb-2">
                  <div class="flex-1 flex items-center justify-center gap-4">
                    <span class="text-right flex-1 font-semibold text-gray-900">{{ cruce.local }}</span>
                    <span class="text-xs font-medium text-gray-400 px-2">vs</span>
                    <span class="text-left flex-1 font-semibold text-gray-900">{{ cruce.visitante }}</span>
                  </div>
                  <span class="text-xs text-gray-400">{{ cruce.partidos }} partidos</span>
                  @if (auth.isAdmin()) {
                    <button mat-icon-button class="!text-red-400 hover:!text-red-600" (click)="eliminarCruce(jornada, cruce)">
                      <mat-icon class="!text-lg">delete</mat-icon>
                    </button>
                  }
                </div>
              }

              @if (!jornada._cruces?.length) {
                <p class="text-gray-400 text-center py-3">Sin cruces. Agrega enfrentamientos.</p>
              }

              <!-- Detalle por categoria (colapsable) -->
              @if (jornada._cruces?.length) {
                <mat-divider class="!my-3"></mat-divider>
                <details class="text-sm">
                  <summary class="cursor-pointer text-gray-500 hover:text-gray-700 mb-2">Ver detalle por categoria y horarios</summary>
                  <div class="space-y-1">
                    @for (p of jornada._partidos; track p.id) {
                      <div class="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-gray-50 text-gray-600">
                        <span class="w-12 text-xs text-gray-400">{{ getHora(p) }}</span>
                        <span class="w-20 text-xs font-medium">{{ p.categoria?.nombre }}</span>
                        <span class="flex-1">{{ p.clubLocal?.nombre_corto }} vs {{ p.clubVisitante?.nombre_corto }}</span>
                        <span class="badge text-xs" [class]="'badge-' + p.estado">{{ p.estado }}</span>
                        <a [routerLink]="['/partidos', p.id]" class="text-gray-400 hover:text-gray-600">
                          <mat-icon class="!text-sm">open_in_new</mat-icon>
                        </a>
                      </div>
                    }
                  </div>
                </details>
              }

              <!-- Agregar cruce -->
              @if (auth.isAdmin()) {
                <mat-divider class="!my-3"></mat-divider>
                <div class="flex flex-wrap gap-3 items-end">
                  <mat-form-field appearance="outline" subscriptSizing="dynamic" class="flex-1 min-w-[150px]">
                    <mat-label>Club Local</mat-label>
                    <mat-select [(ngModel)]="cruceForm.club_local_id">
                      @for (c of clubesZona(jornada.zona_id); track c.id) {
                        <mat-option [value]="c.id">{{ c.nombre }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <span class="text-gray-400 font-medium pb-1">vs</span>
                  <mat-form-field appearance="outline" subscriptSizing="dynamic" class="flex-1 min-w-[150px]">
                    <mat-label>Club Visitante</mat-label>
                    <mat-select [(ngModel)]="cruceForm.club_visitante_id">
                      @for (c of clubesZona(jornada.zona_id); track c.id) {
                        <mat-option [value]="c.id">{{ c.nombre }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <button mat-flat-button color="primary" (click)="agregarCruce(jornada)" class="mb-0.5">
                    <mat-icon>add</mat-icon> Agregar cruce
                  </button>
                </div>
              }
            }

            <!-- Acciones de jornada -->
            @if (auth.isAdmin()) {
              <div class="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button mat-stroked-button color="warn" class="!text-xs" (click)="borrarJornada(jornada)">
                  <mat-icon class="!text-sm">delete</mat-icon> Eliminar fecha
                </button>
              </div>
            }
          </div>
        </mat-expansion-panel>
      } @empty {
        <mat-card class="bg-white rounded-xl border border-gray-200">
          <mat-card-content class="p-8 text-center text-gray-500">
            <mat-icon class="!text-5xl text-gray-300 mb-2">calendar_month</mat-icon>
            <p>No hay fechas creadas</p>
            @if (auth.isAdmin()) {
              <p class="text-sm mt-1">Usa "Nueva Fecha" para crear las jornadas manualmente</p>
            }
          </mat-card-content>
        </mat-card>
      }

      <!-- Horarios de referencia -->
      <mat-card class="bg-white rounded-xl border border-gray-200">
        <mat-card-content class="p-4">
          <h4 class="text-sm font-semibold text-gray-700 mb-2">Horarios por categoria</h4>
          <div class="flex flex-wrap gap-3 text-xs text-gray-500">
            <span>14hs → 2013</span>
            <span>15hs → 2019</span>
            <span>16hs → 2014</span>
            <span>17hs → 2018</span>
            <span>18hs → 2017</span>
            <span>19hs → 2016</span>
            <span>20hs → 2015</span>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class FixtureComponent implements OnInit {
  zonas: any[] = [];
  clubes: any[] = [];
  jornadas: any[] = [];
  jornadasFiltradas: any[] = [];
  filtroZona = '';
  filtroFase = '';
  mostrarFormJornada = false;
  formJornada: any = { numero_jornada: 1, zona_id: null, fase: 'ida', fecha: '' };
  cruceForm = { club_local_id: null, club_visitante_id: null };
  private torneoId: number | null = null;

  constructor(
    private http: HttpClient, public auth: AuthService,
    private toastr: ToastrService, private branding: BrandingService,
  ) {}

  ngOnInit() {
    this.branding.torneoActivoId$.subscribe(id => {
      if (id) { this.torneoId = id; this.cargarDatos(); }
    });
  }

  cargarDatos() {
    if (!this.torneoId) return;
    // Cargar zonas y clubes del torneo
    this.http.get<any>(`${environment.apiUrl}/torneos/${this.torneoId}`).subscribe({
      next: res => {
        this.zonas = res.data.zonas || [];
        this.clubes = res.data.clubes || [];
        this.cargarJornadas();
      },
    });
  }

  cargarJornadas() {
    if (!this.torneoId) return;
    this.http.get<any>(`${environment.apiUrl}/fixture/${this.torneoId}/jornadas`).subscribe({
      next: res => { this.jornadas = res.data; this.filtrar(); },
      error: () => this.toastr.error('Error al cargar jornadas'),
    });
  }

  filtrar() {
    this.jornadasFiltradas = this.jornadas.filter(j => {
      if (this.filtroZona && j.zona_id !== parseInt(this.filtroZona as any)) return false;
      if (this.filtroFase && j.fase !== this.filtroFase) return false;
      return true;
    });
  }

  cargarPartidos(jornada: any) {
    this.http.get<any>(`${environment.apiUrl}/fixture/jornada/${jornada.id}/partidos`).subscribe({
      next: res => {
        jornada._partidos = res.data;
        // Agrupar por cruce (local+visitante)
        const cruces: Record<string, any> = {};
        for (const p of res.data) {
          const key = `${p.club_local_id}-${p.club_visitante_id}`;
          if (!cruces[key]) {
            cruces[key] = {
              key,
              local: p.clubLocal?.nombre_corto || p.clubLocal?.nombre,
              visitante: p.clubVisitante?.nombre_corto || p.clubVisitante?.nombre,
              club_local_id: p.club_local_id,
              club_visitante_id: p.club_visitante_id,
              partidos: 0,
            };
          }
          cruces[key].partidos++;
        }
        jornada._cruces = Object.values(cruces);
      },
      error: () => this.toastr.error('Error al cargar partidos'),
    });
  }

  clubesZona(zonaId: number | null): any[] {
    if (!zonaId) return this.clubes;
    return this.clubes.filter(c => c.zona_id === zonaId);
  }

  getHora(partido: any): string {
    if (!partido.hora_inicio) return '';
    const d = new Date(partido.hora_inicio);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  // ─── Gestion manual ──────────────────────────────────────

  crearJornada() {
    if (!this.formJornada.numero_jornada || !this.formJornada.zona_id) {
      this.toastr.warning('Numero de fecha y zona son requeridos'); return;
    }
    this.http.post<any>(`${environment.apiUrl}/fixture/jornada`, {
      ...this.formJornada, torneo_id: this.torneoId,
    }).subscribe({
      next: () => {
        this.toastr.success('Fecha creada');
        this.mostrarFormJornada = false;
        this.formJornada.numero_jornada++;
        this.cargarJornadas();
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  agregarCruce(jornada: any) {
    if (!this.cruceForm.club_local_id || !this.cruceForm.club_visitante_id) {
      this.toastr.warning('Selecciona ambos clubes'); return;
    }
    this.http.post<any>(`${environment.apiUrl}/fixture/jornada/${jornada.id}/enfrentamiento`, this.cruceForm).subscribe({
      next: (res) => {
        this.toastr.success(res.message);
        this.cruceForm = { club_local_id: null, club_visitante_id: null };
        this.cargarPartidos(jornada);
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  eliminarCruce(jornada: any, cruce: any) {
    if (!confirm(`Eliminar cruce ${cruce.local} vs ${cruce.visitante}?`)) return;
    this.http.delete<any>(`${environment.apiUrl}/fixture/jornada/${jornada.id}/enfrentamiento`, {
      body: { club_local_id: cruce.club_local_id, club_visitante_id: cruce.club_visitante_id },
    }).subscribe({
      next: () => { this.toastr.success('Cruce eliminado'); this.cargarPartidos(jornada); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  borrarJornada(jornada: any) {
    if (!confirm(`Eliminar Fecha ${jornada.numero_jornada} y todos sus partidos?`)) return;
    this.http.delete<any>(`${environment.apiUrl}/fixture/jornada/${jornada.id}`).subscribe({
      next: () => { this.toastr.success('Fecha eliminada'); this.cargarJornadas(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }
}
