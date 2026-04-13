import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-jugadores',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatChipsModule, MatMenuModule],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-200">Jugadores</h1>
        @if (auth.puede('jugadores', 'crear')) {
          <button mat-flat-button color="primary" (click)="mostrarForm = !mostrarForm">
            <mat-icon>person_add</mat-icon> Nuevo Jugador
          </button>
        }
      </div>

      <!-- Filtros -->
      <mat-card class="!bg-slate-900 !border !border-slate-700">
        <mat-card-content class="flex flex-wrap gap-4 items-center">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Club</mat-label>
            <mat-select [(ngModel)]="filtros.club_id" (selectionChange)="cargar()">
              <mat-option [value]="''">Todos</mat-option>
              @for (c of clubes; track c.id) {
                <mat-option [value]="c.id">{{ c.nombre_corto || c.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Categoria</mat-label>
            <mat-select [(ngModel)]="filtros.categoria_id" (selectionChange)="cargar()">
              <mat-option [value]="''">Todas</mat-option>
              @for (cat of categorias; track cat.id) {
                <mat-option [value]="cat.id">{{ cat.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Estado fichaje</mat-label>
            <mat-select [(ngModel)]="filtros.estado_fichaje" (selectionChange)="cargar()">
              <mat-option value="">Todos</mat-option>
              <mat-option value="pendiente">Pendiente</mat-option>
              <mat-option value="aprobado">Aprobado</mat-option>
              <mat-option value="rechazado">Rechazado</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Buscar</mat-label>
            <input matInput [(ngModel)]="filtros.search" (keyup.enter)="cargar()" placeholder="Nombre, apellido o DNI">
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      <!-- Formulario nuevo jugador -->
      @if (mostrarForm) {
        <mat-card class="!bg-slate-900 !border !border-slate-700">
          <mat-card-content>
            <h3 class="text-lg font-semibold text-slate-200 mb-4">{{ editando ? 'Editar' : 'Nuevo' }} Jugador</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <mat-form-field appearance="outline">
                <mat-label>Nombre</mat-label>
                <input matInput [(ngModel)]="form.nombre" required>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Apellido</mat-label>
                <input matInput [(ngModel)]="form.apellido" required>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>DNI</mat-label>
                <input matInput [(ngModel)]="form.dni" required>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fecha de nacimiento</mat-label>
                <input matInput type="date" [(ngModel)]="form.fecha_nacimiento" required>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Club</mat-label>
                <mat-select [(ngModel)]="form.club_id" required>
                  @for (c of clubes; track c.id) {
                    <mat-option [value]="c.id">{{ c.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Categoria</mat-label>
                <mat-select [(ngModel)]="form.categoria_id" required>
                  @for (cat of categorias; track cat.id) {
                    <mat-option [value]="cat.id">{{ cat.nombre }} ({{ cat.anio_nacimiento }})</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>N° camiseta</mat-label>
                <input matInput type="number" [(ngModel)]="form.numero_camiseta">
              </mat-form-field>
            </div>
            <div class="flex gap-2 mt-2">
              <button mat-flat-button color="primary" (click)="guardar()">{{ editando ? 'Actualizar' : 'Crear' }}</button>
              <button mat-stroked-button (click)="cancelarForm()">Cancelar</button>
            </div>
          </mat-card-content>
        </mat-card>
      }

      <!-- Tabla de jugadores -->
      <mat-card class="!bg-slate-900 !border !border-slate-700">
        <mat-card-content>
          <table mat-table [dataSource]="jugadores" class="w-full !bg-transparent">
            <ng-container matColumnDef="jugador">
              <th mat-header-cell *matHeaderCellDef class="!text-slate-400">Jugador</th>
              <td mat-cell *matCellDef="let j" class="!text-slate-200">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ j.apellido }}, {{ j.nombre }}</span>
                  @if (j.numero_camiseta) {
                    <span class="text-xs bg-slate-700 px-1.5 py-0.5 rounded">#{{ j.numero_camiseta }}</span>
                  }
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="dni">
              <th mat-header-cell *matHeaderCellDef class="!text-slate-400">DNI</th>
              <td mat-cell *matCellDef="let j" class="!text-slate-300">{{ j.dni }}</td>
            </ng-container>

            <ng-container matColumnDef="club">
              <th mat-header-cell *matHeaderCellDef class="!text-slate-400">Club</th>
              <td mat-cell *matCellDef="let j" class="!text-slate-300">{{ j.club?.nombre_corto || j.club?.nombre }}</td>
            </ng-container>

            <ng-container matColumnDef="categoria">
              <th mat-header-cell *matHeaderCellDef class="!text-slate-400">Cat.</th>
              <td mat-cell *matCellDef="let j" class="!text-slate-300">{{ j.categoria?.nombre }}</td>
            </ng-container>

            <ng-container matColumnDef="fichaje">
              <th mat-header-cell *matHeaderCellDef class="!text-slate-400">Fichaje</th>
              <td mat-cell *matCellDef="let j">
                <span class="px-2 py-0.5 rounded text-xs font-medium" [class]="getFichajeClass(j.estado_fichaje)">
                  {{ j.estado_fichaje }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef class="!text-slate-400 w-20">Acc.</th>
              <td mat-cell *matCellDef="let j">
                <button mat-icon-button [matMenuTriggerFor]="menuJugador">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menuJugador="matMenu">
                  @if (auth.puede('jugadores', 'editar')) {
                    <button mat-menu-item (click)="editarJugador(j)"><mat-icon>edit</mat-icon> Editar</button>
                  }
                  @if (auth.isAdmin() && j.estado_fichaje === 'pendiente') {
                    <button mat-menu-item (click)="cambiarFichaje(j, 'aprobado')"><mat-icon>check_circle</mat-icon> Aprobar fichaje</button>
                    <button mat-menu-item (click)="cambiarFichaje(j, 'rechazado')"><mat-icon>cancel</mat-icon> Rechazar fichaje</button>
                  }
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columnas"></tr>
            <tr mat-row *matRowDef="let row; columns: columnas;" class="hover:!bg-slate-800"></tr>
          </table>

          @if (!jugadores.length) {
            <div class="p-8 text-center text-slate-400">
              <p>No se encontraron jugadores</p>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class JugadoresComponent implements OnInit {
  jugadores: any[] = [];
  clubes: any[] = [];
  categorias: any[] = [];
  columnas = ['jugador', 'dni', 'club', 'categoria', 'fichaje', 'acciones'];
  filtros: any = { club_id: '', categoria_id: '', estado_fichaje: '', search: '' };
  mostrarForm = false;
  editando: any = null;
  form: any = { nombre: '', apellido: '', dni: '', fecha_nacimiento: '', club_id: '', categoria_id: '', numero_camiseta: null };

  constructor(private http: HttpClient, public auth: AuthService, private toastr: ToastrService) {}

  ngOnInit() {
    // Cargar torneos para obtener categorias y clubes
    this.http.get<any>(`${environment.apiUrl}/torneos`).subscribe({
      next: res => {
        if (res.data.length) {
          const torneo = res.data[0];
          this.categorias = torneo.categorias || [];
        }
      },
    });
    this.http.get<any>(`${environment.apiUrl}/clubes`).subscribe({
      next: res => this.clubes = res.data,
    });
    this.cargar();
  }

  cargar() {
    const params: any = {};
    if (this.filtros.club_id) params.club_id = this.filtros.club_id;
    if (this.filtros.categoria_id) params.categoria_id = this.filtros.categoria_id;
    if (this.filtros.estado_fichaje) params.estado_fichaje = this.filtros.estado_fichaje;
    if (this.filtros.search) params.search = this.filtros.search;

    this.http.get<any>(`${environment.apiUrl}/jugadores`, { params }).subscribe({
      next: res => this.jugadores = res.data,
      error: () => this.toastr.error('Error al cargar jugadores'),
    });
  }

  guardar() {
    if (!this.form.nombre || !this.form.apellido || !this.form.dni || !this.form.fecha_nacimiento || !this.form.club_id || !this.form.categoria_id) {
      this.toastr.warning('Completa todos los campos requeridos'); return;
    }
    const obs = this.editando
      ? this.http.put(`${environment.apiUrl}/jugadores/${this.editando.id}`, this.form)
      : this.http.post(`${environment.apiUrl}/jugadores`, this.form);
    obs.subscribe({
      next: () => { this.toastr.success(this.editando ? 'Jugador actualizado' : 'Jugador creado'); this.cancelarForm(); this.cargar(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  editarJugador(j: any) {
    this.editando = j;
    this.form = { nombre: j.nombre, apellido: j.apellido, dni: j.dni, fecha_nacimiento: j.fecha_nacimiento, club_id: j.club_id, categoria_id: j.categoria_id, numero_camiseta: j.numero_camiseta };
    this.mostrarForm = true;
  }

  cancelarForm() {
    this.editando = null;
    this.form = { nombre: '', apellido: '', dni: '', fecha_nacimiento: '', club_id: '', categoria_id: '', numero_camiseta: null };
    this.mostrarForm = false;
  }

  cambiarFichaje(j: any, estado: string) {
    this.http.put(`${environment.apiUrl}/jugadores/${j.id}/fichaje`, { estado }).subscribe({
      next: () => { this.toastr.success(`Fichaje ${estado}`); this.cargar(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  getFichajeClass(estado: string): string {
    const map: Record<string, string> = {
      pendiente: 'bg-yellow-900/50 text-yellow-300',
      aprobado: 'bg-green-900/50 text-green-300',
      rechazado: 'bg-red-900/50 text-red-300',
      baja: 'bg-slate-700/50 text-slate-300',
    };
    return map[estado] || 'bg-slate-700/50 text-slate-300';
  }
}
