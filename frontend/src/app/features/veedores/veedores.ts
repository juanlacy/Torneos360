import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';
import { ViewPreferenceService, ViewMode } from '../../core/services/view-preference.service';
import { DniScannerComponent, DniData } from '../../shared/dni-scanner/dni-scanner.component';
import { PersonasService, Persona } from '../../core/services/personas.service';
import { PersonaExistenteBannerComponent } from '../../shared/persona-existente-banner/persona-existente-banner.component';

@Component({
  selector: 'app-veedores',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatMenuModule, DniScannerComponent, PersonaExistenteBannerComponent],
  template: `
    <div class="space-y-5 animate-fade-in">

      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Veedores</h1>
          <p class="text-sm text-gray-500 mt-0.5">{{ veedoresFiltrados.length }} veedores registrados</p>
        </div>
        <div class="flex gap-2 items-center flex-wrap">
          <div class="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
            <button (click)="setView('cards')"
              [class]="viewMode === 'cards' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:text-gray-700'"
              class="p-1.5 rounded transition-colors"
              title="Vista tarjetas">
              <mat-icon class="!text-lg !w-5 !h-5">grid_view</mat-icon>
            </button>
            <button (click)="setView('list')"
              [class]="viewMode === 'list' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:text-gray-700'"
              class="p-1.5 rounded transition-colors"
              title="Vista lista">
              <mat-icon class="!text-lg !w-5 !h-5">view_list</mat-icon>
            </button>
          </div>

          @if (auth.puede('veedores', 'crear') || auth.isAdmin()) {
            <button mat-flat-button (click)="mostrarForm = !mostrarForm" class="!rounded-lg !bg-amber-500 !text-white">
              <mat-icon>person_add</mat-icon> Nuevo Veedor
            </button>
          }
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex flex-wrap gap-3 items-center">
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="flex-1 min-w-[180px]">
            <mat-label>Buscar</mat-label>
            <input matInput [(ngModel)]="filtros.search" (ngModelChange)="filtrar()" placeholder="Nombre, apellido o DNI">
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="min-w-[140px]">
            <mat-label>Estado</mat-label>
            <mat-select [(ngModel)]="filtros.activo" (selectionChange)="filtrar()">
              <mat-option [value]="''">Todos</mat-option>
              <mat-option [value]="true">Activos</mat-option>
              <mat-option [value]="false">Inactivos</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <!-- Formulario -->
      @if (mostrarForm) {
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="h-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"></div>
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900">{{ editando ? 'Editar' : 'Nuevo' }} Veedor</h3>
              @if (!editando) {
                <button mat-stroked-button (click)="abrirScannerDni()" type="button" class="!rounded-lg !text-amber-600 !border-amber-500">
                  <mat-icon>qr_code_scanner</mat-icon> Escanear DNI
                </button>
              }
            </div>
            @if (personaExistente) {
              <app-persona-existente-banner [persona]="personaExistente"></app-persona-existente-banner>
            }
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
                <input matInput [(ngModel)]="form.dni" (blur)="verificarDniExistente()" required>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fecha de nacimiento</mat-label>
                <input matInput type="date" [(ngModel)]="form.fecha_nacimiento">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Telefono</mat-label>
                <input matInput [(ngModel)]="form.telefono">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput type="email" [(ngModel)]="form.email">
              </mat-form-field>
            </div>
            <div class="flex gap-2 mt-4">
              <button mat-flat-button (click)="guardar()" class="!bg-amber-500 !text-white">{{ editando ? 'Actualizar' : 'Crear' }}</button>
              <button mat-stroked-button (click)="cancelarForm()">Cancelar</button>
            </div>
          </div>
        </div>
      }

      <!-- Vista TARJETAS -->
      @if (viewMode === 'cards') {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
          @for (v of veedoresFiltrados; track v.id) {
            <div class="bg-white rounded-xl border border-gray-200 hover:shadow-xl hover:-translate-y-1 hover:border-amber-300 transition-all duration-200 overflow-hidden">
              <div class="h-20 relative bg-gradient-to-br from-amber-400 to-yellow-500">
                <div class="absolute top-2 left-2">
                  <div class="w-10 h-10 rounded-lg flex items-center justify-center bg-white/90 text-amber-700">
                    <mat-icon>visibility</mat-icon>
                  </div>
                </div>
                <span class="absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur bg-white/90"
                  [class]="v.activo ? 'text-amber-700' : 'text-gray-500'">
                  {{ v.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </div>

              <div class="relative px-4 pb-4">
                <div class="relative -mt-10 inline-block">
                  @if (v.foto_url) {
                    <img [src]="resolveUrl(v.foto_url)" class="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg" alt="Foto">
                  } @else {
                    <div class="w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold border-4 border-white shadow-lg text-white bg-gradient-to-br from-amber-400 to-yellow-500">
                      {{ (v.nombre?.charAt(0) || '') + (v.apellido?.charAt(0) || '') }}
                    </div>
                  }
                </div>

                <div class="mt-2">
                  <h3 class="font-bold text-gray-900 leading-tight">{{ v.apellido }}</h3>
                  <p class="text-sm text-gray-500">{{ v.nombre }}</p>
                </div>

                <div class="mt-3 space-y-1.5 pt-3 border-t border-gray-100">
                  <div class="flex items-center gap-2 text-xs text-gray-600">
                    <mat-icon class="!text-sm !w-4 !h-4 text-gray-400">badge</mat-icon>
                    <span class="font-medium">{{ v.dni }}</span>
                  </div>
                  @if (v.telefono) {
                    <div class="flex items-center gap-2 text-xs text-gray-600">
                      <mat-icon class="!text-sm !w-4 !h-4 text-gray-400">phone</mat-icon>
                      <span>{{ v.telefono }}</span>
                    </div>
                  }
                  @if (v.email) {
                    <div class="flex items-center gap-2 text-xs text-gray-600 truncate">
                      <mat-icon class="!text-sm !w-4 !h-4 text-gray-400">mail</mat-icon>
                      <span class="truncate">{{ v.email }}</span>
                    </div>
                  }
                </div>

                @if (auth.puede('veedores', 'editar') || auth.isAdmin()) {
                  <div class="mt-3 flex gap-2">
                    <button
                      class="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                      (click)="editar(v)">
                      <mat-icon class="!text-xs !w-3 !h-3">edit</mat-icon> Editar
                    </button>
                    @if (auth.isAdmin()) {
                      <button
                        class="flex items-center justify-center px-2 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                        (click)="eliminar(v)"
                        title="Eliminar">
                        <mat-icon class="!text-xs !w-3 !h-3">delete</mat-icon>
                      </button>
                    }
                  </div>
                }
              </div>
            </div>
          } @empty {
            <div class="bg-white rounded-xl border border-gray-200 col-span-full py-12 text-center">
              <mat-icon class="!text-5xl text-gray-300 mb-3">visibility</mat-icon>
              <p class="text-sm text-gray-500">No se encontraron veedores</p>
            </div>
          }
        </div>
      }

      <!-- Vista LISTA -->
      @if (viewMode === 'list') {
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          @if (veedoresFiltrados.length) {
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Veedor</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">DNI</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Contacto</th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide w-20">Acc.</th>
                  </tr>
                </thead>
                <tbody>
                  @for (v of veedoresFiltrados; track v.id) {
                    <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-3">
                          @if (v.foto_url) {
                            <img [src]="resolveUrl(v.foto_url)" class="w-9 h-9 rounded-full object-cover shrink-0" alt="Foto">
                          } @else {
                            <div class="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 text-white bg-gradient-to-br from-amber-400 to-yellow-500">
                              {{ (v.nombre?.charAt(0) || '') + (v.apellido?.charAt(0) || '') }}
                            </div>
                          }
                          <div class="min-w-0">
                            <p class="font-medium text-gray-900 text-sm truncate">{{ v.apellido }}, {{ v.nombre }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{{ v.dni }}</td>
                      <td class="px-4 py-3 hidden md:table-cell">
                        <div class="space-y-0.5">
                          @if (v.telefono) {
                            <div class="flex items-center gap-1.5 text-xs text-gray-600">
                              <mat-icon class="!text-xs !w-3 !h-3 text-gray-400">phone</mat-icon>
                              {{ v.telefono }}
                            </div>
                          }
                          @if (v.email) {
                            <div class="flex items-center gap-1.5 text-xs text-gray-600 truncate max-w-[180px]">
                              <mat-icon class="!text-xs !w-3 !h-3 text-gray-400">mail</mat-icon>
                              <span class="truncate">{{ v.email }}</span>
                            </div>
                          }
                        </div>
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          [class]="v.activo ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'">
                          {{ v.activo ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-right">
                        <button
                          class="w-8 h-8 rounded-lg inline-flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          [matMenuTriggerFor]="menuVee">
                          <mat-icon class="!text-lg">more_vert</mat-icon>
                        </button>
                        <mat-menu #menuVee="matMenu">
                          <button mat-menu-item (click)="editar(v)"><mat-icon>edit</mat-icon> Editar</button>
                          @if (auth.isAdmin()) {
                            <button mat-menu-item (click)="eliminar(v)"><mat-icon>delete</mat-icon> Eliminar</button>
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
              <mat-icon class="!text-5xl text-gray-300 mb-3">visibility</mat-icon>
              <p class="text-sm text-gray-500">No se encontraron veedores</p>
            </div>
          }
        </div>
      }

      <!-- Scanner DNI modal -->
      @if (mostrarScanner) {
        <app-dni-scanner (scanned)="onDniScanned($event)" (cancelled)="mostrarScanner = false"></app-dni-scanner>
      }
    </div>
  `,
})
export class VeedoresComponent implements OnInit, OnDestroy {
  veedores: any[] = [];
  veedoresFiltrados: any[] = [];
  torneoId: number | null = null;
  viewMode: ViewMode = 'cards';
  filtros: any = { search: '', activo: '' };
  mostrarForm = false;
  mostrarScanner = false;
  editando: any = null;
  form: any = { nombre: '', apellido: '', dni: '', fecha_nacimiento: '', telefono: '', email: '' };
  personaExistente: Persona | null = null;
  private viewSub?: Subscription;

