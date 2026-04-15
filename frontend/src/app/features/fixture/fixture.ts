import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
    <div class="space-y-4 animate-fade-in">
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
        <mat-expansion-panel class="bg-white rounded-xl border border-gray-200 !shadow-none"
          (opened)="!jornada._partidos && cargarPartidos(jornada)">
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
            @if (jornada._loading) {
              <p class="text-gray-400 text-sm py-3 text-center">Cargando partidos...</p>
            } @else if (!jornada._partidos) {
              <p class="text-gray-400 text-sm py-3 text-center">Expandir para cargar</p>
            } @else {
              <!-- Cruces agrupados -->
              @for (cruce of jornada._cruces; track cruce.key) {
                <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all mb-2">
                  <!-- Local -->
                  <div class="flex-1 flex items-center justify-end gap-2">
                    <span class="font-semibold text-gray-900 text-sm">{{ cruce.local }}</span>
                    @if (cruce.localEscudo) {
                      <img [src]="resolveUrl(cruce.localEscudo)" class="escudo-md shrink-0" alt="">
                    } @else {
                      <div class="escudo-md escudo-placeholder text-xs shrink-0"
                        [style.background-color]="cruce.localColor || '#762c7e'">
                        {{ initials(cruce.local) }}
                      </div>
                    }
                  </div>

                  <!-- VS badge -->
                  <div class="px-3 py-1 rounded-full bg-white border border-gray-200 shadow-sm">
                    <span class="text-[10px] font-bold text-gray-500">VS</span>
                  </div>

                  <!-- Visitante -->
                  <div class="flex-1 flex items-center gap-2">
                    @if (cruce.visitEscudo) {
                      <img [src]="resolveUrl(cruce.visitEscudo)" class="escudo-md shrink-0" alt="">
                    } @else {
                      <div class="escudo-md escudo-placeholder text-xs shrink-0"
                        [style.background-color]="cruce.visitColor || '#762c7e'">
                        {{ initials(cruce.visitante) }}
                      </div>
                    }
                    <span class="font-semibold text-gray-900 text-sm">{{ cruce.visitante }}</span>
                  </div>

                  <div class="flex flex-col items-end gap-0.5 text-right">
                    <span class="text-[10px] text-gray-400 font-medium hidden md:inline">{{ cruce.partidos }} partidos</span>
                    @if (cruce.arbitroNombre) {
                      <span class="text-[10px] text-gray-600 flex items-center gap-1">
                        <mat-icon class="!text-xs !w-3 !h-3">sports</mat-icon>
                        {{ cruce.arbitroNombre }}
                      </span>
                    } @else {
                      <span class="text-[10px] text-amber-600 italic">sin arbitro</span>
                    }
                  </div>
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
                  <summary class="cursor-pointer text-gray-500 hover:text-gray-700 mb-2 font-medium">
                    <mat-icon class="!text-sm align-middle mr-1">schedule</mat-icon>
                    Ver detalle por categoria y horarios
                  </summary>
                  <div class="space-y-1 mt-2">
                    @for (p of jornada._partidos; track p.id) {
                      <div class="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-gray-50 text-gray-700">
                        <span class="w-12 text-xs font-mono text-gray-500">{{ getHora(p) }}</span>
                        <span class="w-16 text-[10px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-center">{{ p.categoria?.nombre }}</span>
                        <div class="flex-1 flex items-center gap-1.5">
                          @if (p.clubLocal?.escudo_url) {
                            <img [src]="resolveUrl(p.clubLocal.escudo_url)" class="escudo-sm" alt="">
                          }
                          <span class="text-xs">{{ p.clubLocal?.nombre_corto }}</span>
                          <span class="text-[10px] text-gray-400">vs</span>
                          @if (p.clubVisitante?.escudo_url) {
                            <img [src]="resolveUrl(p.clubVisitante.escudo_url)" class="escudo-sm" alt="">
                          }
                          <span class="text-xs">{{ p.clubVisitante?.nombre_corto }}</span>
                        </div>
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
                      @for (c of clubesDisponibles(jornada); track c.id) {
                        <mat-option [value]="c.id">{{ c.nombre }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <span class="text-gray-400 font-medium pb-1">vs</span>
                  <mat-form-field appearance="outline" subscriptSizing="dynamic" class="flex-1 min-w-[150px]">
                    <mat-label>Club Visitante</mat-label>
                    <mat-select [(ngModel)]="cruceForm.club_visitante_id">
                      @for (c of clubesDisponibles(jornada); track c.id) {
                        <mat-option [value]="c.id" [disabled]="c.id === cruceForm.club_local_id">{{ c.nombre }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" subscriptSizing="dynamic" class="flex-1 min-w-[150px]">
                    <mat-label>Arbitro</mat-label>
                    <mat-select [(ngModel)]="cruceForm.arbitro_id">
                      <mat-option [value]="null">Sin asignar</mat-option>
                      @for (a of arbitros; track a.id) {
                        <mat-option [value]="a.id">{{ a.apellido }}, {{ a.nombre }}</mat-option>
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
  arbitros: any[] = [];
  jornadas: any[] = [];
  jornadasFiltradas: any[] = [];
  filtroZona = '';
  filtroFase = '';
  mostrarFormJornada = false;
  formJornada: any = { numero_jornada: 1, zona_id: null, fase: 'ida', fecha: '' };
  cruceForm: any = { club_local_id: null, club_visitante_id: null, arbitro_id: null };
  private torneoId: number | null = null;

  constructor(
    private http: HttpClient, public auth: AuthService,
    private toastr: ToastrService, private branding: BrandingService,
    private cdr: ChangeDetectorRef,
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
        this.cdr.detectChanges();
      },
    });
    // Cargar arbitros del torneo
    this.http.get<any>(`${environment.apiUrl}/arbitros`, { params: { torneo_id: this.torneoId } }).subscribe({
      next: res => { this.arbitros = res.data || []; this.cdr.detectChanges(); },
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
    jornada._loading = true;
    this.cdr.detectChanges();

    this.http.get<any>(`${environment.apiUrl}/fixture/jornada/${jornada.id}/partidos`).subscribe({
      next: res => {
        jornada._partidos = res.data;
        jornada._loading = false;
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
              localEscudo: p.clubLocal?.escudo_url,
              localColor: p.clubLocal?.color_primario,
              localColorSec: p.clubLocal?.color_secundario,
              visitEscudo: p.clubVisitante?.escudo_url,
              visitColor: p.clubVisitante?.color_primario,
              visitColorSec: p.clubVisitante?.color_secundario,
              arbitroId: p.arbitro_id,
              arbitroNombre: p.arbitro ? `${p.arbitro.apellido || ''} ${p.arbitro.nombre || ''}`.trim() : null,
              partidos: 0,
            };
          }
          cruces[key].partidos++;
        }
        jornada._cruces = Object.values(cruces);
        this.cdr.detectChanges();
      },
      error: () => { jornada._loading = false; this.toastr.error('Error al cargar partidos'); this.cdr.detectChanges(); },
    });
  }

  clubesZona(zonaId: number | null): any[] {
    if (!zonaId) return this.clubes;
    return this.clubes.filter(c => c.zona_id === zonaId);
  }

  /** Devuelve solo los clubes que aun no tienen cruce en esta jornada */
  clubesDisponibles(jornada: any): any[] {
    const zonaClubes = this.clubesZona(jornada.zona_id);
    if (!jornada._cruces?.length) return zonaClubes;

    const usados = new Set<number>();
    for (const cruce of jornada._cruces) {
      usados.add(cruce.club_local_id);
      usados.add(cruce.club_visitante_id);
    }
    return zonaClubes.filter(c => !usados.has(c.id));
  }

  getHora(partido: any): string {
    if (!partido.hora_inicio) return '';
    const d = new Date(partido.hora_inicio);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
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
    if (this.cruceForm.club_local_id === this.cruceForm.club_visitante_id) {
      this.toastr.warning('Selecciona clubes diferentes'); return;
    }

    const localNombre = this.clubes.find((c: any) => c.id === this.cruceForm.club_local_id)?.nombre_corto || '?';
    const visitNombre = this.clubes.find((c: any) => c.id === this.cruceForm.club_visitante_id)?.nombre_corto || '?';

    this.http.post<any>(`${environment.apiUrl}/fixture/jornada/${jornada.id}/enfrentamiento`, this.cruceForm).subscribe({
      next: (res) => {
        this.toastr.success(`${localNombre} vs ${visitNombre} — ${res.data?.length || 7} partidos creados`);
        this.cruceForm = { club_local_id: null, club_visitante_id: null, arbitro_id: null };
        // Recargar partidos de la jornada para mostrar el nuevo cruce
        jornada._partidos = null;
        jornada._cruces = null;
        this.cargarPartidos(jornada);
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  eliminarCruce(jornada: any, cruce: any) {
    if (!confirm(`Eliminar cruce ${cruce.local} vs ${cruce.visitante} y sus ${cruce.partidos} partidos?`)) return;
    this.http.delete<any>(`${environment.apiUrl}/fixture/jornada/${jornada.id}/enfrentamiento`, {
      body: { club_local_id: cruce.club_local_id, club_visitante_id: cruce.club_visitante_id },
    }).subscribe({
      next: () => {
        this.toastr.success(`${cruce.local} vs ${cruce.visitante} eliminado`);
        jornada._partidos = null;
        jornada._cruces = null;
        this.cargarPartidos(jornada);
      },
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
