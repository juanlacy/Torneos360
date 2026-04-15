import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-roles-staff',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatMenuModule, MatSlideToggleModule],
  template: `
    <div class="space-y-5 animate-fade-in">

      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Roles de Staff</h1>
          <p class="text-sm text-gray-500 mt-0.5">{{ roles.length }} roles configurados</p>
        </div>
        <div class="flex gap-2 items-center flex-wrap">
          @if (auth.isAdmin()) {
            <button mat-flat-button color="primary" (click)="mostrarForm = !mostrarForm" class="!rounded-lg">
              <mat-icon>add</mat-icon> Nuevo Rol
            </button>
          }
        </div>
      </div>

      <!-- Formulario -->
      @if (mostrarForm) {
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="h-1 rounded-full bg-gradient-to-r from-[var(--color-primario)] to-[var(--color-acento)]"></div>
          <div class="p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ editando ? 'Editar' : 'Nuevo' }} Rol</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <mat-form-field appearance="outline">
                <mat-label>Nombre</mat-label>
                <input matInput [(ngModel)]="form.nombre" required>
              </mat-form-field>
              @if (editando) {
                <mat-form-field appearance="outline">
                  <mat-label>Codigo</mat-label>
                  <input matInput [ngModel]="form.codigo" readonly>
                </mat-form-field>
              }
              <mat-form-field appearance="outline" class="md:col-span-2">
                <mat-label>Descripcion</mat-label>
                <input matInput [(ngModel)]="form.descripcion">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Icono (material)</mat-label>
                <input matInput [(ngModel)]="form.icono" placeholder="sports_soccer">
                @if (form.icono) {
                  <mat-icon matSuffix>{{ form.icono }}</mat-icon>
                }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Color</mat-label>
                <input matInput type="color" [(ngModel)]="form.color">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Orden</mat-label>
                <input matInput type="number" [(ngModel)]="form.orden">
              </mat-form-field>
              <div class="flex items-center gap-3 md:col-span-3">
                <mat-slide-toggle [(ngModel)]="form.puede_firmar_alineacion" color="primary">
                  Puede firmar alineacion
                </mat-slide-toggle>
                <mat-slide-toggle [(ngModel)]="form.activo" color="primary">
                  Activo
                </mat-slide-toggle>
              </div>
            </div>
            <div class="flex gap-2 mt-4">
              <button mat-flat-button color="primary" (click)="guardar()">{{ editando ? 'Actualizar' : 'Crear' }}</button>
              <button mat-stroked-button (click)="cancelarForm()">Cancelar</button>
            </div>
          </div>
        </div>
      }

      <!-- Lista -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        @if (roles.length) {
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Rol</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Descripcion</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Codigo</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Firma</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Orden</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide w-20">Acc.</th>
                </tr>
              </thead>
              <tbody class="stagger-children">
                @for (r of roles; track r.id) {
                  <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          [style.background-color]="(r.color || '#762c7e') + '20'"
                          [style.color]="r.color || '#762c7e'">
                          <mat-icon class="!text-lg">{{ r.icono || 'badge' }}</mat-icon>
                        </div>
                        <div class="min-w-0">
                          <p class="font-medium text-gray-900 text-sm truncate">{{ r.nombre }}</p>
                          @if (r.es_sistema) {
                            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">Sistema</span>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                      <span class="truncate">{{ r.descripcion || '—' }}</span>
                    </td>
                    <td class="px-4 py-3">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-600">
                        {{ r.codigo }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      @if (r.puede_firmar_alineacion) {
                        <mat-icon class="text-green-600 !text-lg">check_circle</mat-icon>
                      } @else {
                        <mat-icon class="text-gray-300 !text-lg">cancel</mat-icon>
                      }
                    </td>
                    <td class="px-4 py-3 text-center text-sm text-gray-600 hidden sm:table-cell">{{ r.orden ?? 0 }}</td>
                    <td class="px-4 py-3 text-center">
                      @if (r.activo) {
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">Activo</span>
                      } @else {
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Inactivo</span>
                      }
                    </td>
                    <td class="px-4 py-3 text-right">
                      <button
                        class="w-8 h-8 rounded-lg inline-flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        [matMenuTriggerFor]="menuRol">
                        <mat-icon class="!text-lg">more_vert</mat-icon>
                      </button>
                      <mat-menu #menuRol="matMenu">
                        <button mat-menu-item (click)="editar(r)"><mat-icon>edit</mat-icon> Editar</button>
                        @if (!r.es_sistema) {
                          <button mat-menu-item (click)="eliminar(r)"><mat-icon>delete</mat-icon> Eliminar</button>
                        }
                      </mat-menu>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="py-12 text-center">
            <mat-icon class="!text-5xl text-gray-300 mb-3">badge</mat-icon>
            <p class="text-sm text-gray-500">No hay roles configurados</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class RolesStaffComponent implements OnInit {
  roles: any[] = [];
  mostrarForm = false;
  editando: any = null;
  form: any = { nombre: '', codigo: '', descripcion: '', icono: 'badge', color: '#762c7e', puede_firmar_alineacion: false, orden: 0, activo: true };

  constructor(
    private http: HttpClient,
    public auth: AuthService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.http.get<any>(`${environment.apiUrl}/roles-staff`).subscribe({
      next: res => { this.roles = res.data; this.cdr.detectChanges(); },
      error: () => this.toastr.error('Error al cargar roles'),
    });
  }

  guardar() {
    if (!this.form.nombre) { this.toastr.warning('Nombre requerido'); return; }
    const data: any = {
      nombre: this.form.nombre,
      descripcion: this.form.descripcion,
      icono: this.form.icono,
      color: this.form.color,
      puede_firmar_alineacion: this.form.puede_firmar_alineacion,
      orden: this.form.orden,
      activo: this.form.activo,
    };
    const obs = this.editando
      ? this.http.put(`${environment.apiUrl}/roles-staff/${this.editando.id}`, data)
      : this.http.post(`${environment.apiUrl}/roles-staff`, data);
    obs.subscribe({
      next: () => {
        this.toastr.success(this.editando ? 'Rol actualizado' : 'Rol creado');
        this.cancelarForm();
        this.cargar();
        this.cdr.detectChanges();
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  editar(r: any) {
    this.editando = r;
    this.form = {
      nombre: r.nombre,
      codigo: r.codigo,
      descripcion: r.descripcion || '',
      icono: r.icono || 'badge',
      color: r.color || '#762c7e',
      puede_firmar_alineacion: !!r.puede_firmar_alineacion,
      orden: r.orden ?? 0,
      activo: r.activo !== false,
    };
    this.mostrarForm = true;
  }

  eliminar(r: any) {
    if (r.es_sistema) { this.toastr.warning('No se puede eliminar un rol de sistema'); return; }
    if (!confirm(`Eliminar el rol "${r.nombre}"?`)) return;
    this.http.delete(`${environment.apiUrl}/roles-staff/${r.id}`).subscribe({
      next: () => { this.toastr.success('Rol eliminado'); this.cargar(); this.cdr.detectChanges(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  cancelarForm() {
    this.editando = null;
    this.form = { nombre: '', codigo: '', descripcion: '', icono: 'badge', color: '#762c7e', puede_firmar_alineacion: false, orden: 0, activo: true };
    this.mostrarForm = false;
  }
}
