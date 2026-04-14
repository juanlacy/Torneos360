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

@Component({
  selector: 'app-clubes',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatMenuModule],
  template: `
    <div class="space-y-5">

      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Clubes</h1>
          <p class="text-sm text-gray-500 mt-0.5">{{ clubesFiltrados.length }} clubes en el torneo</p>
        </div>
        <div class="flex gap-2 items-center flex-wrap">
          <!-- Toggle de vista -->
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

          @if (auth.puede('clubes', 'crear')) {
            <button mat-flat-button color="primary" (click)="mostrarForm = !mostrarForm" class="!rounded-lg">
              <mat-icon>add</mat-icon> Nuevo Club
            </button>
          }
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex flex-wrap gap-3 items-center">
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="flex-1 min-w-[180px]">
            <mat-label>Buscar</mat-label>
            <input matInput [(ngModel)]="filtros.search" (ngModelChange)="filtrar()" placeholder="Nombre del club">
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="min-w-[160px]">
            <mat-label>Zona</mat-label>
            <mat-select [(ngModel)]="filtros.zona_id" (selectionChange)="filtrar()">
              <mat-option [value]="''">Todas</mat-option>
              @for (z of zonas; track z.id) {
                <mat-option [value]="z.id">{{ z.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="min-w-[160px]">
            <mat-label>Torneo</mat-label>
            <mat-select [(ngModel)]="filtroTorneo" (selectionChange)="cargar()">
              @for (t of torneos; track t.id) {
                <mat-option [value]="t.id">{{ t.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
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
                <mat-label>Telefono</mat-label>
                <input matInput [(ngModel)]="form.telefono">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput type="email" [(ngModel)]="form.email">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Direccion</mat-label>
                <input matInput [(ngModel)]="form.direccion">
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

      <!-- Vista TARJETAS -->
      @if (viewMode === 'cards') {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (club of clubesFiltrados; track club.id) {
            <div class="bg-white rounded-xl border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all duration-200 overflow-hidden group">
              <!-- Header con gradiente -->
              <div class="h-20 relative"
                [style.background]="'linear-gradient(135deg, ' + (club.color_primario || '#762c7e') + ' 0%, ' + (club.color_secundario || '#4f2f7d') + ' 100%)'">
                @if (club.zona) {
                  <span class="absolute top-3 right-3 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/90 text-gray-700 backdrop-blur">
                    {{ club.zona.nombre }}
                  </span>
                }
              </div>

              <!-- Escudo flotante -->
              <div class="relative px-5 pb-5">
                <div class="relative -mt-10 group/escudo shrink-0 inline-block">
                  @if (club.escudo_url) {
                    <img [src]="getEscudoUrl(club.escudo_url)" class="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md" alt="Escudo">
                  } @else {
                    <div class="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold border-4 border-white shadow-md"
                      [style.background-color]="club.color_primario || '#762c7e'"
                      [style.color]="club.color_secundario || '#fff'">
                      {{ (club.nombre_corto || club.nombre).substring(0, 2).toUpperCase() }}
                    </div>
                  }
                  @if (auth.puede('clubes', 'editar')) {
                    <button
                      class="absolute inset-0 w-20 h-20 rounded-2xl bg-black/60 flex items-center justify-center opacity-0 group-hover/escudo:opacity-100 transition-opacity cursor-pointer"
                      (click)="escudoInput.click()"
                      title="Cambiar escudo">
                      <mat-icon class="text-white !text-xl">photo_camera</mat-icon>
                    </button>
                    <input #escudoInput type="file" accept="image/*" class="hidden" (change)="onEscudoChange($event, club)">
                  }
                </div>

                <div class="mt-3">
                  <h3 class="font-bold text-gray-900 text-lg leading-tight">{{ club.nombre }}</h3>
                  @if (club.nombre_corto) {
                    <p class="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">{{ club.nombre_corto }}</p>
                  }
                </div>

                <!-- Info de contacto -->
                <div class="mt-4 space-y-1.5">
                  @if (club.contacto?.telefono || club.telefono) {
                    <div class="flex items-center gap-2 text-xs text-gray-600">
                      <mat-icon class="!text-sm !w-4 !h-4 text-gray-400">phone</mat-icon>
                      <span>{{ club.contacto?.telefono || club.telefono }}</span>
                    </div>
                  }
                  @if (club.contacto?.email || club.email) {
                    <div class="flex items-center gap-2 text-xs text-gray-600 truncate">
                      <mat-icon class="!text-sm !w-4 !h-4 text-gray-400">mail</mat-icon>
                      <span class="truncate">{{ club.contacto?.email || club.email }}</span>
                    </div>
                  }
                  @if (club.contacto?.direccion || club.direccion) {
                    <div class="flex items-center gap-2 text-xs text-gray-600">
                      <mat-icon class="!text-sm !w-4 !h-4 text-gray-400">place</mat-icon>
                      <span class="truncate">{{ club.contacto?.direccion || club.direccion }}</span>
                    </div>
                  }
                </div>

                <!-- Stats -->
                <div class="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                  <div class="text-center">
                    <p class="text-2xl font-bold" [style.color]="club.color_primario || '#762c7e'">{{ club._jugadoresCount ?? '—' }}</p>
                    <p class="text-[10px] text-gray-400 uppercase tracking-wide">Jugadores</p>
                  </div>
                  <div class="text-center">
                    <p class="text-2xl font-bold text-gray-700">{{ club._staffCount ?? '—' }}</p>
                    <p class="text-[10px] text-gray-400 uppercase tracking-wide">Staff</p>
                  </div>
                </div>

                <!-- Acciones -->
                <div class="mt-4 flex gap-2">
                  @if (auth.puede('clubes', 'editar')) {
                    <button
                      class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                      (click)="editar(club)">
                      <mat-icon class="!text-sm !w-4 !h-4">edit</mat-icon> Editar
                    </button>
                  }
                </div>
              </div>
            </div>
          } @empty {
            <div class="bg-white rounded-xl border border-gray-200 col-span-full py-12 text-center">
              <mat-icon class="!text-5xl text-gray-300 mb-3">groups</mat-icon>
              <p class="text-sm text-gray-500">No se encontraron clubes</p>
            </div>
          }
        </div>
      }

      <!-- Vista LISTA -->
      @if (viewMode === 'list') {
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          @if (clubesFiltrados.length) {
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Club</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Zona</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Contacto</th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Jugadores</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide w-16">Acc.</th>
                  </tr>
                </thead>
                <tbody>
                  @for (club of clubesFiltrados; track club.id) {
                    <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-3">
                          <div class="relative group/escudo shrink-0">
                            @if (club.escudo_url) {
                              <img [src]="getEscudoUrl(club.escudo_url)" class="w-10 h-10 rounded-lg object-cover border border-gray-200" alt="Escudo">
                            } @else {
                              <div class="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold"
                                [style.background-color]="club.color_primario || '#762c7e'"
                                [style.color]="club.color_secundario || '#fff'">
                                {{ (club.nombre_corto || club.nombre).substring(0, 2).toUpperCase() }}
                              </div>
                            }
                            @if (auth.puede('clubes', 'editar')) {
                              <button
                                class="absolute inset-0 w-10 h-10 rounded-lg bg-black/60 flex items-center justify-center opacity-0 group-hover/escudo:opacity-100 transition-opacity"
                                (click)="escudoInput2.click()"
                                title="Cambiar escudo">
                                <mat-icon class="text-white !text-base !w-5 !h-5">photo_camera</mat-icon>
                              </button>
                              <input #escudoInput2 type="file" accept="image/*" class="hidden" (change)="onEscudoChange($event, club)">
                            }
                          </div>
                          <div class="min-w-0">
                            <p class="font-medium text-gray-900 text-sm truncate">{{ club.nombre }}</p>
                            @if (club.nombre_corto) {
                              <p class="text-[10px] text-gray-400 uppercase">{{ club.nombre_corto }}</p>
                            }
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        @if (club.zona) {
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {{ club.zona.nombre }}
                          </span>
                        } @else {
                          <span class="text-xs text-gray-400">—</span>
                        }
                      </td>
                      <td class="px-4 py-3 hidden md:table-cell">
                        <div class="space-y-0.5">
                          @if (club.contacto?.telefono || club.telefono) {
                            <div class="flex items-center gap-1.5 text-xs text-gray-600">
                              <mat-icon class="!text-xs !w-3 !h-3 text-gray-400">phone</mat-icon>
                              {{ club.contacto?.telefono || club.telefono }}
                            </div>
                          }
                          @if (club.contacto?.email || club.email) {
                            <div class="flex items-center gap-1.5 text-xs text-gray-600 truncate max-w-[180px]">
                              <mat-icon class="!text-xs !w-3 !h-3 text-gray-400">mail</mat-icon>
                              <span class="truncate">{{ club.contacto?.email || club.email }}</span>
                            </div>
                          }
                          @if (!club.contacto?.telefono && !club.telefono && !club.contacto?.email && !club.email) {
                            <span class="text-xs text-gray-400">Sin datos</span>
                          }
                        </div>
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span class="text-sm font-semibold text-gray-700">{{ club._jugadoresCount ?? '—' }}</span>
                      </td>
                      <td class="px-4 py-3 text-right">
                        @if (auth.puede('clubes', 'editar')) {
                          <button
                            class="w-8 h-8 rounded-lg inline-flex items-center justify-center text-gray-400 hover:text-[var(--color-primario)] hover:bg-gray-100 transition-colors"
                            (click)="editar(club)">
                            <mat-icon class="!text-lg">edit</mat-icon>
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="py-12 text-center">
              <mat-icon class="!text-5xl text-gray-300 mb-3">groups</mat-icon>
              <p class="text-sm text-gray-500">No se encontraron clubes</p>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ClubesComponent implements OnInit, OnDestroy {
  torneos: any[] = [];
  zonas: any[] = [];
  clubes: any[] = [];
  clubesFiltrados: any[] = [];
  filtroTorneo: number | null = null;
  filtros: any = { search: '', zona_id: '' };
  viewMode: ViewMode = 'cards';
  mostrarForm = false;
  editando: any = null;
  form: any = { nombre: '', nombre_corto: '', zona_id: null, telefono: '', email: '', direccion: '', color_primario: '#762c7e', color_secundario: '#ffffff' };
  private viewSub?: Subscription;

  constructor(
    private http: HttpClient,
    public auth: AuthService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private viewPref: ViewPreferenceService,
  ) {}

  ngOnInit() {
    this.viewSub = this.viewPref.get('clubes', 'cards').subscribe(mode => {
      this.viewMode = mode;
      this.cdr.detectChanges();
    });

    this.http.get<any>(`${environment.apiUrl}/torneos`).subscribe({
      next: res => {
        this.torneos = res.data;
        if (this.torneos.length) {
          this.filtroTorneo = this.torneos[0].id;
          this.zonas = this.torneos[0].zonas || [];
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
    this.viewPref.set('clubes', mode);
  }

  cargar() {
    if (!this.filtroTorneo) return;
    const torneo = this.torneos.find(t => t.id === this.filtroTorneo);
    this.zonas = torneo?.zonas || [];
    this.http.get<any>(`${environment.apiUrl}/clubes`, { params: { torneo_id: this.filtroTorneo } }).subscribe({
      next: res => {
        this.clubes = res.data;
        this.cargarCounts();
        this.filtrar();
        this.cdr.detectChanges();
      },
      error: () => this.toastr.error('Error al cargar clubes'),
    });
  }

  /** Carga contadores de jugadores por club */
  cargarCounts() {
    for (const club of this.clubes) {
      this.http.get<any>(`${environment.apiUrl}/clubes/${club.id}/jugadores`).subscribe({
        next: res => {
          club._jugadoresCount = res.data?.length || 0;
          this.cdr.detectChanges();
        },
        error: () => { club._jugadoresCount = 0; },
      });
    }
  }

  filtrar() {
    const search = (this.filtros.search || '').toLowerCase().trim();
    const zonaId = this.filtros.zona_id;
    this.clubesFiltrados = this.clubes.filter(c => {
      if (search && !(c.nombre?.toLowerCase().includes(search) || c.nombre_corto?.toLowerCase().includes(search))) return false;
      if (zonaId && c.zona_id !== zonaId) return false;
      return true;
    });
    this.cdr.detectChanges();
  }

  guardar() {
    if (!this.form.nombre) { this.toastr.warning('Nombre requerido'); return; }
    const data = {
      ...this.form,
      torneo_id: this.filtroTorneo,
      contacto: {
        telefono: this.form.telefono || null,
        email: this.form.email || null,
        direccion: this.form.direccion || null,
      },
    };
    const obs = this.editando
      ? this.http.put(`${environment.apiUrl}/clubes/${this.editando.id}`, data)
      : this.http.post(`${environment.apiUrl}/clubes`, data);
    obs.subscribe({
      next: () => {
        this.toastr.success(this.editando ? 'Club actualizado' : 'Club creado');
        this.cancelar();
        this.cargar();
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  editar(club: any) {
    this.editando = club;
    const contacto = club.contacto || {};
    this.form = {
      nombre: club.nombre,
      nombre_corto: club.nombre_corto,
      zona_id: club.zona_id,
      telefono: contacto.telefono || '',
      email: contacto.email || '',
      direccion: contacto.direccion || '',
      color_primario: club.color_primario || '#762c7e',
      color_secundario: club.color_secundario || '#ffffff',
    };
    this.mostrarForm = true;
  }

  cancelar() {
    this.editando = null;
    this.form = { nombre: '', nombre_corto: '', zona_id: null, telefono: '', email: '', direccion: '', color_primario: '#762c7e', color_secundario: '#ffffff' };
    this.mostrarForm = false;
  }

  getEscudoUrl(url: string): string {
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return url;
    return `${environment.apiUrl}${url}`;
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
        this.cdr.detectChanges();
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error al subir escudo'),
    });
  }
}
