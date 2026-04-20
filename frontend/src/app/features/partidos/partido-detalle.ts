import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { UpperCasePipe } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';

@Component({
  selector: 'app-partido-detalle',
  standalone: true,
  imports: [FormsModule, RouterLink, UpperCasePipe, MatCardModule, MatButtonModule, MatIconModule, MatDividerModule, MatChipsModule, MatSelectModule, MatFormFieldModule, MatInputModule],
  template: `
    @if (partido) {
      <div class="space-y-4">
        <!-- Header con resultado -->
        <mat-card class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          @if (partido.estado === 'finalizado') {
            <!-- Barra superior con degrade de colores de los equipos -->
            <div class="h-1.5 grid grid-cols-2">
              <div [style.background-color]="partido.clubLocal?.color_primario || '#762c7e'"></div>
              <div [style.background-color]="partido.clubVisitante?.color_primario || '#4f2f7d'"></div>
            </div>
          }
          <mat-card-content class="p-6">
            <div class="text-center mb-3 flex items-center justify-center gap-2 flex-wrap">
              <span class="text-xs text-gray-500 font-medium">
                Fecha {{ partido.jornada?.numero_jornada }} · {{ partido.jornada?.fase | uppercase }}
              </span>
              @if (partido.categoria?.nombre) {
                <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">{{ partido.categoria.nombre }}</span>
              }
              <span class="badge" [class]="'badge-' + partido.estado">{{ partido.estado }}</span>
              @if (partido.confirmado_arbitro) {
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                  <mat-icon class="!text-xs !w-3 !h-3">verified</mat-icon> Confirmado
                </span>
              }
            </div>
            <div class="flex items-center justify-center gap-4 sm:gap-8">
              <!-- Local -->
              <div class="text-center flex-1 min-w-0">
                @if (partido.clubLocal?.escudo_url) {
                  <img [src]="resolveUrl(partido.clubLocal.escudo_url)" class="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-2 object-contain" alt="">
                } @else {
                  <div class="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-2 rounded-xl flex items-center justify-center text-white text-xl font-bold"
                    [style.background-color]="partido.clubLocal?.color_primario || '#762c7e'">
                    {{ initials(partido.clubLocal?.nombre_corto || partido.clubLocal?.nombre) }}
                  </div>
                }
                <div class="text-sm sm:text-lg font-bold text-gray-900 truncate"
                  [class.text-green-700]="esGanadorPartido('local')">
                  {{ partido.clubLocal?.nombre }}
                  @if (esGanadorPartido('local')) {
                    <mat-icon class="!text-base !w-4 !h-4 align-middle text-yellow-500">emoji_events</mat-icon>
                  }
                </div>
                <div class="text-xs text-gray-400">Local</div>
              </div>

              <!-- Score -->
              <div class="text-center shrink-0">
                <div class="text-4xl sm:text-5xl font-black px-5 py-3 rounded-xl tabular-nums shadow-sm"
                  [class]="partido.estado === 'finalizado' ? 'bg-gradient-to-br from-gray-900 to-gray-700 text-white' : partido.estado === 'en_curso' ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-100 text-gray-700'">
                  {{ partido.goles_local }} <span class="text-gray-400 mx-1">-</span> {{ partido.goles_visitante }}
                </div>
                @if (partido.estado === 'finalizado' && partido.goles_local === partido.goles_visitante) {
                  <div class="text-[10px] text-gray-500 uppercase font-semibold mt-1">Empate</div>
                }
              </div>

              <!-- Visitante -->
              <div class="text-center flex-1 min-w-0">
                @if (partido.clubVisitante?.escudo_url) {
                  <img [src]="resolveUrl(partido.clubVisitante.escudo_url)" class="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-2 object-contain" alt="">
                } @else {
                  <div class="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-2 rounded-xl flex items-center justify-center text-white text-xl font-bold"
                    [style.background-color]="partido.clubVisitante?.color_primario || '#4f2f7d'">
                    {{ initials(partido.clubVisitante?.nombre_corto || partido.clubVisitante?.nombre) }}
                  </div>
                }
                <div class="text-sm sm:text-lg font-bold text-gray-900 truncate"
                  [class.text-green-700]="esGanadorPartido('visitante')">
                  @if (esGanadorPartido('visitante')) {
                    <mat-icon class="!text-base !w-4 !h-4 align-middle text-yellow-500">emoji_events</mat-icon>
                  }
                  {{ partido.clubVisitante?.nombre }}
                </div>
                <div class="text-xs text-gray-400">Visitante</div>
              </div>
            </div>

            <!-- MVP + Calificacion arbitro (solo si finalizado) -->
            @if (partido.estado === 'finalizado' && (partido.mejorJugador || partido.calificacion_arbitro || partido.arbitro)) {
              <div class="mt-5 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                @if (partido.arbitro) {
                  <div class="flex items-center gap-2">
                    <mat-icon class="!text-gray-400">sports</mat-icon>
                    <div>
                      <p class="text-[10px] text-gray-400 uppercase font-semibold">Arbitro</p>
                      <p class="font-medium text-gray-800">{{ partido.arbitro.apellido }}, {{ partido.arbitro.nombre }}</p>
                    </div>
                  </div>
                }
                @if (partido.mejorJugador) {
                  <div class="flex items-center gap-2">
                    <mat-icon class="!text-yellow-500">star</mat-icon>
                    <div>
                      <p class="text-[10px] text-gray-400 uppercase font-semibold">MVP del partido</p>
                      <p class="font-medium text-gray-800">{{ partido.mejorJugador.apellido }}, {{ partido.mejorJugador.nombre }}</p>
                    </div>
                  </div>
                }
                @if (partido.calificacion_arbitro) {
                  <div class="flex items-center gap-2">
                    <mat-icon class="!text-amber-400">grade</mat-icon>
                    <div>
                      <p class="text-[10px] text-gray-400 uppercase font-semibold">Calificacion arbitro</p>
                      <p class="font-medium text-gray-800">
                        @for (i of [1,2,3,4,5]; track i) {
                          <span [class.text-amber-500]="i <= partido.calificacion_arbitro" [class.text-gray-300]="i > partido.calificacion_arbitro">★</span>
                        }
                      </p>
                    </div>
                  </div>
                }
              </div>
            }

            <!-- Acciones segun estado -->
            <div class="flex justify-center gap-3 mt-6 flex-wrap">
              @if (auth.puede('partidos', 'editar') && partido.estado !== 'finalizado') {
                <a [routerLink]="['/partidos', partido.id, 'control']" mat-flat-button color="primary" class="!bg-[var(--color-primario)]">
                  <mat-icon>settings_remote</mat-icon> Panel de Control
                </a>
              }
              @if (auth.puede('partidos', 'editar')) {
                <button mat-stroked-button (click)="abrirResultadoRapido()">
                  <mat-icon>edit</mat-icon>
                  {{ partido.estado === 'finalizado' ? 'Editar resultado' : 'Cargar resultado' }}
                </button>
              }
              @if (partido.estado === 'programado' && auth.puede('partidos', 'editar')) {
                <button mat-stroked-button (click)="iniciarPartido()">
                  <mat-icon>play_arrow</mat-icon> Iniciar Partido
                </button>
              }
              @if (partido.estado === 'en_curso' && auth.puede('partidos', 'editar')) {
                <button mat-stroked-button color="warn" (click)="finalizarPartido()">
                  <mat-icon>stop</mat-icon> Finalizar Partido
                </button>
              }
              @if (partido.estado === 'finalizado' && !partido.confirmado_arbitro && (auth.getUser()?.rol === 'arbitro' || auth.isAdmin())) {
                <button mat-flat-button color="accent" (click)="confirmarPartido()">
                  <mat-icon>verified</mat-icon> Confirmar (Arbitro)
                </button>
              }
              @if (partido.confirmado_arbitro) {
                <span class="flex items-center gap-1 text-green-600 text-sm">
                  <mat-icon class="!text-lg">verified</mat-icon> Confirmado por arbitro
                </span>
              }
            </div>

            <!-- Form inline: carga/edicion rapida de resultado -->
            @if (mostrarResultadoRapido) {
              <div class="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fade-in">
                <div class="flex items-center gap-2 mb-3">
                  <mat-icon class="!text-lg text-[var(--color-primario)]">edit</mat-icon>
                  <h3 class="text-sm font-bold text-gray-800">{{ partido.estado === 'finalizado' ? 'Editar resultado' : 'Cargar resultado final' }}</h3>
                  @if (partido.estado !== 'finalizado') {
                    <span class="ml-auto text-[10px] text-gray-500 italic">El partido se marcara como finalizado</span>
                  }
                </div>
                <div class="flex items-center justify-center gap-3 flex-wrap">
                  <div class="text-center flex-1 min-w-[160px]">
                    <p class="text-xs text-gray-500 mb-1 font-medium">{{ partido.clubLocal?.nombre_corto || partido.clubLocal?.nombre }}</p>
                    <input type="number" min="0" [(ngModel)]="resultadoForm.goles_local"
                      class="w-20 text-center text-2xl font-bold px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primario)]">
                  </div>
                  <span class="text-xl font-bold text-gray-400 mt-4">-</span>
                  <div class="text-center flex-1 min-w-[160px]">
                    <p class="text-xs text-gray-500 mb-1 font-medium">{{ partido.clubVisitante?.nombre_corto || partido.clubVisitante?.nombre }}</p>
                    <input type="number" min="0" [(ngModel)]="resultadoForm.goles_visitante"
                      class="w-20 text-center text-2xl font-bold px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primario)]">
                  </div>
                </div>
                <div class="flex justify-end gap-2 mt-4">
                  <button mat-button (click)="mostrarResultadoRapido = false">Cancelar</button>
                  <button mat-flat-button color="primary" class="!bg-[var(--color-primario)]"
                    (click)="guardarResultadoRapido()" [disabled]="guardandoResultado">
                    @if (guardandoResultado) {
                      <mat-icon class="animate-spin">autorenew</mat-icon>
                    }
                    Guardar
                  </button>
                </div>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Registrar evento (solo en curso) -->
        @if (partido.estado === 'en_curso' && auth.puede('partidos', 'editar')) {
          <mat-card class="bg-white rounded-xl border border-gray-200">
            <mat-card-content>
              <h3 class="text-lg font-semibold text-gray-900 mb-3">Registrar evento</h3>
              <div class="flex flex-wrap gap-3 items-end">
                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-36">
                  <mat-label>Tipo</mat-label>
                  <mat-select [(ngModel)]="evento.tipo">
                    <mat-option value="gol">Gol</mat-option>
                    <mat-option value="amarilla">Amarilla</mat-option>
                    <mat-option value="roja">Roja</mat-option>
                    <mat-option value="sustitucion">Sustitucion</mat-option>
                    <mat-option value="informe">Informe</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-36">
                  <mat-label>Club</mat-label>
                  <mat-select [(ngModel)]="evento.club_id">
                    <mat-option [value]="partido.club_local_id">{{ partido.clubLocal?.nombre_corto }}</mat-option>
                    <mat-option [value]="partido.club_visitante_id">{{ partido.clubVisitante?.nombre_corto }}</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-20">
                  <mat-label>Min</mat-label>
                  <input matInput type="number" [(ngModel)]="evento.minuto">
                </mat-form-field>
                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="flex-1">
                  <mat-label>Detalle</mat-label>
                  <input matInput [(ngModel)]="evento.detalle" placeholder="Descripcion del evento">
                </mat-form-field>
                <button mat-flat-button color="primary" (click)="registrarEvento()">
                  <mat-icon>add</mat-icon> Registrar
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        }

        <!-- Resumen del partido (solo finalizado) -->
        @if (partido.estado === 'finalizado' && resumen.goleadores.length + resumen.amarillas.length + resumen.rojas.length > 0) {
          <mat-card class="bg-white rounded-xl border border-gray-200">
            <mat-card-content class="p-5">
              <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Resumen del partido</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Local -->
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    @if (partido.clubLocal?.escudo_url) {
                      <img [src]="resolveUrl(partido.clubLocal.escudo_url)" class="w-6 h-6 object-contain" alt="">
                    }
                    <span class="text-sm font-semibold text-gray-800">{{ partido.clubLocal?.nombre_corto || partido.clubLocal?.nombre }}</span>
                  </div>
                  @for (g of filtrarPorClub(resumen.goleadores, partido.club_local_id); track g.persona_id) {
                    <div class="flex items-center gap-2 py-1 text-sm text-gray-700">
                      <span class="text-green-600">⚽</span>
                      <span class="flex-1 truncate">{{ g.nombre }}</span>
                      @if (g.cantidad > 1) { <span class="font-bold text-gray-800">x{{ g.cantidad }}</span> }
                    </div>
                  }
                  @for (a of filtrarPorClub(resumen.amarillas, partido.club_local_id); track a.persona_id) {
                    <div class="flex items-center gap-2 py-1 text-sm text-gray-700">
                      <span>🟨</span>
                      <span class="flex-1 truncate">{{ a.nombre }}</span>
                      @if (a.cantidad > 1) { <span class="font-bold text-gray-800">x{{ a.cantidad }}</span> }
                    </div>
                  }
                  @for (r of filtrarPorClub(resumen.rojas, partido.club_local_id); track r.persona_id) {
                    <div class="flex items-center gap-2 py-1 text-sm text-gray-700">
                      <span>🟥</span>
                      <span class="flex-1 truncate">{{ r.nombre }}</span>
                    </div>
                  }
                  @if (filtrarPorClub(resumen.goleadores, partido.club_local_id).length + filtrarPorClub(resumen.amarillas, partido.club_local_id).length + filtrarPorClub(resumen.rojas, partido.club_local_id).length === 0) {
                    <p class="text-xs text-gray-400 italic py-1">Sin eventos registrados</p>
                  }
                </div>
                <!-- Visitante -->
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    @if (partido.clubVisitante?.escudo_url) {
                      <img [src]="resolveUrl(partido.clubVisitante.escudo_url)" class="w-6 h-6 object-contain" alt="">
                    }
                    <span class="text-sm font-semibold text-gray-800">{{ partido.clubVisitante?.nombre_corto || partido.clubVisitante?.nombre }}</span>
                  </div>
                  @for (g of filtrarPorClub(resumen.goleadores, partido.club_visitante_id); track g.persona_id) {
                    <div class="flex items-center gap-2 py-1 text-sm text-gray-700">
                      <span class="text-green-600">⚽</span>
                      <span class="flex-1 truncate">{{ g.nombre }}</span>
                      @if (g.cantidad > 1) { <span class="font-bold text-gray-800">x{{ g.cantidad }}</span> }
                    </div>
                  }
                  @for (a of filtrarPorClub(resumen.amarillas, partido.club_visitante_id); track a.persona_id) {
                    <div class="flex items-center gap-2 py-1 text-sm text-gray-700">
                      <span>🟨</span>
                      <span class="flex-1 truncate">{{ a.nombre }}</span>
                      @if (a.cantidad > 1) { <span class="font-bold text-gray-800">x{{ a.cantidad }}</span> }
                    </div>
                  }
                  @for (r of filtrarPorClub(resumen.rojas, partido.club_visitante_id); track r.persona_id) {
                    <div class="flex items-center gap-2 py-1 text-sm text-gray-700">
                      <span>🟥</span>
                      <span class="flex-1 truncate">{{ r.nombre }}</span>
                    </div>
                  }
                  @if (filtrarPorClub(resumen.goleadores, partido.club_visitante_id).length + filtrarPorClub(resumen.amarillas, partido.club_visitante_id).length + filtrarPorClub(resumen.rojas, partido.club_visitante_id).length === 0) {
                    <p class="text-xs text-gray-400 italic py-1">Sin eventos registrados</p>
                  }
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        }

        <!-- Timeline de eventos -->
        <mat-card class="bg-white rounded-xl border border-gray-200">
          <mat-card-content>
            <h3 class="text-lg font-semibold text-gray-900 mb-3">Eventos del partido</h3>
            @if (partido.eventos?.length) {
              <div class="space-y-2">
                @for (ev of partido.eventos; track ev.id) {
                  <div class="flex items-center gap-3 p-2 rounded bg-gray-50">
                    <span class="text-xs text-gray-400 w-10 text-right">{{ ev.minuto ? ev.minuto + "'" : '' }}</span>
                    <mat-icon class="!text-lg" [class]="getEventoIconClass(ev.tipo)">{{ getEventoIcon(ev.tipo) }}</mat-icon>
                    <div class="flex-1">
                      <span class="text-gray-900">
                        @if (ev.jugador) {
                          {{ ev.jugador.apellido }} {{ ev.jugador.nombre }}
                          @if (ev.jugador.numero_camiseta) { (#{{ ev.jugador.numero_camiseta }}) }
                        }
                        @if (ev.detalle) { — {{ ev.detalle }} }
                      </span>
                    </div>
                    <span class="text-xs text-gray-400">{{ ev.club?.nombre_corto }}</span>
                  </div>
                }
              </div>
            } @else {
              <p class="text-gray-500 text-center py-4">Sin eventos registrados</p>
            }
          </mat-card-content>
        </mat-card>
        <!-- Informes del arbitro -->
        @if (partido.estado === 'finalizado' || partido.estado === 'en_curso') {
          <mat-card class="bg-white rounded-xl border border-gray-200">
            <mat-card-content>
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-semibold text-gray-900">Informes del arbitro</h3>
                @if (auth.getUser()?.rol === 'arbitro' || auth.isAdmin()) {
                  <button mat-stroked-button color="primary" (click)="crearInforme()">
                    <mat-icon>note_add</mat-icon> Nuevo informe
                  </button>
                }
              </div>

              @for (inf of informes; track inf.id) {
                <div class="p-3 rounded bg-gray-50 mb-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded text-xs font-medium"
                        [class]="inf.tipo === 'disciplinario' ? 'bg-red-50 text-red-700' : inf.tipo === 'incidente' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-700'">
                        {{ inf.tipo }}
                      </span>
                      <span class="px-2 py-0.5 rounded text-xs" [class]="inf.estado === 'confirmado' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'">
                        {{ inf.estado }}
                      </span>
                    </div>
                    <span class="text-xs text-gray-400">{{ inf.usuario?.nombre }} {{ inf.usuario?.apellido }}</span>
                  </div>

                  @if (inf.resumen) {
                    <p class="text-sm text-gray-700 mb-1"><strong>Resumen IA:</strong> {{ inf.resumen }}</p>
                  }
                  @if (inf.texto_manual) {
                    <p class="text-sm text-gray-500">{{ inf.texto_manual }}</p>
                  }
                  @if (inf.audio_url && !inf.transcripcion) {
                    <p class="text-sm text-yellow-600">Audio pendiente de transcripcion</p>
                  }

                  <div class="flex gap-2 mt-2">
                    @if (!inf.audio_url) {
                      <button mat-stroked-button class="!text-xs" (click)="grabarAudio(inf)">
                        <mat-icon class="!text-sm">mic</mat-icon> Grabar audio
                      </button>
                    }
                    @if (inf.audio_url) {
                      <audio [src]="getAudioUrl(inf.audio_url)" controls class="h-8"></audio>
                    }
                    @if ((inf.transcripcion || inf.texto_manual) && !inf.resumen) {
                      <button mat-stroked-button class="!text-xs" (click)="generarResumen(inf)">
                        <mat-icon class="!text-sm">auto_awesome</mat-icon> Generar resumen IA
                      </button>
                    }
                  </div>
                </div>
              } @empty {
                <p class="text-gray-500 text-center py-4">Sin informes</p>
              }

              <!-- Grabador de audio -->
              @if (grabando || audioBlob) {
                <div class="mt-4 p-4 rounded bg-gray-50 border border-gray-200">
                  <h4 class="text-sm font-medium text-gray-700 mb-2">Grabacion de audio</h4>
                  @if (grabando) {
                    <div class="flex items-center gap-3">
                      <span class="animate-pulse text-red-500 flex items-center gap-1">
                        <mat-icon class="!text-lg">fiber_manual_record</mat-icon> Grabando...
                      </span>
                      <button mat-flat-button color="warn" (click)="detenerGrabacion()">
                        <mat-icon>stop</mat-icon> Detener
                      </button>
                    </div>
                  }
                  @if (audioBlob && !grabando) {
                    <div class="flex items-center gap-3">
                      <audio [src]="audioPreviewUrl" controls class="h-8"></audio>
                      <button mat-flat-button color="primary" (click)="enviarAudio()" [disabled]="enviandoAudio">
                        <mat-icon>{{ enviandoAudio ? 'hourglass_top' : 'cloud_upload' }}</mat-icon>
                        {{ enviandoAudio ? 'Procesando con IA...' : 'Enviar y transcribir' }}
                      </button>
                      <button mat-stroked-button (click)="cancelarAudio()">Cancelar</button>
                    </div>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>
        }
      </div>
    }
  `,
})
export class PartidoDetalleComponent implements OnInit, OnDestroy {
  partido: any = null;
  evento: any = { tipo: 'gol', club_id: null, minuto: null, detalle: '' };
  informes: any[] = [];

