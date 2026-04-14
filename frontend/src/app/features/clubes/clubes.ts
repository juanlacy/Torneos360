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
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Clubes</h1>
        <div class="flex gap-2 items-center">
          <mat-form-field appearance="outline" class="!w-48" subscriptSizing="dynamic">
            <mat-label>Torneo</mat-label>
            <mat-select [(ngModel)]="filtroTorneo" (selectionChange)="cargar()">
              @for (t of torneos; track t.id) {
                <mat-option [value]="t.id">{{ t.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          @if (auth.puede('clubes', 'crear')) {
            <button mat-flat-button color="primary" (click)="mostrarForm = !mostrarForm">
              <mat-icon>add</mat-icon> Nuevo Club
            </button>
          }
        </div>
      </div>

      @if (mostrarForm) {
        <mat-card class="bg-white rounded-xl border border-gray-200">
          <mat-card-content>
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
            <div class="flex gap-2 mt-2">
              <button mat-flat-button color="primary" (click)="guardar()">{{ editando ? 'Actualizar' : 'Crear' }}</button>
              <button mat-stroked-button (click)="cancelar()">Cancelar</button>
            </div>
          </mat-card-content>
        </mat-card>
      }

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (club of clubes; track club.id) {
          <mat-card class="bg-white rounded-xl border border-gray-200">
            <mat-card-content class="p-4">
              <div class="flex items-center gap-3">
                @if (club.escudo_url) {
                  <img [src]="getEscudoUrl(club.escudo_url)" class="w-12 h-12 rounded object-cover" alt="Escudo">
                } @else {
                  <div class="w-12 h-12 rounded flex items-center justify-center text-xl font-bold"
                    [style.background-color]="club.color_primario || '#334155'"
                    [style.color]="club.color_secundario || '#fff'">
                    {{ (club.nombre_corto || club.nombre).substring(0, 2).toUpperCase() }}
                  </div>
                }
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-900">{{ club.nombre }}</h3>
                  @if (club.zona) {
                    <span class="text-xs text-gray-500">Zona {{ club.zona.nombre }}</span>
                  }
                </div>
                <div class="flex gap-1">
                  @if (auth.puede('clubes', 'editar')) {
                    <button mat-icon-button (click)="editar(club)"><mat-icon class="!text-sm">edit</mat-icon></button>
                  }
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        } @empty {
          <mat-card class="bg-white rounded-xl border border-gray-200 col-span-full">
            <mat-card-content class="p-8 text-center text-gray-500">
              @if (!filtroTorneo) {
                <p>Selecciona un torneo para ver los clubes</p>
              } @else {
                <p>No hay clubes en este torneo</p>
              }
            </mat-card-content>
          </mat-card>
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
}