  constructor(
    private http: HttpClient,
    public auth: AuthService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private viewPref: ViewPreferenceService,
    private personasService: PersonasService,
  ) {}

  ngOnInit() {
    this.viewSub = this.viewPref.get('veedores', 'cards').subscribe(mode => {
      this.viewMode = mode;
      this.cdr.detectChanges();
    });

    this.http.get<any>(`${environment.apiUrl}/torneos`).subscribe({
      next: res => {
        if (res.data.length) {
          this.torneoId = res.data[0].id;
          this.cargar();
        }
        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy() {
    this.viewSub?.unsubscribe();
  }

  setView(mode: ViewMode) {
    this.viewPref.set('veedores', mode);
  }

  cargar() {
    if (!this.torneoId) return;
    this.http.get<any>(`${environment.apiUrl}/veedores`, { params: { torneo_id: this.torneoId } }).subscribe({
      next: res => { this.veedores = res.data; this.filtrar(); this.cdr.detectChanges(); },
      error: () => this.toastr.error('Error al cargar veedores'),
    });
  }

  filtrar() {
    const search = (this.filtros.search || '').toLowerCase().trim();
    const activo = this.filtros.activo;
    this.veedoresFiltrados = this.veedores.filter(v => {
      if (search) {
        const txt = `${v.nombre || ''} ${v.apellido || ''} ${v.dni || ''}`.toLowerCase();
        if (!txt.includes(search)) return false;
      }
      if (activo !== '' && activo !== null && activo !== undefined) {
        if (!!v.activo !== activo) return false;
      }
      return true;
    });
    this.cdr.detectChanges();
  }

  guardar() {
    if (!this.form.nombre || !this.form.apellido || !this.form.dni) {
      this.toastr.warning('Completa todos los campos requeridos'); return;
    }
    const data = { ...this.form, torneo_id: this.torneoId };
    const obs = this.editando
      ? this.http.put(`${environment.apiUrl}/veedores/${this.editando.id}`, data)
      : this.http.post(`${environment.apiUrl}/veedores`, data);
    obs.subscribe({
      next: (res: any) => {
        const msg = this.editando
          ? 'Veedor actualizado'
          : (res?.persona_creada === false
              ? 'Rol de veedor agregado a persona existente'
              : 'Veedor creado');
        this.toastr.success(msg);
        this.cancelarForm();
        this.cargar();
        this.cdr.detectChanges();
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  verificarDniExistente() {
    if (this.editando) return;
    const dni = (this.form.dni || '').replace(/[\s.\-]/g, '').trim();
    if (!dni || dni.length < 7) { this.personaExistente = null; return; }
    this.personasService.buscarPorDni(dni).subscribe({
      next: (res) => {
        this.personaExistente = res.data;
        if (res.data && !this.form.nombre) this.form.nombre = res.data.nombre;
        if (res.data && !this.form.apellido) this.form.apellido = res.data.apellido;
        if (res.data && !this.form.fecha_nacimiento && res.data.fecha_nacimiento) {
          this.form.fecha_nacimiento = res.data.fecha_nacimiento;
        }
        this.cdr.detectChanges();
      },
      error: () => { this.personaExistente = null; },
    });
  }

  editar(v: any) {
    this.editando = v;
    this.form = {
      nombre: v.nombre,
      apellido: v.apellido,
      dni: v.dni,
      fecha_nacimiento: v.fecha_nacimiento || '',
      telefono: v.telefono || '',
      email: v.email || '',
    };
    this.mostrarForm = true;
  }

  eliminar(v: any) {
    if (!confirm(`Eliminar a ${v.apellido}, ${v.nombre}?`)) return;
    this.http.delete(`${environment.apiUrl}/veedores/${v.id}`).subscribe({
      next: () => { this.toastr.success('Veedor eliminado'); this.cargar(); this.cdr.detectChanges(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  cancelarForm() {
    this.editando = null;
    this.form = { nombre: '', apellido: '', dni: '', fecha_nacimiento: '', telefono: '', email: '' };
    this.personaExistente = null;
    this.mostrarForm = false;
  }

  abrirScannerDni() {
    this.mostrarScanner = true;
    this.cdr.detectChanges();
  }

  onDniScanned(data: DniData) {
    if (data.nombre) this.form.nombre = this.capitalizar(data.nombre);
    if (data.apellido) this.form.apellido = this.capitalizar(data.apellido);
    if (data.dni) this.form.dni = data.dni;
    if (data.fecha_nacimiento) this.form.fecha_nacimiento = data.fecha_nacimiento;
    this.mostrarScanner = false;
    this.toastr.success('DNI escaneado correctamente');
    this.cdr.detectChanges();
    this.verificarDniExistente();
  }

  private capitalizar(texto: string): string {
    return texto.toLowerCase().split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }

  resolveUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return url;
    return `${environment.apiUrl}${url}`;
  }
}
