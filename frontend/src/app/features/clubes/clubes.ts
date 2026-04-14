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
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-clubes',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatChipsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Clubes</h1>
          <p class="text-sm text-gray-500 mt-0.5">Gestion de clubes del torneo</p>
        </div>
        <div class="flex gap-3 items-center">
          <mat-form-field appearance="outline" class="!w-48" subscriptSizing="dynamic">
            <mat-label>Torneo</mat-label>
            <mat-select [(ngModel)]="filtroTorneo" (selectionChange)="cargar()">
              @for (t of torneos; track t.id) {
                <mat-option [value]="t.id">{{ t.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          @if (auth.puede('clubes', 'crear')) {
            <button mat-flat-button color="primary" (click)="mostrarForm = !mostrarForm"
              class="!rounded-lg">
              <mat-icon>add</mat-icon> Nuevo Club
            </button>
          }
        </div>
      </div>

      <!-- Formulario -->
      @if (mostrarForm) {
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="h-1 rounded-full bg-gradient-to-r from-[var(--color-primario)] to-[var(--color-acento)]"></div>
          <div class="p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ editando ? 'Editar' : 'Nuevo' }} Club</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <mat-form-field appearance="outline">
                <mat-label>Nombre</mat-label>
                <input matInput [(ngModel)]="form.nombre">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Nombre corto</mat-label>
                <input matInput [(ngModel)]="form.nombre_corto" maxlength="30">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Zona</mat-label>
                <mat-select [(ngModel)]="form.zona_id">
                  <mat-option [value]="null">Sin zona</mat-option>
                  @for (z of zonas; track z.id) {
                    <mat-option [value]="z.id">{{ z.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Color primario</mat-label>
                <input matInput type="color" [(ngModel)]="form.color_primario">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Color secundario</mat-label>
                <input matInput type="color" [(ngModel)]="form.color_secundario">
              </mat-form-field>
            </div>
            <div class="flex gap-2 mt-4">
              <button mat-flat-button color="primary" (click)="guardar()">{{ editando ? 'Actualizar' : 'Crear' }}</button>
              <button mat-stroked-button (click)="cancelar()">Cancelar</button>
            </div>
          </div>
        </div>
      }

      <!-- Club Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (club of clubes; track club.id) {
          <div class="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200 p-5">
            <div class="flex items-center gap-4">
              <!-- Escudo / Avatar with upload overlay -->
              <div class="relative group shrink-0">
                @if (club.escudo_url) {
                  <img [src]="getEscudoUrl(club.escudo_url)" class="w-16 h-16 rounded-xl object-cover border border-gray-100" alt="Escudo">
                } @else {
                  <div class="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold shadow-sm"
                    [style.background-color]="club.color_primario || '#334155'"
                    [style.color]="club.color_secundario || '#fff'">
                    {{ (club.nombre_corto || club.nombre).substring(0, 2).toUpperCase() }}
                  </div>
                }
                @if (auth.puede('clubes', 'editar')) {
                  <button
                    class="absolute inset-0 w-16 h-16 rounded-xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    (click)="escudoInput.click()">
                    <mat-icon class="text-white !text-xl">photo_camera</mat-icon>
                  </button>
                  <input #escudoInput type="file" accept="image/*" class="hidden" (change)="onEscudoChange($event, club)">
                }
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-gray-900 truncate">{{ club.nombre }}</h3>
                @if (club.nombre_corto) {
                  <p class="text-[10px] text-gray-400 uppercase tracking-wide">{{ club.nombre_corto }}</p>
                }
                @if (club.zona) {
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 mt-1.5">
                    Zona {{ club.zona.nombre }}
                  </span>
                }
              </div>

              <!-- Actions -->
              <div class="flex flex-col gap-1 shrink-0">
                @if (auth.puede('clubes', 'editar')) {
                  <button
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    (click)="editar(club)">
                    <mat-icon class="!text-lg">edit</mat-icon>
                  </button>
                }
              </div>
            </div>

            <!-- Color strip -->
            <div class="flex gap-1 mt-3">
              <div class="h-1 flex-1 rounded-full" [style.background-color]="club.color_primario || '#e2e8f0'"></div>
              <div class="h-1 flex-1 rounded-full" [style.background-color]="club.color_secundario || '#f1f5f9'"></div>
            </div>
          </div>
        } @empty {
          <div class="bg-white rounded-xl border border-gray-200 col-span-full py-12 text-center">
            @if (!filtroTorneo) {
              <mat-icon class="!text-5xl text-gray-300 mb-3">sports_soccer</mat-icon>
              <p class="text-sm text-gray-500">Selecciona un torneo para ver los clubes</p>
            } @else {
              <mat-icon class="!text-5xl text-gray-300 mb-3">groups</mat-icon>
              <p class="text-sm text-gray-500">No hay clubes en este torneo</p>
              <p class="text-[10px] text-gray-400 mt-1">Crea el primer club para comenzar</p>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class ClubesComponent implements OnInit {
  torneos: any[] = [];
  zonas: any[] = [];
  clubes: any[] = [];
  filtroTorneo: number | null = null;
  mostrarForm = false;
  editando: any = null;
  form: any = { nombre: '', nombre_corto: '', zona_id: null, color_primario: '#16a34a', color_secundario: '#ffffff' };

  constructor(private http: HttpClient, public auth: AuthService, private toastr: ToastrService) {}

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/torneos`).subscribe({
      next: res => {
        this.torneos = res.data;
        if (this.torneos.length) {
          this.filtroTorneo = this.torneos[0].id;
          this.zonas = this.torneos[0].zonas || [];
          this.cargar();
        }
      },
    });
  }

  cargar() {
    if (!this.filtroTorneo) return;
    const torneo = this.torneos.find(t => t.id === this.filtroTorneo);
    this.zonas = torneo?.zonas || [];
    this.http.get<any>(`${environment.apiUrl}/clubes`, { params: { torneo_id: this.filtroTorneo } }).subscribe({
      next: res => this.clubes = res.data,
      error: () => this.toastr.error('Error al cargar clubes'),
    });
  }

  guardar() {
    if (!this.form.nombre) { this.toastr.warning('Nombre requerido'); return; }
    const data = { ...this.form, torneo_id: this.filtroTorneo };
    const obs = this.editando
      ? this.http.put(`${environment.apiUrl}/clubes/${this.editando.id}`, data)
      : this.http.post(`${environment.apiUrl}/clubes`, data);
    obs.subscribe({
      next: () => { this.toastr.success(this.editando ? 'Club actualizado' : 'Club creado'); this.cancelar(); this.cargar(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  editar(club: any) {
    this.editando = club;
    this.form = { nombre: club.nombre, nombre_corto: club.nombre_corto, zona_id: club.zona_id, color_primario: club.color_primario || '#16a34a', color_secundario: club.color_secundario || '#ffffff' };
    this.mostrarForm = true;
  }

  cancelar() { this.editando = null; this.form = { nombre: '', nombre_corto: '', zona_id: null, color_primario: '#16a34a', color_secundario: '#ffffff' }; this.mostrarForm = false; }

  getEscudoUrl(url: string): string {
    return url.startsWith('http') ? url : `${environment.apiUrl}${url}`;
  }

  onEscudoChange(event: Event, club: any) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const formData = new FormData();
    formData.append('escudo', input.files[0]);
    this.http.post<any>(`${environment.apiUrl}/clubes/${club.id}/escudo`, formData).subscribe({
      next: (res) => {
        this.toastr.success('Escudo actualizado');
        club.escudo_url = res.data?.escudo_url || res.escudo_url;
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error al subir escudo'),
    });
  }
}