  // Carga rapida de resultado
  mostrarResultadoRapido = false;
  resultadoForm = { goles_local: 0, goles_visitante: 0 };
  guardandoResultado = false;

  // Resumen agregado (goleadores, amarillas, rojas por jugador)
  resumen: {
    goleadores: { persona_id: number; nombre: string; club_id: number; cantidad: number }[];
    amarillas:  { persona_id: number; nombre: string; club_id: number; cantidad: number }[];
    rojas:      { persona_id: number; nombre: string; club_id: number; cantidad: number }[];
  } = { goleadores: [], amarillas: [], rojas: [] };

  // Grabacion de audio
  grabando = false;
  audioBlob: Blob | null = null;
  audioPreviewUrl = '';
  enviandoAudio = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private informeActual: any = null;
  private subs: Subscription[] = [];
  private partidoId: number | null = null;

  constructor(
    private http: HttpClient, private route: ActivatedRoute,
    public auth: AuthService, private toastr: ToastrService,
    private socket: SocketService, private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() { this.cargar(); }

  ngOnDestroy() {
    if (this.partidoId) this.socket.leaveMatch(this.partidoId);
    this.subs.forEach(s => s.unsubscribe());
  }

  private setupSocketListeners() {
    if (!this.partido) return;
    this.partidoId = this.partido.id;
    this.socket.joinMatch(this.partido.id);

    // Escuchar eventos en tiempo real
    this.subs.push(
      this.socket.on('match:event').subscribe((data: any) => {
        if (data.partido_id === this.partido.id) {
          this.partido.goles_local = data.goles_local;
          this.partido.goles_visitante = data.goles_visitante;
          if (data.evento) {
            this.partido.eventos = [...(this.partido.eventos || []), data.evento];
          }
          this.cdr.detectChanges();
        }
      }),
      this.socket.on('match:score').subscribe((data: any) => {
        if (data.partido_id === this.partido.id) {
          this.partido.goles_local = data.goles_local;
          this.partido.goles_visitante = data.goles_visitante;
          this.cdr.detectChanges();
        }
      }),
      this.socket.on('match:start').subscribe((data: any) => {
        if (data.partido_id === this.partido.id) {
          this.partido.estado = 'en_curso';
          this.partido.hora_inicio = data.hora_inicio;
          this.toastr.info('El partido ha comenzado');
          this.cdr.detectChanges();
        }
      }),
      this.socket.on('match:end').subscribe((data: any) => {
        if (data.partido_id === this.partido.id) {
          this.partido.estado = 'finalizado';
          this.partido.goles_local = data.goles_local;
          this.partido.goles_visitante = data.goles_visitante;
          this.toastr.info('Partido finalizado');
          this.cdr.detectChanges();
        }
      }),
      this.socket.on('match:confirm').subscribe((data: any) => {
        if (data.partido_id === this.partido.id) {
          this.partido.confirmado_arbitro = true;
          this.toastr.success('Partido confirmado por el arbitro');
          this.cdr.detectChanges();
        }
      }),
    );
  }

  cargar() {
    const id = this.route.snapshot.paramMap.get('id');
    this.http.get<any>(`${environment.apiUrl}/partidos/${id}`).subscribe({
      next: res => {
        this.partido = res.data;
        this.calcularResumen();
        this.cargarInformes();
        if (!this.partidoId) this.setupSocketListeners();
        this.cdr.detectChanges();
      },
      error: () => this.toastr.error('Error al cargar partido'),
    });
  }

  cargarInformes() {
    this.http.get<any>(`${environment.apiUrl}/informes`, { params: { partido_id: this.partido.id } }).subscribe({
      next: res => { this.informes = res.data; this.cdr.detectChanges(); },
    });
  }

  esGanadorPartido(lado: 'local' | 'visitante'): boolean {
    if (this.partido?.estado !== 'finalizado') return false;
    const gl = this.partido.goles_local ?? 0;
    const gv = this.partido.goles_visitante ?? 0;
    return lado === 'local' ? gl > gv : gv > gl;
  }

  initials(name: string | null | undefined): string {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  }

  resolveUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return url;
    return `${environment.apiUrl}${url}`;
  }

