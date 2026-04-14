import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { UpperCasePipe } from '@angular/common';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-fixture',
  standalone: true,
  imports: [FormsModule, RouterLink, UpperCasePipe, MatCardModule, MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatChipsModule, MatExpansionModule],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Fixture</h1>
        <div class="flex gap-2 items-center">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Torneo</mat-label>
            <mat-select [(ngModel)]="torneoId" (selectionChange)="cargarJornadas()">
              @for (t of torneos; track t.id) {
                <mat-option [value]="t.id">{{ t.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          @if (auth.isAdmin() && torneoId) {
            @if (!jornadas.length) {
              <button mat-flat-button color="primary" (click)="generarFixture()">
                <mat-icon>auto_fix_high</mat-icon> Generar Fixture
              </button>
            } @else {
              <button mat-stroked-button color="warn" (click)="eliminarFixture()">
                <mat-icon>delete</mat-icon> Eliminar Fixture
              </button>
            }
          }
        </div>
      </div>

      <!-- Filtros -->
      @if (jornadas.length) {
        <div class="flex gap-2">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Zona</mat-label>
            <mat-select [(ngModel)]="filtroZona" (selectionChange)="filtrar()">
              <mat-option [value]="''">Todas</mat-option>
              @for (z of zonas; track z.id) {
                <mat-option [value]="z.id">{{ z.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Fase</mat-label>
            <mat-select [(ngModel)]="filtroFase" (selectionChange)="filtrar()">
              <mat-option value="">Todas</mat-option>
              <mat-option value="ida">Ida</mat-option>
              <mat-option value="vuelta">Vuelta</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      }

      <!-- Jornadas -->
      @for (jornada of jornadasFiltradas; track jornada.id) {
        <mat-expansion-panel class="bg-white rounded-xl border border-gray-200">
          <mat-expansion-panel-header>
            <mat-panel-title class="!text-gray-900">
              Fecha {{ jornada.numero_jornada }} — {{ jornada.fase | uppercase }}
            </mat-panel-title>
            <mat-panel-description class="!text-gray-500">
              @if (jornada.zona) {
                <span class="mr-3">Zona {{ jornada.zona.nombre }}</span>
              }
              <span class="px-2 py-0.5 rounded text-xs" [class]="getEstadoClass(jornada.estado)">{{ jornada.estado }}</span>
              @if (jornada.fecha) {
                <span class="ml-3">{{ jornada.fecha }}</span>
              }
            </mat-panel-description>
          </mat-expansion-panel-header>

          <div class="mt-2">
            @if (!jornada._partidos) {
              <button mat-stroked-button (click)="cargarPartidos(jornada)">
                <mat-icon>sports_soccer</mat-icon> Ver partidos
              </button>
            } @else {
              <div class="space-y-2">
                @for (partido of jornada._partidos; track partido.id) {
                  <div class="flex items-center gap-3 p-3 rounded bg-gray-50 hover:bg-gray-100">
                    <span class="text-xs text-gray-400 w-16">{{ partido.categoria?.nombre }}</span>
                    <div class="flex-1 flex items-center justify-center gap-4">
                      <span class="text-right flex-1 font-medium text-gray-900">
                        {{ partido.clubLocal?.nombre_corto || partido.clubLocal?.nombre }}
                      </span>
                      <div class="px-3 py-1 rounded bg-gray-100 min-w-[60px] text-center font-bold"
                        [class]="partido.estado === 'finalizado' ? 'bg-green-50 text-green-700' : 'text-gray-700'">
                        {{ partido.goles_local }} - {{ partido.goles_visitante }}
                      </div>
                      <span class="text-left flex-1 font-medium text-gray-900">
                        {{ partido.clubVisitante?.nombre_corto || partido.clubVisitante?.nombre }}
                      </span>
                    </div>
                    <span class="px-2 py-0.5 rounded text-xs" [class]="getEstadoClass(partido.estado)">
                      {{ partido.estado }}
                    </span>
                    <a mat-icon-button [routerLink]="['/partidos', partido.id]" class="!text-gray-400">
                      <mat-icon class="!text-lg">open_in_new</mat-icon>
                    </a>
                  </div>
                }
              </div>
            }
          </div>
        </mat-expansion-panel>
      } @empty {
        <mat-card class="bg-white rounded-xl border border-gray-200">
          <mat-card-content class="p-8 text-center text-gray-500">
            @if (!torneoId) {
              <p>Selecciona un torneo</p>
            } @else {
              <mat-icon class="!text-5xl text-gray-400 mb-2">calendar_month</mat-icon>
              <p>No hay fixture generado para este torneo</p>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
})
export class FixtureComponent implements OnInit {
  torneos: any[] = [];
  zonas: any[] = [];
  jornadas: any[] = [];
  jornadasFiltradas: any[] = [];
  torneoId: number | null = null;
  filtroZona = '';
  filtroFase = '';

  constructor(private http: HttpClient, public auth: AuthService, private toastr: ToastrService) {}

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/torneos`).subscribe({
      next: res => {
        this.torneos = res.data;
        if (this.torneos.length) {
          this.torneoId = this.torneos[0].id;
          this.zonas = this.torneos[0].zonas || [];
          this.cargarJornadas();
        }
      },
    });
  }

  cargarJornadas() {
    if (!this.torneoId) return;
    const torneo = this.torneos.find(t => t.id === this.torneoId);
    this.zonas = torneo?.zonas || [];
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
      next: res => jornada._partidos = res.data,
      error: () => this.toastr.error('Error al cargar partidos'),
    });
  }

  generarFixture() {
    if (!confirm('Esto generara el fixture completo con ida y vuelta. Continuar?')) return;
    this.http.post<any>(`${environment.apiUrl}/fixture/generar/${this.torneoId}`, {}).subscribe({
      next: res => { this.toastr.success(res.message); this.cargarJornadas(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error al generar fixture'),
    });
  }

  eliminarFixture() {
    if (!confirm('Esto eliminara TODO el fixture y los partidos. Esta accion es irreversible. Continuar?')) return;
    this.http.delete<any>(`${environment.apiUrl}/fixture/${this.torneoId}`).subscribe({
      next: () => { this.toastr.success('Fixture eliminado'); this.jornadas = []; this.jornadasFiltradas = []; },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      programada: 'bg-gray-100 text-gray-700', programado: 'bg-gray-100 text-gray-700',
      en_curso: 'bg-yellow-50 text-yellow-700',
      finalizada: 'bg-green-50 text-green-700', finalizado: 'bg-green-50 text-green-700',
      suspendida: 'bg-red-50 text-red-700', suspendido: 'bg-red-50 text-red-700',
    };
    return map[estado] || 'bg-gray-100 text-gray-700';
  }
}
