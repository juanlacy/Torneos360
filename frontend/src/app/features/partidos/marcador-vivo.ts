import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { UpperCasePipe } from '@angular/common';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { SocketService } from '../../core/services/socket.service';

@Component({
  selector: 'app-marcador-vivo',
  standalone: true,
  imports: [FormsModule, RouterLink, UpperCasePipe, MatCardModule, MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatChipsModule],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-200">
          <mat-icon class="text-red-400 animate-pulse mr-1 align-middle">fiber_manual_record</mat-icon>
          Marcador en Vivo
        </h1>
        <div class="flex gap-2 items-center">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Torneo</mat-label>
            <mat-select [(ngModel)]="torneoId" (selectionChange)="cargarJornadas()">
              @for (t of torneos; track t.id) {
                <mat-option [value]="t.id">{{ t.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Jornada</mat-label>
            <mat-select [(ngModel)]="jornadaId" (selectionChange)="cargarPartidos()">
              @for (j of jornadas; track j.id) {
                <mat-option [value]="j.id">
                  F{{ j.numero_jornada }} {{ j.fase | uppercase }}
                  @if (j.zona) { — {{ j.zona.nombre }} }
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <!-- Partidos agrupados por categoria -->
      @for (grupo of partidosAgrupados; track grupo.categoria) {
        <div>
          <h3 class="text-sm font-semibold text-slate-400 uppercase mb-2">{{ grupo.categoria }}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            @for (p of grupo.partidos; track p.id) {
              <mat-card class="!bg-slate-900 !border !border-slate-700 hover:!border-slate-500 transition-colors cursor-pointer"
                [class.!border-yellow-600]="p.estado === 'en_curso'"
                [class.!border-green-700]="p.estado === 'finalizado'">
                <mat-card-content class="p-4">
                  <div class="flex items-center gap-4">
                    <!-- Club local -->
                    <div class="flex-1 text-right">
                      <span class="font-semibold text-slate-200">
                        {{ p.clubLocal?.nombre_corto || p.clubLocal?.nombre }}
                      </span>
                    </div>

                    <!-- Marcador -->
                    <div class="text-center min-w-[80px]">
                      <div class="text-2xl font-bold px-4 py-2 rounded-lg"
                        [class]="p.estado === 'en_curso' ? 'bg-yellow-900/40 text-yellow-300 animate-pulse' :
                                 p.estado === 'finalizado' ? 'bg-green-900/30 text-green-300' :
                                 'bg-slate-800 text-slate-400'">
                        {{ p.goles_local }} - {{ p.goles_visitante }}
                      </div>
                      <div class="mt-1">
                        @if (p.estado === 'en_curso') {
                          <span class="text-xs text-yellow-400 flex items-center justify-center gap-1">
                            <mat-icon class="!text-xs">fiber_manual_record</mat-icon> EN VIVO
                          </span>
                        } @else if (p.estado === 'finalizado') {
                          <span class="text-xs text-green-400">FINAL</span>
                        } @else {
                          <span class="text-xs text-slate-500">{{ p.estado }}</span>
                        }
                      </div>
                    </div>

                    <!-- Club visitante -->
                    <div class="flex-1 text-left">
                      <span class="font-semibold text-slate-200">
                        {{ p.clubVisitante?.nombre_corto || p.clubVisitante?.nombre }}
                      </span>
                    </div>

                    <!-- Link al detalle -->
                    <a [routerLink]="['/partidos', p.id]" class="text-slate-500 hover:text-slate-300">
                      <mat-icon>open_in_new</mat-icon>
                    </a>
                  </div>

                  <!-- Ultimo evento -->
                  @if (p._ultimoEvento) {
                    <div class="mt-2 text-xs text-slate-400 text-center border-t border-slate-800 pt-2">
                      <mat-icon class="!text-xs align-middle mr-1"
                        [class]="p._ultimoEvento.tipo === 'gol' ? 'text-green-400' : p._ultimoEvento.tipo === 'amarilla' ? 'text-yellow-400' : p._ultimoEvento.tipo === 'roja' ? 'text-red-400' : 'text-slate-400'">
                        {{ p._ultimoEvento.tipo === 'gol' ? 'sports_soccer' : p._ultimoEvento.tipo === 'amarilla' ? 'square' : p._ultimoEvento.tipo === 'roja' ? 'square' : 'info' }}
                      </mat-icon>
                      {{ p._ultimoEvento.minuto ? p._ultimoEvento.minuto + "'" : '' }}
                      {{ p._ultimoEvento.detalle || p._ultimoEvento.tipo }}
                    </div>
                  }
                </mat-card-content>
              </mat-card>
            }
          </div>
        </div>
      } @empty {
        <mat-card class="!bg-slate-900 !border !border-slate-700">
          <mat-card-content class="p-8 text-center text-slate-400">
            @if (!jornadaId) {
              <mat-icon class="!text-5xl text-slate-600 mb-2">live_tv</mat-icon>
              <p>Selecciona un torneo y una jornada para ver el marcador en vivo</p>
            } @else {
              <p>No hay partidos para esta jornada</p>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
})
export class MarcadorVivoComponent implements OnInit, OnDestroy {
  torneos: any[] = [];
  jornadas: any[] = [];
  partidos: any[] = [];
  partidosAgrupados: { categoria: string; partidos: any[] }[] = [];
  torneoId: number | null = null;
  jornadaId: number | null = null;
  private subs: Subscription[] = [];

  constructor(private http: HttpClient, private socket: SocketService, private toastr: ToastrService) {}

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/torneos`).subscribe({
      next: res => {
        this.torneos = res.data;
        if (this.torneos.length) { this.torneoId = this.torneos[0].id; this.cargarJornadas(); }
      },
    });
    this.setupSocketListeners();
  }

  ngOnDestroy() {
    if (this.jornadaId) this.socket.leaveJornada(this.jornadaId);
    this.subs.forEach(s => s.unsubscribe());
  }

  cargarJornadas() {
    if (!this.torneoId) return;
    this.http.get<any>(`${environment.apiUrl}/fixture/${this.torneoId}/jornadas`).subscribe({
      next: res => { this.jornadas = res.data; },
    });
  }

  cargarPartidos() {
    if (!this.jornadaId) return;
    // Desuscribir jornada anterior
    this.socket.leaveJornada(this.jornadaId);

    this.http.get<any>(`${environment.apiUrl}/fixture/jornada/${this.jornadaId}/partidos`).subscribe({
      next: res => {
        this.partidos = res.data;
        this.agrupar();
        this.socket.joinJornada(this.jornadaId!);
      },
    });
  }

  private agrupar() {
    const grupos: Record<string, any[]> = {};
    for (const p of this.partidos) {
      const cat = p.categoria?.nombre || 'Sin categoria';
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(p);
    }
    this.partidosAgrupados = Object.entries(grupos).map(([categoria, partidos]) => ({ categoria, partidos }));
  }

  private setupSocketListeners() {
    this.subs.push(
      // Actualizar marcador
      this.socket.on('match:score').subscribe((data: any) => {
        const p = this.partidos.find(x => x.id === data.partido_id);
        if (p) { p.goles_local = data.goles_local; p.goles_visitante = data.goles_visitante; }
      }),
      // Nuevo evento (actualiza marcador + muestra ultimo evento)
      this.socket.on('match:event').subscribe((data: any) => {
        const p = this.partidos.find(x => x.id === data.partido_id);
        if (p) {
          p.goles_local = data.goles_local;
          p.goles_visitante = data.goles_visitante;
          p._ultimoEvento = data.evento;
        }
      }),
      // Partido iniciado
      this.socket.on('match:start').subscribe((data: any) => {
        const p = this.partidos.find(x => x.id === data.partido_id);
        if (p) { p.estado = 'en_curso'; }
      }),
      // Partido finalizado
      this.socket.on('match:end').subscribe((data: any) => {
        const p = this.partidos.find(x => x.id === data.partido_id);
        if (p) {
          p.estado = 'finalizado';
          p.goles_local = data.goles_local;
          p.goles_visitante = data.goles_visitante;
        }
      }),
      // Confirmado
      this.socket.on('match:confirm').subscribe((data: any) => {
        const p = this.partidos.find(x => x.id === data.partido_id);
        if (p) p.confirmado_arbitro = true;
      }),
    );
  }
}
