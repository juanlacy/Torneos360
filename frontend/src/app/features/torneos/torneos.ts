import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-torneos',
  standalone: true,
  imports: [FormsModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-200">Torneos</h1>
        @if (auth.puede('torneos', 'crear')) {
          <button mat-flat-button color="primary" (click)="mostrarFormulario = !mostrarFormulario">
            <mat-icon>add</mat-icon> Nuevo Torneo
          </button>
        }
      </div>

      @if (mostrarFormulario) {
        <mat-card class="!bg-slate-900 !border !border-slate-700">
          <mat-card-content>
            <h3 class="text-lg font-semibold text-slate-200 mb-4">{{ editando ? 'Editar' : 'Nuevo' }} Torneo</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <mat-form-field appearance="outline">
                <mat-label>Nombre</mat-label>
                <input matInput [(ngModel)]="form.nombre" placeholder="Torneo Baby Futbol 2026">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Anio</mat-label>
                <input matInput type="number" [(ngModel)]="form.anio" placeholder="2026">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Estado</mat-label>
                <mat-select [(ngModel)]="form.estado">
                  <mat-option value="planificacion">Planificacion</mat-option>
                  <mat-option value="inscripcion">Inscripcion</mat-option>
                  <mat-option value="en_curso">En curso</mat-option>
                  <mat-option value="finalizado">Finalizado</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
            <div class="flex gap-2 mt-2">
              <button mat-flat-button color="primary" (click)="guardar()">{{ editando ? 'Actualizar' : 'Crear' }}</button>
              <button mat-stroked-button (click)="cancelar()">Cancelar</button>
            </div>
          </mat-card-content>
        </mat-card>
      }

      @for (torneo of torneos; track torneo.id) {
        <mat-card class="!bg-slate-900 !border !border-slate-700">
          <mat-card-content class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-xl font-bold text-slate-200">{{ torneo.nombre }}</h2>
                <div class="flex items-center gap-3 mt-2">
                  <span class="text-sm text-slate-400">Anio: {{ torneo.anio }}</span>
                  <span class="px-2 py-0.5 rounded text-xs font-medium"
                    [class]="getEstadoClass(torneo.estado)">{{ torneo.estado }}</span>
                  <span class="text-sm text-slate-400">{{ torneo.categorias?.length || 0 }} categorias</span>
                  <span class="text-sm text-slate-400">{{ torneo.zonas?.length || 0 }} zonas</span>
                </div>
              </div>
              <div class="flex gap-2">
                @if (auth.puede('torneos', 'editar')) {
                  @if (!torneo.categorias?.length) {
                    <button mat-stroked-button color="primary" (click)="generarCategorias(torneo)">
                      <mat-icon>auto_fix_high</mat-icon> Generar Categorias
                    </button>
                  }
                  <button mat-icon-button (click)="editar(torneo)"><mat-icon>edit</mat-icon></button>
                }
                <a mat-icon-button [routerLink]="['/torneos', torneo.id]"><mat-icon>visibility</mat-icon></a>
              </div>
            </div>

            @if (torneo.categorias?.length) {
              <div class="flex flex-wrap gap-2 mt-3">
                @for (cat of torneo.categorias; track cat.id) {
                  <span class="px-2 py-1 rounded text-xs"
                    [class]="cat.es_preliminar ? 'bg-yellow-900/50 text-yellow-300' : 'bg-green-900/50 text-green-300'">
                    {{ cat.nombre }}
                  </span>
                }
              </div>
            }
          </mat-card-content>
        </mat-card>
      } @empty {
        <mat-card class="!bg-slate-900 !border !border-slate-700">
          <mat-card-content class="p-8 text-center text-slate-400">
            <mat-icon class="!text-5xl text-slate-600 mb-2">emoji_events</mat-icon>
            <p>No hay torneos creados</p>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
})
export class TorneosComponent implements OnInit {
  torneos: any[] = [];
  mostrarFormulario = false;
  editando: any = null;
  form: any = { nombre: '', anio: new Date().getFullYear(), estado: 'planificacion' };

  constructor(private http: HttpClient, public auth: AuthService, private toastr: ToastrService) {}

  ngOnInit() { this.cargar(); }

  cargar() {
    this.http.get<any>(`${environment.apiUrl}/torneos`).subscribe({
      next: res => this.torneos = res.data,
      error: () => this.toastr.error('Error al cargar torneos'),
    });
  }

  guardar() {
    if (!this.form.nombre || !this.form.anio) { this.toastr.warning('Nombre y anio son requeridos'); return; }
    const obs = this.editando
      ? this.http.put(`${environment.apiUrl}/torneos/${this.editando.id}`, this.form)
      : this.http.post(`${environment.apiUrl}/torneos`, this.form);
    obs.subscribe({
      next: () => { this.toastr.success(this.editando ? 'Torneo actualizado' : 'Torneo creado'); this.cancelar(); this.cargar(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  editar(torneo: any) {
    this.editando = torneo;
    this.form = { nombre: torneo.nombre, anio: torneo.anio, estado: torneo.estado };
    this.mostrarFormulario = true;
  }

  cancelar() { this.editando = null; this.form = { nombre: '', anio: new Date().getFullYear(), estado: 'planificacion' }; this.mostrarFormulario = false; }

  generarCategorias(torneo: any) {
    this.http.post(`${environment.apiUrl}/torneos/${torneo.id}/generar-categorias`, {}).subscribe({
      next: (res: any) => { this.toastr.success(res.message); this.cargar(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      planificacion: 'bg-slate-700/50 text-slate-300',
      inscripcion: 'bg-blue-900/50 text-blue-300',
      en_curso: 'bg-green-900/50 text-green-300',
      finalizado: 'bg-red-900/50 text-red-300',
    };
    return map[estado] || 'bg-slate-700/50 text-slate-300';
  }
}
