import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { UpperCasePipe } from '@angular/common';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';
import { BrandingService } from '../../core/services/branding.service';

@Component({
  selector: 'app-fixture',
  standalone: true,
  imports: [FormsModule, RouterLink, UpperCasePipe, MatCardModule, MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatChipsModule, MatExpansionModule, MatDividerModule],
  template: `
    <div class="space-y-4 animate-fade-in">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h1 class="text-2xl font-bold text-gray-900">Fixture</h1>
        <div class="flex gap-2 items-center flex-wrap">
          <div class="flex gap-1">
            <button (click)="setFase('')"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              [class]="filtroFase === '' ? 'bg-[var(--color-primario)] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
              Todas
            </button>
            <button (click)="setFase('ida')"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              [class]="filtroFase === 'ida' ? 'bg-[var(--color-primario)] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
              Ida
            </button>
            <button (click)="setFase('vuelta')"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              [class]="filtroFase === 'vuelta' ? 'bg-[var(--color-primario)] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
              Vuelta
            </button>
          </div>
          @if (auth.isAdmin()) {
            <button mat-flat-button color="primary" (click)="mostrarFormJornada = !mostrarFormJornada">
              <mat-icon>add</mat-icon> Nueva Fecha
            </button>
          }
        </div>
      </div>

      <!-- ═══ Formulario nueva jornada ═══ -->
      @if (mostrarFormJornada && auth.isAdmin()) {
        <mat-card class="bg-white rounded-xl border border-gray-200">
          <mat-card-content>
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Nueva Fecha</h3>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
              <mat-form-field appearance="outline">
                <mat-label>N° Fecha</mat-label>
                <input matInput type="number" [(ngModel)]="formJornada.numero_jornada" min="1">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Zona</mat-label>
                <mat-select [(ngModel)]="formJornada.zona_id">
                  @for (z of zonas; track z.id) {
                    <mat-option [value]="z.id">{{ z.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fase</mat-label>
                <mat-select [(ngModel)]="formJornada.fase">
                  <mat-option value="ida">Ida</mat-option>
                  <mat-option value="vuelta">Vuelta</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fecha</mat-label>
                <input matInput type="date" [(ngModel)]="formJornada.fecha">
              </mat-form-field>
              <div class="flex gap-2 items-center">
                <button mat-flat-button color="primary" (click)="crearJornada()">Crear</button>
                <button mat-stroked-button (click)="mostrarFormJornada = false">Cancelar</button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      }

      <!-- ═══ Jornadas por zona (2 columnas) ═══ -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        @for (col of jornadasPorZona; track col.zona.id) {
          <div class="space-y-3">
            <div class="flex items-center gap-2 px-2">
              <span class="w-3 h-3 rounded-full" [style.background-color]="col.zona.color || '#6b7280'"></span>
              <span class="text-sm font-bold text-gray-700 uppercase tracking-wide">Zona {{ col.zona.nombre }}</span>
              <span class="text-[10px] text-gray-400">{{ col.jornadas.length }} fechas</span>
            </div>
            @for (jornada of col.jornadas; track jornada.id) {
              <mat-expansion-panel [id]="'jornada-' + jornada.id" class="bg-white rounded-xl border !shadow-none overflow-hidden jornada-panel"
          [class.border-gray-200]="(jornada._estadoVisual || jornada.estado) === 'programada'"
          [class.border-red-300]="(jornada._estadoVisual || jornada.estado) === 'en_curso'"
          [class.border-green-300]="(jornada._estadoVisual || jornada.estado) === 'finalizada'"
          [class.border-amber-300]="(jornada._estadoVisual || jornada.estado) === 'suspendida'"
          [class.bg-red-50\/30]="(jornada._estadoVisual || jornada.estado) === 'en_curso'"
          (opened)="!jornada._partidos && cargarPartidos(jornada)">
          <mat-expansion-panel-header>
            <mat-panel-title class="text-gray-900 font-semibold flex items-center gap-2">
              @switch (jornada._estadoVisual || jornada.estado) {
                @case ('finalizada') {
                  <mat-icon class="!text-green-600 !text-lg !w-5 !h-5">check_circle</mat-icon>
                }
                @case ('en_curso') {
                  <span class="relative flex h-2.5 w-2.5 shrink-0">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                  </span>
                }
                @case ('suspendida') {
                  <mat-icon class="!text-amber-600 !text-lg !w-5 !h-5">pause_circle</mat-icon>
                }
                @default {
                  <mat-icon class="!text-gray-400 !text-lg !w-5 !h-5">schedule</mat-icon>
                }
              }
              <span>Fecha {{ jornada.numero_jornada }} — {{ jornada.fase | uppercase }}</span>
            </mat-panel-title>
            <mat-panel-description class="text-gray-500 flex items-center gap-2 flex-wrap">
              @if (jornada.zona) {
                <span>Zona {{ jornada.zona.nombre }}</span>
              }
              <span class="badge" [class]="'badge-' + (jornada._estadoVisual || jornada.estado)">{{ jornada._estadoVisual || jornada.estado }}</span>
              @if (jornada.fecha) {
                <span class="inline-flex items-center gap-1 text-[11px]">
                  <mat-icon class="!text-xs !w-3.5 !h-3.5 text-gray-400">calendar_today</mat-icon>
                  {{ formatFecha(jornada.fecha) }}
                </span>
              }
            </mat-panel-description>
          </mat-expansion-panel-header>

          <div class="mt-2">
            <!-- Cambiar fecha calendario (admin) -->
            @if (auth.isAdmin()) {
              <div class="mb-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100 flex items-center gap-3 flex-wrap">
                <mat-icon class="!text-blue-600 !text-lg !w-5 !h-5 shrink-0">event</mat-icon>
                <span class="text-xs font-medium text-gray-600 shrink-0">Fecha:</span>
                <input type="date" [(ngModel)]="jornada._fechaEdit"
                  class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <label class="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer shrink-0">
                  <input type="checkbox" [(ngModel)]="jornada._syncOtraZona" class="w-3.5 h-3.5 accent-blue-600">
                  Aplicar tambien a la otra zona
                </label>
                <button (click)="guardarFechaJornada(jornada)" [disabled]="!jornada._fechaEdit || jornada._guardandoFecha"
                  class="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  @if (jornada._guardandoFecha) {
                    <mat-icon class="!text-xs !w-3.5 !h-3.5 animate-spin">autorenew</mat-icon>
                  } @else {
                    <mat-icon class="!text-xs !w-3.5 !h-3.5">save</mat-icon>
                  }
                  Guardar
                </button>
              </div>
            }

            @if (jornada._loading) {
              <p class="text-gray-400 text-sm py-3 text-center">Cargando partidos...</p>
            } @else if (!jornada._partidos) {
              <p class="text-gray-400 text-sm py-3 text-center">Expandir para cargar</p>
            } @else {
              <!-- Cruces agrupados -->
              @for (cruce of jornada._cruces; track cruce.key) {
                <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all mb-2">
                  <!-- Local -->
                  <div class="flex-1 flex items-center justify-end gap-2">
                    <span class="font-semibold text-gray-900 text-sm">{{ cruce.local }}</span>
                    @if (cruce.localEscudo) {
                      <img [src]="resolveUrl(cruce.localEscudo)" class="escudo-md shrink-0" alt="">
                    } @else {
                      <div class="escudo-md escudo-placeholder text-xs shrink-0"
                        [style.background-color]="cruce.localColor || '#762c7e'">
                        {{ initials(cruce.local) }}
                      </div>
                    }
                  </div>

                  <!-- Marcador / VS -->
                  @if (cruce.finalizados > 0) {
                    <div class="px-3 py-1 rounded-lg bg-gray-900 text-white shadow-sm text-center min-w-[70px]">
                      <div class="text-lg font-black leading-none">{{ cruce.puntosLocal }} - {{ cruce.puntosVisitante }}</div>
                      <div class="text-[8px] text-gray-400 mt-0.5">{{ cruce.finalizados }}/{{ cruce.partidos }} cat</div>
                    </div>
                  } @else {
                    <div class="px-3 py-1 rounded-full bg-white border border-gray-200 shadow-sm">
                      <span class="text-[10px] font-bold text-gray-500">VS</span>
                    </div>
                  }

                  <!-- Visitante -->
                  <div class="flex-1 flex items-center gap-2">
                    @if (cruce.visitEscudo) {
                      <img [src]="resolveUrl(cruce.visitEscudo)" class="escudo-md shrink-0" alt="">
                    } @else {
                      <div class="escudo-md escudo-placeholder text-xs shrink-0"
                        [style.background-color]="cruce.visitColor || '#762c7e'">
                        {{ initials(cruce.visitante) }}
                      </div>
                    }
                    <span class="font-semibold text-gray-900 text-sm">{{ cruce.visitante }}</span>
                  </div>

                  <div class="flex flex-col items-end gap-1 text-right min-w-[180px]">
                    <span class="text-[10px] text-gray-400 font-medium hidden md:inline">{{ cruce.partidos }} partidos</span>
                    @if (puedeCargarResultados()) {
                      <!-- Asignacion rapida a nivel cruce (aplica a todos los partidos) -->
                      <div class="flex items-center gap-1">
                        <mat-icon class="!text-xs !w-3 !h-3 text-gray-400">sports</mat-icon>
                        <select [ngModel]="arbitroComunCruce(cruce)" (ngModelChange)="setArbitroTodoCruce(cruce, $event)"
                          class="h-6 px-1.5 text-[11px] border border-gray-200 rounded bg-white focus:outline-none focus:border-blue-500 max-w-[140px]"
                          [class.border-amber-400]="!arbitroComunCruce(cruce) && !hayArbitrosEnCruce(cruce)"
                          [class.bg-amber-50]="!arbitroComunCruce(cruce) && !hayArbitrosEnCruce(cruce)">
                          <option [ngValue]="null">Sin arbitro</option>
                          @if (tieneAsignacionMixta(cruce, 'arbitro')) {
                            <option [ngValue]="'__mixto__'" disabled>— varios —</option>
                          }
                          @for (a of arbitros; track a.id) {
                            @let ocupA = recursoOcupadoEn(jornada, cruce, a.persona_id || a.id, 'arbitro');
                            <option [ngValue]="a.persona_id || a.id" [disabled]="!!ocupA">
                              {{ a.apellido }}, {{ a.nombre }}{{ ocupA ? ' — ' + ocupA : '' }}
                            </option>
                          }
                        </select>
                      </div>
                      <div class="flex items-center gap-1">
                        <mat-icon class="!text-xs !w-3 !h-3 text-gray-400">visibility</mat-icon>
                        <select [ngModel]="veedorComunCruce(cruce)" (ngModelChange)="setVeedorTodoCruce(cruce, $event)"
                          class="h-6 px-1.5 text-[11px] border border-gray-200 rounded bg-white focus:outline-none focus:border-blue-500 max-w-[140px]">
                          <option [ngValue]="null">Sin veedor</option>
                          @if (tieneAsignacionMixta(cruce, 'veedor')) {
                            <option [ngValue]="'__mixto__'" disabled>— varios —</option>
                          }
                          @for (v of veedores; track v.id) {
                            @let ocupV = recursoOcupadoEn(jornada, cruce, v.persona_id || v.id, 'veedor');
                            <option [ngValue]="v.persona_id || v.id" [disabled]="!!ocupV">
                              {{ v.apellido }}, {{ v.nombre }}{{ ocupV ? ' — ' + ocupV : '' }}
                            </option>
                          }
                        </select>
                      </div>
                    } @else {
                      @if (cruce.arbitroNombre) {
                        <span class="text-[10px] text-gray-600 flex items-center gap-1">
                          <mat-icon class="!text-xs !w-3 !h-3">sports</mat-icon>
                          {{ cruce.arbitroNombre }}
                        </span>
                      } @else {
                        <span class="text-[10px] text-amber-600 italic">sin arbitro</span>
                      }
                    }
                  </div>
                  @if (auth.isAdmin()) {
                    <button mat-icon-button class="!text-red-400 hover:!text-red-600" (click)="eliminarCruce(jornada, cruce)">
                      <mat-icon class="!text-lg">delete</mat-icon>
                    </button>
                  }
                </div>
                <!-- Barra de acciones del cruce -->
                <div class="ml-4 mr-4 mb-2 flex items-center justify-between gap-2 flex-wrap">
                  <button class="text-[11px] text-[var(--color-primario)] hover:underline cursor-pointer flex items-center gap-1"
                    (click)="cruce._showDetail = !cruce._showDetail">
                    <mat-icon class="!text-sm !w-4 !h-4">{{ cruce._showDetail ? 'expand_less' : 'expand_more' }}</mat-icon>
                    {{ cruce._showDetail ? 'Ocultar detalle' : 'Ver detalle por categoria' }}{{ puedeCargarResultados() ? ' y cargar resultados' : '' }}
                  </button>
                  @if (puedeCargarResultados() && tieneCambios(cruce)) {
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] text-amber-600 font-medium">Cambios sin guardar</span>
                      <button (click)="descartarCambios(cruce)"
                        class="px-2 py-1 rounded text-[11px] font-medium text-gray-600 hover:bg-gray-100">
                        Descartar
                      </button>
                      <button (click)="guardarResultadosCruce(jornada, cruce)" [disabled]="cruce._guardando"
                        class="inline-flex items-center gap-1 px-3 py-1 rounded bg-[var(--color-primario)] text-white text-[11px] font-medium hover:opacity-90 disabled:opacity-50">
                        @if (cruce._guardando) {
                          <mat-icon class="!text-xs !w-3.5 !h-3.5 animate-spin">autorenew</mat-icon>
                        } @else {
                          <mat-icon class="!text-xs !w-3.5 !h-3.5">save</mat-icon>
                        }
                        Guardar
                      </button>
                    </div>
                  }
                </div>
                @if (cruce._showDetail) {
                  <div class="ml-4 mr-4 mb-3 pl-3 border-l-2 border-gray-200 space-y-1 animate-fade-in">
                    @for (r of cruce.resultados; track r.partido_id) {
                      <div class="flex items-center gap-2 py-1 text-xs">
                        <!-- Hora -->
                        <span class="w-10 font-mono text-gray-400 shrink-0">{{ r.hora || '—' }}</span>
                        <!-- Categoria -->
                        <span class="w-16 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full text-center shrink-0"
                          [class]="r.es_preliminar ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-700'">
                          {{ r.categoria }}{{ r.es_preliminar ? ' *' : '' }}
                        </span>
                        <!-- Local nombre -->
                        <span class="flex-1 text-right truncate text-gray-700"
                          [class.font-bold]="r.estado === 'finalizado' && r.goles_local > r.goles_visitante">
                          {{ cruce.local }}
                        </span>
                        <!-- Marcador / inputs -->
                        @if (puedeCargarResultados()) {
                          <input type="number" min="0" [(ngModel)]="r._editLocal" (ngModelChange)="r._modificado = true"
                            class="w-11 h-7 text-center font-bold text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shrink-0">
                          <span class="text-gray-400 shrink-0">-</span>
                          <input type="number" min="0" [(ngModel)]="r._editVisitante" (ngModelChange)="r._modificado = true"
                            class="w-11 h-7 text-center font-bold text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shrink-0">
                        } @else {
                          @if (r.estado === 'finalizado' || r.estado === 'en_curso') {
                            <span class="font-bold w-7 text-center shrink-0"
                              [class]="r.goles_local > r.goles_visitante ? 'text-green-700' : r.goles_local < r.goles_visitante ? 'text-red-600' : 'text-gray-500'">
                              {{ r.goles_local }}
                            </span>
                            <span class="text-gray-300 shrink-0">-</span>
                            <span class="font-bold w-7 text-center shrink-0"
                              [class]="r.goles_visitante > r.goles_local ? 'text-green-700' : r.goles_visitante < r.goles_local ? 'text-red-600' : 'text-gray-500'">
                              {{ r.goles_visitante }}
                            </span>
                          } @else {
                            <span class="text-gray-400 italic w-16 text-center shrink-0">vs</span>
                          }
                        }
                        <!-- Visitante nombre -->
                        <span class="flex-1 truncate text-gray-700"
                          [class.font-bold]="r.estado === 'finalizado' && r.goles_visitante > r.goles_local">
                          {{ cruce.visitante }}
                        </span>
                        <!-- Estado badge -->
                        <span class="badge text-[9px]" [class]="'badge-' + r.estado">{{ r.estado }}</span>
                        <!-- Link al detalle -->
                        <a [routerLink]="['/partidos', r.partido_id]" class="text-gray-400 hover:text-gray-600 shrink-0" title="Ver partido">
                          <mat-icon class="!text-sm !w-4 !h-4">open_in_new</mat-icon>
                        </a>
                      </div>

                      <!-- Fila de asignacion: arbitro + veedor -->
                      <div class="flex items-center gap-2 pl-12 pb-1 text-[11px] text-gray-500">
                        <mat-icon class="!text-xs !w-3 !h-3 text-gray-400">sports</mat-icon>
                        @if (puedeCargarResultados()) {
                          <select [(ngModel)]="r._editArbitroId" (ngModelChange)="r._modificadoAsignacion = true"
                            class="h-6 px-1.5 text-[11px] border border-gray-200 rounded bg-white focus:outline-none focus:border-blue-500">
                            <option [ngValue]="null">Sin árbitro</option>
                            @for (a of arbitros; track a.id) {
                              @let ocupRA = recursoOcupadoEn(jornada, cruce, a.persona_id || a.id, 'arbitro');
                              <option [ngValue]="a.persona_id || a.id" [disabled]="!!ocupRA && r._editArbitroId !== (a.persona_id || a.id)">
                                {{ a.apellido || a.persona?.apellido }}, {{ a.nombre || a.persona?.nombre }}{{ ocupRA ? ' — ' + ocupRA : '' }}
                              </option>
                            }
                          </select>
                        } @else {
                          <span class="truncate">{{ arbitroNombre(r.arbitro_id) || 'sin árbitro' }}</span>
                        }
                        <mat-icon class="!text-xs !w-3 !h-3 text-gray-400 ml-3">visibility</mat-icon>
                        @if (puedeCargarResultados()) {
                          <select [(ngModel)]="r._editVeedorId" (ngModelChange)="r._modificadoAsignacion = true"
                            class="h-6 px-1.5 text-[11px] border border-gray-200 rounded bg-white focus:outline-none focus:border-blue-500">
                            <option [ngValue]="null">Sin veedor</option>
                            @for (v of veedores; track v.id) {
                              @let ocupRV = recursoOcupadoEn(jornada, cruce, v.persona_id || v.id, 'veedor');
                              <option [ngValue]="v.persona_id || v.id" [disabled]="!!ocupRV && r._editVeedorId !== (v.persona_id || v.id)">
                                {{ v.apellido || v.persona?.apellido }}, {{ v.nombre || v.persona?.nombre }}{{ ocupRV ? ' — ' + ocupRV : '' }}
                              </option>
                            }
                          </select>
                        } @else {
                          <span class="truncate">{{ veedorNombre(r.veedor_id) || 'sin veedor' }}</span>
                        }
                      </div>
                    }
                  </div>
                }
              }

              @if (!jornada._cruces?.length) {
                <p class="text-gray-400 text-center py-3">Sin cruces. Agrega enfrentamientos.</p>
              }

              <!-- Agregar cruce -->
              @if (auth.isAdmin()) {
                <mat-divider class="!my-3"></mat-divider>
                <div class="flex flex-wrap gap-3 items-end">
                  <mat-form-field appearance="outline" subscriptSizing="dynamic" class="flex-1 min-w-[150px]">
                    <mat-label>Club Local</mat-label>
                    <mat-select [(ngModel)]="cruceForm.club_local_id">
                      @for (c of clubesDisponibles(jornada); track c.id) {
                        <mat-option [value]="c.id">{{ c.nombre }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <span class="text-gray-400 font-medium pb-1">vs</span>
                  <mat-form-field appearance="outline" subscriptSizing="dynamic" class="flex-1 min-w-[150px]">
                    <mat-label>Club Visitante</mat-label>
                    <mat-select [(ngModel)]="cruceForm.club_visitante_id">
                      @for (c of clubesDisponibles(jornada); track c.id) {
                        <mat-option [value]="c.id" [disabled]="c.id === cruceForm.club_local_id">{{ c.nombre }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" subscriptSizing="dynamic" class="flex-1 min-w-[150px]">
                    <mat-label>Arbitro</mat-label>
                    <mat-select [(ngModel)]="cruceForm.arbitro_id">
                      <mat-option [value]="null">Sin asignar</mat-option>
                      @for (a of arbitros; track a.id) {
                        <mat-option [value]="a.id">{{ a.apellido }}, {{ a.nombre }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <button mat-flat-button color="primary" (click)="agregarCruce(jornada)" class="mb-0.5">
                    <mat-icon>add</mat-icon> Agregar cruce
                  </button>
                </div>
              }
            }

            <!-- Acciones de jornada -->
            @if (auth.isAdmin()) {
              <div class="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button mat-stroked-button color="warn" class="!text-xs" (click)="borrarJornada(jornada)">
                  <mat-icon class="!text-sm">delete</mat-icon> Eliminar fecha
                </button>
              </div>
            }
          </div>
            </mat-expansion-panel>
            } @empty {
              <p class="text-xs text-gray-400 italic px-2 py-3">Sin fechas en esta zona</p>
            }
          </div>
        } @empty {
          <div class="col-span-full">
            <mat-card class="bg-white rounded-xl border border-gray-200">
              <mat-card-content class="p-8 text-center text-gray-500">
                <mat-icon class="!text-5xl text-gray-300 mb-2">calendar_month</mat-icon>
                <p>No hay fechas creadas</p>
                @if (auth.isAdmin()) {
                  <p class="text-sm mt-1">Usa "Nueva Fecha" para crear las jornadas manualmente</p>
                }
              </mat-card-content>
            </mat-card>
          </div>
        }
      </div>

      <!-- Horarios de referencia -->
      <mat-card class="bg-white rounded-xl border border-gray-200">
        <mat-card-content class="p-4">
          <h4 class="text-sm font-semibold text-gray-700 mb-2">Horarios por categoria</h4>
          <div class="flex flex-wrap gap-3 text-xs text-gray-500">
            <span>14hs → 2013</span>
            <span>15hs → 2019</span>
            <span>16hs → 2014</span>
            <span>17hs → 2018</span>
            <span>18hs → 2017</span>
            <span>19hs → 2016</span>
            <span>20hs → 2015</span>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class FixtureComponent implements OnInit {
  zonas: any[] = [];
  clubes: any[] = [];
  ptsVictoria = 2;
  ptsEmpate = 1;
  arbitros: any[] = [];
  veedores: any[] = [];
  jornadas: any[] = [];
  jornadasFiltradas: any[] = [];
  jornadasPorZona: { zona: any; jornadas: any[] }[] = [];
  filtroFase: 'ida' | 'vuelta' | '' = '';
  mostrarFormJornada = false;
  formJornada: any = { numero_jornada: 1, zona_id: null, fase: 'ida', fecha: '' };
  cruceForm: any = { club_local_id: null, club_visitante_id: null, arbitro_id: null };
  private torneoId: number | null = null;

  constructor(
    private http: HttpClient, public auth: AuthService,
    private toastr: ToastrService, private branding: BrandingService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.branding.torneoActivoId$.subscribe(id => {
      if (id) { this.torneoId = id; this.cargarDatos(); }
    });
  }

  /** Scroll + auto-expand segun query params (?jornada=X&partido=Y) despues de cargar jornadas */
  private aplicarDeepLink() {
    const qp = this.route.snapshot.queryParamMap;
    const jornadaId = parseInt(qp.get('jornada') || '0');
    const partidoId = parseInt(qp.get('partido') || '0');
    if (!jornadaId) return;

    const jornada = this.jornadas.find(j => j.id === jornadaId);
    if (!jornada) return;

    // Asegurar que la fase del filtro incluya esta jornada
    if (this.filtroFase && jornada.fase !== this.filtroFase) {
      this.filtroFase = '';
      this.filtrar();
    }

    jornada._expandirDeepLink = true;
    jornada._partidoObjetivo = partidoId;
    // Scroll + expand despues del proximo render
    setTimeout(() => {
      const el = document.getElementById('jornada-' + jornadaId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Trigger expand via click programatico
        const header = el.querySelector('mat-expansion-panel-header');
        if (header && !jornada._partidos) (header as HTMLElement).click();
      }
    }, 200);
  }

  cargarDatos() {
    if (!this.torneoId) return;
    // Cargar zonas y clubes del torneo
    this.http.get<any>(`${environment.apiUrl}/torneos/${this.torneoId}`).subscribe({
      next: res => {
        this.zonas = res.data.zonas || [];
        this.clubes = res.data.clubes || [];
        // Leer config de puntos del torneo
        const cfg = res.data.config || {};
        this.ptsVictoria = cfg.puntos_victoria ?? 2;
        this.ptsEmpate = cfg.puntos_empate ?? 1;
        this.cargarJornadas();
        this.cdr.detectChanges();
      },
    });
    // Cargar arbitros del torneo
    this.http.get<any>(`${environment.apiUrl}/arbitros`, { params: { torneo_id: this.torneoId } }).subscribe({
      next: res => { this.arbitros = res.data || []; this.cdr.detectChanges(); },
    });
    // Cargar veedores del torneo
    this.http.get<any>(`${environment.apiUrl}/veedores`, { params: { torneo_id: this.torneoId } }).subscribe({
      next: res => { this.veedores = res.data || []; this.cdr.detectChanges(); },
    });
  }

  cargarJornadas() {
    if (!this.torneoId) return;
    this.http.get<any>(`${environment.apiUrl}/fixture/${this.torneoId}/jornadas`).subscribe({
      next: res => {
        // Pre-cargar _fechaEdit con el valor actual para el input del picker
        this.jornadas = (res.data || []).map((j: any) => ({ ...j, _fechaEdit: j.fecha || '', _syncOtraZona: true }));
        this.filtrar();
        this.aplicarDeepLink();
      },
      error: () => this.toastr.error('Error al cargar jornadas'),
    });
  }

  guardarFechaJornada(jornada: any) {
    if (!jornada._fechaEdit) return;
    jornada._guardandoFecha = true;
    this.cdr.detectChanges();

    const payload = { fecha: jornada._fechaEdit };
    const target = [jornada.id];

    // Si pidio sync a la otra zona, buscar la jornada hermana (mismo torneo, misma fase+numero, zona distinta)
    if (jornada._syncOtraZona) {
      const hermana = this.jornadas.find((j: any) =>
        j.id !== jornada.id &&
        j.fase === jornada.fase &&
        j.numero_jornada === jornada.numero_jornada &&
        j.zona_id !== jornada.zona_id,
      );
      if (hermana) target.push(hermana.id);
    }

    const calls = target.map(id =>
      this.http.put(`${environment.apiUrl}/fixture/jornada/${id}`, payload).toPromise(),
    );
    Promise.all(calls).then(() => {
      this.toastr.success(target.length > 1 ? 'Fecha guardada en ambas zonas' : 'Fecha guardada');
      // Actualizar en memoria sin recargar todo
      for (const id of target) {
        const j = this.jornadas.find((x: any) => x.id === id);
        if (j) { j.fecha = jornada._fechaEdit; j._fechaEdit = jornada._fechaEdit; }
      }
      jornada._guardandoFecha = false;
      this.filtrar();
    }).catch((e: any) => {
      this.toastr.error(e?.error?.message || 'Error al guardar');
      jornada._guardandoFecha = false;
      this.cdr.detectChanges();
    });
  }

  filtrar() {
    this.jornadasFiltradas = this.jornadas.filter(j => {
      if (this.filtroFase && j.fase !== this.filtroFase) return false;
      return true;
    });

    // Agrupar por zona, respetando orden de this.zonas
    const map = new Map<number, { zona: any; jornadas: any[] }>();
    for (const z of this.zonas) map.set(z.id, { zona: z, jornadas: [] });
    const sinZona: any[] = [];
    for (const j of this.jornadasFiltradas) {
      if (j.zona_id && map.has(j.zona_id)) map.get(j.zona_id)!.jornadas.push(j);
      else sinZona.push(j);
    }
    this.jornadasPorZona = [...map.values()].filter(g => g.jornadas.length);
    if (sinZona.length) this.jornadasPorZona.push({ zona: { id: 0, nombre: 'Sin zona', color: '#94a3b8' }, jornadas: sinZona });
    this.cdr.detectChanges();
  }

  setFase(f: 'ida' | 'vuelta' | '') {
    this.filtroFase = f;
    this.filtrar();
  }

  formatFecha(iso: string): string {
    if (!iso) return '';
    try {
      const d = new Date(iso + 'T12:00:00');  // forzar mediodia para evitar TZ
      const dia = d.toLocaleDateString('es-AR', { weekday: 'short' });
      const fecha = d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
      return `${dia.replace('.', '')} ${fecha.replace('.', '')}`;
    } catch { return iso; }
  }

  cargarPartidos(jornada: any) {
    jornada._loading = true;
    this.cdr.detectChanges();

    this.http.get<any>(`${environment.apiUrl}/fixture/jornada/${jornada.id}/partidos`).subscribe({
      next: res => {
        jornada._partidos = res.data;
        jornada._loading = false;
        // Agrupar por cruce (local+visitante)
        const cruces: Record<string, any> = {};
        for (const p of res.data) {
          const key = `${p.club_local_id}-${p.club_visitante_id}`;
          if (!cruces[key]) {
            cruces[key] = {
              key,
              local: p.clubLocal?.nombre_corto || p.clubLocal?.nombre,
              visitante: p.clubVisitante?.nombre_corto || p.clubVisitante?.nombre,
              club_local_id: p.club_local_id,
              club_visitante_id: p.club_visitante_id,
              localEscudo: p.clubLocal?.escudo_url,
              localColor: p.clubLocal?.color_primario,
              localColorSec: p.clubLocal?.color_secundario,
              visitEscudo: p.clubVisitante?.escudo_url,
              visitColor: p.clubVisitante?.color_primario,
              visitColorSec: p.clubVisitante?.color_secundario,
              arbitroId: p.arbitro_id,
              arbitroNombre: p.arbitro ? `${p.arbitro.apellido || ''} ${p.arbitro.nombre || ''}`.trim() : null,
              partidos: 0,
            };
          }
          cruces[key].partidos++;
          // Agregar resultado por categoria si finalizado
          if (!cruces[key].resultados) cruces[key].resultados = [];
          cruces[key].resultados.push({
            partido_id: p.id,
            categoria: p.categoria?.nombre,
            categoria_id: p.categoria_id,
            es_preliminar: p.categoria?.es_preliminar,
            estado: p.estado,
            goles_local: p.goles_local ?? 0,
            goles_visitante: p.goles_visitante ?? 0,
            arbitro_id: p.arbitro_id || null,
            veedor_id: p.veedor_id || null,
            _editLocal: p.goles_local ?? 0,
            _editVisitante: p.goles_visitante ?? 0,
            _editArbitroId: p.arbitro_id || null,
            _editVeedorId: p.veedor_id || null,
            _modificado: false,
            _modificadoAsignacion: false,
            hora: this.getHora(p),
          });
        }
        // Calcular puntos del cruce (sin preliminar, con config del torneo)
        for (const cruce of Object.values(cruces) as any[]) {
          let ptsLocal = 0, ptsVisit = 0;
          for (const r of (cruce.resultados || [])) {
            if (r.estado !== 'finalizado' || r.es_preliminar) continue;
            if (r.goles_local > r.goles_visitante) ptsLocal += this.ptsVictoria;
            else if (r.goles_local < r.goles_visitante) ptsVisit += this.ptsVictoria;
            else { ptsLocal += this.ptsEmpate; ptsVisit += this.ptsEmpate; }
          }
          cruce.puntosLocal = ptsLocal;
          cruce.puntosVisitante = ptsVisit;
          cruce.finalizados = cruce.resultados.filter((r: any) => r.estado === 'finalizado').length;
        }
        // Ordenar resultados dentro de cada cruce por categoria_id
        for (const cruce of Object.values(cruces) as any[]) {
          cruce.resultados.sort((a: any, b: any) => (a.categoria_id || 0) - (b.categoria_id || 0));
        }
        jornada._cruces = Object.values(cruces);

        // Actualizar estado visual de la jornada segun sus partidos
        const estados = res.data.map((p: any) => p.estado);
        if (estados.every((e: string) => e === 'finalizado')) {
          jornada._estadoVisual = 'finalizada';
        } else if (estados.some((e: string) => e === 'en_curso' || e === 'finalizado')) {
          jornada._estadoVisual = 'en_curso';
        } else {
          jornada._estadoVisual = 'programada';
        }

        // Si venimos de un deep-link, expandir el cruce que contiene el partido
        if (jornada._partidoObjetivo) {
          const cruce = (jornada._cruces as any[]).find((c: any) =>
            (c.resultados || []).some((r: any) => r.partido_id === jornada._partidoObjetivo),
          );
          if (cruce) cruce._showDetail = true;
          jornada._partidoObjetivo = null; // consumido
        }

        // Cargar en background todas las jornadas que caigan en la MISMA fecha
        // calendario (una persona no puede estar en 2 lugares el mismo dia).
        if (jornada.fecha) {
          const mismaFecha = this.jornadas.filter((j: any) =>
            j.id !== jornada.id && j.fecha === jornada.fecha,
          );
          for (const j of mismaFecha) {
            if (!j._cruces && !j._loading) this.cargarPartidos(j);
          }
        }

        this.cdr.detectChanges();
      },
      error: () => { jornada._loading = false; this.toastr.error('Error al cargar partidos'); this.cdr.detectChanges(); },
    });
  }

  /** Jornadas del torneo con la misma fecha calendario que la dada (incluye la misma jornada) */
  getJornadasMismaFecha(jornada: any): any[] {
    if (!jornada?.fecha) return [jornada];
    return this.jornadas.filter((j: any) => j.fecha === jornada.fecha);
  }

  clubesZona(zonaId: number | null): any[] {
    if (!zonaId) return this.clubes;
    return this.clubes.filter(c => c.zona_id === zonaId);
  }

  /** Devuelve solo los clubes que aun no tienen cruce en esta jornada */
  clubesDisponibles(jornada: any): any[] {
    const zonaClubes = this.clubesZona(jornada.zona_id);
    if (!jornada._cruces?.length) return zonaClubes;

    const usados = new Set<number>();
    for (const cruce of jornada._cruces) {
      usados.add(cruce.club_local_id);
      usados.add(cruce.club_visitante_id);
    }
    return zonaClubes.filter(c => !usados.has(c.id));
  }

  /** Puede cargar/editar resultados rapidamente desde Fixture: coordinador, admin_torneo o admin_sistema */
  puedeCargarResultados(): boolean {
    if (this.auth.isAdmin()) return true;
    return (this.auth.rolesActivos || []).includes('coordinador');
  }

  tieneCambios(cruce: any): boolean {
    return (cruce.resultados || []).some((r: any) => r._modificado || r._modificadoAsignacion);
  }

  descartarCambios(cruce: any) {
    for (const r of cruce.resultados || []) {
      r._editLocal = r.goles_local;
      r._editVisitante = r.goles_visitante;
      r._editArbitroId = r.arbitro_id;
      r._editVeedorId = r.veedor_id;
      r._modificado = false;
      r._modificadoAsignacion = false;
    }
    this.cdr.detectChanges();
  }

  guardarResultadosCruce(jornada: any, cruce: any) {
    const conCambios = (cruce.resultados || []).filter((r: any) => r._modificado || r._modificadoAsignacion);
    if (!conCambios.length) return;
    cruce._guardando = true;
    this.cdr.detectChanges();

    const calls: Promise<any>[] = [];
    for (const r of conCambios) {
      if (r._modificado) {
        calls.push(this.http.post(`${environment.apiUrl}/partidos/${r.partido_id}/resultado-rapido`, {
          goles_local: parseInt(r._editLocal) || 0,
          goles_visitante: parseInt(r._editVisitante) || 0,
        }).toPromise());
      }
      if (r._modificadoAsignacion) {
        calls.push(this.http.put(`${environment.apiUrl}/partidos/${r.partido_id}`, {
          arbitro_id: r._editArbitroId,
          veedor_id: r._editVeedorId,
        }).toPromise());
      }
    }

    Promise.all(calls).then(() => {
      this.toastr.success(`${conCambios.length} partido${conCambios.length > 1 ? 's' : ''} actualizado${conCambios.length > 1 ? 's' : ''}`);
      cruce._guardando = false;
      jornada._cruces = null;
      jornada._partidos = null;
      this.cargarPartidos(jornada);
    }).catch((e: any) => {
      cruce._guardando = false;
      this.toastr.error(e?.error?.message || 'Error al guardar');
      this.cdr.detectChanges();
    });
  }

  /**
   * Si una persona (arbitro o veedor) ya esta asignada a algun cruce de la
   * MISMA fecha calendario (cualquier jornada/zona que juegue ese dia),
   * devuelve texto descriptivo. Null si esta libre.
   */
  recursoOcupadoEn(jornada: any, cruceActual: any, personaId: number | null | undefined, tipo: 'arbitro' | 'veedor'): string | null {
    if (!personaId) return null;
    const key = tipo === 'arbitro' ? '_editArbitroId' : '_editVeedorId';

    // Si no hay fecha calendario, al menos validar contra la misma jornada (modelo antiguo)
    const jornadas = this.getJornadasMismaFecha(jornada).length
      ? this.getJornadasMismaFecha(jornada)
      : [jornada];

    for (const j of jornadas) {
      for (const c of j?._cruces || []) {
        // Saltar el cruce actual (es quien pregunta)
        if (j.id === jornada.id && (c === cruceActual || c.key === cruceActual?.key)) continue;
        if ((c.resultados || []).some((r: any) => r[key] === personaId)) {
          const zonaLabel = j.id !== jornada.id ? ` (${j.zona?.nombre || 'otra zona'})` : '';
          return `en ${c.local} vs ${c.visitante}${zonaLabel}`;
        }
      }
    }

    return null;
  }

  /** Devuelve el persona_id del arbitro si TODOS los partidos tienen el mismo, null si todos sin asignar, '__mixto__' si divergen */
  arbitroComunCruce(cruce: any): any {
    const ids = (cruce.resultados || []).map((r: any) => r._editArbitroId ?? null);
    if (!ids.length) return null;
    const first = ids[0];
    return ids.every((x: any) => x === first) ? first : '__mixto__';
  }
  veedorComunCruce(cruce: any): any {
    const ids = (cruce.resultados || []).map((r: any) => r._editVeedorId ?? null);
    if (!ids.length) return null;
    const first = ids[0];
    return ids.every((x: any) => x === first) ? first : '__mixto__';
  }
  tieneAsignacionMixta(cruce: any, tipo: 'arbitro' | 'veedor'): boolean {
    const key = tipo === 'arbitro' ? '_editArbitroId' : '_editVeedorId';
    const ids = (cruce.resultados || []).map((r: any) => r[key] ?? null);
    if (ids.length <= 1) return false;
    return !ids.every((x: any) => x === ids[0]);
  }
  hayArbitrosEnCruce(cruce: any): boolean {
    return (cruce.resultados || []).some((r: any) => !!r._editArbitroId);
  }
  /** Cascadea asignacion a todos los partidos del cruce */
  setArbitroTodoCruce(cruce: any, arbitroId: any) {
    if (arbitroId === '__mixto__') return;  // ignorar la opcion disabled
    for (const r of cruce.resultados || []) {
      if (r._editArbitroId !== arbitroId) {
        r._editArbitroId = arbitroId;
        r._modificadoAsignacion = true;
      }
    }
    this.cdr.detectChanges();
  }
  setVeedorTodoCruce(cruce: any, veedorId: any) {
    if (veedorId === '__mixto__') return;
    for (const r of cruce.resultados || []) {
      if (r._editVeedorId !== veedorId) {
        r._editVeedorId = veedorId;
        r._modificadoAsignacion = true;
      }
    }
    this.cdr.detectChanges();
  }

  arbitroNombre(personaId: number | null | undefined): string {
    if (!personaId) return '';
    const a = this.arbitros.find((x: any) => (x.persona_id || x.id) === personaId);
    if (!a) return '';
    return `${a.apellido || a.persona?.apellido || ''}, ${a.nombre || a.persona?.nombre || ''}`.replace(/^, |, $/g, '');
  }

  veedorNombre(personaId: number | null | undefined): string {
    if (!personaId) return '';
    const v = this.veedores.find((x: any) => (x.persona_id || x.id) === personaId);
    if (!v) return '';
    return `${v.apellido || v.persona?.apellido || ''}, ${v.nombre || v.persona?.nombre || ''}`.replace(/^, |, $/g, '');
  }

  getHora(partido: any): string {
    if (!partido.hora_inicio) return '';
    const d = new Date(partido.hora_inicio);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  resolveUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return url;
    return `${environment.apiUrl}${url}`;
  }

  initials(name: string | null | undefined): string {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  }

  // ─── Gestion manual ──────────────────────────────────────

  crearJornada() {
    if (!this.formJornada.numero_jornada || !this.formJornada.zona_id) {
      this.toastr.warning('Numero de fecha y zona son requeridos'); return;
    }
    this.http.post<any>(`${environment.apiUrl}/fixture/jornada`, {
      ...this.formJornada, torneo_id: this.torneoId,
    }).subscribe({
      next: () => {
        this.toastr.success('Fecha creada');
        this.mostrarFormJornada = false;
        this.formJornada.numero_jornada++;
        this.cargarJornadas();
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  agregarCruce(jornada: any) {
    if (!this.cruceForm.club_local_id || !this.cruceForm.club_visitante_id) {
      this.toastr.warning('Selecciona ambos clubes'); return;
    }
    if (this.cruceForm.club_local_id === this.cruceForm.club_visitante_id) {
      this.toastr.warning('Selecciona clubes diferentes'); return;
    }

    const localNombre = this.clubes.find((c: any) => c.id === this.cruceForm.club_local_id)?.nombre_corto || '?';
    const visitNombre = this.clubes.find((c: any) => c.id === this.cruceForm.club_visitante_id)?.nombre_corto || '?';

    this.http.post<any>(`${environment.apiUrl}/fixture/jornada/${jornada.id}/enfrentamiento`, this.cruceForm).subscribe({
      next: (res) => {
        this.toastr.success(`${localNombre} vs ${visitNombre} — ${res.data?.length || 7} partidos creados`);
        this.cruceForm = { club_local_id: null, club_visitante_id: null, arbitro_id: null };
        // Recargar partidos de la jornada para mostrar el nuevo cruce
        jornada._partidos = null;
        jornada._cruces = null;
        this.cargarPartidos(jornada);
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  eliminarCruce(jornada: any, cruce: any) {
    if (!confirm(`Eliminar cruce ${cruce.local} vs ${cruce.visitante} y sus ${cruce.partidos} partidos?`)) return;
    this.http.delete<any>(`${environment.apiUrl}/fixture/jornada/${jornada.id}/enfrentamiento`, {
      body: { club_local_id: cruce.club_local_id, club_visitante_id: cruce.club_visitante_id },
    }).subscribe({
      next: () => {
        this.toastr.success(`${cruce.local} vs ${cruce.visitante} eliminado`);
        jornada._partidos = null;
        jornada._cruces = null;
        this.cargarPartidos(jornada);
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  borrarJornada(jornada: any) {
    if (!confirm(`Eliminar Fecha ${jornada.numero_jornada} y todos sus partidos?`)) return;
    this.http.delete<any>(`${environment.apiUrl}/fixture/jornada/${jornada.id}`).subscribe({
      next: () => { this.toastr.success('Fecha eliminada'); this.cargarJornadas(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }
}