  filtrarPorClub<T extends { club_id: number }>(items: T[], clubId: number): T[] {
    return items.filter(i => i.club_id === clubId);
  }

  private calcularResumen() {
    const agrupar = (tipos: string[]) => {
      const map = new Map<string, { persona_id: number; nombre: string; club_id: number; cantidad: number }>();
      for (const ev of this.partido?.eventos || []) {
        if (!tipos.includes(ev.tipo) || !ev.persona_id) continue;
        const key = `${ev.persona_id}-${ev.club_id}`;
        if (!map.has(key)) {
          const nombre = ev.jugador ? `${ev.jugador.apellido || ''}, ${ev.jugador.nombre || ''}`.replace(/^, |, $/g, '') : '(desconocido)';
          map.set(key, { persona_id: ev.persona_id, nombre, club_id: ev.club_id, cantidad: 0 });
        }
        map.get(key)!.cantidad++;
      }
      return [...map.values()].sort((a, b) => b.cantidad - a.cantidad);
    };
    this.resumen = {
      goleadores: agrupar(['gol']),
      amarillas:  agrupar(['amarilla']),
      rojas:      agrupar(['roja']),
    };
  }

  abrirResultadoRapido() {
    this.resultadoForm = {
      goles_local: this.partido?.goles_local ?? 0,
      goles_visitante: this.partido?.goles_visitante ?? 0,
    };
    this.mostrarResultadoRapido = true;
    this.cdr.detectChanges();
  }

