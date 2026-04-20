import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { UpperCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { BrandingService } from '../../core/services/branding.service';
import { DniFirmaModalComponent, DniFirmaResult } from '../../shared/dni-firma-modal/dni-firma-modal.component';

type EventoTipo = 'gol' | 'amarilla' | 'azul' | 'roja' | 'falta';

@Component({
  selector: 'app-panel-control',
  standalone: true,
  imports: [RouterLink, FormsModule, UpperCasePipe, MatIconModule, DniFirmaModalComponent],
  template: `
    @if (partido) {
      <div class="min-h-screen bg-slate-50" [class.fixed]="isFullscreen" [class.inset-0]="isFullscreen" [class.z-[9999]]="isFullscreen" [class.overflow-y-auto]="isFullscreen" [class.bg-white]="isFullscreen">

        <!-- ═══ A) Top bar ═══ -->
        <div class="flex items-center justify-between px-4 py-2 bg-gray-900 text-white text-sm">
          <a [routerLink]="['/partidos', partido.id]" class="flex items-center gap-1 hover:text-gray-300">
            <mat-icon class="!text-base !w-5 !h-5">arrow_back</mat-icon>
            <span>Detalle</span>
          </a>
          <div class="text-xs text-gray-400 text-center">
            {{ partido.categoria?.nombre }} · Fecha {{ partido.jornada?.numero_jornada }}
            @if (faseLabel()) { · <span class="text-white font-medium">{{ faseLabel() }}</span> }
          </div>
          <button (click)="toggleFullscreen()" class="p-1.5 rounded hover:bg-gray-700">
            <mat-icon class="!text-base !w-5 !h-5">{{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
          </button>
        </div>

        <!-- ═══ B) Marcador / Scoreboard ═══ -->
        <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-5 text-white relative overflow-hidden"
          [style.background]="'linear-gradient(135deg, ' + localColor + ' 0%, ' + localColorSec + ' 40%, ' + visitColorSec + ' 60%, ' + visitColor + ' 100%)'">
          <!-- Local -->
          <div class="flex items-center justify-end gap-3 text-right min-w-0">
            <div class="flex-shrink-0 w-16 h-16">
              @if (partido.clubLocal?.escudo_url) {
                <img [src]="resolveUrl(partido.clubLocal.escudo_url)" class="w-full h-full rounded-xl object-cover border-[3px] border-white shadow-lg" alt="">
              } @else {
                <div class="w-full h-full rounded-xl flex items-center justify-center text-2xl font-extrabold text-white border-[3px] border-white shadow-lg"
                  [style.background-color]="localColor">
                  {{ initials(partido.clubLocal?.nombre_corto || partido.clubLocal?.nombre) }}
                </div>
              }
            </div>
            <div class="font-bold uppercase text-sm leading-tight text-shadow min-w-0 truncate">{{ partido.clubLocal?.nombre_corto || partido.clubLocal?.nombre }}</div>
            <div class="text-6xl font-black leading-none min-w-[3.5rem] text-center" style="text-shadow: 0 4px 8px rgba(0,0,0,0.4)">{{ partido.goles_local }}</div>
          </div>

          <!-- Centro: reloj + periodo -->
          <div class="text-center px-2">
            <div class="text-2xl font-extrabold font-mono bg-black/30 px-4 py-2 rounded-lg border-2 border-white/30">{{ formatClock() }}</div>
            <div class="text-[0.65rem] font-bold mt-1 uppercase flex items-center justify-center gap-1.5 opacity-90">
              @if (partido.estado === 'programado') { <span>PREPARACION</span> }
              @else if (partido.estado === 'en_curso') {
                <span class="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                @if (partido.periodo_actual) { T{{ partido.periodo_actual }} }
                EN VIVO
              }
              @else if (partido.estado === 'finalizado') {
                @if (partido.confirmado_arbitro) { <span>CONFIRMADO</span> }
                @else { <span>FINAL</span> }
              }
              @else { <span>{{ partido.estado | uppercase }}</span> }
            </div>
            @if (configTorneo.reloj_parado && partido.estado === 'en_curso') {
              <button (click)="relojPausado = !relojPausado" class="mt-2 text-xs bg-white/20 px-2 py-1 rounded">
                <mat-icon class="!text-xs !w-3 !h-3 align-middle">{{ relojPausado ? 'play_arrow' : 'pause' }}</mat-icon>
                {{ relojPausado ? 'RELOJ PARADO' : 'CORRIENDO' }}
              </button>
            }
          </div>

          <!-- Visitante -->
          <div class="flex items-center justify-start gap-3 text-left min-w-0">
            <div class="text-6xl font-black leading-none min-w-[3.5rem] text-center" style="text-shadow: 0 4px 8px rgba(0,0,0,0.4)">{{ partido.goles_visitante }}</div>
            <div class="font-bold uppercase text-sm leading-tight text-shadow min-w-0 truncate">{{ partido.clubVisitante?.nombre_corto || partido.clubVisitante?.nombre }}</div>
            <div class="flex-shrink-0 w-16 h-16">
              @if (partido.clubVisitante?.escudo_url) {
                <img [src]="resolveUrl(partido.clubVisitante.escudo_url)" class="w-full h-full rounded-xl object-cover border-[3px] border-white shadow-lg" alt="">
              } @else {
                <div class="w-full h-full rounded-xl flex items-center justify-center text-2xl font-extrabold text-white border-[3px] border-white shadow-lg"
                  [style.background-color]="visitColor">
                  {{ initials(partido.clubVisitante?.nombre_corto || partido.clubVisitante?.nombre) }}
                </div>
              }
            </div>
          </div>

          <!-- Contador de faltas (solo si config lo habilita y partido en curso) -->
          @if (configTorneo.contar_faltas && partido.estado === 'en_curso') {
            <div class="grid grid-cols-3 items-center gap-2 px-4 py-2 bg-gray-900/90 text-white border-t border-white/20">
              <!-- Local -->
              <div class="flex items-center gap-2 justify-end">
                <span class="text-[10px] uppercase text-gray-400 font-semibold tracking-wide hidden sm:inline">Faltas T{{ partido.periodo_actual }}</span>
                <span class="sm:hidden text-[10px] uppercase text-gray-400 font-semibold">T{{ partido.periodo_actual }}</span>
                <div class="inline-flex items-center justify-center min-w-[44px] h-9 px-2 rounded-lg font-extrabold text-xl tabular-nums shadow-sm"
                  [class]="faltaColorClass(contarFaltasPeriodo('local'))">
                  {{ contarFaltasPeriodo('local') }}
                </div>
              </div>

              <!-- Centro: aviso si alguno llego a 5+ -->
              <div class="text-center">
                @if (contarFaltasPeriodo('local') >= 6 || contarFaltasPeriodo('visitante') >= 6) {
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white animate-pulse">
                    ⚠ TIRO LIBRE DIRECTO
                  </span>
                } @else if (contarFaltasPeriodo('local') >= 5 || contarFaltasPeriodo('visitante') >= 5) {
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">
                    ⚠ ALERTA 5ta FALTA
                  </span>
                } @else {
                  <span class="text-[10px] uppercase text-gray-500 tracking-wide">Faltas acumuladas</span>
                }
              </div>

              <!-- Visitante -->
              <div class="flex items-center gap-2 justify-start">
                <div class="inline-flex items-center justify-center min-w-[44px] h-9 px-2 rounded-lg font-extrabold text-xl tabular-nums shadow-sm"
                  [class]="faltaColorClass(contarFaltasPeriodo('visitante'))">
                  {{ contarFaltasPeriodo('visitante') }}
                </div>
                <span class="text-[10px] uppercase text-gray-400 font-semibold tracking-wide hidden sm:inline">Faltas T{{ partido.periodo_actual }}</span>
                <span class="sm:hidden text-[10px] uppercase text-gray-400 font-semibold">T{{ partido.periodo_actual }}</span>
              </div>
            </div>
          }
        </div>

        <!-- ═══ C) FASE PREPARACION ═══ -->
        @if (fase === 'preparacion') {
          <div class="p-3">
            <div class="text-center mb-3">
              <h2 class="text-lg font-bold text-gray-900">Preparacion del partido</h2>
              <p class="text-sm text-gray-500">Selecciona jugadores y asigna camiseta</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <!-- Alineacion LOCAL -->
              <div class="bg-white rounded-xl border-2 overflow-hidden" [class.border-green-500]="alineacion.confirmado_local" [class.border-gray-200]="!alineacion.confirmado_local">
                <div class="flex items-center justify-between px-3 py-2.5 text-white"
                  [style.background]="'linear-gradient(135deg, ' + localColor + ', ' + localColorSec + ')'">
                  <div class="flex items-center gap-2">
                    @if (partido.clubLocal?.escudo_url) {
                      <img [src]="resolveUrl(partido.clubLocal.escudo_url)" class="w-8 h-8 rounded object-cover border-2 border-white" alt="">
                    }
                    <div>
                      <p class="font-bold text-sm">{{ partido.clubLocal?.nombre_corto || partido.clubLocal?.nombre }}</p>
                      <p class="text-[0.65rem] opacity-90">LOCAL · {{ contarAlineados('local') }} jugadores</p>
                    </div>
                  </div>
                  @if (alineacion.confirmado_local) {
                    <mat-icon class="!text-xl text-green-300">verified</mat-icon>
                  }
                </div>

                <div class="max-h-[400px] overflow-y-auto p-1.5 space-y-1">
                  @for (j of jugadoresLocal; track j.id) {
                    <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
                      [class.bg-green-50]="esAlineado(j.id) && !j.inhabilitado"
                      [class.bg-red-50]="j.inhabilitado"
                      [class.hover:bg-gray-50]="!esAlineado(j.id) && !j.inhabilitado"
                      [title]="j.inhabilitado ? ('INHABILITADO: ' + (j.sancion?.motivo || '').replaceAll('_', ' ') + ' · ' + j.sancion?.fechas_suspension + 'f') : ''">
                      <input type="checkbox"
                        class="w-4 h-4 cursor-pointer accent-green-600 flex-shrink-0"
                        [checked]="esAlineado(j.id)"
                        [disabled]="alineacion.confirmado_local || j.inhabilitado"
                        (change)="toggleAlineado(j, partido.club_local_id, $event)">
                      @if (esAlineado(j.id)) {
                        <input type="number"
                          class="w-[50px] px-1 py-0.5 border-2 border-gray-300 rounded text-center font-bold text-sm focus:outline-none focus:border-blue-500"
                          placeholder="#"
                          [value]="getCamiseta(j.id)"
                          [disabled]="alineacion.confirmado_local"
                          min="1" max="99"
                          (change)="setCamiseta(j, partido.club_local_id, $event)">
                      }
                      <div class="flex-1 min-w-0">
                        <span class="text-sm font-bold text-gray-900 uppercase truncate" [class.line-through]="j.inhabilitado" [class.text-red-600]="j.inhabilitado">{{ j.apellido }}</span>
                        <span class="text-xs text-gray-500 ml-1 truncate" [class.line-through]="j.inhabilitado">{{ j.nombre }}</span>
                        @if (j.inhabilitado) {
                          <mat-icon class="!text-sm !w-4 !h-4 text-red-600 ml-1" title="Inhabilitado por sancion">block</mat-icon>
                        }
                      </div>
                    </div>
                  }
                </div>

                @if (!alineacion.confirmado_local) {
                  <button class="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed"
                    (click)="abrirConfirmacion('local')" [disabled]="contarAlineados('local') < 5">
                    <mat-icon>how_to_reg</mat-icon> Confirmar Alineacion Local
                  </button>
                }
              </div>

              <!-- Alineacion VISITANTE -->
              <div class="bg-white rounded-xl border-2 overflow-hidden" [class.border-green-500]="alineacion.confirmado_visitante" [class.border-gray-200]="!alineacion.confirmado_visitante">
                <div class="flex items-center justify-between px-3 py-2.5 text-white"
                  [style.background]="'linear-gradient(135deg, ' + visitColor + ', ' + visitColorSec + ')'">
                  <div class="flex items-center gap-2">
                    @if (partido.clubVisitante?.escudo_url) {
                      <img [src]="resolveUrl(partido.clubVisitante.escudo_url)" class="w-8 h-8 rounded object-cover border-2 border-white" alt="">
                    }
                    <div>
                      <p class="font-bold text-sm">{{ partido.clubVisitante?.nombre_corto || partido.clubVisitante?.nombre }}</p>
                      <p class="text-[0.65rem] opacity-90">VISITANTE · {{ contarAlineados('visitante') }} jugadores</p>
                    </div>
                  </div>
                  @if (alineacion.confirmado_visitante) {
                    <mat-icon class="!text-xl text-green-300">verified</mat-icon>
                  }
                </div>

                <div class="max-h-[400px] overflow-y-auto p-1.5 space-y-1">
                  @for (j of jugadoresVisitante; track j.id) {
                    <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
                      [class.bg-green-50]="esAlineado(j.id) && !j.inhabilitado"
                      [class.bg-red-50]="j.inhabilitado"
                      [class.hover:bg-gray-50]="!esAlineado(j.id) && !j.inhabilitado"
                      [title]="j.inhabilitado ? ('INHABILITADO: ' + (j.sancion?.motivo || '').replaceAll('_', ' ') + ' · ' + j.sancion?.fechas_suspension + 'f') : ''">
                      <input type="checkbox"
                        class="w-4 h-4 cursor-pointer accent-green-600 flex-shrink-0"
                        [checked]="esAlineado(j.id)"
                        [disabled]="alineacion.confirmado_visitante || j.inhabilitado"
                        (change)="toggleAlineado(j, partido.club_visitante_id, $event)">
                      @if (esAlineado(j.id)) {
                        <input type="number"
                          class="w-[50px] px-1 py-0.5 border-2 border-gray-300 rounded text-center font-bold text-sm focus:outline-none focus:border-blue-500"
                          placeholder="#"
                          [value]="getCamiseta(j.id)"
                          [disabled]="alineacion.confirmado_visitante"
                          min="1" max="99"
                          (change)="setCamiseta(j, partido.club_visitante_id, $event)">
                      }
                      <div class="flex-1 min-w-0">
                        <span class="text-sm font-bold text-gray-900 uppercase truncate" [class.line-through]="j.inhabilitado" [class.text-red-600]="j.inhabilitado">{{ j.apellido }}</span>
                        <span class="text-xs text-gray-500 ml-1 truncate" [class.line-through]="j.inhabilitado">{{ j.nombre }}</span>
                        @if (j.inhabilitado) {
                          <mat-icon class="!text-sm !w-4 !h-4 text-red-600 ml-1" title="Inhabilitado por sancion">block</mat-icon>
                        }
                      </div>
                    </div>
                  }
                </div>

                @if (!alineacion.confirmado_visitante) {
                  <button class="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed"
                    (click)="abrirConfirmacion('visitante')" [disabled]="contarAlineados('visitante') < 5">
                    <mat-icon>how_to_reg</mat-icon> Confirmar Alineacion Visitante
                  </button>
                }
              </div>
            </div>

            <!-- Boton INICIAR cuando ambas confirmadas -->
            @if (alineacion.confirmado_local && alineacion.confirmado_visitante) {
              <div class="text-center pt-4">
                <button class="inline-flex flex-col items-center gap-2 px-12 py-5 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 text-white font-bold text-lg shadow-xl hover:shadow-2xl active:scale-[0.97] transition-all min-w-[280px]"
                  (click)="iniciarPeriodo(1)">
                  <mat-icon class="!text-4xl !w-10 !h-10">play_arrow</mat-icon>
                  <span>INICIAR PRIMER TIEMPO</span>
                </button>
              </div>
            }
          </div>
        }

        <!-- ═══ D) FASE EN CURSO ═══ -->
        @if (fase === 'en_curso_tiempo') {
          <div class="p-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <!-- Columna LOCAL -->
              <div>
                <div class="flex items-center gap-2 mb-2 px-1">
                  @if (partido.clubLocal?.escudo_url) {
                    <img [src]="resolveUrl(partido.clubLocal.escudo_url)" class="w-6 h-6 rounded object-cover" alt="">
                  }
                  <span class="text-sm font-bold text-gray-700 uppercase">{{ partido.clubLocal?.nombre_corto || partido.clubLocal?.nombre }}</span>
                  <span class="text-xs text-gray-400">({{ alineacionVisible('local').length }})</span>
                </div>
                <div class="space-y-1.5">
                  @for (a of alineacionVisible('local'); track a.id) {
                    <div class="rounded-lg border p-1.5 bg-white flex items-center gap-2" [class.border-gray-200]="!a._roja" [class.border-red-300]="a._roja" [class.bg-red-50]="a._roja">
                        <!-- Badge dorsal -->
                        <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                          [style.background-color]="localColor">
                          {{ a.numero_camiseta || '?' }}
                        </div>
                        <!-- Nombre -->
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-bold uppercase truncate" [class.line-through]="a._roja" [class.text-red-400]="a._roja">{{ a.jugador?.apellido }}</div>
                          <div class="text-[0.65rem] text-gray-500 truncate">{{ a.jugador?.nombre }}</div>
                        </div>
                        <!-- Acumuladores -->
                        @if (a._goles) {
                          <span class="inline-flex items-center gap-0.5 text-xs font-bold bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">⚽ {{ a._goles }}</span>
                        }
                        @if (a._amarillas) {
                          <span class="text-xs">🟡</span>
                        }
                        @if (a._roja) {
                          <span class="text-xs">🔴</span>
                        }
                      <!-- Botones de accion (al margen derecho) -->
                      @if (!a._roja) {
                        <div class="flex items-center gap-1 ml-auto shrink-0">
                          <button class="w-9 h-9 rounded-lg bg-green-500 text-white text-sm font-bold flex items-center justify-center active:scale-90 transition-transform shadow-sm"
                            title="Gol"
                            (click)="registrarEventoDirecto('gol', a, 'local')">⚽</button>
                          <button class="w-9 h-9 rounded-lg bg-yellow-400 text-gray-900 text-sm font-bold flex items-center justify-center active:scale-90 transition-transform shadow-sm"
                            title="Amarilla"
                            (click)="registrarEventoDirecto('amarilla', a, 'local')">🟡</button>
                          @if (configTorneo.tarjeta_azul_habilitada) {
                            <button class="w-9 h-9 rounded-lg bg-blue-500 text-white text-sm font-bold flex items-center justify-center active:scale-90 transition-transform shadow-sm"
                              title="Azul"
                              (click)="registrarEventoDirecto('azul', a, 'local')">🔵</button>
                          }
                          <button class="w-9 h-9 rounded-lg bg-red-600 text-white text-sm font-bold flex items-center justify-center active:scale-90 transition-transform shadow-sm"
                            title="Roja"
                            (click)="registrarEventoDirecto('roja', a, 'local')">🔴</button>
                          @if (configTorneo.contar_faltas) {
                            <button class="w-9 h-9 rounded-lg bg-orange-400 text-white text-sm font-bold flex items-center justify-center active:scale-90 transition-transform shadow-sm"
                              title="Falta"
                              (click)="registrarEventoDirecto('falta', a, 'local')">⚠️</button>
                          }
                        </div>
                      }
                    </div>
                  }
                  @if (!alineacionVisible('local').length) {
                    <div class="text-center py-6 text-gray-400 text-sm">Sin jugadores alineados</div>
                  }
                </div>
              </div>

              <!-- Columna VISITANTE -->
              <div>
                <div class="flex items-center gap-2 mb-2 px-1">
                  @if (partido.clubVisitante?.escudo_url) {
                    <img [src]="resolveUrl(partido.clubVisitante.escudo_url)" class="w-6 h-6 rounded object-cover" alt="">
                  }
                  <span class="text-sm font-bold text-gray-700 uppercase">{{ partido.clubVisitante?.nombre_corto || partido.clubVisitante?.nombre }}</span>
                  <span class="text-xs text-gray-400">({{ alineacionVisible('visitante').length }})</span>
                </div>
                <div class="space-y-1.5">
                  @for (a of alineacionVisible('visitante'); track a.id) {
                    <div class="rounded-lg border p-1.5 bg-white flex items-center gap-2" [class.border-gray-200]="!a._roja" [class.border-red-300]="a._roja" [class.bg-red-50]="a._roja">
                        <!-- Badge dorsal -->
                        <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                          [style.background-color]="visitColor">
                          {{ a.numero_camiseta || '?' }}
                        </div>
                        <!-- Nombre -->
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-bold uppercase truncate" [class.line-through]="a._roja" [class.text-red-400]="a._roja">{{ a.jugador?.apellido }}</div>
                          <div class="text-[0.65rem] text-gray-500 truncate">{{ a.jugador?.nombre }}</div>
                        </div>
                        <!-- Acumuladores -->
                        @if (a._goles) {
                          <span class="inline-flex items-center gap-0.5 text-xs font-bold bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">⚽ {{ a._goles }}</span>
                        }
                        @if (a._amarillas) {
                          <span class="text-xs">🟡</span>
                        }
                        @if (a._roja) {
                          <span class="text-xs">🔴</span>
                        }
                      <!-- Botones de accion (al margen derecho) -->
                      @if (!a._roja) {
                        <div class="flex items-center gap-1 ml-auto shrink-0">
                          <button class="w-9 h-9 rounded-lg bg-green-500 text-white text-sm font-bold flex items-center justify-center active:scale-90 transition-transform shadow-sm"
                            title="Gol"
                            (click)="registrarEventoDirecto('gol', a, 'visitante')">⚽</button>
                          <button class="w-9 h-9 rounded-lg bg-yellow-400 text-gray-900 text-sm font-bold flex items-center justify-center active:scale-90 transition-transform shadow-sm"
                            title="Amarilla"
                            (click)="registrarEventoDirecto('amarilla', a, 'visitante')">🟡</button>
                          @if (configTorneo.tarjeta_azul_habilitada) {
                            <button class="w-9 h-9 rounded-lg bg-blue-500 text-white text-sm font-bold flex items-center justify-center active:scale-90 transition-transform shadow-sm"
                              title="Azul"
                              (click)="registrarEventoDirecto('azul', a, 'visitante')">🔵</button>
                          }
                          <button class="w-9 h-9 rounded-lg bg-red-600 text-white text-sm font-bold flex items-center justify-center active:scale-90 transition-transform shadow-sm"
                            title="Roja"
                            (click)="registrarEventoDirecto('roja', a, 'visitante')">🔴</button>
                          @if (configTorneo.contar_faltas) {
                            <button class="w-9 h-9 rounded-lg bg-orange-400 text-white text-sm font-bold flex items-center justify-center active:scale-90 transition-transform shadow-sm"
                              title="Falta"
                              (click)="registrarEventoDirecto('falta', a, 'visitante')">⚠️</button>
                          }
                        </div>
                      }
                    </div>
                  }
                  @if (!alineacionVisible('visitante').length) {
                    <div class="text-center py-6 text-gray-400 text-sm">Sin jugadores alineados</div>
                  }
                </div>
              </div>
            </div>

            <!-- Boton FIN periodo -->
            <button class="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-gray-700 to-gray-900 text-white text-xl font-bold flex items-center justify-center gap-3 active:scale-[0.97] transition-transform shadow-lg"
              (click)="finalizarPeriodoActual()">
              <mat-icon class="!text-3xl !w-8 !h-8">stop_circle</mat-icon>
              FIN T{{ partido.periodo_actual }}
            </button>
          </div>
        }

        <!-- ═══ E) FASE DESCANSO ═══ -->
        @if (fase === 'descanso') {
          <div class="p-8 text-center space-y-6">
            <div class="inline-flex items-center gap-3 px-8 py-5 rounded-2xl bg-blue-50 border-2 border-blue-300 text-blue-700">
              <mat-icon class="!text-4xl !w-10 !h-10">local_cafe</mat-icon>
              <div class="text-left">
                <p class="text-2xl font-bold">DESCANSO</p>
                <p class="text-sm">Fin del Tiempo {{ partido.periodo_actual }}</p>
              </div>
            </div>
            <div>
              <button class="inline-flex flex-col items-center gap-2 px-12 py-5 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 text-white font-bold text-lg shadow-xl hover:shadow-2xl active:scale-[0.97] transition-all min-w-[280px]"
                (click)="iniciarPeriodo(partido.periodo_actual + 1)">
                <mat-icon class="!text-4xl !w-10 !h-10">play_arrow</mat-icon>
                <span>INICIAR TIEMPO {{ partido.periodo_actual + 1 }}</span>
              </button>
            </div>
          </div>
        }

        <!-- ═══ F) FASE FINALIZADO ═══ -->
        @if (fase === 'finalizado') {
          <div class="p-6 space-y-5">
            <!-- Banner resultado -->
            <div class="flex items-center justify-center">
              @if (!partido.confirmado_arbitro) {
                <div class="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-700">
                  <mat-icon class="!text-3xl">hourglass_empty</mat-icon>
                  <div class="text-left">
                    <p class="text-xl font-bold">PARTIDO TERMINADO</p>
                    <p class="text-sm">{{ partido.goles_local }} - {{ partido.goles_visitante }} · Pendiente de cierre</p>
                  </div>
                </div>
              } @else {
                <div class="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-green-50 border-2 border-green-500 text-green-700">
                  <mat-icon class="!text-3xl">verified</mat-icon>
                  <div class="text-left">
                    <p class="text-xl font-bold">CONFIRMADO</p>
                    <p class="text-sm">{{ partido.goles_local }} - {{ partido.goles_visitante }} · Partido cerrado</p>
                  </div>
                </div>
              }
            </div>

            @if (!partido.confirmado_arbitro) {
              <div class="max-w-md mx-auto space-y-4">

                <!-- Mejor jugador del partido -->
                @if (configTorneo.elegir_mejor_jugador) {
                  <div class="bg-white rounded-xl border border-gray-200 p-4">
                    <label class="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                      <mat-icon class="!text-lg text-yellow-500">star</mat-icon>
                      Mejor jugador del partido
                    </label>
                    <select [(ngModel)]="mejorJugadorId"
                      class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-[var(--color-primario)] focus:border-transparent outline-none">
                      <option [ngValue]="null">— Seleccionar —</option>
                      @for (a of todosAlineados(); track a.persona_id || a.jugador?.id) {
                        <option [ngValue]="a.persona_id || a.jugador?.id">
                          {{ a.jugador?.apellido }}, {{ a.jugador?.nombre }} (#{{ a.numero_camiseta }})
                          — {{ a.club_id === partido.club_local_id ? (partido.clubLocal?.nombre_corto) : (partido.clubVisitante?.nombre_corto) }}
                        </option>
                      }
                    </select>
                  </div>
                }

                <!-- Calificacion del arbitro se hace DESPUES del cierre -->

                <!-- Boton cerrar -->
                @if (auth.getUser()?.rol === 'arbitro' || auth.isAdmin()) {
                  <button class="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold text-base shadow-xl hover:shadow-2xl active:scale-[0.97] transition-all"
                    (click)="guardarYCerrar()">
                    <mat-icon class="!text-2xl">verified</mat-icon>
                    CERRAR PARTIDO
                  </button>
                }
              </div>
            }

            <!-- Info post-cierre -->
            @if (partido.confirmado_arbitro) {
              <div class="max-w-md mx-auto space-y-3">
                <!-- MVP asignado -->
                @if (partido.mejor_jugador_id && partido.mejorJugador) {
                  <div class="flex items-center gap-2 p-3 bg-yellow-50 rounded-xl border border-yellow-200 text-sm">
                    <mat-icon class="text-yellow-500">star</mat-icon>
                    <span class="text-gray-600">MVP:</span>
                    <strong class="text-gray-900">{{ partido.mejorJugador.apellido }}, {{ partido.mejorJugador.nombre }}</strong>
                  </div>
                }

                <!-- Calificacion del arbitro — post cierre, delegados/veedores pueden calificar -->
                @if (configTorneo.calificar_arbitro) {
                  @if (partido.calificacion_arbitro) {
                    <!-- Ya calificado -->
                    <div class="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200 text-sm">
                      <mat-icon class="text-blue-500">gavel</mat-icon>
                      <span class="text-gray-600">Arbitro:</span>
                      @for (s of [1,2,3,4,5]; track s) {
                        <span class="text-lg" [class]="s <= partido.calificacion_arbitro ? 'text-yellow-500' : 'text-gray-300'">★</span>
                      }
                      @if (partido.comentario_arbitro) {
                        <span class="text-xs text-gray-400 italic ml-1">{{ partido.comentario_arbitro }}</span>
                      }
                    </div>
                  } @else {
                    <!-- Pendiente de calificacion — delegados/veedores/admin pueden calificar -->
                    <div class="bg-white rounded-xl border border-gray-200 p-4">
                      <label class="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                        <mat-icon class="!text-lg text-blue-500">gavel</mat-icon>
                        Calificar al arbitro
                      </label>
                      <div class="flex items-center gap-1 mb-2">
                        @for (star of [1,2,3,4,5]; track star) {
                          <button (click)="calificacionArbitro = star"
                            class="w-11 h-11 rounded-lg flex items-center justify-center text-2xl transition-all"
                            [class]="star <= calificacionArbitro ? 'bg-yellow-100 text-yellow-500 scale-110' : 'bg-gray-100 text-gray-300 hover:bg-gray-200'">
                            ★
                          </button>
                        }
                        @if (calificacionArbitro) {
                          <span class="ml-2 text-sm font-bold text-yellow-600">{{ calificacionArbitro }}/5</span>
                        }
                      </div>
                      <input type="text" [(ngModel)]="comentarioArbitro"
                        placeholder="Comentario opcional..."
                        class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:ring-2 focus:ring-blue-400">
                      @if (calificacionArbitro) {
                        <button class="w-full py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
                          (click)="guardarCalificacion()">
                          Enviar calificacion
                        </button>
                      }
                    </div>
                  }
                }
              </div>
            }
          </div>
        }

        <!-- ═══ G) Timeline de eventos ═══ -->
        @if (partido.eventos?.length) {
          <div class="px-3 py-2 bg-gray-50 border-t border-gray-200">
            <h3 class="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
              <mat-icon class="!text-sm !w-4 !h-4">list</mat-icon>
              Eventos ({{ partido.eventos.length }})
            </h3>
            <div class="flex flex-col gap-1 max-h-[250px] overflow-y-auto">
              @for (ev of partido.eventos; track ev.id) {
                <div class="flex items-center gap-2 px-2 py-1.5 bg-white rounded border border-gray-100 text-sm">
                  @if (ev.periodo) {
                    <span class="text-[0.6rem] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">T{{ ev.periodo }}</span>
                  }
                  <span class="font-mono font-bold text-gray-400 w-8 text-right text-xs">{{ ev.minuto ? ev.minuto + "'" : '--' }}</span>
                  <!-- Badge visual distinguible por tipo -->
                  @switch (ev.tipo) {
                    @case ('gol') {
                      <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-300">⚽ GOL</span>
                    }
                    @case ('amarilla') {
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-300 text-yellow-900 border border-yellow-400">🟡 AMAR</span>
                    }
                    @case ('azul') {
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500 text-white border border-blue-600">🔵 AZUL</span>
                    }
                    @case ('roja') {
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white border border-red-700">🔴 ROJA</span>
                    }
                    @case ('falta') {
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300">⚠️ FALTA</span>
                    }
                    @default {
                      <mat-icon class="!text-base !w-4 !h-4" [class]="iconClassEvento(ev.tipo)">{{ iconEvento(ev.tipo) }}</mat-icon>
                    }
                  }
                  <span class="flex-1 text-gray-700 text-xs truncate">
                    @if (ev.jugador) {
                      {{ ev.jugador.apellido }}
                    }
                    @if (ev.detalle && !ev.jugador) { {{ ev.detalle }} }
                  </span>
                  <span class="text-[0.6rem] text-gray-400 font-semibold uppercase">{{ ev.club?.nombre_corto }}</span>
                </div>
              }
            </div>
          </div>
        }

      </div>

      <!-- ═══ H) Modal DNI+Firma ═══ -->
      @if (modalConfirmacion) {
        <app-dni-firma-modal
          [titulo]="modalConfirmacion.titulo"
          [subtitulo]="modalConfirmacion.subtitulo"
          (confirmed)="onConfirmModal($event)"
          (cancelled)="modalConfirmacion = null">
        </app-dni-firma-modal>
      }
    } @else {
      <div class="p-12 text-center text-gray-500">Cargando partido...</div>
    }
  `,
  styles: [`
    :host { display: block; }
  `],
})
export class PanelControlComponent implements OnInit, OnDestroy {
  partido: any = null;
  alineacion: any = { local: [], visitante: [], confirmado_local: false, confirmado_visitante: false };
  jugadoresLocal: any[] = [];
  jugadoresVisitante: any[] = [];
  tabActivo: 'local' | 'visitante' = 'local';
  jugadorSeleccionado: any = null;
  isFullscreen = false;
  relojPausado = false;
  clockSeconds = 0;

  localColor = '#762c7e';
  localColorSec = '#4f2f7d';
  visitColor = '#4f2f7d';
  visitColorSec = '#762c7e';

  configTorneo: any = {
    tarjeta_azul_habilitada: false,
    contar_faltas: false,
    reloj_parado: false,
    cantidad_tiempos: 2,
    minutos_por_tiempo: 25,
    elegir_mejor_jugador: false,
    calificar_arbitro: false,
  };

  // MVP y calificación (fase finalizado)
  mejorJugadorId: number | null = null;
  calificacionArbitro = 0;
  comentarioArbitro = '';

  modalConfirmacion: { tipo: 'local' | 'visitante' | 'cierre'; titulo: string; subtitulo: string } | null = null;

  private partidoId: number | null = null;
  private subs: Subscription[] = [];
  private clockSub?: Subscription;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    public auth: AuthService,
    private toastr: ToastrService,
    private socket: SocketService,
    private branding: BrandingService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.partidoId = parseInt(this.route.snapshot.paramMap.get('id') || '0') || null;
    if (!this.partidoId) { this.toastr.error('Partido no encontrado'); return; }
    this.cargarTodo();
    this.setupSocket();
  }

  ngOnDestroy() {
    if (this.partidoId) this.socket.leaveMatch(this.partidoId);
    this.subs.forEach(s => s.unsubscribe());
    this.clockSub?.unsubscribe();
    if (this.isFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  // ─── Fase calculada ──────────────────────────────────────
  get fase(): 'preparacion' | 'en_curso_tiempo' | 'descanso' | 'finalizado' {
    if (!this.partido) return 'preparacion';
    if (this.partido.estado === 'programado') return 'preparacion';
    if (this.partido.estado === 'finalizado') return 'finalizado';
    if (this.partido.estado === 'en_curso') {
      // Si el ultimo evento del periodo actual es fin_periodo, estamos en descanso
      const eventos = this.partido.eventos || [];
      const ultimo = [...eventos].reverse().find((e: any) => e.tipo === 'fin_periodo' || e.tipo === 'inicio_periodo');
      if (ultimo?.tipo === 'fin_periodo' && this.partido.periodo_actual < (this.configTorneo.cantidad_tiempos || 2)) {
        return 'descanso';
      }
      return 'en_curso_tiempo';
    }
    return 'preparacion';
  }

  faseLabel(): string {
    switch (this.fase) {
      case 'preparacion': return 'Preparacion';
      case 'en_curso_tiempo': return `Tiempo ${this.partido.periodo_actual}`;
      case 'descanso': return 'Descanso';
      case 'finalizado': return 'Finalizado';
    }
  }

  // ─── Carga inicial ────────────────────────────────────────
  cargarTodo() {
    this.cargarPartido();
    this.cargarJugadores();
    this.cargarAlineacion();
  }

  cargarPartido() {
    this.http.get<any>(`${environment.apiUrl}/partidos/${this.partidoId}`).subscribe({
      next: res => {
        this.partido = res.data;
        this.localColor = this.partido.clubLocal?.color_primario || '#762c7e';
        this.localColorSec = this.partido.clubLocal?.color_secundario || this.localColor;
        this.visitColor = this.partido.clubVisitante?.color_primario || '#4f2f7d';
        this.visitColorSec = this.partido.clubVisitante?.color_secundario || this.visitColor;

        // Merge config del torneo
        const torneoId = this.partido.jornada?.torneo_id;
        if (torneoId) {
          this.http.get<any>(`${environment.apiUrl}/torneos/${torneoId}`).subscribe({
            next: r => {
              const cfg = r.data?.config || {};
              this.configTorneo = { ...this.configTorneo, ...cfg, ...(this.partido.config_override || {}) };
              this.cdr.detectChanges();
            },
          });
        }

        this.calcEventosJugador();
        this.startClock();
        this.cdr.detectChanges();
      },
      error: () => this.toastr.error('Error al cargar partido'),
    });
  }

  cargarJugadores() {
    this.http.get<any>(`${environment.apiUrl}/partidos/${this.partidoId}/jugadores-disponibles`).subscribe({
      next: res => {
        this.jugadoresLocal = res.data?.local || [];
        this.jugadoresVisitante = res.data?.visitante || [];
        this.cdr.detectChanges();
      },
    });
  }

  cargarAlineacion() {
    this.http.get<any>(`${environment.apiUrl}/partidos/${this.partidoId}/alineacion`).subscribe({
      next: res => {
        this.alineacion = res.data || { local: [], visitante: [], confirmado_local: false, confirmado_visitante: false };
        this.calcEventosJugador();
        this.cdr.detectChanges();
      },
    });
  }

  // ─── Socket ───────────────────────────────────────────────
  private setupSocket() {
    this.socket.joinMatch(this.partidoId!);
    this.subs.push(
      this.socket.on('match:event').subscribe((data: any) => {
        if (data.partido_id === this.partidoId) {
          this.partido.goles_local = data.goles_local;
          this.partido.goles_visitante = data.goles_visitante;
          if (data.evento) {
            this.partido.eventos = [...(this.partido.eventos || []), data.evento];
            this.calcEventosJugador();
          }
          this.cdr.detectChanges();
        }
      }),
      this.socket.on('match:start').subscribe((data: any) => {
        if (data.partido_id === this.partidoId) {
          this.partido.estado = 'en_curso';
          this.partido.hora_inicio = data.hora_inicio;
          this.startClock();
          this.cdr.detectChanges();
        }
      }),
      this.socket.on('match:end').subscribe((data: any) => {
        if (data.partido_id === this.partidoId) {
          this.partido.estado = 'finalizado';
          this.partido.goles_local = data.goles_local;
          this.partido.goles_visitante = data.goles_visitante;
          this.clockSub?.unsubscribe();
          this.cdr.detectChanges();
        }
      }),
      this.socket.on('match:confirm').subscribe((data: any) => {
        if (data.partido_id === this.partidoId) {
          this.partido.confirmado_arbitro = true;
          this.cdr.detectChanges();
        }
      }),
    );
  }

  // ─── Reloj ────────────────────────────────────────────────
  private startClock() {
    if (this.partido?.estado !== 'en_curso' || !this.partido.hora_inicio) return;
    this.clockSub?.unsubscribe();
    this.clockSub = interval(1000).subscribe(() => {
      // Pausar si reloj_parado activado O si estamos en descanso entre tiempos
      if (this.relojPausado || this.fase === 'descanso') return;
      const inicio = new Date(this.partido.hora_inicio).getTime();
      this.clockSeconds = Math.floor((Date.now() - inicio) / 1000);
      this.cdr.detectChanges();
    });
  }

  formatClock(): string {
    if (this.partido?.estado === 'programado') return '00:00';
    if (this.fase === 'descanso' || this.partido?.estado === 'finalizado') {
      // Mostrar el tiempo al momento del fin del periodo/partido
      if (this.partido?.hora_inicio && this.partido?.hora_fin) {
        const s = Math.floor((new Date(this.partido.hora_fin).getTime() - new Date(this.partido.hora_inicio).getTime()) / 1000);
        return this.secsToTime(s);
      }
      return this.secsToTime(this.clockSeconds); // mantener el ultimo valor
    }
    return this.secsToTime(this.clockSeconds);
  }

  private secsToTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  private currentMinute(): number {
    return Math.max(1, Math.floor(this.clockSeconds / 60) + 1);
  }

  // ─── Alineacion ───────────────────────────────────────────
  esAlineado(jugadorId: number): boolean {
    const todas = [...(this.alineacion.local || []), ...(this.alineacion.visitante || [])];
    return todas.some(a => (a.persona_id || a.jugador_id) === jugadorId);
  }

  getCamiseta(jugadorId: number): string {
    const todas = [...(this.alineacion.local || []), ...(this.alineacion.visitante || [])];
    const a = todas.find(x => (x.persona_id || x.jugador_id) === jugadorId);
    return a?.numero_camiseta?.toString() || '';
  }

  contarAlineados(lado: 'local' | 'visitante'): number {
    return (this.alineacion[lado] || []).length;
  }

  toggleAlineado(jugador: any, clubId: number, event: any) {
    const checked = event.target?.checked;
    const personaId = jugador.id; // jugadores-disponibles devuelve persona_id como id
    if (checked) {
      this.http.post<any>(`${environment.apiUrl}/partidos/${this.partidoId}/alineacion`, {
        persona_id: personaId,
        club_id: clubId,
        numero_camiseta: jugador.numero_camiseta || null,
        titular: true,
      }).subscribe({
        next: () => { this.cargarAlineacion(); },
        error: (e: any) => { this.toastr.error(e.error?.message || 'Error'); event.target.checked = false; },
      });
    } else {
      this.http.delete<any>(`${environment.apiUrl}/partidos/${this.partidoId}/alineacion/${personaId}`).subscribe({
        next: () => { this.cargarAlineacion(); },
        error: (e: any) => { this.toastr.error(e.error?.message || 'Error'); event.target.checked = true; },
      });
    }
  }

  setCamiseta(jugador: any, clubId: number, event: any) {
    const numero = parseInt(event.target.value);
    if (!numero) return;
    this.http.post<any>(`${environment.apiUrl}/partidos/${this.partidoId}/alineacion`, {
      persona_id: jugador.id,
      club_id: clubId,
      numero_camiseta: numero,
      titular: true,
    }).subscribe({
      next: () => { this.cargarAlineacion(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  // ─── Confirmaciones ───────────────────────────────────────
  abrirConfirmacion(tipo: 'local' | 'visitante') {
    const club = tipo === 'local' ? this.partido.clubLocal : this.partido.clubVisitante;
    this.modalConfirmacion = {
      tipo,
      titulo: `Confirmar alineacion ${tipo === 'local' ? 'LOCAL' : 'VISITANTE'}`,
      subtitulo: `Delegado de ${club?.nombre || ''} debe confirmar con DNI y firma`,
    };
  }

  abrirCierre() {
    this.modalConfirmacion = {
      tipo: 'cierre',
      titulo: 'Cerrar partido',
      subtitulo: 'El arbitro asignado debe confirmar con DNI y firma',
    };
  }

  /** Clase de color segun cantidad de faltas */
  faltaColorClass(n: number): string {
    if (n >= 6) return 'bg-red-600 text-white ring-2 ring-red-300';
    if (n >= 5) return 'bg-orange-500 text-white';
    if (n >= 3) return 'bg-yellow-500 text-gray-900';
    return 'bg-gray-700 text-gray-100';
  }

  /** Cuenta faltas de un equipo en el periodo actual */
  contarFaltasPeriodo(lado: 'local' | 'visitante'): number {
    const clubId = lado === 'local' ? this.partido.club_local_id : this.partido.club_visitante_id;
    const periodo = this.partido.periodo_actual;
    return (this.partido.eventos || []).filter((e: any) =>
      e.tipo === 'falta' && e.club_id === clubId && e.periodo === periodo
    ).length;
  }

  /** Devuelve todos los jugadores alineados de ambos equipos */
  todosAlineados(): any[] {
    return [...(this.alineacion.local || []), ...(this.alineacion.visitante || [])];
  }

  /** Guarda la calificacion del arbitro (post-cierre, por delegados/veedores) */
  guardarCalificacion() {
    this.http.put<any>(`${environment.apiUrl}/partidos/${this.partidoId}`, {
      calificacion_arbitro: this.calificacionArbitro,
      comentario_arbitro: this.comentarioArbitro,
    }).subscribe({
      next: () => { this.toastr.success('Calificacion enviada'); this.cargarPartido(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  /** Guarda MVP y abre el modal de cierre DNI */
  guardarYCerrar() {
    // Guardar MVP antes de abrir el modal (calificacion la hace un delegado/veedor despues)
    const updates: any = {};
    if (this.mejorJugadorId) updates.mejor_jugador_id = this.mejorJugadorId;

    if (Object.keys(updates).length) {
      this.http.put<any>(`${environment.apiUrl}/partidos/${this.partidoId}`, updates).subscribe({
        next: () => this.abrirCierre(),
        error: () => this.abrirCierre(), // abrir igual si falla el update
      });
    } else {
      this.abrirCierre();
    }
  }

  onConfirmModal(result: DniFirmaResult) {
    if (!this.modalConfirmacion) return;
    const tipo = this.modalConfirmacion.tipo;
    this.modalConfirmacion = null;

    if (tipo === 'cierre') {
      this.http.post<any>(`${environment.apiUrl}/partidos/${this.partidoId}/cerrar`, result).subscribe({
        next: () => { this.toastr.success('Partido cerrado y confirmado'); this.cargarPartido(); },
        error: (e: any) => this.toastr.error(e.error?.message || 'Error al cerrar'),
      });
    } else {
      this.http.post<any>(`${environment.apiUrl}/partidos/${this.partidoId}/confirmar-alineacion`, {
        tipo, ...result,
      }).subscribe({
        next: () => { this.toastr.success('Alineacion confirmada'); this.cargarAlineacion(); },
        error: (e: any) => this.toastr.error(e.error?.message || 'Error al confirmar'),
      });
    }
  }

  // ─── Partido: iniciar/finalizar periodos ──────────────────
  iniciarPeriodo(periodo: number) {
    if (!confirm(`Iniciar tiempo ${periodo}?`)) return;
    this.http.post<any>(`${environment.apiUrl}/partidos/${this.partidoId}/periodo/iniciar`, { periodo }).subscribe({
      next: () => { this.toastr.success(`Tiempo ${periodo} iniciado`); this.cargarPartido(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  finalizarPeriodoActual() {
    if (!confirm(`Finalizar tiempo ${this.partido.periodo_actual}?`)) return;
    this.http.post<any>(`${environment.apiUrl}/partidos/${this.partidoId}/periodo/finalizar`, {}).subscribe({
      next: () => { this.toastr.success(`Tiempo ${this.partido.periodo_actual} finalizado`); this.cargarPartido(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  // ─── Eventos ──────────────────────────────────────────────
  private calcEventosJugador() {
    const todas = [...(this.alineacion.local || []), ...(this.alineacion.visitante || [])];
    todas.forEach(a => { a._goles = 0; a._amarillas = 0; a._azules = 0; a._roja = false; });
    for (const ev of this.partido?.eventos || []) {
      const evPersonaId = ev.persona_id ?? ev.jugador?.id;
      if (!evPersonaId) continue;
      const a = todas.find(x => (x.persona_id ?? x.jugador?.id) === evPersonaId);
      if (!a) continue;
      if (ev.tipo === 'gol') a._goles++;
      if (ev.tipo === 'amarilla') a._amarillas++;
      if (ev.tipo === 'azul') a._azules++;
      if (ev.tipo === 'roja') a._roja = true;
    }
  }

  setTab(tab: 'local' | 'visitante') {
    this.tabActivo = tab;
    this.cdr.detectChanges();
  }

  alineacionVisible(lado: 'local' | 'visitante'): any[] {
    return this.alineacion[lado] || [];
  }

  alineacionVisibleTab(): any[] {
    return this.alineacionVisible(this.tabActivo);
  }

  seleccionarJugador(a: any) {
    this.jugadorSeleccionado = this.jugadorSeleccionado?.id === (a.persona_id || a.jugador?.id) ? null : { id: a.persona_id || a.jugador?.id, apellido: a.jugador?.apellido };
    this.cdr.detectChanges();
  }

  /** Registra un evento directamente desde el botón del jugador (sin pasos intermedios) */
  registrarEventoDirecto(tipo: EventoTipo, alineacion: any, lado: 'local' | 'visitante') {
    const personaId = alineacion.persona_id || alineacion.jugador?.id;
    const clubId = lado === 'local' ? this.partido.club_local_id : this.partido.club_visitante_id;
    const apellido = alineacion.jugador?.apellido || '?';

    this.http.post<any>(`${environment.apiUrl}/partidos/${this.partidoId}/evento`, {
      tipo,
      persona_id: personaId,
      club_id: clubId,
      minuto: this.currentMinute(),
      periodo: this.partido.periodo_actual,
    }).subscribe({
      next: () => {
        this.toastr.success(`${tipo.toUpperCase()}: ${apellido}`);
        this.cargarPartido();
        this.calcEventosJugador();
        this.cdr.detectChanges();
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  registrarRapido(tipo: EventoTipo) {
    if (!this.jugadorSeleccionado && tipo !== 'falta') {
      this.toastr.warning('Selecciona un jugador primero'); return;
    }
    const clubId = this.tabActivo === 'local' ? this.partido.club_local_id : this.partido.club_visitante_id;
    this.http.post<any>(`${environment.apiUrl}/partidos/${this.partidoId}/evento`, {
      tipo,
      persona_id: this.jugadorSeleccionado?.id,
      club_id: clubId,
      minuto: this.currentMinute(),
      periodo: this.partido.periodo_actual,
    }).subscribe({
      next: () => {
        const label = tipo.toUpperCase();
        this.toastr.success(`${label}${this.jugadorSeleccionado ? ': ' + this.jugadorSeleccionado.apellido : ''}`);
        this.jugadorSeleccionado = null;
        this.cargarPartido();
        this.cdr.detectChanges();
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  // ─── UI helpers ───────────────────────────────────────────
  toggleFullscreen() {
    const elem = document.documentElement;
    if (!this.isFullscreen) {
      elem.requestFullscreen?.().then(() => { this.isFullscreen = true; this.cdr.detectChanges(); }).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => { this.isFullscreen = false; this.cdr.detectChanges(); }).catch(() => {});
    }
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

  iconEvento(tipo: string): string {
    const map: Record<string, string> = {
      gol: 'sports_soccer', amarilla: 'square', azul: 'square', roja: 'square',
      sustitucion: 'swap_horiz', falta: 'warning', informe: 'description',
      inicio: 'play_arrow', fin: 'stop', penal: 'sports_soccer',
      inicio_periodo: 'play_circle', fin_periodo: 'stop_circle',
    };
    return map[tipo] || 'info';
  }

  iconClassEvento(tipo: string): string {
    const map: Record<string, string> = {
      gol: 'text-green-500', amarilla: 'text-yellow-500', azul: 'text-blue-500', roja: 'text-red-500',
      sustitucion: 'text-cyan-500', falta: 'text-purple-500',
      inicio: 'text-green-400', fin: 'text-red-400',
      inicio_periodo: 'text-green-400', fin_periodo: 'text-gray-500',
    };
    return map[tipo] || 'text-gray-400';
  }
}
