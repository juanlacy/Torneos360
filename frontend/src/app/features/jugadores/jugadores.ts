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
import { DocumentosUploadComponent } from '../../shared/documentos-upload/documentos-upload.component';
import { BrandingService } from '../../core/services/branding.service';

@Component({
  selector: 'app-jugadores',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, DniScannerComponent, PersonaExistenteBannerComponent, DocumentosUploadComponent],
  template: `
    <div class="space-y-5 animate-fade-in">

      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Jugadores</h1>
          <p class="text-sm text-gray-500 mt-0.5">{{ jugadores.length }} jugadores registrados</p>
        </div>
        <div class="flex gap-2 items-center flex-wrap">
          <div class="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
            <button (click)="setView('cards')"
              [class]="viewMode === 'cards' ? 'bg-[var(--color-primario)] text-white' : 'text-gray-500 hover:text-gray-700'"
              class="p-1.5 rounded transition-colors"
              title="Vista tarjetas">
              <mat-icon class="!text-lg !w-5 !h-5">grid_view</mat-icon>
            </button>
            <button (click)="setView('list')"
              [class]="viewMode === 'list' ? 'bg-[var(--color-primario)] text-white' : 'text-gray-500 hover:text-gray-700'"
              class="p-1.5 rounded transition-colors"
              title="Vista lista">
              <mat-icon class="!text-lg !w-5 !h-5">view_list</mat-icon>
            </button>
          </div>

          @if (auth.puede('jugadores', 'crear')) {
            <button mat-flat-button color="primary" (click)="mostrarForm = !mostrarForm" class="!rounded-lg">
              <mat-icon>person_add</mat-icon> Nuevo Jugador
            </button>
          }
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex flex-wrap gap-3 items-center">
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="flex-1 min-w-[180px]">
            <mat-label>Buscar</mat-label>
            <input matInput [(ngModel)]="filtros.search" (keyup.enter)="cargar()" placeholder="Nombre, apellido o DNI">
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="min-w-[160px]">
            <mat-label>Club</mat-label>
            <mat-select [(ngModel)]="filtros.club_id" (selectionChange)="cargar()">
              <mat-option [value]="''">Todos</mat-option>
              @for (c of clubes; track c.id) {
                <mat-option [value]="c.id">{{ c.nombre_corto || c.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="min-w-[140px]">
            <mat-label>Categoria</mat-label>
            <mat-select [(ngModel)]="filtros.categoria_id" (selectionChange)="cargar()">
              <mat-option [value]="''">Todas</mat-option>
              @for (cat of categorias; track cat.id) {
                <mat-option [value]="cat.id">{{ cat.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="min-w-[140px]">
            <mat-label>Fichaje</mat-label>
            <mat-select [(ngModel)]="filtros.estado_fichaje" (selectionChange)="cargar()">
              <mat-option value="">Todos</mat-option>
              <mat-option value="pendiente">Pendiente</mat-option>
              <mat-option value="aprobado">Aprobado</mat-option>
              <mat-option value="rechazado">Rechazado</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <!-- Drawer lateral -->
      @if (mostrarForm) {
        <div class="edit-drawer-overlay" (click)="cancelarForm()"></div>
        <div class="edit-drawer">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
            <h3 class="text-base font-semibold text-gray-900">{{ editando ? 'Editar' : 'Nuevo' }} Jugador</h3>
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
            <!-- Banner persona existente -->
            @if (personaExistente) {
              <app-persona-existente-banner [persona]="personaExistente"></app-persona-existente-banner>
            }
            <!-- Campos del form -->
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
                <input matInput type="date" [(ngModel)]="form.fecha_nacimiento" required>
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Club</mat-label>
                <mat-select [(ngModel)]="form.club_id" required>
                  @for (c of clubes; track c.id) {
                    <mat-option [value]="c.id">{{ c.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Categoria</mat-label>
                <mat-select [(ngModel)]="form.categoria_id" required>
                  @for (cat of categorias; track cat.id) {
                    <mat-option [value]="cat.id">{{ cat.nombre }} ({{ cat.anio_nacimiento }})</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>N camiseta</mat-label>
                <input matInput type="number" [(ngModel)]="form.numero_camiseta">
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
          @for (j of jugadores; track j.id) {
            <div class="bg-white rounded-xl border border-gray-200 hover:shadow-xl hover:-translate-y-1 hover:border-gray-300 transition-all duration-200 overflow-hidden">
              <!-- Header con color del club -->
              <div class="h-14 relative"
                [style.background]="'linear-gradient(135deg, ' + (j.club?.color_primario || '#762c7e') + ' 0%, ' + (j.club?.color_secundario || '#4f2f7d') + ' 100%)'">
                <!-- Escudo del club arriba a la izquierda -->
                <div class="absolute top-2 left-2">
                  @if (j.club?.escudo_url) {
                    <img [src]="resolveUrl(j.club.escudo_url)" class="w-10 h-10 rounded-lg object-cover border-2 border-white shadow-md" alt="Club">
                  } @else {
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold border-2 border-white shadow-md"
                      [style.background-color]="j.club?.color_secundario || '#fff'"
                      [style.color]="j.club?.color_primario || '#762c7e'">
                      {{ (j.club?.nombre_corto || j.club?.nombre || '?').substring(0, 2).toUpperCase() }}
                    </div>
                  }
                </div>

                <!-- Badge fichaje -->
                <span class="absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur bg-white/90"
                  [class]="getFichajeTextClass(j.estado_fichaje)">
                  {{ j.estado_fichaje }}
                </span>

                <!-- Numero camiseta (abajo derecha) -->
                @if (j.numero_camiseta) {
                  <span class="absolute bottom-2 right-2 inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold bg-white/90 text-gray-800 shadow-md">
                    #{{ j.numero_camiseta }}
                  </span>
                }
              </div>

              <!-- Foto / avatar -->
              <div class="relative px-3 pb-3">
                <div class="relative -mt-7 inline-block">
                  @if (j.foto_url) {
                    <img [src]="resolveUrl(j.foto_url)" class="w-14 h-14 rounded-full object-cover border-4 border-white shadow-lg" alt="Foto">
                  } @else {
                    <div class="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-4 border-white shadow-lg text-white"
                      [style.background]="'linear-gradient(135deg, ' + (j.club?.color_primario || '#a78bfa') + ' 0%, ' + (j.club?.color_secundario || '#7c3aed') + ' 100%)'">
                      {{ (j.nombre?.charAt(0) || '') + (j.apellido?.charAt(0) || '') }}
                    </div>
                  }
                </div>

                <div class="mt-2">
                  <h3 class="font-bold text-gray-900 leading-tight">{{ j.apellido }}</h3>
                  <p class="text-sm text-gray-500">{{ j.nombre }}</p>
                </div>

                <!-- Info -->
                <div class="mt-3 space-y-1.5 pt-3 border-t border-gray-100">
                  <div class="flex items-center gap-2 text-xs text-gray-600">
                    <mat-icon class="!text-sm !w-4 !h-4 text-gray-400">badge</mat-icon>
                    <span class="font-medium">{{ j.dni }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-600">
                    <mat-icon class="!text-sm !w-4 !h-4 text-gray-400">shield</mat-icon>
                    <span class="truncate font-medium">{{ j.club?.nombre_corto || j.club?.nombre }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-600">
                    <mat-icon class="!text-sm !w-4 !h-4 text-gray-400">emoji_events</mat-icon>
                    <span>Categoria {{ j.categoria?.nombre }}</span>
                  </div>
                </div>

                <!-- Acciones -->
                @if (auth.puede('jugadores', 'editar') || auth.isAdmin()) {
                  <div class="mt-3 flex gap-1">
                    @if (auth.puede('jugadores', 'editar')) {
                      <button class="action-btn action-edit" (click)="editarJugador(j)" title="Editar">
                        <mat-icon>edit</mat-icon>
                      </button>
                    }
                    @if (auth.isAdmin() && j.estado_fichaje === 'pendiente') {
                      <button class="action-btn action-approve" (click)="cambiarFichaje(j, 'aprobado')" title="Aprobar">
                        <mat-icon>check_circle</mat-icon>
                      </button>
                      <button class="action-btn action-reject" (click)="cambiarFichaje(j, 'rechazado')" title="Rechazar">
                        <mat-icon>cancel</mat-icon>
                      </button>
                    }
                  </div>
                }
              </div>
            </div>
          } @empty {
            <div class="bg-white rounded-xl border border-gray-200 col-span-full py-12 text-center">
              <mat-icon class="!text-5xl text-gray-300 mb-3">person_search</mat-icon>
              <p class="text-sm text-gray-500">No se encontraron jugadores</p>
              <p class="text-[10px] text-gray-400 mt-1">Ajusta los filtros o agrega nuevos jugadores</p>
            </div>
          }
        </div>
      }

      <!-- Vista LISTA -->
      @if (viewMode === 'list') {
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          @if (jugadores.length) {
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Jugador</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">DNI</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Club</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Cat.</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Fichaje</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide w-20">Acc.</th>
                  </tr>
                </thead>
                <tbody>
                  @for (j of jugadores; track j.id) {
                    <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td class="px-3 py-2">
                        <div class="flex items-center gap-2">
                          @if (j.foto_url) {
                            <img [src]="resolveUrl(j.foto_url)" class="w-7 h-7 rounded-full object-cover shrink-0" alt="Foto">
                          } @else {
                            <div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-white"
                              [style.background]="'linear-gradient(135deg, ' + (j.club?.color_primario || '#a78bfa') + ' 0%, ' + (j.club?.color_secundario || '#7c3aed') + ' 100%)'">
                              {{ (j.nombre?.charAt(0) || '') + (j.apellido?.charAt(0) || '') }}
                            </div>
                          }
                          <div class="min-w-0">
                            <p class="font-medium text-gray-900 text-xs truncate">{{ j.apellido }}, {{ j.nombre }}</p>
                            @if (j.numero_camiseta) {
                              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                                #{{ j.numero_camiseta }}
                              </span>
                            }
                          </div>
                        </div>
                      </td>
                      <td class="px-3 py-2 text-xs text-gray-600 hidden sm:table-cell">{{ j.dni }}</td>
                      <td class="px-3 py-2">
                        <div class="flex items-center gap-2">
                          @if (j.club?.escudo_url) {
                            <img [src]="resolveUrl(j.club.escudo_url)" class="escudo-sm shrink-0" alt="Escudo">
                          } @else {
                            <div class="escudo-sm escudo-placeholder text-[9px] shrink-0"
                              [style.background-color]="j.club?.color_primario || '#762c7e'">
                              {{ (j.club?.nombre_corto || j.club?.nombre || '?').substring(0, 2).toUpperCase() }}
                            </div>
                          }
                          <span class="text-xs text-gray-700 truncate">{{ j.club?.nombre_corto || j.club?.nombre }}</span>
                        </div>
                      </td>
                      <td class="px-3 py-2 hidden md:table-cell">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {{ j.categoria?.nombre }}
                        </span>
                      </td>
                      <td class="px-3 py-2">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" [class]="getFichajeClass(j.estado_fichaje)">
                          {{ j.estado_fichaje }}
                        </span>
                      </td>
                      <td class="px-3 py-2 text-right">
                        <div class="flex gap-1 justify-end">
                          <button class="action-btn action-edit" (click)="editarJugador(j)" title="Editar">
                            <mat-icon>edit</mat-icon>
                          </button>
                          @if (auth.isAdmin() && j.estado_fichaje === 'pendiente') {
                            <button class="action-btn action-approve" (click)="cambiarFichaje(j, 'aprobado')" title="Aprobar">
                              <mat-icon>check_circle</mat-icon>
                            </button>
                            <button class="action-btn action-reject" (click)="cambiarFichaje(j, 'rechazado')" title="Rechazar">
                              <mat-icon>cancel</mat-icon>
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
              <mat-icon class="!text-5xl text-gray-300 mb-3">person_search</mat-icon>
              <p class="text-sm text-gray-500">No se encontraron jugadores</p>
              <p class="text-[10px] text-gray-400 mt-1">Ajusta los filtros o agrega nuevos jugadores</p>
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
export class JugadoresComponent implements OnInit, OnDestroy {
  jugadores: any[] = [];
  clubes: any[] = [];
  categorias: any[] = [];
  viewMode: ViewMode = 'cards';
  filtros: any = { club_id: '', categoria_id: '', estado_fichaje: '', search: '' };
  mostrarForm = false;
  mostrarScanner = false;
  editando: any = null;
  form: any = { nombre: '', apellido: '', dni: '', fecha_nacimiento: '', club_id: '', categoria_id: '', numero_camiseta: null };
  personaExistente: Persona | null = null;
  private viewSub?: Subscription;
  private torneoSub?: Subscription;
  torneoActivoId: number | null = null;

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
    this.viewSub = this.viewPref.get('jugadores', 'list').subscribe(mode => {
      this.viewMode = mode;
      this.cdr.detectChanges();
    });

    this.torneoSub = this.branding.torneoActivoId$.subscribe(id => {
      this.torneoActivoId = id;
      if (id) {
        this.http.get<any>(`${environment.apiUrl}/torneos/${id}`).subscribe({
          next: res => {
            this.categorias = res.data?.categorias || [];
            this.cdr.detectChanges();
          },
        });
        this.http.get<any>(`${environment.apiUrl}/clubes`, { params: { torneo_id: id } }).subscribe({
          next: res => { this.clubes = res.data; this.cdr.detectChanges(); },
        });
        this.cargar();
      }
    });
  }

  ngOnDestroy() {
    this.viewSub?.unsubscribe();
    this.torneoSub?.unsubscribe();
  }

  setView(mode: ViewMode) {
    this.viewPref.set('jugadores', mode);
  }

  cargar() {
    const params: any = {};
    if (this.torneoActivoId) params.torneo_id = this.torneoActivoId;
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
      : this.http.post<any>(`${environment.apiUrl}/jugadores`, this.form);
    obs.subscribe({
      next: (res: any) => {
        const msg = this.editando
          ? 'Jugador actualizado'
          : (res?.persona_creada === false
              ? 'Rol de jugador agregado a persona existente'
              : 'Jugador creado');
        this.toastr.success(msg);
        this.cancelarForm();
        this.cargar();
        this.cdr.detectChanges();
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  /** Busca en el backend si el DNI ya pertenece a una persona existente */
  verificarDniExistente() {
    if (this.editando) return;
    const dni = (this.form.dni || '').replace(/[\s.\-]/g, '').trim();
    if (!dni || dni.length < 7) { this.personaExistente = null; return; }

    this.personasService.buscarPorDni(dni).subscribe({
      next: (res) => {
        this.personaExistente = res.data;
        // Autocompletar nombre/apellido/fecha_nac si la persona existe y el form esta vacio
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

  editarJugador(j: any) {
    this.editando = j;
    this.form = { nombre: j.nombre, apellido: j.apellido, dni: j.dni, fecha_nacimiento: j.fecha_nacimiento, club_id: j.club_id, categoria_id: j.categoria_id, numero_camiseta: j.numero_camiseta };
    this.mostrarForm = true;
  }

  cancelarForm() {
    this.editando = null;
    this.form = { nombre: '', apellido: '', dni: '', fecha_nacimiento: '', club_id: '', categoria_id: '', numero_camiseta: null };
    this.personaExistente = null;
    this.mostrarForm = false;
  }

  abrirScannerDni() {
    this.mostrarScanner = true;
    this.cdr.detectChanges();
  }

  onDniScanned(data: DniData) {
    // Autocompletar campos del formulario con los datos del DNI
    if (data.nombre) this.form.nombre = this.capitalizar(data.nombre);
    if (data.apellido) this.form.apellido = this.capitalizar(data.apellido);
    if (data.dni) this.form.dni = data.dni;
    if (data.fecha_nacimiento) this.form.fecha_nacimiento = data.fecha_nacimiento;
    this.mostrarScanner = false;
    this.toastr.success('DNI escaneado correctamente');
    this.cdr.detectChanges();
    // Consultar si la persona ya existe en el sistema
    this.verificarDniExistente();
  }

  private capitalizar(texto: string): string {
    return texto.toLowerCase().split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }

  cambiarFichaje(j: any, estado: string) {
    this.http.put(`${environment.apiUrl}/jugadores/${j.id}/fichaje`, { estado }).subscribe({
      next: () => { this.toastr.success(`Fichaje ${estado}`); this.cargar(); this.cdr.detectChanges(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  resolveUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return url;
    return `${environment.apiUrl}${url}`;
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

  getFichajeTextClass(estado: string): string {
    const map: Record<string, string> = {
      pendiente: 'text-yellow-700',
      aprobado: 'text-green-700',
      rechazado: 'text-red-700',
      baja: 'text-gray-700',
    };
    return map[estado] || 'text-gray-700';
  }
}
