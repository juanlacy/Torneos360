import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-instituciones',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <div class="space-y-5 animate-fade-in">

      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Instituciones</h1>
          <p class="text-sm text-gray-500 mt-0.5">{{ institucionesFiltradas.length }} instituciones registradas</p>
        </div>
        <div class="flex gap-2 items-center flex-wrap">
          @if (auth.puede('clubes', 'crear')) {
            <button mat-flat-button color="primary" (click)="nuevaInstitucion()" class="!rounded-lg">
              <mat-icon>add</mat-icon> Nueva Institucion
            </button>
          }
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex flex-wrap gap-3 items-center">
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="flex-1 min-w-[200px]">
            <mat-label>Buscar</mat-label>
            <input matInput [(ngModel)]="filtros.search" (ngModelChange)="filtrar()" placeholder="Nombre o nombre corto">
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="min-w-[160px]">
            <mat-label>Estado</mat-label>
            <mat-select [(ngModel)]="filtros.activo" (selectionChange)="filtrar()">
              <mat-option [value]="'todos'">Todos</mat-option>
              <mat-option [value]="'activo'">Activos</mat-option>
              <mat-option [value]="'inactivo'">Inactivos</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <!-- Formulario -->
      @if (mostrarForm) {
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="h-1 rounded-full bg-gradient-to-r from-[var(--color-primario)] to-[var(--color-acento)]"></div>
          <div class="p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ editando ? 'Editar' : 'Nueva' }} Institucion</h3>

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
                <mat-label>CUIT</mat-label>
                <input matInput [(ngModel)]="form.cuit" placeholder="XX-XXXXXXXX-X">
              </mat-form-field>

              <mat-form-field appearance="outline" class="md:col-span-2">
                <mat-label>Escudo (URL)</mat-label>
                <input matInput [(ngModel)]="form.escudo_url" placeholder="https://...">
                <mat-icon matSuffix>image</mat-icon>
              </mat-form-field>
              <div class="flex items-center gap-3">
                @if (form.escudo_url) {
                  <img [src]="getEscudoUrl(form.escudo_url)" class="w-14 h-14 rounded-lg object-cover border border-gray-200" alt="Preview" (error)="onEscudoError($event)">
                } @else {
                  <div class="w-14 h-14 rounded-lg flex items-center justify-center text-xs font-bold border border-gray-200"
                    [style.background-color]="form.color_primario || '#762c7e'"
                    [style.color]="form.color_secundario || '#fff'">
                    {{ (form.nombre_corto || form.nombre || '??').substring(0, 2).toUpperCase() }}
                  </div>
                }
                @if (editando) {
                  <button mat-stroked-button (click)="escudoFileInput.click()" class="!rounded-lg">
                    <mat-icon>upload</mat-icon> Subir
                  </button>
                  <input #escudoFileInput type="file" accept="image/*" class="hidden" (change)="onEscudoUpload($event)">
                }
              </div>

              <mat-form-field appearance="outline">
                <mat-label>Color primario</mat-label>
                <input matInput type="color" [(ngModel)]="form.color_primario">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Color secundario</mat-label>
                <input matInput type="color" [(ngModel)]="form.color_secundario">
              </mat-form-field>
              <div class="flex items-center gap-3 px-3">
                <div class="w-full h-10 rounded-lg border border-gray-200 flex items-center justify-center text-white text-sm font-semibold"
                  [style.background]="'linear-gradient(135deg, ' + (form.color_primario || '#762c7e') + ' 0%, ' + (form.color_secundario || '#4f2f7d') + ' 100%)'">
                  Vista previa
                </div>
              </div>

              <mat-form-field appearance="outline">
                <mat-label>Telefono</mat-label>
                <input matInput [(ngModel)]="form.telefono">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput type="email" [(ngModel)]="form.email">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Web</mat-label>
                <input matInput [(ngModel)]="form.web">
              </mat-form-field>

              <mat-form-field appearance="outline" class="md:col-span-2">
                <mat-label>Direccion</mat-label>
                <input matInput [(ngModel)]="form.direccion">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Referente</mat-label>
                <input matInput [(ngModel)]="form.referente">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Fundacion</mat-label>
                <input matInput type="date" [(ngModel)]="form.fundacion">
              </mat-form-field>
              <mat-form-field appearance="outline" class="md:col-span-2">
                <mat-label>Observaciones</mat-label>
                <textarea matInput rows="2" [(ngModel)]="form.observaciones"></textarea>
              </mat-form-field>
            </div>

            <div class="flex gap-2 mt-4">
              <button mat-flat-button color="primary" (click)="guardar()">{{ editando ? 'Actualizar' : 'Crear' }}</button>
              <button mat-stroked-button (click)="cancelar()">Cancelar</button>
            </div>
          </div>
        </div>
      }

      <!-- Grid de cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
        @for (inst of institucionesFiltradas; track inst.id) {
          <div class="bg-white rounded-xl border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all duration-200 overflow-hidden group">
            <!-- Header con gradiente -->
            <div class="h-20 relative"
              [style.background]="'linear-gradient(135deg, ' + (inst.color_primario || '#762c7e') + ' 0%, ' + (inst.color_secundario || '#4f2f7d') + ' 100%)'">
              @if (!inst.activo) {
                <span class="absolute top-3 right-3 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                  Inactivo
                </span>
              }
              <span class="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/90 text-gray-700 backdrop-blur">
                <mat-icon class="!text-xs !w-3 !h-3">emoji_events</mat-icon>
                {{ inst.participaciones?.length || 0 }} torneos
              </span>
            </div>

            <!-- Escudo flotante -->
            <div class="relative px-5 pb-5">
              <div class="relative -mt-10 shrink-0 inline-block">
                @if (inst.escudo_url) {
                  <img [src]="getEscudoUrl(inst.escudo_url)" class="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md" alt="Escudo">
                } @else {
                  <div class="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold border-4 border-white shadow-md"
                    [style.background-color]="inst.color_primario || '#762c7e'"
                    [style.color]="inst.color_secundario || '#fff'">
                    {{ (inst.nombre_corto || inst.nombre).substring(0, 2).toUpperCase() }}
                  </div>
                }
              </div>

              <div class="mt-3">
                <h3 class="font-bold text-gray-900 text-lg leading-tight">{{ inst.nombre }}</h3>
                @if (inst.nombre_corto) {
                  <p class="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">{{ inst.nombre_corto }}</p>
                }
              </div>

              <!-- Info -->
              <div class="mt-4 space-y-1.5">
                @if (inst.cuit) {
                  <div class="flex items-center gap-2 text-xs text-gray-600">
                    <mat-icon class="!text-sm !w-4 !h-4 text-gray-400">badge</mat-icon>
                    <span>CUIT {{ inst.cuit }}</span>
                  </div>
                }
                @if (inst.contacto?.telefono) {
                  <div class="flex items-center gap-2 text-xs text-gray-600">
                    <mat-icon class="!text-sm !w-4 !h-4 text-gray-400">phone</mat-icon>
                    <span>{{ inst.contacto.telefono }}</span>
                  </div>
                }
                @if (inst.contacto?.email) {
                  <div class="flex items-center gap-2 text-xs text-gray-600 truncate">
                    <mat-icon class="!text-sm !w-4 !h-4 text-gray-400">mail</mat-icon>
                    <span class="truncate">{{ inst.contacto.email }}</span>
                  </div>
                }
                @if (inst.contacto?.web) {
                  <div class="flex items-center gap-2 text-xs text-gray-600 truncate">
                    <mat-icon class="!text-sm !w-4 !h-4 text-gray-400">language</mat-icon>
                    <span class="truncate">{{ inst.contacto.web }}</span>
                  </div>
                }
              </div>

              <!-- Participaciones toggle -->
              @if (inst.participaciones?.length) {
                <div class="mt-3">
                  <button
                    class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                    (click)="toggleDetalle(inst)">
                    <span class="flex items-center gap-1.5">
                      <mat-icon class="!text-sm !w-4 !h-4">emoji_events</mat-icon>
                      Ver {{ inst.participaciones.length }} participaciones
                    </span>
                    <mat-icon class="!text-sm !w-4 !h-4">{{ inst._expanded ? 'expand_less' : 'expand_more' }}</mat-icon>
                  </button>
                  @if (inst._expanded) {
                    <div class="mt-2 p-3 bg-gray-50 rounded-lg space-y-1.5 max-h-40 overflow-y-auto">
                      @for (p of inst.participaciones; track p.id) {
                        <div class="flex items-center justify-between gap-2 text-xs">
                          <span class="text-gray-700 truncate">{{ p.torneo?.nombre || 'Torneo #' + p.torneo_id }}</span>
                          @if (p.torneo?.anio) {
                            <span class="text-gray-400 shrink-0">{{ p.torneo.anio }}</span>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }

              <!-- Acciones -->
              <div class="mt-4 flex gap-2">
                @if (auth.puede('clubes', 'editar')) {
                  <button
                    class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                    (click)="editar(inst)">
                    <mat-icon class="!text-sm !w-4 !h-4">edit</mat-icon> Editar
                  </button>
                }
                @if (auth.puede('clubes', 'eliminar')) {
                  <button
                    class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                    (click)="eliminar(inst)">
                    <mat-icon class="!text-sm !w-4 !h-4">delete</mat-icon>
                  </button>
                }
              </div>
            </div>
          </div>
        } @empty {
          <div class="bg-white rounded-xl border border-gray-200 col-span-full py-12 text-center">
            <mat-icon class="!text-5xl text-gray-300 mb-3">domain</mat-icon>
            <p class="text-sm text-gray-500">No se encontraron instituciones</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class InstitucionesComponent implements OnInit {
  instituciones: any[] = [];
  institucionesFiltradas: any[] = [];
  filtros: any = { search: '', activo: 'activo' };
  mostrarForm = false;
  editando: any = null;
  form: any = this.formVacio();

  constructor(
    private http: HttpClient,
    public auth: AuthService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargar();
  }

  formVacio() {
    return {
      nombre: '',
      nombre_corto: '',
      cuit: '',
      escudo_url: '',
      color_primario: '#762c7e',
      color_secundario: '#ffffff',
      telefono: '',
      email: '',
      web: '',
      direccion: '',
      referente: '',
      fundacion: '',
      observaciones: '',
      activo: true,
    };
  }

  cargar() {
    this.http.get<any>(`${environment.apiUrl}/instituciones`, { params: { con_participaciones: 'true' } }).subscribe({
      next: res => {
        this.instituciones = res.data || [];
        this.filtrar();
        this.cdr.detectChanges();
      },
      error: () => this.toastr.error('Error al cargar instituciones'),
    });
  }

  filtrar() {
    const search = (this.filtros.search || '').toLowerCase().trim();
    const activo = this.filtros.activo;
    this.institucionesFiltradas = this.instituciones.filter(i => {
      if (search && !(i.nombre?.toLowerCase().includes(search) || i.nombre_corto?.toLowerCase().includes(search))) return false;
      if (activo === 'activo' && !i.activo) return false;
      if (activo === 'inactivo' && i.activo) return false;
      return true;
    });
    this.cdr.detectChanges();
  }

  nuevaInstitucion() {
    this.cancelar();
    this.mostrarForm = true;
  }

  guardar() {
    if (!this.form.nombre) { this.toastr.warning('Nombre requerido'); return; }
    const data = {
      nombre: this.form.nombre,
      nombre_corto: this.form.nombre_corto || null,
      cuit: this.form.cuit || null,
      escudo_url: this.form.escudo_url || null,
      color_primario: this.form.color_primario || null,
      color_secundario: this.form.color_secundario || null,
      direccion: this.form.direccion || null,
      fundacion: this.form.fundacion || null,
      observaciones: this.form.observaciones || null,
      activo: this.form.activo,
      contacto: {
        telefono: this.form.telefono || null,
        email: this.form.email || null,
        web: this.form.web || null,
        referente: this.form.referente || null,
      },
    };
    const obs = this.editando
      ? this.http.put(`${environment.apiUrl}/instituciones/${this.editando.id}`, data)
      : this.http.post(`${environment.apiUrl}/instituciones`, data);
    obs.subscribe({
      next: () => {
        this.toastr.success(this.editando ? 'Institucion actualizada' : 'Institucion creada');
        this.cancelar();
        this.cargar();
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error al guardar'),
    });
  }

  editar(inst: any) {
    this.editando = inst;
    const contacto = inst.contacto || {};
    this.form = {
      nombre: inst.nombre || '',
      nombre_corto: inst.nombre_corto || '',
      cuit: inst.cuit || '',
      escudo_url: inst.escudo_url || '',
      color_primario: inst.color_primario || '#762c7e',
      color_secundario: inst.color_secundario || '#ffffff',
      telefono: contacto.telefono || '',
      email: contacto.email || '',
      web: contacto.web || '',
      direccion: inst.direccion || '',
      referente: contacto.referente || '',
      fundacion: inst.fundacion ? String(inst.fundacion).substring(0, 10) : '',
      observaciones: inst.observaciones || '',
      activo: inst.activo !== false,
    };
    this.mostrarForm = true;
    this.cdr.detectChanges();
  }

  eliminar(inst: any) {
    const tieneParticipaciones = (inst.participaciones?.length || 0) > 0;
    const msg = tieneParticipaciones
      ? `Esta institucion tiene ${inst.participaciones.length} participaciones en torneos. Eliminar igualmente?`
      : `Eliminar la institucion "${inst.nombre}"?`;
    if (!confirm(msg)) return;
    this.http.delete(`${environment.apiUrl}/instituciones/${inst.id}`).subscribe({
      next: () => {
        this.toastr.success('Institucion eliminada');
        this.cargar();
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error al eliminar'),
    });
  }

  cancelar() {
    this.editando = null;
    this.form = this.formVacio();
    this.mostrarForm = false;
  }

  toggleDetalle(inst: any) {
    inst._expanded = !inst._expanded;
    this.cdr.detectChanges();
  }

  getEscudoUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return url;
    return `${environment.apiUrl}${url}`;
  }

  onEscudoError(event: Event) {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  onEscudoUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.editando) return;
    const formData = new FormData();
    formData.append('escudo', input.files[0]);
    this.http.post<any>(`${environment.apiUrl}/instituciones/${this.editando.id}/escudo`, formData).subscribe({
      next: (res) => {
        this.toastr.success('Escudo actualizado');
        this.form.escudo_url = res.data?.escudo_url || res.escudo_url || this.form.escudo_url;
        this.cdr.detectChanges();
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error al subir escudo'),
    });
  }
}
