import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-transicion',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, MatCheckboxModule],
  template: `
    <div class="space-y-6 max-w-5xl mx-auto">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Transicion de Torneo</h1>
        <p class="text-sm text-gray-500 mt-0.5">Wizard para crear un nuevo torneo a partir de uno existente</p>
      </div>

      <!-- Stepper visual -->
      <div class="flex items-center justify-center gap-0 py-4">
        @for (s of pasos; track s.num; let i = $index) {
          <div class="flex items-center">
            <div class="flex flex-col items-center">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                [class]="paso >= s.num ? 'bg-[var(--color-primario)] text-white' : 'bg-gray-200 text-gray-500'">
                @if (paso > s.num) {
                  <mat-icon class="!text-lg">check</mat-icon>
                } @else {
                  {{ s.num }}
                }
              </div>
              <span class="text-[11px] mt-1 font-medium" [class]="paso >= s.num ? 'text-[var(--color-primario)]' : 'text-gray-400'">{{ s.label }}</span>
            </div>
            @if (i < pasos.length - 1) {
              <div class="w-16 h-0.5 mx-2 mt-[-16px]" [class]="paso > s.num ? 'bg-[var(--color-primario)]' : 'bg-gray-200'"></div>
            }
          </div>
        }
      </div>

      <!-- Card contenedor del paso actual -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden animate-fade-in">
        <div class="h-1 rounded-full bg-gradient-to-r from-[var(--color-primario)] to-[var(--color-acento)]"></div>

        <!-- ==================== PASO 1: Configuracion ==================== -->
        @if (paso === 1) {
          <div class="p-6 space-y-5">
            <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <mat-icon class="text-[var(--color-primario)]">settings</mat-icon> Configuracion
            </h2>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Torneo origen</mat-label>
              <mat-select [(ngModel)]="torneoOrigenId" (ngModelChange)="cargarPreview()">
                @for (t of torneos; track t.id) {
                  <mat-option [value]="t.id">{{ t.nombre }} ({{ t.anio }})</mat-option>
                }
              </mat-select>
            </mat-form-field>

            @if (cargandoPreview) {
              <div class="flex items-center justify-center py-8 gap-2 text-gray-500">
                <mat-icon class="animate-spin">autorenew</mat-icon>
                <span class="text-sm">Cargando preview de transicion...</span>
              </div>
            }

            @if (preview) {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Nombre del nuevo torneo</mat-label>
                  <input matInput [(ngModel)]="config.nombre">
                </mat-form-field>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Anio</mat-label>
                  <input matInput type="number" [(ngModel)]="config.anio">
                </mat-form-field>
              </div>

              <div class="flex flex-col gap-3">
                <mat-slide-toggle [(ngModel)]="config.copiar_fixture" color="primary">
                  Copiar fixture
                </mat-slide-toggle>
                <mat-slide-toggle [(ngModel)]="config.copiar_config" color="primary">
                  Copiar configuracion de reglas
                </mat-slide-toggle>
              </div>
            }
          </div>
        }

        <!-- ==================== PASO 2: Categorias ==================== -->
        @if (paso === 2 && preview) {
          <div class="p-6 space-y-5">
            <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <mat-icon class="text-[var(--color-primario)]">category</mat-icon> Categorias
            </h2>

            <div class="space-y-2">
              @for (catOrigen of preview.categorias_origen; track catOrigen.nombre) {
                <div class="flex items-center gap-3 p-3 rounded-lg border"
                  [class]="getCategoriaClass(catOrigen)">
                  <!-- Origen -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <mat-icon class="!text-lg" [class]="getCategoriaIconColor(catOrigen)">{{ getCategoriaIcon(catOrigen) }}</mat-icon>
                      <span class="font-medium text-gray-900">{{ catOrigen.nombre }}</span>
                      <span class="text-xs text-gray-500">({{ catOrigen.jugadores }} jugadores)</span>
                    </div>
                  </div>

                  <!-- Flecha -->
                  <mat-icon class="text-gray-400 shrink-0">arrow_forward</mat-icon>

                  <!-- Destino -->
                  <div class="flex-1 min-w-0">
                    @if (catOrigen.destino === 'graduada') {
                      <div class="flex items-center gap-2">
                        <mat-icon class="!text-lg text-red-500">school</mat-icon>
                        <span class="font-medium text-red-700">Se gradua ({{ catOrigen.jugadores }} jugadores)</span>
                      </div>
                    } @else {
                      @if (getDestinoParaOrigen(catOrigen); as dest) {
                        <div class="flex items-center gap-2">
                          <span class="font-medium text-gray-900">{{ dest.nombre }}</span>
                          @if (dest.origen === 'nueva') {
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">NUEVA</span>
                          }
                          @if (dest.es_preliminar === false && isPreliminarOrigen(catOrigen)) {
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">Ahora regular</span>
                          }
                        </div>
                      }
                    }
                  </div>
                </div>
              }

              <!-- Nueva preliminar (sin origen) -->
              @for (catDest of getCategoriasNuevas(); track catDest.nombre) {
                <div class="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
                  <div class="flex-1 min-w-0">
                    <span class="text-sm text-gray-400 italic">Sin categoria origen</span>
                  </div>
                  <mat-icon class="text-gray-400 shrink-0">arrow_forward</mat-icon>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <mat-icon class="!text-lg text-amber-500">fiber_new</mat-icon>
                      <span class="font-medium text-amber-800">{{ catDest.nombre }}</span>
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">NUEVA</span>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Totales -->
            <div class="flex items-center gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div class="flex items-center gap-2 text-green-700">
                <mat-icon class="!text-lg">people</mat-icon>
                <span class="text-sm font-medium">{{ getTotalTrasladados() }} jugadores se trasladaran</span>
              </div>
              <div class="w-px h-5 bg-gray-300"></div>
              <div class="flex items-center gap-2 text-red-700">
                <mat-icon class="!text-lg">school</mat-icon>
                <span class="text-sm font-medium">{{ getTotalGraduados() }} se graduaran</span>
              </div>
            </div>
          </div>
        }

        <!-- ==================== PASO 3: Personas ==================== -->
        @if (paso === 3 && preview) {
          <div class="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <mat-icon class="text-[var(--color-primario)]">people</mat-icon> Personas
            </h2>

            <!-- Staff de clubes -->
            <div class="border border-gray-200 rounded-lg overflow-hidden">
              <button class="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                (click)="seccionStaff = !seccionStaff">
                <div class="flex items-center gap-2">
                  <mat-icon class="!text-lg">{{ seccionStaff ? 'expand_less' : 'expand_more' }}</mat-icon>
                  <span class="font-semibold text-gray-900">Staff de clubes</span>
                  <span class="text-xs text-gray-500">({{ staffSeleccionados.size }} de {{ preview.staff.length }} seleccionados)</span>
                </div>
                <div class="flex gap-2">
                  <button mat-stroked-button class="!text-xs !h-7 !min-h-0 !px-2" (click)="$event.stopPropagation(); seleccionarTodosStaff(true)">Todos</button>
                  <button mat-stroked-button class="!text-xs !h-7 !min-h-0 !px-2" (click)="$event.stopPropagation(); seleccionarTodosStaff(false)">Ninguno</button>
                </div>
              </button>
              @if (seccionStaff) {
                <div class="p-4 space-y-4">
                  @for (club of staffPorClub; track club.club_id) {
                    <div>
                      <h4 class="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <mat-icon class="!text-sm text-gray-400">sports_soccer</mat-icon>
                        {{ club.club }}
                      </h4>
                      <div class="space-y-1 ml-5">
                        @for (persona of club.personas; track persona.persona_rol_id) {
                          <label class="flex items-center gap-3 py-1 px-2 rounded hover:bg-gray-50 cursor-pointer">
                            <mat-checkbox [checked]="staffSeleccionados.has(persona.persona_rol_id)"
                              (change)="toggleStaff(persona.persona_rol_id)" color="primary"></mat-checkbox>
                            <span class="text-sm text-gray-900">{{ persona.nombre }}</span>
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">{{ persona.rol }}</span>
                            <span class="text-xs text-gray-400 ml-auto">DNI {{ persona.dni }}</span>
                          </label>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Arbitros -->
            <div class="border border-gray-200 rounded-lg overflow-hidden">
              <button class="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                (click)="seccionArbitros = !seccionArbitros">
                <div class="flex items-center gap-2">
                  <mat-icon class="!text-lg">{{ seccionArbitros ? 'expand_less' : 'expand_more' }}</mat-icon>
                  <span class="font-semibold text-gray-900">Arbitros</span>
                  <span class="text-xs text-gray-500">({{ arbitroSeleccionados.size }} de {{ preview.arbitros.length }} seleccionados)</span>
                </div>
                <div class="flex gap-2">
                  <button mat-stroked-button class="!text-xs !h-7 !min-h-0 !px-2" (click)="$event.stopPropagation(); seleccionarTodosArbitros(true)">Todos</button>
                  <button mat-stroked-button class="!text-xs !h-7 !min-h-0 !px-2" (click)="$event.stopPropagation(); seleccionarTodosArbitros(false)">Ninguno</button>
                </div>
              </button>
              @if (seccionArbitros) {
                <div class="p-4 space-y-1">
                  @for (a of preview.arbitros; track a.persona_rol_id) {
                    <label class="flex items-center gap-3 py-1 px-2 rounded hover:bg-gray-50 cursor-pointer">
                      <mat-checkbox [checked]="arbitroSeleccionados.has(a.persona_rol_id)"
                        (change)="toggleArbitro(a.persona_rol_id)" color="primary"></mat-checkbox>
                      <span class="text-sm text-gray-900">{{ a.nombre }}</span>
                      <span class="text-xs text-gray-400 ml-auto">DNI {{ a.dni }}</span>
                    </label>
                  }
                </div>
              }
            </div>

            <!-- Veedores -->
            <div class="border border-gray-200 rounded-lg overflow-hidden">
              <button class="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                (click)="seccionVeedores = !seccionVeedores">
                <div class="flex items-center gap-2">
                  <mat-icon class="!text-lg">{{ seccionVeedores ? 'expand_less' : 'expand_more' }}</mat-icon>
                  <span class="font-semibold text-gray-900">Veedores</span>
                  <span class="text-xs text-gray-500">({{ veedorSeleccionados.size }} de {{ preview.veedores.length }} seleccionados)</span>
                </div>
                <div class="flex gap-2">
                  <button mat-stroked-button class="!text-xs !h-7 !min-h-0 !px-2" (click)="$event.stopPropagation(); seleccionarTodosVeedores(true)">Todos</button>
                  <button mat-stroked-button class="!text-xs !h-7 !min-h-0 !px-2" (click)="$event.stopPropagation(); seleccionarTodosVeedores(false)">Ninguno</button>
                </div>
              </button>
              @if (seccionVeedores) {
                <div class="p-4 space-y-1">
                  @for (v of preview.veedores; track v.persona_rol_id) {
                    <label class="flex items-center gap-3 py-1 px-2 rounded hover:bg-gray-50 cursor-pointer">
                      <mat-checkbox [checked]="veedorSeleccionados.has(v.persona_rol_id)"
                        (change)="toggleVeedor(v.persona_rol_id)" color="primary"></mat-checkbox>
                      <span class="text-sm text-gray-900">{{ v.nombre }}</span>
                      <span class="text-xs text-gray-400 ml-auto">DNI {{ v.dni }}</span>
                    </label>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- ==================== PASO 4: Resumen ==================== -->
        @if (paso === 4 && preview) {
          <div class="p-6 space-y-5">
            <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <mat-icon class="text-[var(--color-primario)]">checklist</mat-icon> Resumen y Confirmacion
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <mat-icon class="text-[var(--color-primario)]">emoji_events</mat-icon>
                <div>
                  <span class="text-xs text-gray-500">Nuevo torneo</span>
                  <p class="text-sm font-semibold text-gray-900">{{ config.nombre }} ({{ config.anio }})</p>
                </div>
              </div>
              <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <mat-icon class="text-[var(--color-primario)]">category</mat-icon>
                <div>
                  <span class="text-xs text-gray-500">Categorias</span>
                  <p class="text-sm font-semibold text-gray-900">{{ preview.categorias_destino.length }} ({{ getCategoriasRegulares() }} regulares + {{ getCategoriasPrelim() }} preliminar)</p>
                </div>
              </div>
              <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <mat-icon class="text-[var(--color-primario)]">domain</mat-icon>
                <div>
                  <span class="text-xs text-gray-500">Clubes</span>
                  <p class="text-sm font-semibold text-gray-900">{{ preview.clubes }} (mismas instituciones)</p>
                </div>
              </div>
              <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <mat-icon class="text-green-600">people</mat-icon>
                <div>
                  <span class="text-xs text-gray-500">Jugadores</span>
                  <p class="text-sm font-semibold text-gray-900">{{ getTotalTrasladados() }} trasladados / {{ getTotalGraduados() }} graduados</p>
                </div>
              </div>
              <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <mat-icon class="text-purple-600">badge</mat-icon>
                <div>
                  <span class="text-xs text-gray-500">Staff</span>
                  <p class="text-sm font-semibold text-gray-900">{{ staffSeleccionados.size }} de {{ preview.staff.length }}</p>
                </div>
              </div>
              <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <mat-icon class="text-orange-600">gavel</mat-icon>
                <div>
                  <span class="text-xs text-gray-500">Arbitros</span>
                  <p class="text-sm font-semibold text-gray-900">{{ arbitroSeleccionados.size }} de {{ preview.arbitros.length }}</p>
                </div>
              </div>
              <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <mat-icon class="text-teal-600">visibility</mat-icon>
                <div>
                  <span class="text-xs text-gray-500">Veedores</span>
                  <p class="text-sm font-semibold text-gray-900">{{ veedorSeleccionados.size }} de {{ preview.veedores.length }}</p>
                </div>
              </div>
              <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <mat-icon class="text-blue-600">settings</mat-icon>
                <div>
                  <span class="text-xs text-gray-500">Opciones</span>
                  <p class="text-sm font-semibold text-gray-900">Fixture: {{ config.copiar_fixture ? 'Copiado' : 'No copiado' }} / Config: {{ config.copiar_config ? 'Copiada' : 'No copiada' }}</p>
                </div>
              </div>
            </div>

            <!-- Boton ejecutar -->
            <div class="pt-4 flex justify-center">
              @if (!ejecutando) {
                <button mat-flat-button color="primary" class="!rounded-xl !px-8 !py-3 !text-base !font-bold"
                  (click)="confirmarEjecutar()">
                  <mat-icon>rocket_launch</mat-icon>
                  Crear Torneo {{ config.anio }}
                </button>
              } @else {
                <div class="flex items-center gap-3 text-[var(--color-primario)]">
                  <mat-icon class="animate-spin">autorenew</mat-icon>
                  <span class="text-sm font-medium">Creando torneo, por favor espere...</span>
                </div>
              }
            </div>
          </div>
        }
      </div>

      <!-- Navegacion -->
      <div class="flex items-center justify-between">
        <button mat-stroked-button (click)="pasoAnterior()" [disabled]="paso === 1" class="!rounded-lg">
          <mat-icon>chevron_left</mat-icon> Anterior
        </button>
        @if (paso < 4) {
          <button mat-flat-button color="primary" (click)="pasoSiguiente()"
            [disabled]="!puedeAvanzar()" class="!rounded-lg">
            Siguiente <mat-icon>chevron_right</mat-icon>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
  `],
})
export class TransicionComponent implements OnInit {
  paso = 1;
  pasos = [
    { num: 1, label: 'Configuracion' },
    { num: 2, label: 'Categorias' },
    { num: 3, label: 'Personas' },
    { num: 4, label: 'Resumen' },
  ];