  guardarResultadoRapido() {
    if (!this.partidoId) return;
    this.guardandoResultado = true;
    this.http.post<any>(`${environment.apiUrl}/partidos/${this.partidoId}/resultado-rapido`, {
      goles_local: this.resultadoForm.goles_local,
      goles_visitante: this.resultadoForm.goles_visitante,
    }).subscribe({
      next: (res) => {
        this.guardandoResultado = false;
        this.toastr.success(res.message || 'Resultado guardado');
        this.mostrarResultadoRapido = false;
        this.cargar();
      },
      error: (e: any) => {
        this.guardandoResultado = false;
        this.toastr.error(e.error?.message || 'Error al guardar');
        this.cdr.detectChanges();
      },
    });
  }

  iniciarPartido() {
    this.http.post<any>(`${environment.apiUrl}/partidos/${this.partido.id}/iniciar`, {}).subscribe({
      next: () => { this.toastr.success('Partido iniciado'); this.cargar(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  finalizarPartido() {
    if (!confirm('Finalizar el partido?')) return;
    this.http.post<any>(`${environment.apiUrl}/partidos/${this.partido.id}/finalizar`, {}).subscribe({
      next: () => { this.toastr.success('Partido finalizado'); this.cargar(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  confirmarPartido() {
    this.http.post<any>(`${environment.apiUrl}/partidos/${this.partido.id}/confirmar`, {}).subscribe({
      next: () => { this.toastr.success('Partido confirmado'); this.cargar(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  registrarEvento() {
    if (!this.evento.tipo) { this.toastr.warning('Selecciona el tipo de evento'); return; }
    this.http.post<any>(`${environment.apiUrl}/partidos/${this.partido.id}/evento`, this.evento).subscribe({
      next: () => {
        this.toastr.success('Evento registrado');
        this.evento = { tipo: 'gol', club_id: null, minuto: null, detalle: '' };
        this.cargar();
        this.cdr.detectChanges();
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      programado: 'bg-gray-100 text-gray-700',
      en_curso: 'bg-yellow-50 text-yellow-700',
      finalizado: 'bg-green-50 text-green-700',
      suspendido: 'bg-red-50 text-red-700',
    };
    return map[estado] || 'bg-gray-100 text-gray-700';
  }

  getEventoIcon(tipo: string): string {
    const map: Record<string, string> = { gol: 'sports_soccer', amarilla: 'square', roja: 'square', sustitucion: 'swap_horiz', informe: 'description', inicio: 'play_arrow', fin: 'stop', penal: 'sports_soccer' };
    return map[tipo] || 'info';
  }

  getEventoIconClass(tipo: string): string {
    const map: Record<string, string> = { gol: 'text-green-600', amarilla: 'text-yellow-500', roja: 'text-red-500', sustitucion: 'text-blue-500', informe: 'text-gray-400', inicio: 'text-cyan-500', fin: 'text-gray-400' };
    return map[tipo] || 'text-gray-400';
  }

  // ─── Informes ─────────────────────────────────────────────────

  crearInforme() {
    this.http.post<any>(`${environment.apiUrl}/informes`, { partido_id: this.partido.id, tipo: 'general' }).subscribe({
      next: (res) => {
        this.toastr.success('Informe creado');
        this.cargarInformes();
        this.informeActual = res.data;
        this.cdr.detectChanges();
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  getAudioUrl(url: string): string {
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return url;
    return `${environment.apiUrl}${url}`;
  }

  async grabarAudio(informe: any) {
    this.informeActual = informe;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioPreviewUrl = URL.createObjectURL(this.audioBlob);
        stream.getTracks().forEach(t => t.stop());
        this.cdr.detectChanges();
      };

      this.mediaRecorder.start();
      this.grabando = true;
      this.cdr.detectChanges();
    } catch (err) {
      this.toastr.error('No se pudo acceder al microfono. Verifica los permisos.');
    }
  }

  detenerGrabacion() {
    this.mediaRecorder?.stop();
    this.grabando = false;
    this.cdr.detectChanges();
  }

  enviarAudio() {
    if (!this.audioBlob || !this.informeActual) return;
    this.enviandoAudio = true;
    this.cdr.detectChanges();

    const formData = new FormData();
    formData.append('audio', this.audioBlob, `informe-${Date.now()}.webm`);

    this.http.post<any>(`${environment.apiUrl}/informes/${this.informeActual.id}/audio`, formData).subscribe({
      next: (res) => {
        this.enviandoAudio = false;
        this.toastr.success(res.message || 'Audio procesado');
        if (res.warning) this.toastr.warning(res.warning);
        this.cancelarAudio();
        this.cargarInformes();
        this.cdr.detectChanges();
      },
      error: (e: any) => {
        this.enviandoAudio = false;
        this.toastr.error(e.error?.message || 'Error al procesar audio');
        this.cdr.detectChanges();
      },
    });
  }

  cancelarAudio() {
    this.audioBlob = null;
    this.audioPreviewUrl = '';
    this.grabando = false;
    this.informeActual = null;
  }

  generarResumen(informe: any) {
    this.http.post<any>(`${environment.apiUrl}/informes/${informe.id}/resumir`, {}).subscribe({
      next: () => { this.toastr.success('Resumen generado'); this.cargarInformes(); this.cdr.detectChanges(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }
}
