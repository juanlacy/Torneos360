import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
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

@Component({
  selector: 'app-partido-detalle',
  standalone: true,
  imports: [FormsModule, UpperCasePipe, MatCardModule, MatButtonModule, MatIconModule, MatDividerModule, MatChipsModule, MatSelectModule, MatFormFieldModule, MatInputModule],
  template: `
    @if (partido) {
      <div class="space-y-4">
        <!-- Header con resultado -->
        <mat-card class="!bg-slate-900 !border !border-slate-700">
          <mat-card-content class="p-6">
            <div class="text-center mb-2">
              <span class="text-sm text-slate-400">
                Fecha {{ partido.jornada?.numero_jornada }} — {{ partido.jornada?.fase | uppercase }}
                · {{ partido.categoria?.nombre }}
              </span>
            </div>
            <div class="flex items-center justify-center gap-8">
              <div class="text-center flex-1">
                <div class="text-xl font-bold text-slate-200">{{ partido.clubLocal?.nombre }}</div>
                <div class="text-sm text-slate-400">Local</div>
              </div>
              <div class="text-center">
                <div class="text-4xl font-bold px-6 py-3 rounded-lg"
                  [class]="partido.estado === 'finalizado' ? 'bg-green-900/30 text-green-300' : partido.estado === 'en_curso' ? 'bg-yellow-900/30 text-yellow-300' : 'bg-slate-800 text-slate-300'">
                  {{ partido.goles_local }} - {{ partido.goles_visitante }}
                </div>
                <span class="px-3 py-1 rounded text-xs font-medium mt-2 inline-block"
                  [class]="getEstadoClass(partido.estado)">{{ partido.estado }}</span>
              </div>
              <div class="text-center flex-1">
                <div class="text-xl font-bold text-slate-200">{{ partido.clubVisitante?.nombre }}</div>
                <div class="text-sm text-slate-400">Visitante</div>
              </div>
            </div>

            <!-- Acciones segun estado -->
            <div class="flex justify-center gap-3 mt-6">
              @if (partido.estado === 'programado' && auth.puede('partidos', 'editar')) {
                <button mat-flat-button color="primary" (click)="iniciarPartido()">
                  <mat-icon>play_arrow</mat-icon> Iniciar Partido
                </button>
              }
              @if (partido.estado === 'en_curso' && auth.puede('partidos', 'editar')) {
                <button mat-flat-button color="warn" (click)="finalizarPartido()">
                  <mat-icon>stop</mat-icon> Finalizar Partido
                </button>
              }
              @if (partido.estado === 'finalizado' && !partido.confirmado_arbitro && (auth.getUser()?.rol === 'arbitro' || auth.isAdmin())) {
                <button mat-flat-button color="accent" (click)="confirmarPartido()">
                  <mat-icon>verified</mat-icon> Confirmar (Arbitro)
                </button>
              }
              @if (partido.confirmado_arbitro) {
                <span class="flex items-center gap-1 text-green-400 text-sm">
                  <mat-icon class="!text-lg">verified</mat-icon> Confirmado por arbitro
                </span>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Registrar evento (solo en curso) -->
        @if (partido.estado === 'en_curso' && auth.puede('partidos', 'editar')) {
          <mat-card class="!bg-slate-900 !border !border-slate-700">
            <mat-card-content>
              <h3 class="text-lg font-semibold text-slate-200 mb-3">Registrar evento</h3>
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

        <!-- Timeline de eventos -->
        <mat-card class="!bg-slate-900 !border !border-slate-700">
          <mat-card-content>
            <h3 class="text-lg font-semibold text-slate-200 mb-3">Eventos del partido</h3>
            @if (partido.eventos?.length) {
              <div class="space-y-2">
                @for (ev of partido.eventos; track ev.id) {
                  <div class="flex items-center gap-3 p-2 rounded bg-slate-800/50">
                    <span class="text-xs text-slate-500 w-10 text-right">{{ ev.minuto ? ev.minuto + "'" : '' }}</span>
                    <mat-icon class="!text-lg" [class]="getEventoIconClass(ev.tipo)">{{ getEventoIcon(ev.tipo) }}</mat-icon>
                    <div class="flex-1">
                      <span class="text-slate-200">
                        @if (ev.jugador) {
                          {{ ev.jugador.apellido }} {{ ev.jugador.nombre }}
                          @if (ev.jugador.numero_camiseta) { (#{{ ev.jugador.numero_camiseta }}) }
                        }
                        @if (ev.detalle) { — {{ ev.detalle }} }
                      </span>
                    </div>
                    <span class="text-xs text-slate-500">{{ ev.club?.nombre_corto }}</span>
                  </div>
                }
              </div>
            } @else {
              <p class="text-slate-400 text-center py-4">Sin eventos registrados</p>
            }
          </mat-card-content>
        </mat-card>
        <!-- Informes del arbitro -->
        @if (partido.estado === 'finalizado' || partido.estado === 'en_curso') {
          <mat-card class="!bg-slate-900 !border !border-slate-700">
            <mat-card-content>
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-semibold text-slate-200">Informes del arbitro</h3>
                @if (auth.getUser()?.rol === 'arbitro' || auth.isAdmin()) {
                  <button mat-stroked-button color="primary" (click)="crearInforme()">
                    <mat-icon>note_add</mat-icon> Nuevo informe
                  </button>
                }
              </div>

              @for (inf of informes; track inf.id) {
                <div class="p-3 rounded bg-slate-800/50 mb-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded text-xs font-medium"
                        [class]="inf.tipo === 'disciplinario' ? 'bg-red-900/50 text-red-300' : inf.tipo === 'incidente' ? 'bg-yellow-900/50 text-yellow-300' : 'bg-slate-700/50 text-slate-300'">
                        {{ inf.tipo }}
                      </span>
                      <span class="px-2 py-0.5 rounded text-xs" [class]="inf.estado === 'confirmado' ? 'bg-green-900/50 text-green-300' : 'bg-slate-700/50 text-slate-300'">
                        {{ inf.estado }}
                      </span>
                    </div>
                    <span class="text-xs text-slate-500">{{ inf.usuario?.nombre }} {{ inf.usuario?.apellido }}</span>
                  </div>

                  @if (inf.resumen) {
                    <p class="text-sm text-slate-300 mb-1"><strong>Resumen IA:</strong> {{ inf.resumen }}</p>
                  }
                  @if (inf.texto_manual) {
                    <p class="text-sm text-slate-400">{{ inf.texto_manual }}</p>
                  }
                  @if (inf.audio_url && !inf.transcripcion) {
                    <p class="text-sm text-yellow-400">Audio pendiente de transcripcion</p>
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
                <p class="text-slate-400 text-center py-4">Sin informes</p>
              }

              <!-- Grabador de audio -->
              @if (grabando || audioBlob) {
                <div class="mt-4 p-4 rounded bg-slate-800 border border-slate-600">
                  <h4 class="text-sm font-medium text-slate-300 mb-2">Grabacion de audio</h4>
                  @if (grabando) {
                    <div class="flex items-center gap-3">
                      <span class="animate-pulse text-red-400 flex items-center gap-1">
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
export class PartidoDetalleComponent implements OnInit {
  partido: any = null;
  evento: any = { tipo: 'gol', club_id: null, minuto: null, detalle: '' };
  informes: any[] = [];

  // Grabacion de audio
  grabando = false;
  audioBlob: Blob | null = null;
  audioPreviewUrl = '';
  enviandoAudio = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private informeActual: any = null;

  constructor(private http: HttpClient, private route: ActivatedRoute, public auth: AuthService, private toastr: ToastrService) {}

  ngOnInit() { this.cargar(); }

  cargar() {
    const id = this.route.snapshot.paramMap.get('id');
    this.http.get<any>(`${environment.apiUrl}/partidos/${id}`).subscribe({
      next: res => { this.partido = res.data; this.cargarInformes(); },
      error: () => this.toastr.error('Error al cargar partido'),
    });
  }

  cargarInformes() {
    this.http.get<any>(`${environment.apiUrl}/informes`, { params: { partido_id: this.partido.id } }).subscribe({
      next: res => this.informes = res.data,
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
      next: () => { this.toastr.success('Evento registrado'); this.evento = { tipo: 'gol', club_id: null, minuto: null, detalle: '' }; this.cargar(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      programado: 'bg-slate-700/50 text-slate-300',
      en_curso: 'bg-yellow-900/50 text-yellow-300',
      finalizado: 'bg-green-900/50 text-green-300',
      suspendido: 'bg-red-900/50 text-red-300',
    };
    return map[estado] || 'bg-slate-700/50 text-slate-300';
  }

  getEventoIcon(tipo: string): string {
    const map: Record<string, string> = { gol: 'sports_soccer', amarilla: 'square', roja: 'square', sustitucion: 'swap_horiz', informe: 'description', inicio: 'play_arrow', fin: 'stop', penal: 'sports_soccer' };
    return map[tipo] || 'info';
  }

  getEventoIconClass(tipo: string): string {
    const map: Record<string, string> = { gol: 'text-green-400', amarilla: 'text-yellow-400', roja: 'text-red-400', sustitucion: 'text-blue-400', informe: 'text-slate-400', inicio: 'text-cyan-400', fin: 'text-slate-400' };
    return map[tipo] || 'text-slate-400';
  }

  // ─── Informes ─────────────────────────────────────────────────

  crearInforme() {
    this.http.post<any>(`${environment.apiUrl}/informes`, { partido_id: this.partido.id, tipo: 'general' }).subscribe({
      next: (res) => {
        this.toastr.success('Informe creado');
        this.cargarInformes();
        // Abrir grabador automaticamente
        this.informeActual = res.data;
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  getAudioUrl(url: string): string {
    return url.startsWith('http') ? url : `${environment.apiUrl}${url}`;
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
      };

      this.mediaRecorder.start();
      this.grabando = true;
    } catch (err) {
      this.toastr.error('No se pudo acceder al microfono. Verifica los permisos.');
    }
  }

  detenerGrabacion() {
    this.mediaRecorder?.stop();
    this.grabando = false;
  }

  enviarAudio() {
    if (!this.audioBlob || !this.informeActual) return;
    this.enviandoAudio = true;

    const formData = new FormData();
    formData.append('audio', this.audioBlob, `informe-${Date.now()}.webm`);

    this.http.post<any>(`${environment.apiUrl}/informes/${this.informeActual.id}/audio`, formData).subscribe({
      next: (res) => {
        this.enviandoAudio = false;
        this.toastr.success(res.message || 'Audio procesado');
        if (res.warning) this.toastr.warning(res.warning);
        this.cancelarAudio();
        this.cargarInformes();
      },
      error: (e: any) => {
        this.enviandoAudio = false;
        this.toastr.error(e.error?.message || 'Error al procesar audio');
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
      next: () => { this.toastr.success('Resumen generado'); this.cargarInformes(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }
}