  torneos: any[] = [];
  torneoOrigenId: number | null = null;
  cargandoPreview = false;
  preview: any = null;
  ejecutando = false;

  config = {
    nombre: '',
    anio: new Date().getFullYear() + 1,
    copiar_fixture: true,
    copiar_config: true,
  };

  // Paso 3
  seccionStaff = true;
  seccionArbitros = true;
  seccionVeedores = true;
  staffSeleccionados = new Set<number>();
  arbitroSeleccionados = new Set<number>();
  veedorSeleccionados = new Set<number>();
  staffPorClub: { club: string; club_id: number; personas: any[] }[] = [];

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/torneos`).subscribe({
      next: res => {
        this.torneos = res.data || [];
        this.cdr.detectChanges();
      },
      error: () => this.toastr.error('Error al cargar torneos'),
    });
  }

  cargarPreview() {
    if (!this.torneoOrigenId) return;
    this.cargandoPreview = true;
    this.preview = null;
    this.cdr.detectChanges();

    this.http.get<any>(`${environment.apiUrl}/torneos/${this.torneoOrigenId}/transicion/preview`).subscribe({
      next: res => {
        this.preview = res.data;
        this.config.nombre = res.data.nombre_sugerido || '';
        this.config.anio = res.data.anio_nuevo || new Date().getFullYear() + 1;
        this.inicializarSelecciones();
        this.cargandoPreview = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.toastr.error(e.error?.message || 'Error al cargar preview');
        this.cargandoPreview = false;
        this.cdr.detectChanges();
      },
    });
  }

  inicializarSelecciones() {
    if (!this.preview) return;

    // Staff: todos seleccionados, agrupados por club
    this.staffSeleccionados = new Set(this.preview.staff.map((s: any) => s.persona_rol_id));
    const clubMap = new Map<number, { club: string; club_id: number; personas: any[] }>();
    for (const s of this.preview.staff) {
      if (!clubMap.has(s.club_id)) {
        clubMap.set(s.club_id, { club: s.club, club_id: s.club_id, personas: [] });
      }
      clubMap.get(s.club_id)!.personas.push(s);
    }
    this.staffPorClub = Array.from(clubMap.values()).sort((a, b) => a.club.localeCompare(b.club));

    // Arbitros y veedores: todos seleccionados
    this.arbitroSeleccionados = new Set(this.preview.arbitros.map((a: any) => a.persona_rol_id));
    this.veedorSeleccionados = new Set(this.preview.veedores.map((v: any) => v.persona_rol_id));
  }

  // --- Navegacion ---

  puedeAvanzar(): boolean {
    if (this.paso === 1) return !!this.preview && !!this.config.nombre && !!this.config.anio;
    return true;
  }

  pasoSiguiente() {
    if (this.paso < 4 && this.puedeAvanzar()) this.paso++;
  }

  pasoAnterior() {
    if (this.paso > 1) this.paso--;
  }

  // --- Paso 2: Categorias ---

  getCategoriaClass(cat: any): string {
    if (cat.destino === 'graduada') return 'border-red-200 bg-red-50';
    if (cat.destino === 'continua') return 'border-green-200 bg-green-50';
    return 'border-gray-200 bg-gray-50';
  }

  getCategoriaIcon(cat: any): string {
    if (cat.destino === 'graduada') return 'school';
    return 'arrow_circle_right';
  }

  getCategoriaIconColor(cat: any): string {
    if (cat.destino === 'graduada') return 'text-red-500';
    return 'text-green-500';
  }

  getDestinoParaOrigen(catOrigen: any): any {
    if (!this.preview) return null;
    return this.preview.categorias_destino.find((d: any) =>
      d.nombre === catOrigen.nombre || (d.anio_nacimiento && d.anio_nacimiento === catOrigen.anio_nacimiento)
    );
  }

  isPreliminarOrigen(cat: any): boolean {
    return cat.nombre?.toLowerCase().includes('preliminar');
  }

  getCategoriasNuevas(): any[] {
    if (!this.preview) return [];
    return this.preview.categorias_destino.filter((d: any) => d.origen === 'nueva');
  }

  getTotalTrasladados(): number {
    if (!this.preview) return 0;
    return this.preview.categorias_origen
      .filter((c: any) => c.destino !== 'graduada')
      .reduce((sum: number, c: any) => sum + (c.jugadores || 0), 0);
  }

  getTotalGraduados(): number {
    if (!this.preview) return 0;
    return this.preview.categorias_origen
      .filter((c: any) => c.destino === 'graduada')
      .reduce((sum: number, c: any) => sum + (c.jugadores || 0), 0);
  }

  getCategoriasRegulares(): number {
    if (!this.preview) return 0;
    return this.preview.categorias_destino.filter((c: any) => !c.es_preliminar).length;
  }

  getCategoriasPrelim(): number {
    if (!this.preview) return 0;
    return this.preview.categorias_destino.filter((c: any) => c.es_preliminar).length;
  }

  // --- Paso 3: Selecciones ---

  toggleStaff(id: number) {
    if (this.staffSeleccionados.has(id)) this.staffSeleccionados.delete(id);
    else this.staffSeleccionados.add(id);
  }

  toggleArbitro(id: number) {
    if (this.arbitroSeleccionados.has(id)) this.arbitroSeleccionados.delete(id);
    else this.arbitroSeleccionados.add(id);
  }

  toggleVeedor(id: number) {
    if (this.veedorSeleccionados.has(id)) this.veedorSeleccionados.delete(id);
    else this.veedorSeleccionados.add(id);
  }

  seleccionarTodosStaff(val: boolean) {
    if (val) this.staffSeleccionados = new Set(this.preview.staff.map((s: any) => s.persona_rol_id));
    else this.staffSeleccionados = new Set();
    this.cdr.detectChanges();
  }

  seleccionarTodosArbitros(val: boolean) {
    if (val) this.arbitroSeleccionados = new Set(this.preview.arbitros.map((a: any) => a.persona_rol_id));
    else this.arbitroSeleccionados = new Set();
    this.cdr.detectChanges();
  }

  seleccionarTodosVeedores(val: boolean) {
    if (val) this.veedorSeleccionados = new Set(this.preview.veedores.map((v: any) => v.persona_rol_id));
    else this.veedorSeleccionados = new Set();
    this.cdr.detectChanges();
  }

  // --- Paso 4: Ejecutar ---

  confirmarEjecutar() {
    if (!confirm(`Se creara el torneo "${this.config.nombre}" (${this.config.anio}). Esta accion no se puede deshacer. Continuar?`)) return;
    this.ejecutando = true;
    this.cdr.detectChanges();

    const body = {
      nombre: this.config.nombre,
      anio: this.config.anio,
      copiar_fixture: this.config.copiar_fixture,
      copiar_config: this.config.copiar_config,
      staff_ids: Array.from(this.staffSeleccionados),
      arbitro_ids: Array.from(this.arbitroSeleccionados),
      veedor_ids: Array.from(this.veedorSeleccionados),
    };

    this.http.post<any>(`${environment.apiUrl}/torneos/${this.torneoOrigenId}/transicion`, body).subscribe({
      next: (res) => {
        const stats = res.stats || {};
        this.toastr.success(
          `Torneo creado: ${stats.jugadores_trasladados || 0} jugadores trasladados, ${stats.staff_trasladados || 0} staff copiados`,
          'Transicion exitosa'
        );
        this.ejecutando = false;
        this.cdr.detectChanges();
        this.router.navigate(['/torneos']);
      },
      error: (e) => {
        this.toastr.error(e.error?.message || 'Error al ejecutar transicion');
        this.ejecutando = false;
        this.cdr.detectChanges();
      },
    });
  }
}
