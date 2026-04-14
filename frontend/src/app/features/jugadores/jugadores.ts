import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-jugadores',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule, MatMenuModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Jugadores</h1>
          <p class="text-sm text-gray-500 mt-0.5">Registro y fichaje de jugadores</p>
        </div>
        @if (auth.puede('jugadores', 'crear')) {
          <button mat-flat-button color="primary" (click)="mostrarForm = !mostrarForm" class="!rounded-lg">
            <mat-icon>person_add</mat-icon> Nuevo Jugador
          </button>
        }
      </div>

      <!-- Filtros -->
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex flex-wrap gap-4 items-center">
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
        </div>
      </div>

      <!-- Formulario nuevo jugador -->
      @if (mostrarForm) {
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="h-1 rounded-full bg-gradient-to-r from-[var(--color-primario)] to-[var(--color-acento)]"></div>
          <div class="p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ editando ? 'Editar' : 'Nuevo' }} Jugador</h3>
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
                <mat-label>N camiseta</mat-label>
                <input matInput type="number" [(ngModel)]="form.numero_camiseta">
              </mat-form-field>
            </div>
            <div class="flex gap-2 mt-4">
              <button mat-flat-button color="primary" (click)="guardar()">{{ editando ? 'Actualizar' : 'Crear' }}</button>
              <button mat-stroked-button (click)="cancelarForm()">Cancelar</button>
            </div>
          </div>
        </div>
      }

      <!-- Tabla de jugadores -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        @if (jugadores.length) {
          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Jugador</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">DNI</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Club</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Cat.</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Fichaje</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide w-20">Acc.</th>
              </tr>
            </thead>
            <tbody>
              @for (j of jugadores; track j.id) {
                <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <!-- Jugador -->
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0"
                        [style.background-color]="j.club?.color_primario || '#e2e8f0'"
                        [style.color]="j.club?.color_secundario || '#475569'">
                        {{ (j.nombre?.charAt(0) || '') + (j.apellido?.charAt(0) || '') }}
                      </div>
                      <div>
                        <span class="font-medium text-gray-900 text-sm">{{ j.apellido }}, {{ j.nombre }}</span>
                        @if (j.numero_camiseta) {
                          <span class="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">#{{ j.numero_camiseta }}</span>
                        }
                      </div>
                    </div>
                  </td>
                  <!-- DNI -->
                  <td class="px-4 py-3 text-sm text-gray-600">{{ j.dni }}</td>
                  <!-- Club -->
                  <td class="px-4 py-3 text-sm text-gray-600">{{ j.club?.nombre_corto || j.club?.nombre }}</td>
                  <!-- Categoria -->
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {{ j.categoria?.nombre }}
                    </span>
                  </td>
                  <!-- Fichaje -->
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" [class]="getFichajeClass(j.estado_fichaje)">
                      {{ j.estado_fichaje }}
                    </span>
                  </td>
                  <!-- Acciones -->
                  <td class="px-4 py-3 text-right">
                    <button
                      class="w-8 h-8 rounded-lg inline-flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      [matMenuTriggerFor]="menuJugador">
                      <mat-icon class="!text-lg">more_vert</mat-icon>
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
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div class="py-12 text-center">
            <mat-icon class="!text-5xl text-gray-300 mb-3">person_search</mat-icon>
            <p class="text-sm text-gray-500">No se encontraron jugadores</p>
            <p class="text-[10px] text-gray-400 mt-1">Ajusta los filtros o agrega nuevos jugadores</p>
          </div>
        }
      </div>
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

  constructor(private http: HttpClient, public auth: AuthService, private toastr: ToastrService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    // Cargar torneos para obtener categorias y clubes
    this.http.get<any>(`${environment.apiUrl}/torneos`).subscribe({
      next: res => {
        if (res.data.length) {
          const torneo = res.data[0];
          this.categorias = torneo.categorias || [];
        }
        this.cdr.detectChanges();
      },
    });
    this.http.get<any>(`${environment.apiUrl}/clubes`).subscribe({
      next: res => { this.clubes = res.data; this.cdr.detectChanges(); },
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
      next: res => { this.jugadores = res.data; this.cdr.detectChanges(); },
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
      next: () => { this.toastr.success(this.editando ? 'Jugador actualizado' : 'Jugador creado'); this.cancelarForm(); this.cargar(); this.cdr.detectChanges(); },
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
      next: () => { this.toastr.success(`Fichaje ${estado}`); this.cargar(); this.cdr.detectChanges(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  getFichajeClass(estado: string): string {
    const map: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-700',
      aprobado: 'bg-green-100 text-green-700',
      rechazado: 'bg-red-100 text-red-700',
      baja: 'bg-gray-100 text-gray-700',
    };
    return map[estado] || 'bg-gray-100 text-gray-700';
  }
}
