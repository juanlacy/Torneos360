import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { UpperCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';

type EventoTipo = 'gol' | 'amarilla' | 'roja' | 'sustitucion' | 'informe';

@Component({
  selector: 'app-panel-control',
  standalone: true,
  imports: [RouterLink, UpperCasePipe, MatIconModule],
  template: `
    @if (partido) {
      <div class="panel-root" [class.fullscreen]="isFullscreen">

        <!-- ═══ Top bar ═══ -->
        <div class="flex items-center justify-between px-4 py-2 bg-gray-900 text-white text-sm">
          <a [routerLink]="['/partidos', partido.id]" class="flex items-center gap-1 hover:text-gray-300">
            <mat-icon class="!text-base !w-5 !h-5">arrow_back</mat-icon>
            <span>Detalle del partido</span>
          </a>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-400">{{ partido.categoria?.nombre }} · {{ partido.jornada?.numero_jornada ? 'Fecha ' + partido.jornada.numero_jornada : '' }}</span>
            <button (click)="toggleFullscreen()" class="p-1.5 rounded hover:bg-gray-700">
              <mat-icon class="!text-base !w-5 !h-5">{{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
            </button>
          </div>
        </div>

        <!-- ═══ Marcador gigante ═══ -->
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

          <!-- Centro: cronometro + estado -->
          <div class="center-info">
            <div class="clock">
              <div class="clock-time">{{ formatClock() }}</div>
              <div class="clock-label">
                @if (partido.estado === 'programado') { <span>POR COMENZAR</span> }
                @else if (partido.estado === 'en_curso') {
                  <span class="live-dot"></span> EN VIVO
                }
                @else if (partido.estado === 'finalizado') { <span>FINAL</span> }
                @else { <span>{{ partido.estado | uppercase }}</span> }
              </div>
            </div>
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

        <!-- ═══ Acciones principales del partido ═══ -->
        @if (partido.estado === 'programado') {
          <div class="p-6 text-center bg-gray-50">
            <button class="btn-huge btn-start" (click)="iniciarPartido()">
              <mat-icon class="!text-4xl !w-10 !h-10">play_arrow</mat-icon>
              <span>INICIAR PARTIDO</span>
            </button>
          </div>
        }

        @if (partido.estado === 'en_curso') {
          <div class="content-area">
            <!-- Tabs Local | Visitante -->
            <div class="team-tabs">
              <button
                class="team-tab"
                [class.active]="tabActivo === 'local'"
                (click)="setTab('local')"
                [style.border-color]="tabActivo === 'local' ? localColor : 'transparent'">
                @if (partido.clubLocal?.escudo_url) {
                  <img [src]="resolveUrl(partido.clubLocal.escudo_url)" class="w-7 h-7 rounded object-cover" alt="">
                }
                <span>{{ partido.clubLocal?.nombre_corto || partido.clubLocal?.nombre }}</span>
                <span class="count">{{ jugadoresLocal.length }}</span>
              </button>
              <button
                class="team-tab"
                [class.active]="tabActivo === 'visitante'"
                (click)="setTab('visitante')"
                [style.border-color]="tabActivo === 'visitante' ? visitColor : 'transparent'">
                @if (partido.clubVisitante?.escudo_url) {
                  <img [src]="resolveUrl(partido.clubVisitante.escudo_url)" class="w-7 h-7 rounded object-cover" alt="">
                }
                <span>{{ partido.clubVisitante?.nombre_corto || partido.clubVisitante?.nombre }}</span>
                <span class="count">{{ jugadoresVisitante.length }}</span>
              </button>
            </div>

            <!-- Lista de jugadores -->
            <div class="players-grid">
              @for (j of jugadoresVisible(); track j.id) {
                <button class="player-card" (click)="seleccionarJugador(j)">
                  <div class="player-number">{{ j.numero_camiseta || '?' }}</div>
                  <div class="player-info">
                    <div class="player-name">{{ j.apellido }}</div>
                    <div class="player-firstname">{{ j.nombre }}</div>
                  </div>
                  @if (j._goles) {
                    <div class="player-badge goles">
                      <mat-icon class="!text-sm !w-4 !h-4">sports_soccer</mat-icon>
                      {{ j._goles }}
                    </div>
                  }
                  @if (j._amarillas) {
                    <div class="player-badge amarilla">
                      <mat-icon class="!text-sm !w-4 !h-4">square</mat-icon>
                      {{ j._amarillas }}
                    </div>
                  }
                  @if (j._roja) {
                    <div class="player-badge roja">
                      <mat-icon class="!text-sm !w-4 !h-4">square</mat-icon>
                    </div>
                  }
                </button>
              }
              @if (!jugadoresVisible().length) {
                <div class="empty-players">
                  <mat-icon class="!text-5xl text-gray-300">groups</mat-icon>
                  <p>No hay jugadores fichados para esta categoria</p>
                </div>
              }
            </div>

            <!-- Botones de accion rapida -->
            <div class="quick-actions">
              <button class="action-btn gol" (click)="registrarRapido('gol')">
                <mat-icon class="!text-3xl !w-8 !h-8">sports_soccer</mat-icon>
                <span>GOL</span>
              </button>
              <button class="action-btn amarilla" (click)="registrarRapido('amarilla')">
                <mat-icon class="!text-3xl !w-8 !h-8">square</mat-icon>
                <span>AMARILLA</span>
              </button>
              <button class="action-btn roja" (click)="registrarRapido('roja')">
                <mat-icon class="!text-3xl !w-8 !h-8">square</mat-icon>
                <span>ROJA</span>
              </button>
              <button class="action-btn finalizar" (click)="finalizarPartido()">
                <mat-icon class="!text-3xl !w-8 !h-8">stop_circle</mat-icon>
                <span>FINALIZAR</span>
              </button>
            </div>
          </div>
        }

        @if (partido.estado === 'finalizado') {
          <div class="p-6 text-center bg-gray-50">
            @if (!partido.confirmado_arbitro && (auth.getUser()?.rol === 'arbitro' || auth.isAdmin())) {
              <button class="btn-huge btn-confirm" (click)="confirmarPartido()">
                <mat-icon class="!text-4xl !w-10 !h-10">verified</mat-icon>
                <span>CONFIRMAR RESULTADO</span>
              </button>
            } @else if (partido.confirmado_arbitro) {
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
            <h3 class="text-sm font-semibold text-gray-700 mb-2">Eventos del partido</h3>
            <div class="events-list">
              @for (ev of partido.eventos; track ev.id) {
                <div class="event-item">
                  <span class="event-min">{{ ev.minuto ? ev.minuto + "'" : '—' }}</span>
                  <mat-icon class="!text-lg"
                    [class]="ev.tipo === 'gol' ? 'text-green-500' : ev.tipo === 'amarilla' ? 'text-yellow-500' : ev.tipo === 'roja' ? 'text-red-500' : 'text-gray-400'">
                    {{ ev.tipo === 'gol' ? 'sports_soccer' : ev.tipo === 'amarilla' || ev.tipo === 'roja' ? 'square' : ev.tipo === 'sustitucion' ? 'swap_horiz' : 'info' }}
                  </mat-icon>
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
    } @else {
      <div class="p-12 text-center text-gray-500">Cargando partido...</div>
    }
  `,
  styles: [`
    :host { display: block; }

    .panel-root {
      min-height: 100vh;
      background: #f8fafc;
    }

    .fullscreen {
      position: fixed;
      inset: 0;
      z-index: 9999;
      overflow-y: auto;
      background: white;
    }

    /* Scoreboard */
    .scoreboard {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 1rem;
      padding: 2rem 1.5rem;
      color: white;
      position: relative;
      overflow: hidden;
    }

    .team {
      display: flex;
      align-items: center;
      gap: 1rem;
      min-width: 0;
    }
    .team-local { justify-content: flex-end; text-align: right; }
    .team-visit { justify-content: flex-start; text-align: left; }

    .team-shield {
      width: 84px;
      height: 84px;
      flex-shrink: 0;
    }
    .team-shield img {
      width: 100%;
      height: 100%;
      border-radius: 12px;
      object-fit: cover;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .shield-placeholder {
      width: 100%;
      height: 100%;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 800;
      color: white;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .team-name {
      font-size: 1.25rem;
      font-weight: 700;
      text-transform: uppercase;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      letter-spacing: 0.5px;
    }

    .team-score {
      font-size: 5rem;
      font-weight: 900;
      line-height: 1;
      text-shadow: 0 4px 8px rgba(0,0,0,0.4);
      min-width: 4rem;
      text-align: center;
    }

    .center-info {
      text-align: center;
      padding: 0 1rem;
    }
    .clock-time {
      font-size: 1.75rem;
      font-weight: 800;
      font-family: ui-monospace, monospace;
      background: rgba(0,0,0,0.3);
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      border: 2px solid rgba(255,255,255,0.3);
    }
    .clock-label {
      font-size: 0.75rem;
      font-weight: 700;
      margin-top: 0.5rem;
      opacity: 0.9;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
    }
    .live-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;
      animation: pulse 1.2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.9); }
    }

    /* Botones grandes */
    .btn-huge {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 2rem 3rem;
      border: none;
      border-radius: 1rem;
      font-size: 1.25rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      min-width: 240px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    }
    .btn-huge:active { transform: scale(0.97); }
    .btn-start {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }
    .btn-confirm {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
    }

    /* Content area */
    .content-area {
      padding: 1rem;
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 1rem;
      min-height: 400px;
    }

    /* Team tabs */
    .team-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }
    .team-tab {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      background: white;
      border: 3px solid transparent;
      border-radius: 0.75rem;
      font-size: 0.95rem;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .team-tab:hover { background: #f9fafb; }
    .team-tab.active { background: #f9fafb; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .team-tab .count {
      margin-left: auto;
      padding: 0.15rem 0.5rem;
      background: #e5e7eb;
      color: #4b5563;
      border-radius: 9999px;
      font-size: 0.7rem;
      font-weight: 700;
    }

    /* Players grid */
    .players-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 0.75rem;
      align-content: start;
    }
    .player-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 0.75rem;
      font-weight: 600;
      color: #111827;
      cursor: pointer;
      transition: all 0.15s;
      text-align: left;
      min-height: 72px;
      position: relative;
    }
    .player-card:hover {
      border-color: var(--color-primario);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    .player-card.selected {
      border-color: var(--color-primario);
      background: color-mix(in srgb, var(--color-primario) 8%, white);
    }
    .player-number {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--color-primario);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.1rem;
      flex-shrink: 0;
    }
    .player-info { flex: 1; min-width: 0; }
    .player-name {
      font-size: 0.875rem;
      font-weight: 700;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .player-firstname {
      font-size: 0.75rem;
      color: #6b7280;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .player-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      padding: 0.15rem 0.4rem;
      border-radius: 0.5rem;
      font-size: 0.7rem;
      font-weight: 700;
    }
    .player-badge.goles { background: #d1fae5; color: #065f46; }
    .player-badge.amarilla { background: #fef3c7; color: #92400e; }
    .player-badge.roja { background: #fee2e2; color: #991b1b; }

    .empty-players {
      grid-column: 1 / -1;
      text-align: center;
      padding: 3rem;
      color: #9ca3af;
    }

    /* Quick actions */
    .quick-actions {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
      padding: 1rem;
      background: white;
      border-radius: 0.75rem;
      border: 1px solid #e5e7eb;
      position: sticky;
      bottom: 0;
      box-shadow: 0 -4px 16px rgba(0,0,0,0.06);
    }
    @media (max-width: 640px) {
      .quick-actions { grid-template-columns: repeat(2, 1fr); }
    }
    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      padding: 1.25rem 0.5rem;
      border: none;
      border-radius: 0.75rem;
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
      color: white;
      min-height: 88px;
    }
    .action-btn:active { transform: scale(0.97); }
    .action-btn.gol { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .action-btn.amarilla { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    .action-btn.roja { background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); }
    .action-btn.finalizar { background: linear-gradient(135deg, #6b7280 0%, #374151 100%); }

    /* Timeline */
    .events-timeline {
      padding: 1rem;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }
    .events-list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      max-height: 300px;
      overflow-y: auto;
    }
    .event-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0.85rem;
      background: white;
      border-radius: 0.5rem;
      border: 1px solid #e5e7eb;
      font-size: 0.85rem;
    }
    .event-min {
      font-family: ui-monospace, monospace;
      font-weight: 700;
      color: #9ca3af;
      width: 36px;
      text-align: right;
    }
    .event-text { flex: 1; color: #374151; }
    .event-club {
      font-size: 0.7rem;
      color: #9ca3af;
      font-weight: 600;
      text-transform: uppercase;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .scoreboard { padding: 1rem; gap: 0.5rem; }
      .team-shield { width: 56px; height: 56px; }
      .team-name { font-size: 0.85rem; }
      .team-score { font-size: 3rem; min-width: 2.5rem; }
      .clock-time { font-size: 1.1rem; padding: 0.35rem 0.7rem; }
      .clock-label { font-size: 0.65rem; }
    }
  `],
})
export class PanelControlComponent implements OnInit, OnDestroy {
  partido: any = null;
  jugadoresLocal: any[] = [];
  jugadoresVisitante: any[] = [];
  tabActivo: 'local' | 'visitante' = 'local';
  jugadorSeleccionado: any = null;
  isFullscreen = false;
  clockSeconds = 0;
  localColor = '#762c7e';
  localColorSec = '#4f2f7d';
  visitColor = '#4f2f7d';
  visitColorSec = '#762c7e';

  private partidoId: number | null = null;
  private subs: Subscription[] = [];
  private clockSub?: Subscription;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    public auth: AuthService,
    private toastr: ToastrService,
    private socket: SocketService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.partidoId = parseInt(this.route.snapshot.paramMap.get('id') || '0') || null;
    if (!this.partidoId) { this.toastr.error('Partido no encontrado'); return; }
    this.cargarPartido();
    this.cargarJugadores();
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

  cargarPartido() {
    this.http.get<any>(`${environment.apiUrl}/partidos/${this.partidoId}`).subscribe({
      next: res => {
        this.partido = res.data;
        this.localColor = this.partido.clubLocal?.color_primario || '#762c7e';
        this.localColorSec = this.partido.clubLocal?.color_secundario || this.localColor;
        this.visitColor = this.partido.clubVisitante?.color_primario || '#4f2f7d';
        this.visitColorSec = this.partido.clubVisitante?.color_secundario || this.visitColor;
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
        this.calcEventosJugador();
        this.cdr.detectChanges();
      },
    });
  }

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

  private startClock() {
    if (this.partido?.estado !== 'en_curso' || !this.partido.hora_inicio) return;
    this.clockSub?.unsubscribe();
    this.clockSub = interval(1000).subscribe(() => {
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

  private calcEventosJugador() {
    // Reset contadores
    [...this.jugadoresLocal, ...this.jugadoresVisitante].forEach(j => {
      j._goles = 0;
      j._amarillas = 0;
      j._roja = false;
    });
    for (const ev of this.partido?.eventos || []) {
      if (!ev.jugador_id) continue;
      const jug = [...this.jugadoresLocal, ...this.jugadoresVisitante].find(j => j.id === ev.jugador_id);
      if (!jug) continue;
      if (ev.tipo === 'gol') jug._goles++;
      if (ev.tipo === 'amarilla') jug._amarillas++;
      if (ev.tipo === 'roja') jug._roja = true;
    }
  }

  setTab(tab: 'local' | 'visitante') {
    this.tabActivo = tab;
  }

  jugadoresVisible(): any[] {
    return this.tabActivo === 'local' ? this.jugadoresLocal : this.jugadoresVisitante;
  }

  seleccionarJugador(j: any) {
    this.jugadorSeleccionado = this.jugadorSeleccionado?.id === j.id ? null : j;
    // Visual feedback
    this.jugadoresLocal.forEach(x => x._selected = x.id === this.jugadorSeleccionado?.id);
    this.jugadoresVisitante.forEach(x => x._selected = x.id === this.jugadorSeleccionado?.id);
  }

  registrarRapido(tipo: EventoTipo) {
    if (!this.jugadorSeleccionado) {
      this.toastr.warning('Selecciona un jugador primero');
      return;
    }
    const clubId = this.tabActivo === 'local' ? this.partido.club_local_id : this.partido.club_visitante_id;
    this.http.post<any>(`${environment.apiUrl}/partidos/${this.partidoId}/evento`, {
      tipo,
      jugador_id: this.jugadorSeleccionado.id,
      club_id: clubId,
      minuto: this.currentMinute(),
    }).subscribe({
      next: () => {
        const label = tipo === 'gol' ? 'GOL' : tipo === 'amarilla' ? 'AMARILLA' : 'ROJA';
        this.toastr.success(`${label}: ${this.jugadorSeleccionado.apellido}`);
        this.jugadorSeleccionado = null;
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  iniciarPartido() {
    if (!confirm('Iniciar el partido?')) return;
    this.http.post<any>(`${environment.apiUrl}/partidos/${this.partidoId}/iniciar`, {}).subscribe({
      next: () => this.toastr.success('Partido iniciado'),
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  finalizarPartido() {
    if (!confirm('Finalizar el partido? Esta accion no se puede deshacer.')) return;
    this.http.post<any>(`${environment.apiUrl}/partidos/${this.partidoId}/finalizar`, {}).subscribe({
      next: () => this.toastr.success('Partido finalizado'),
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  confirmarPartido() {
    this.http.post<any>(`${environment.apiUrl}/partidos/${this.partidoId}/confirmar`, {}).subscribe({
      next: () => this.toastr.success('Partido confirmado'),
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  toggleFullscreen() {
    const elem = document.documentElement;
    if (!this.isFullscreen) {
      elem.requestFullscreen?.().then(() => {
        this.isFullscreen = true;
        this.cdr.detectChanges();
      }).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => {
        this.isFullscreen = false;
        this.cdr.detectChanges();
      }).catch(() => {});
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
}
