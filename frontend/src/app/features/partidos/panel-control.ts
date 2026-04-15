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
      <div class="panel-root" [class.fullscreen]="isFullscreen">

        <!-- Top bar -->
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

        <!-- ═══ Marcador ═══ -->
        <div class="scoreboard" [style.background]="'linear-gradient(135deg, ' + localColor + ' 0%, ' + localColorSec + ' 40%, ' + visitColorSec + ' 60%, ' + visitColor + ' 100%)'">
          <!-- Local -->
          <div class="team team-local">
            <div class="team-shield">
              @if (partido.clubLocal?.escudo_url) {
                <img [src]="resolveUrl(partido.clubLocal.escudo_url)" alt="">
              } @else {
                <div class="shield-placeholder" [style.background-color]="localColor">
                  {{ initials(partido.clubLocal?.nombre_corto || partido.clubLocal?.nombre) }}
                </div>
              }
            </div>
            <div class="team-name">{{ partido.clubLocal?.nombre_corto || partido.clubLocal?.nombre }}</div>
            <div class="team-score">{{ partido.goles_local }}</div>
          </div>

          <!-- Centro -->
          <div class="center-info">
            <div class="clock-time">{{ formatClock() }}</div>
            <div class="clock-label">
              @if (partido.estado === 'programado') { <span>PREPARACION</span> }
              @else if (partido.estado === 'en_curso') {
                <span class="live-dot"></span>
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
          <div class="team team-visit">
            <div class="team-score">{{ partido.goles_visitante }}</div>
            <div class="team-name">{{ partido.clubVisitante?.nombre_corto || partido.clubVisitante?.nombre }}</div>
            <div class="team-shield">
              @if (partido.clubVisitante?.escudo_url) {
                <img [src]="resolveUrl(partido.clubVisitante.escudo_url)" alt="">
              } @else {
                <div class="shield-placeholder" [style.background-color]="visitColor">
                  {{ initials(partido.clubVisitante?.nombre_corto || partido.clubVisitante?.nombre) }}
                </div>
              }
            </div>
          </div>
        </div>

        <!-- ═══ FASE PREPARACION: alineaciones ═══ -->
        @if (fase === 'preparacion') {
          <div class="preparation-area">
            <div class="prep-header">
              <h2 class="text-lg font-bold text-gray-900">Preparacion del partido</h2>
              <p class="text-sm text-gray-500">Selecciona los jugadores y asigna numero de camiseta para cada equipo</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <!-- Alineacion local -->
              <div class="club-alineacion" [class.confirmada]="alineacion.confirmado_local">
                <div class="club-header" [style.background]="'linear-gradient(135deg, ' + localColor + ', ' + localColorSec + ')'">
                  <div class="flex items-center gap-3 text-white">
                    @if (partido.clubLocal?.escudo_url) {
                      <img [src]="resolveUrl(partido.clubLocal.escudo_url)" class="w-10 h-10 rounded object-cover border-2 border-white">
                    }
                    <div>
                      <p class="font-bold">{{ partido.clubLocal?.nombre }}</p>
                      <p class="text-xs opacity-90">LOCAL · {{ contarAlineados('local') }} jugadores seleccionados</p>
                    </div>
                  </div>
                  @if (alineacion.confirmado_local) {
                    <mat-icon class="!text-2xl text-green-300">verified</mat-icon>
                  }
                </div>

                <div class="player-selection">
                  @for (j of jugadoresLocal; track j.id) {
                    <div class="player-row" [class.active]="esAlineado(j.id)">
                      <label class="player-checkbox">
                        <input type="checkbox"
                          [checked]="esAlineado(j.id)"
                          [disabled]="alineacion.confirmado_local"
                          (change)="toggleAlineado(j, partido.club_local_id, $event)">
                      </label>
                      <div class="player-avatar"
                        [style.background]="'linear-gradient(135deg, ' + localColor + ', ' + localColorSec + ')'">
                        {{ (j.nombre?.charAt(0) || '') + (j.apellido?.charAt(0) || '') }}
                      </div>
                      <div class="player-info">
                        <div class="player-apellido">{{ j.apellido }}</div>
                        <div class="player-nombre">{{ j.nombre }}</div>
                      </div>
                      @if (esAlineado(j.id)) {
                        <input type="number"
                          class="camiseta-input"
                          placeholder="#"
                          [value]="getCamiseta(j.id)"
                          [disabled]="alineacion.confirmado_local"
                          min="1" max="99"
                          (change)="setCamiseta(j, partido.club_local_id, $event)">
                      }
                    </div>
                  }
                </div>

                @if (!alineacion.confirmado_local) {
                  <button class="btn-confirmar" (click)="abrirConfirmacion('local')" [disabled]="contarAlineados('local') < 5">
                    <mat-icon>how_to_reg</mat-icon> Confirmar alineacion (Delegado)
                  </button>
                }
              </div>

              <!-- Alineacion visitante -->
              <div class="club-alineacion" [class.confirmada]="alineacion.confirmado_visitante">
                <div class="club-header" [style.background]="'linear-gradient(135deg, ' + visitColor + ', ' + visitColorSec + ')'">
                  <div class="flex items-center gap-3 text-white">
                    @if (partido.clubVisitante?.escudo_url) {
                      <img [src]="resolveUrl(partido.clubVisitante.escudo_url)" class="w-10 h-10 rounded object-cover border-2 border-white">
                    }
                    <div>
                      <p class="font-bold">{{ partido.clubVisitante?.nombre }}</p>
                      <p class="text-xs opacity-90">VISITANTE · {{ contarAlineados('visitante') }} jugadores seleccionados</p>
                    </div>
                  </div>
                  @if (alineacion.confirmado_visitante) {
                    <mat-icon class="!text-2xl text-green-300">verified</mat-icon>
                  }
                </div>

                <div class="player-selection">
                  @for (j of jugadoresVisitante; track j.id) {
                    <div class="player-row" [class.active]="esAlineado(j.id)">
                      <label class="player-checkbox">
                        <input type="checkbox"
                          [checked]="esAlineado(j.id)"
                          [disabled]="alineacion.confirmado_visitante"
                          (change)="toggleAlineado(j, partido.club_visitante_id, $event)">
                      </label>
                      <div class="player-avatar"
                        [style.background]="'linear-gradient(135deg, ' + visitColor + ', ' + visitColorSec + ')'">
                        {{ (j.nombre?.charAt(0) || '') + (j.apellido?.charAt(0) || '') }}
                      </div>
                      <div class="player-info">
                        <div class="player-apellido">{{ j.apellido }}</div>
                        <div class="player-nombre">{{ j.nombre }}</div>
                      </div>
                      @if (esAlineado(j.id)) {
                        <input type="number"
                          class="camiseta-input"
                          placeholder="#"
                          [value]="getCamiseta(j.id)"
                          [disabled]="alineacion.confirmado_visitante"
                          min="1" max="99"
                          (change)="setCamiseta(j, partido.club_visitante_id, $event)">
                      }
                    </div>
                  }
                </div>

                @if (!alineacion.confirmado_visitante) {
                  <button class="btn-confirmar" (click)="abrirConfirmacion('visitante')" [disabled]="contarAlineados('visitante') < 5">
                    <mat-icon>how_to_reg</mat-icon> Confirmar alineacion (Delegado)
                  </button>
                }
              </div>
            </div>

            <!-- Boton de inicio cuando ambas estan confirmadas -->
            @if (alineacion.confirmado_local && alineacion.confirmado_visitante) {
              <div class="text-center pt-4">
                <button class="btn-huge btn-start" (click)="iniciarPeriodo(1)">
                  <mat-icon class="!text-4xl !w-10 !h-10">play_arrow</mat-icon>
                  <span>INICIAR PRIMER TIEMPO</span>
                </button>
              </div>
            }
          </div>
        }

        <!-- ═══ FASE EN CURSO: tiempos con eventos ═══ -->
        @if (fase === 'en_curso_tiempo') {
          <div class="content-area">
            <!-- Tabs por club -->
            <div class="team-tabs">
              <button class="team-tab" [class.active]="tabActivo === 'local'" (click)="setTab('local')"
                [style.border-color]="tabActivo === 'local' ? localColor : 'transparent'">
                @if (partido.clubLocal?.escudo_url) {
                  <img [src]="resolveUrl(partido.clubLocal.escudo_url)" class="w-7 h-7 rounded object-cover" alt="">
                }
                <span>{{ partido.clubLocal?.nombre_corto || partido.clubLocal?.nombre }}</span>
                <span class="count">{{ alineacionVisible('local').length }}</span>
              </button>
              <button class="team-tab" [class.active]="tabActivo === 'visitante'" (click)="setTab('visitante')"
                [style.border-color]="tabActivo === 'visitante' ? visitColor : 'transparent'">
                @if (partido.clubVisitante?.escudo_url) {
                  <img [src]="resolveUrl(partido.clubVisitante.escudo_url)" class="w-7 h-7 rounded object-cover" alt="">
                }
                <span>{{ partido.clubVisitante?.nombre_corto || partido.clubVisitante?.nombre }}</span>
                <span class="count">{{ alineacionVisible('visitante').length }}</span>
              </button>
            </div>

            <!-- Grid de jugadores -->
            <div class="players-grid">
              @for (a of alineacionVisibleTab(); track a.id) {
                <button class="player-card" [class.selected]="jugadorSeleccionado?.id === a.jugador_id" (click)="seleccionarJugador(a)">
                  <div class="player-number">{{ a.numero_camiseta || '?' }}</div>
                  <div class="player-info">
                    <div class="player-name">{{ a.jugador?.apellido }}</div>
                    <div class="player-firstname">{{ a.jugador?.nombre }}</div>
                  </div>
                  @if (a._goles) { <div class="player-badge goles"><mat-icon class="!text-sm !w-4 !h-4">sports_soccer</mat-icon>{{ a._goles }}</div> }
                  @if (a._amarillas) { <div class="player-badge amarilla"><mat-icon class="!text-sm !w-4 !h-4">square</mat-icon>{{ a._amarillas }}</div> }
                  @if (a._azules) { <div class="player-badge azul"><mat-icon class="!text-sm !w-4 !h-4">square</mat-icon>{{ a._azules }}</div> }
                  @if (a._roja) { <div class="player-badge roja"><mat-icon class="!text-sm !w-4 !h-4">square</mat-icon></div> }
                </button>
              }
              @if (!alineacionVisibleTab().length) {
                <div class="empty-players">
                  <mat-icon class="!text-5xl text-gray-300">groups</mat-icon>
                  <p>Sin jugadores en la alineacion</p>
                </div>
              }
            </div>

            <!-- Botones de accion -->
            <div class="quick-actions" [class.cols-5]="configTorneo.tarjeta_azul_habilitada && configTorneo.contar_faltas"
              [class.cols-4]="configTorneo.tarjeta_azul_habilitada !== configTorneo.contar_faltas">
              <button class="action-btn gol" (click)="registrarRapido('gol')">
                <mat-icon class="!text-3xl !w-8 !h-8">sports_soccer</mat-icon><span>GOL</span>
              </button>
              <button class="action-btn amarilla" (click)="registrarRapido('amarilla')">
                <mat-icon class="!text-3xl !w-8 !h-8">square</mat-icon><span>AMARILLA</span>
              </button>
              @if (configTorneo.tarjeta_azul_habilitada) {
                <button class="action-btn azul" (click)="registrarRapido('azul')">
                  <mat-icon class="!text-3xl !w-8 !h-8">square</mat-icon><span>AZUL</span>
                </button>
              }
              <button class="action-btn roja" (click)="registrarRapido('roja')">
                <mat-icon class="!text-3xl !w-8 !h-8">square</mat-icon><span>ROJA</span>
              </button>
              @if (configTorneo.contar_faltas) {
                <button class="action-btn falta" (click)="registrarRapido('falta')">
                  <mat-icon class="!text-3xl !w-8 !h-8">warning</mat-icon><span>FALTA</span>
                </button>
              }
              <button class="action-btn finalizar" (click)="finalizarPeriodoActual()">
                <mat-icon class="!text-3xl !w-8 !h-8">stop_circle</mat-icon>
                <span>FIN T{{ partido.periodo_actual }}</span>
              </button>
            </div>
          </div>
        }

        <!-- ═══ FASE DESCANSO entre tiempos ═══ -->
        @if (fase === 'descanso') {
          <div class="p-6 text-center bg-gray-50 space-y-4">
            <div class="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-blue-50 border-2 border-blue-300 text-blue-700">
              <mat-icon class="!text-3xl !w-8 !h-8">local_cafe</mat-icon>
              <div class="text-left">
                <p class="text-xl font-bold">DESCANSO</p>
                <p class="text-xs">Esperando inicio del siguiente tiempo</p>
              </div>
            </div>
            <div>
              <button class="btn-huge btn-start" (click)="iniciarPeriodo(partido.periodo_actual + 1)">
                <mat-icon class="!text-4xl !w-10 !h-10">play_arrow</mat-icon>
                <span>INICIAR T{{ partido.periodo_actual + 1 }}</span>
              </button>
            </div>
          </div>
        }

        <!-- ═══ FASE FINALIZADO: cerrar con arbitro ═══ -->
        @if (fase === 'finalizado') {
          <div class="p-6 text-center bg-gray-50 space-y-4">
            @if (!partido.confirmado_arbitro) {
              <div class="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-700">
                <mat-icon class="!text-3xl !w-8 !h-8">hourglass_empty</mat-icon>
                <div class="text-left">
                  <p class="text-xl font-bold">PARTIDO TERMINADO</p>
                  <p class="text-xs">Esperando confirmacion del arbitro</p>
                </div>
              </div>
              @if (auth.getUser()?.rol === 'arbitro' || auth.isAdmin()) {
                <div>
                  <button class="btn-huge btn-confirm" (click)="abrirCierre()">
                    <mat-icon class="!text-4xl !w-10 !h-10">verified</mat-icon>
                    <span>CERRAR PARTIDO (ARBITRO)</span>
                  </button>
                </div>
              }
            } @else {
              <div class="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-green-50 border-2 border-green-500 text-green-700">
                <mat-icon class="!text-3xl !w-8 !h-8">verified</mat-icon>
                <span class="text-xl font-bold">CONFIRMADO POR EL ARBITRO</span>
              </div>
            }
          </div>
        }

        <!-- ═══ Timeline de eventos ═══ -->
        @if (partido.eventos?.length) {
          <div class="events-timeline">
            <h3 class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <mat-icon class="!text-base">list</mat-icon>
              Eventos del partido
            </h3>
            <div class="events-list">
              @for (ev of partido.eventos; track ev.id) {
                <div class="event-item">
                  @if (ev.periodo) {
                    <span class="event-periodo">T{{ ev.periodo }}</span>
                  }
                  <span class="event-min">{{ ev.minuto ? ev.minuto + "'" : '—' }}</span>
                  <mat-icon class="!text-lg" [class]="iconClassEvento(ev.tipo)">{{ iconEvento(ev.tipo) }}</mat-icon>
                  <span class="event-text">
                    @if (ev.jugador) {
                      {{ ev.jugador.apellido }}@if (ev.jugador.numero_camiseta) { (#{{ ev.jugador.numero_camiseta }}) }
                    }
                    @if (ev.detalle) { — {{ ev.detalle }} }
                  </span>
                  <span class="event-club">{{ ev.club?.nombre_corto }}</span>
                </div>
              }
            </div>
          </div>
        }

      </div>

      <!-- Modal confirmacion DNI + firma -->
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
    .panel-root { min-height: 100vh; background: #f8fafc; }
    .fullscreen { position: fixed; inset: 0; z-index: 9999; overflow-y: auto; background: white; }

    /* Scoreboard */
    .scoreboard {
      display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1rem;
      padding: 1.5rem; color: white; position: relative; overflow: hidden;
    }
    .team { display: flex; align-items: center; gap: 1rem; min-width: 0; }
    .team-local { justify-content: flex-end; text-align: right; }
    .team-visit { justify-content: flex-start; text-align: left; }
    .team-shield { width: 72px; height: 72px; flex-shrink: 0; }
    .team-shield img { width: 100%; height: 100%; border-radius: 12px; object-fit: cover; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
    .shield-placeholder { width: 100%; height: 100%; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; font-weight: 800; color: white; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
    .team-name { font-size: 1.1rem; font-weight: 700; text-transform: uppercase; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
    .team-score { font-size: 4.5rem; font-weight: 900; line-height: 1; text-shadow: 0 4px 8px rgba(0,0,0,0.4); min-width: 3.5rem; text-align: center; }

    .center-info { text-align: center; padding: 0 0.75rem; }
    .clock-time { font-size: 1.5rem; font-weight: 800; font-family: ui-monospace, monospace; background: rgba(0,0,0,0.3); padding: 0.5rem 1rem; border-radius: 0.5rem; border: 2px solid rgba(255,255,255,0.3); }
    .clock-label { font-size: 0.7rem; font-weight: 700; margin-top: 0.35rem; opacity: 0.9; text-transform: uppercase; display: flex; align-items: center; justify-content: center; gap: 0.35rem; }
    .live-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #ef4444; animation: pulse 1.2s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.9); } }

    /* Preparacion */
    .preparation-area { padding: 1rem; }
    .prep-header { text-align: center; margin-bottom: 1rem; }
    .club-alineacion { background: white; border-radius: 0.75rem; overflow: hidden; border: 2px solid #e5e7eb; transition: border-color 0.2s; }
    .club-alineacion.confirmada { border-color: #10b981; }
    .club-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; color: white; }
    .player-selection { max-height: 400px; overflow-y: auto; padding: 0.5rem; }
    .player-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; border-radius: 0.5rem; transition: background 0.15s; }
    .player-row:hover { background: #f9fafb; }
    .player-row.active { background: #f0fdf4; }
    .player-checkbox input { width: 18px; height: 18px; cursor: pointer; }
    .player-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.7rem; flex-shrink: 0; }
    .player-info { flex: 1; min-width: 0; }
    .player-apellido { font-size: 0.85rem; font-weight: 700; color: #111827; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .player-nombre { font-size: 0.7rem; color: #6b7280; }
    .camiseta-input { width: 50px; padding: 0.35rem; border: 2px solid #d1d5db; border-radius: 0.35rem; font-weight: 700; font-size: 0.9rem; text-align: center; }
    .camiseta-input:focus { outline: none; border-color: var(--color-primario); }
    .btn-confirmar { width: 100%; padding: 1rem; border: none; background: linear-gradient(135deg, #10b981, #059669); color: white; font-weight: 700; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
    .btn-confirmar:disabled { background: #9ca3af; cursor: not-allowed; }

    /* Botones grandes */
    .btn-huge { display: inline-flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1.5rem 3rem; border: none; border-radius: 1rem; font-size: 1.1rem; font-weight: 700; cursor: pointer; transition: all 0.2s; min-width: 280px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
    .btn-huge:active { transform: scale(0.97); }
    .btn-start { background: linear-gradient(135deg, #10b981, #059669); color: white; }
    .btn-confirm { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; }

    /* Content area en curso */
    .content-area { padding: 1rem; display: grid; grid-template-rows: auto 1fr auto; gap: 1rem; min-height: 400px; }

    .team-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .team-tab { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem; background: white; border: 3px solid transparent; border-radius: 0.75rem; font-size: 0.95rem; font-weight: 600; color: #374151; cursor: pointer; transition: all 0.2s; }
    .team-tab .count { margin-left: auto; padding: 0.15rem 0.5rem; background: #e5e7eb; color: #4b5563; border-radius: 9999px; font-size: 0.7rem; font-weight: 700; }

    .players-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.75rem; align-content: start; }
    .player-card { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: white; border: 2px solid #e5e7eb; border-radius: 0.75rem; font-weight: 600; color: #111827; cursor: pointer; transition: all 0.15s; text-align: left; min-height: 72px; position: relative; }
    .player-card:hover { border-color: var(--color-primario); }
    .player-card.selected { border-color: var(--color-primario); background: color-mix(in srgb, var(--color-primario) 8%, white); }
    .player-number { width: 44px; height: 44px; border-radius: 50%; background: var(--color-primario); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; flex-shrink: 0; }
    .player-info { flex: 1; min-width: 0; }
    .player-name { font-size: 0.875rem; font-weight: 700; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .player-firstname { font-size: 0.75rem; color: #6b7280; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .player-badge { display: inline-flex; align-items: center; gap: 0.15rem; padding: 0.15rem 0.4rem; border-radius: 0.5rem; font-size: 0.7rem; font-weight: 700; }
    .player-badge.goles { background: #d1fae5; color: #065f46; }
    .player-badge.amarilla { background: #fef3c7; color: #92400e; }
    .player-badge.azul { background: #dbeafe; color: #1e40af; }
    .player-badge.roja { background: #fee2e2; color: #991b1b; }
    .empty-players { grid-column: 1/-1; text-align: center; padding: 3rem; color: #9ca3af; }

    /* Quick actions */
    .quick-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; padding: 0.75rem; background: white; border-radius: 0.75rem; border: 1px solid #e5e7eb; position: sticky; bottom: 0; box-shadow: 0 -4px 16px rgba(0,0,0,0.06); }
    .quick-actions.cols-5 { grid-template-columns: repeat(5, 1fr); }
    .quick-actions.cols-6 { grid-template-columns: repeat(6, 1fr); }
    @media (max-width: 640px) { .quick-actions, .quick-actions.cols-5, .quick-actions.cols-6 { grid-template-columns: repeat(3, 1fr); } }
    .action-btn { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 1rem 0.5rem; border: none; border-radius: 0.6rem; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.15s; color: white; min-height: 80px; }
    .action-btn:active { transform: scale(0.95); }
    .action-btn.gol { background: linear-gradient(135deg, #10b981, #059669); }
    .action-btn.amarilla { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .action-btn.azul { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
    .action-btn.roja { background: linear-gradient(135deg, #ef4444, #b91c1c); }
    .action-btn.falta { background: linear-gradient(135deg, #a855f7, #7e22ce); }
    .action-btn.finalizar { background: linear-gradient(135deg, #6b7280, #374151); }

    /* Timeline */
    .events-timeline { padding: 1rem; background: #f9fafb; border-top: 1px solid #e5e7eb; }
    .events-list { display: flex; flex-direction: column; gap: 0.35rem; max-height: 300px; overflow-y: auto; }
    .event-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; background: white; border-radius: 0.5rem; border: 1px solid #e5e7eb; font-size: 0.85rem; }
    .event-periodo { font-size: 0.65rem; font-weight: 700; background: #dbeafe; color: #1e40af; padding: 0.1rem 0.35rem; border-radius: 0.25rem; }
    .event-min { font-family: ui-monospace, monospace; font-weight: 700; color: #9ca3af; width: 36px; text-align: right; }
    .event-text { flex: 1; color: #374151; }
    .event-club { font-size: 0.7rem; color: #9ca3af; font-weight: 600; text-transform: uppercase; }
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
  };

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
      if (this.relojPausado) return;
      const inicio = new Date(this.partido.hora_inicio).getTime();
      this.clockSeconds = Math.floor((Date.now() - inicio) / 1000);
      this.cdr.detectChanges();
    });
  }

  formatClock(): string {
    if (this.partido?.estado === 'programado') return '00:00';
    if (this.partido?.estado === 'finalizado' && this.partido?.hora_inicio && this.partido?.hora_fin) {
      const s = Math.floor((new Date(this.partido.hora_fin).getTime() - new Date(this.partido.hora_inicio).getTime()) / 1000);
      return this.secsToTime(s);
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
    return todas.some(a => a.jugador_id === jugadorId);
  }

  getCamiseta(jugadorId: number): string {
    const todas = [...(this.alineacion.local || []), ...(this.alineacion.visitante || [])];
    const a = todas.find(x => x.jugador_id === jugadorId);
    return a?.numero_camiseta?.toString() || '';
  }

  contarAlineados(lado: 'local' | 'visitante'): number {
    return (this.alineacion[lado] || []).length;
  }

  toggleAlineado(jugador: any, clubId: number, event: any) {
    const checked = event.target?.checked;
    if (checked) {
      this.http.post<any>(`${environment.apiUrl}/partidos/${this.partidoId}/alineacion`, {
        jugador_id: jugador.id,
        club_id: clubId,
        numero_camiseta: jugador.numero_camiseta || null,
        titular: true,
      }).subscribe({
        next: () => { this.cargarAlineacion(); },
        error: (e: any) => { this.toastr.error(e.error?.message || 'Error'); event.target.checked = false; },
      });
    } else {
      this.http.delete<any>(`${environment.apiUrl}/partidos/${this.partidoId}/alineacion/${jugador.id}`).subscribe({
        next: () => { this.cargarAlineacion(); },
        error: (e: any) => { this.toastr.error(e.error?.message || 'Error'); event.target.checked = true; },
      });
    }
  }

  setCamiseta(jugador: any, clubId: number, event: any) {
    const numero = parseInt(event.target.value);
    if (!numero) return;
    this.http.post<any>(`${environment.apiUrl}/partidos/${this.partidoId}/alineacion`, {
      jugador_id: jugador.id,
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
      if (!ev.jugador_id) continue;
      const a = todas.find(x => x.jugador_id === ev.jugador_id);
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
    this.jugadorSeleccionado = this.jugadorSeleccionado?.id === a.jugador_id ? null : { id: a.jugador_id, apellido: a.jugador?.apellido };
    this.cdr.detectChanges();
  }

  registrarRapido(tipo: EventoTipo) {
    if (!this.jugadorSeleccionado && tipo !== 'falta') {
      this.toastr.warning('Selecciona un jugador primero'); return;
    }
    const clubId = this.tabActivo === 'local' ? this.partido.club_local_id : this.partido.club_visitante_id;
    this.http.post<any>(`${environment.apiUrl}/partidos/${this.partidoId}/evento`, {
      tipo,
      jugador_id: this.jugadorSeleccionado?.id,
      club_id: clubId,
      minuto: this.currentMinute(),
      periodo: this.partido.periodo_actual,
    }).subscribe({
      next: () => {
        const label = tipo.toUpperCase();
        this.toastr.success(`${label}${this.jugadorSeleccionado ? ': ' + this.jugadorSeleccionado.apellido : ''}`);
        this.jugadorSeleccionado = null;
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
