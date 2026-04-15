import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Torneos</h1>
          <p class="text-sm text-gray-500 mt-0.5">Administracion de torneos</p>
        </div>
        @if (auth.puede('torneos', 'crear')) {
          <button mat-flat-button color="primary" (click)="mostrarFormulario = !mostrarFormulario" class="!rounded-lg">
            <mat-icon>add</mat-icon> Nuevo Torneo
          </button>
        }
      </div>

      <!-- Formulario -->
      @if (mostrarFormulario) {
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="h-1 rounded-full bg-gradient-to-r from-[var(--color-primario)] to-[var(--color-acento)]"></div>
          <div class="p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ editando ? 'Editar' : 'Nuevo' }} Torneo</h3>
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
            <div class="flex gap-2 mt-4">
              <button mat-flat-button color="primary" (click)="guardar()">{{ editando ? 'Actualizar' : 'Crear' }}</button>
              <button mat-stroked-button (click)="cancelar()">Cancelar</button>
            </div>
          </div>
        </div>
      }

      <!-- Torneo Cards -->
      @for (torneo of torneos; track torneo.id) {
        <div class="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
          <!-- Brand bar -->
          <div class="h-1 rounded-full bg-gradient-to-r from-[var(--color-primario)] to-[var(--color-acento)]"></div>

          <div class="p-6">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <h2 class="text-xl font-bold text-gray-900">{{ torneo.nombre }}</h2>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    [class]="getEstadoClass(torneo.estado)">{{ torneo.estado }}</span>
                </div>
                <div class="flex items-center gap-4 mt-2">
                  <span class="text-sm text-gray-500">
                    <mat-icon class="!text-sm align-middle mr-0.5">calendar_today</mat-icon>
                    {{ torneo.anio }}
                  </span>
                  <span class="text-sm text-gray-500">
                    <mat-icon class="!text-sm align-middle mr-0.5">category</mat-icon>
                    {{ torneo.categorias?.length || 0 }} categorias
                  </span>
                  <span class="text-sm text-gray-500">
                    <mat-icon class="!text-sm align-middle mr-0.5">map</mat-icon>
                    {{ torneo.zonas?.length || 0 }} zonas
                  </span>
                </div>
              </div>

              <div class="flex gap-2 items-center shrink-0">
                @if (auth.puede('torneos', 'editar')) {
                  @if (!torneo.categorias?.length) {
                    <button mat-stroked-button color="primary" (click)="generarCategorias(torneo)" class="!rounded-lg !text-sm">
                      <mat-icon class="!text-lg">auto_fix_high</mat-icon> Generar Categorias
                    </button>
                  }
                  <button
                    class="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    (click)="editar(torneo)"
                    title="Editar">
                    <mat-icon class="!text-xl">edit</mat-icon>
                  </button>
                  <button
                    class="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                    (click)="abrirDuplicar(torneo)"
                    title="Duplicar torneo">
                    <mat-icon class="!text-xl">content_copy</mat-icon>
                  </button>
                }
                <a class="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-[var(--color-primario)] hover:bg-purple-50 transition-colors"
                  [routerLink]="['/torneos', torneo.id]">
                  <mat-icon class="!text-xl">visibility</mat-icon>
                </a>
              </div>
            </div>

            <!-- Categories chips -->
            @if (torneo.categorias?.length) {
              <div class="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-100">
                @for (cat of torneo.categorias; track cat.id) {
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                    [class]="cat.es_preliminar ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-200'">
                    {{ cat.nombre }}
                  </span>
                }
              </div>
            }
          </div>
        </div>
      } @empty {
        <div class="bg-white rounded-xl border border-gray-200 py-12 text-center">
          <mat-icon class="!text-5xl text-gray-300 mb-3">emoji_events</mat-icon>
          <p class="text-sm text-gray-500">No hay torneos creados</p>
          <p class="text-[10px] text-gray-400 mt-1">Crea el primer torneo para comenzar</p>
        </div>
      }

      <!-- Modal Duplicar torneo -->
      @if (duplicando) {
        <div class="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" (click)="cerrarDuplicar()">
          <div class="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl" (click)="$event.stopPropagation()">
            <div class="h-1 rounded-full bg-gradient-to-r from-[var(--color-primario)] to-[var(--color-acento)]"></div>
            <div class="px-5 py-4 border-b border-gray-200 flex items-center gap-3">
              <mat-icon class="text-green-600">content_copy</mat-icon>
              <div>
                <h3 class="font-bold text-gray-900">Duplicar Torneo</h3>
                <p class="text-xs text-gray-500">Desde "{{ duplicando.nombre }}" {{ duplicando.anio }}</p>
              </div>
            </div>
            <div class="p-5 space-y-3">
              <p class="text-sm text-gray-600">
                Se van a clonar: <strong>zonas, categorias, clubes y fixture</strong>.
                Las instituciones se reutilizan. Los partidos quedan en estado "programado" sin arbitros ni resultados.
                <br><span class="text-xs text-gray-500">No se clonan: personas, alineaciones, eventos ni fichajes.</span>
              </p>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Nombre del nuevo torneo</mat-label>
                <input matInput [(ngModel)]="dupForm.nombre" placeholder="CAFI 2026 DEMO">
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Anio</mat-label>
                <input matInput type="number" [(ngModel)]="dupForm.anio">
              </mat-form-field>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [(ngModel)]="dupForm.con_arbitros_veedores" class="w-4 h-4">
                <span class="text-sm text-gray-700">Clonar tambien arbitros y veedores del torneo origen</span>
              </label>
            </div>
            <div class="px-5 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button mat-stroked-button (click)="cerrarDuplicar()" [disabled]="duplicandoEnCurso">Cancelar</button>
              <button mat-flat-button color="primary" (click)="confirmarDuplicar()" [disabled]="duplicandoEnCurso">
                @if (duplicandoEnCurso) {
                  <mat-icon class="animate-spin">autorenew</mat-icon>
                }
                Duplicar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class TorneosComponent implements OnInit {
  torneos: any[] = [];
  mostrarFormulario = false;
  editando: any = null;
  form: any = { nombre: '', anio: new Date().getFullYear(), estado: 'planificacion' };

  // Duplicar torneo
  duplicando: any = null;
  duplicandoEnCurso = false;
  dupForm: any = { nombre: '', anio: new Date().getFullYear(), con_arbitros_veedores: false };

  constructor(private http: HttpClient, public auth: AuthService, private toastr: ToastrService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.cargar(); }

  cargar() {
    this.http.get<any>(`${environment.apiUrl}/torneos`).subscribe({
      next: res => { this.torneos = res.data; this.cdr.detectChanges(); },
      error: () => this.toastr.error('Error al cargar torneos'),
    });
  }

  guardar() {
    if (!this.form.nombre || !this.form.anio) { this.toastr.warning('Nombre y anio son requeridos'); return; }
    const obs = this.editando
      ? this.http.put(`${environment.apiUrl}/torneos/${this.editando.id}`, this.form)
      : this.http.post(`${environment.apiUrl}/torneos`, this.form);
    obs.subscribe({
      next: () => { this.toastr.success(this.editando ? 'Torneo actualizado' : 'Torneo creado'); this.cancelar(); this.cargar(); this.cdr.detectChanges(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  editar(torneo: any) {
    this.editando = torneo;
    this.form = { nombre: torneo.nombre, anio: torneo.anio, estado: torneo.estado };
    this.mostrarFormulario = true;
  }

  cancelar() { this.editando = null; this.form = { nombre: '', anio: new Date().getFullYear(), estado: 'planificacion' }; this.mostrarFormulario = false; }

  abrirDuplicar(torneo: any) {
    this.duplicando = torneo;
    this.dupForm = {
      nombre: `${torneo.nombre} DEMO`,
      anio: torneo.anio,
      con_arbitros_veedores: false,
    };
    this.cdr.detectChanges();
  }

  cerrarDuplicar() {
    if (this.duplicandoEnCurso) return;
    this.duplicando = null;
    this.cdr.detectChanges();
  }

  confirmarDuplicar() {
    if (!this.dupForm.nombre || !this.dupForm.anio) {
      this.toastr.warning('Completa nombre y anio');
      return;
    }
    this.duplicandoEnCurso = true;
    this.cdr.detectChanges();
    this.http.post<any>(`${environment.apiUrl}/torneos/${this.duplicando.id}/duplicar`, this.dupForm).subscribe({
      next: (res) => {
        this.toastr.success(res.message || 'Torneo duplicado');
        this.duplicandoEnCurso = false;
        this.duplicando = null;
        this.cargar();
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.toastr.error(e.error?.message || 'Error al duplicar');
        this.duplicandoEnCurso = false;
        this.cdr.detectChanges();
      },
    });
  }

  generarCategorias(torneo: any) {
    this.http.post(`${environment.apiUrl}/torneos/${torneo.id}/generar-categorias`, {}).subscribe({
      next: (res: any) => { this.toastr.success(res.message); this.cargar(); this.cdr.detectChanges(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      planificacion: 'bg-gray-100 text-gray-700',
      inscripcion: 'bg-blue-100 text-blue-700',
      en_curso: 'bg-green-100 text-green-700',
      finalizado: 'bg-red-100 text-red-700',
    };
    return map[estado] || 'bg-gray-100 text-gray-700';
  }
}
