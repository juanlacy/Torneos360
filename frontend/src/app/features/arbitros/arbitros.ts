import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';
import { ViewPreferenceService, ViewMode } from '../../core/services/view-preference.service';
import { DniScannerComponent, DniData } from '../../shared/dni-scanner/dni-scanner.component';
import { PersonasService, Persona } from '../../core/services/personas.service';
import { PersonaExistenteBannerComponent } from '../../shared/persona-existente-banner/persona-existente-banner.component';
import { BrandingService } from '../../core/services/branding.service';
import { DocumentosUploadComponent } from '../../shared/documentos-upload/documentos-upload.component';

@Component({
  selector: 'app-arbitros',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, DniScannerComponent, PersonaExistenteBannerComponent, DocumentosUploadComponent],
  template: `
    <div class="space-y-5 animate-fade-in">

      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Arbitros</h1>
          <p class="text-sm text-gray-500 mt-0.5">{{ arbitrosFiltrados.length }} arbitros registrados</p>
        </div>
        <div class="flex gap-2 items-center flex-wrap">
          <div class="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
            <button (click)="setView('cards')"
              [class]="viewMode === 'cards' ? 'bg-teal-600 text-white' : 'text-gray-500 hover:text-gray-700'"
              class="p-1.5 rounded transition-colors"
              title="Vista tarjetas">
              <mat-icon class="!text-lg !w-5 !h-5">grid_view</mat-icon>
            </button>
            <button (click)="setView('list')"
              [class]="viewMode === 'list' ? 'bg-teal-600 text-white' : 'text-gray-500 hover:text-gray-700'"
              class="p-1.5 rounded transition-colors"
              title="Vista lista">
              <mat-icon class="!text-lg !w-5 !h-5">view_list</mat-icon>
            </button>
          </div>

          @if (auth.puede('arbitros', 'crear') || auth.isAdmin()) {
            <button mat-flat-button (click)="mostrarForm = !mostrarForm" class="!rounded-lg !bg-teal-600 !text-white">
              <mat-icon>person_add</mat-icon> Nuevo Arbitro
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

      <!-- Drawer lateral -->
      @if (mostrarForm) {
        <div class="edit-drawer-overlay" (click)="cancelarForm()"></div>
        <div class="edit-drawer">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
            <h3 class="text-base font-semibold text-gray-900">{{ editando ? 'Editar' : 'Nuevo' }} Arbitro</h3>
            <div class="flex items-center gap-2">
              @if (!editando) {
                <button class="action-btn" (click)="abrirScannerDni()" title="Escanear DNI">
                  <mat-icon>qr_code_scanner</mat-icon>
                </button>
              }
              <button class="action-btn" (click)="cancelarForm()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto p-5 space-y-4">
            @if (personaExistente) {
              <app-persona-existente-banner [persona]="personaExistente"></app-persona-existente-banner>
            }
            <div class="grid grid-cols-2 gap-3">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Nombre</mat-label>
                <input matInput [(ngModel)]="form.nombre" required>
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Apellido</mat-label>
                <input matInput [(ngModel)]="form.apellido" required>
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>DNI</mat-label>
                <input matInput [(ngModel)]="form.dni" (blur)="verificarDniExistente()" required>
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Fecha de nacimiento</mat-label>
                <input matInput type="date" [(ngModel)]="form.fecha_nacimiento">
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Telefono</mat-label>
                <input matInput [(ngModel)]="form.telefono">
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Email</mat-label>
                <input matInput type="email" [(ngModel)]="form.email">
              </mat-form-field>
            </div>
            <!-- Documentos -->
            @if (editando?.persona_id) {
              <div class="pt-4 border-t border-gray-200">
                <app-documentos-upload entidadTipo="personas" [entidadId]="editando.persona_id"></app-documentos-upload>
              </div>
            }
          </div>
          <div class="flex gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
            <button mat-flat-button color="primary" (click)="guardar()" class="flex-1">{{ editando ? 'Actualizar' : 'Crear' }}</button>
            <button mat-stroked-button (click)="cancelarForm()">Cancelar</button>
          </div>
        </div>
      }

      <!-- Vista TARJETAS -->
      @if (viewMode === 'cards') {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
          @for (a of arbitrosFiltrados; track a.id) {
            <div class="bg-white rounded-xl border border-gray-200 hover:shadow-xl hover:-translate-y-1 hover:border-teal-300 transition-all duration-200 overflow-hidden">
              <div class="h-14 relative bg-gradient-to-br from-teal-500 to-emerald-600">
                <div class="absolute top-2 left-2">
                  <div class="w-10 h-10 rounded-lg flex items-center justify-center bg-white/90 text-teal-700">
                    <mat-icon>sports</mat-icon>
                  </div>
                </div>
                <span class="absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur bg-white/90"
                  [class]="a.activo ? 'text-teal-700' : 'text-gray-500'">
                  {{ a.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </div>

              <div class="relative px-3 pb-3">
                <div class="relative -mt-7 inline-block">
                  @if (a.foto_url) {
                    <img [src]="resolveUrl(a.foto_url)" class="w-14 h-14 rounded-full object-cover border-4 border-white shadow-lg" alt="Foto">
                  } @else {
                    <div class="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-4 border-white shadow-lg text-white bg-gradient-to-br from-teal-500 to-emerald-600">
                      {{ (a.nombre?.charAt(0) || '') + (a.apellido?.charAt(0) || '') }}
                    </div>
                  }
                </div>

                <div class="mt-2">
                  <h3 class="font-bold text-gray-900 leading-tight">{{ a.apellido }}</h3>
                  <p class="text-sm text-gray-500">{{ a.nombre }}</p>
                </div>

                <div class="mt-3 space-y-1.5 pt-3 border-t border-gray-100">
                  <div class="flex items-center gap-2 text-xs text-gray-600">
                    <mat-icon class="!text-sm !w-4 !h-4 text-gray-400">badge</mat-icon>
                    <span class="font-medium">{{ a.dni }}</span>
                  </div>
                  @if (a.telefono) {
                    <div class="flex items-center gap-2 text-xs text-gray-600">
                      <mat-icon class="!text-sm !w-4 !h-4 text-gray-400">phone</mat-icon>
                      <span>{{ a.telefono }}</span>
                    </div>
                  }
                  @if (a.email) {
                    <div class="flex items-center gap-2 text-xs text-gray-600 truncate">
                      <mat-icon class="!text-sm !w-4 !h-4 text-gray-400">mail</mat-icon>
                      <span class="truncate">{{ a.email }}</span>
                    </div>
                  }
                </div>

                @if (auth.puede('arbitros', 'editar') || auth.isAdmin()) {
                  <div class="mt-3 flex gap-1">
                    <button class="action-btn action-edit" (click)="editar(a)" title="Editar">
                      <mat-icon>edit</mat-icon>
                    </button>
                    @if (auth.isAdmin()) {
                      <button class="action-btn action-reject" (click)="eliminar(a)" title="Eliminar">
                        <mat-icon>delete</mat-icon>
                      </button>
                    }
                  </div>
                }
              </div>
            </div>
          } @empty {
            <div class="bg-white rounded-xl border border-gray-200 col-span-full py-12 text-center">
              <mat-icon class="!text-5xl text-gray-300 mb-3">sports</mat-icon>
              <p class="text-sm text-gray-500">No se encontraron arbitros</p>
            </div>
          }
        </div>
      }

      <!-- Vista LISTA -->
      @if (viewMode === 'list') {
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          @if (arbitrosFiltrados.length) {
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Arbitro</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">DNI</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Contacto</th>
                    <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide w-20">Acc.</th>
                  </tr>
                </thead>
                <tbody>
                  @for (a of arbitrosFiltrados; track a.id) {
                    <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td class="px-3 py-2">
                        <div class="flex items-center gap-2">
                          @if (a.foto_url) {
                            <img [src]="resolveUrl(a.foto_url)" class="w-7 h-7 rounded-full object-cover shrink-0" alt="Foto">
                          } @else {
                            <div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-white bg-gradient-to-br from-teal-500 to-emerald-600">
                              {{ (a.nombre?.charAt(0) || '') + (a.apellido?.charAt(0) || '') }}
                            </div>
                          }
                          <div class="min-w-0">
                            <p class="font-medium text-gray-900 text-xs truncate">{{ a.apellido }}, {{ a.nombre }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="px-3 py-2 text-xs text-gray-600 hidden sm:table-cell">{{ a.dni }}</td>
                      <td class="px-3 py-2 hidden md:table-cell">
                        <div class="space-y-0.5">
                          @if (a.telefono) {
                            <div class="flex items-center gap-1.5 text-xs text-gray-600">
                              <mat-icon class="!text-xs !w-3 !h-3 text-gray-400">phone</mat-icon>
                              {{ a.telefono }}
                            </div>
                          }
                          @if (a.email) {
                            <div class="flex items-center gap-1.5 text-xs text-gray-600 truncate max-w-[180px]">
                              <mat-icon class="!text-xs !w-3 !h-3 text-gray-400">mail</mat-icon>
                              <span class="truncate">{{ a.email }}</span>
                            </div>
                          }
                        </div>
                      </td>
                      <td class="px-3 py-2 text-center">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          [class]="a.activo ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-500'">
                          {{ a.activo ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td class="px-3 py-2 text-right">
                        <div class="flex gap-1 justify-end">
                          <button class="action-btn action-edit" (click)="editar(a)" title="Editar">
                            <mat-icon>edit</mat-icon>
                          </button>
                          @if (auth.isAdmin()) {
                            <button class="action-btn action-reject" (click)="eliminar(a)" title="Eliminar">
                              <mat-icon>delete</mat-icon>
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="py-12 text-center">
              <mat-icon class="!text-5xl text-gray-300 mb-3">sports</mat-icon>
              <p class="text-sm text-gray-500">No se encontraron arbitros</p>
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
export class ArbitrosComponent implements OnInit, OnDestroy {
  arbitros: any[] = [];
  arbitrosFiltrados: any[] = [];
  torneoId: number | null = null;
  torneoActivoId: number | null = null;
  viewMode: ViewMode = 'cards';
  filtros: any = { search: '', activo: '' };
  mostrarForm = false;
  mostrarScanner = false;
  editando: any = null;
  form: any = { nombre: '', apellido: '', dni: '', fecha_nacimiento: '', telefono: '', email: '' };
  personaExistente: Persona | null = null;
  private viewSub?: Subscription;
  private torneoSub?: Subscription;

  constructor(
    private http: HttpClient,
    public auth: AuthService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private viewPref: ViewPreferenceService,
    private personasService: PersonasService,
    public branding: BrandingService,
  ) {}

  ngOnInit() {
    this.viewSub = this.viewPref.get('arbitros', 'cards').subscribe(mode => {
      this.viewMode = mode;
      this.cdr.detectChanges();
    });

    this.torneoSub = this.branding.torneoActivoId$.subscribe(id => {
      this.torneoActivoId = id;
      this.torneoId = id;
      if (id) this.cargar();
    });
  }

  ngOnDestroy() {
    this.viewSub?.unsubscribe();
    this.torneoSub?.unsubscribe();
  }

  setView(mode: ViewMode) {
    this.viewPref.set('arbitros', mode);
  }

  cargar() {
    if (!this.torneoActivoId) return;
    this.http.get<any>(`${environment.apiUrl}/arbitros`, { params: { torneo_id: this.torneoActivoId } }).subscribe({
      next: res => { this.arbitros = res.data; this.filtrar(); this.cdr.detectChanges(); },
      error: () => this.toastr.error('Error al cargar arbitros'),
    });
  }

  filtrar() {
    const search = (this.filtros.search || '').toLowerCase().trim();
    const activo = this.filtros.activo;
    this.arbitrosFiltrados = this.arbitros.filter(a => {
      if (search) {
        const txt = `${a.nombre || ''} ${a.apellido || ''} ${a.dni || ''}`.toLowerCase();
        if (!txt.includes(search)) return false;
      }
      if (activo !== '' && activo !== null && activo !== undefined) {
        if (!!a.activo !== activo) return false;
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
      ? this.http.put(`${environment.apiUrl}/arbitros/${this.editando.id}`, data)
      : this.http.post(`${environment.apiUrl}/arbitros`, data);
    obs.subscribe({
      next: (res: any) => {
        const msg = this.editando
          ? 'Arbitro actualizado'
          : (res?.persona_creada === false
              ? 'Rol de arbitro agregado a persona existente'
              : 'Arbitro creado');
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

  editar(a: any) {
    this.editando = a;
    this.form = {
      nombre: a.nombre,
      apellido: a.apellido,
      dni: a.dni,
      fecha_nacimiento: a.fecha_nacimiento || '',
      telefono: a.telefono || '',
      email: a.email || '',
    };
    this.mostrarForm = true;
  }

  eliminar(a: any) {
    if (!confirm(`Eliminar a ${a.apellido}, ${a.nombre}?`)) return;
    this.http.delete(`${environment.apiUrl}/arbitros/${a.id}`).subscribe({
      next: () => { this.toastr.success('Arbitro eliminado'); this.cargar(); this.cdr.detectChanges(); },
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
