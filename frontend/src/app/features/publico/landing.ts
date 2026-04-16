import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="animate-fade-in">

      <!-- ═══ HERO ═══ -->
      <section class="relative overflow-hidden py-20 md:py-32 px-6 text-center"
        style="background: linear-gradient(135deg, var(--color-primario) 0%, var(--color-secundario) 50%, var(--color-acento) 100%);">
        <!-- Pattern overlay -->
        <div class="absolute inset-0 opacity-10" style="background-image: url('data:image/svg+xml,<svg width=\\'60\\' height=\\'60\\' xmlns=\\'http://www.w3.org/2000/svg\\'><circle cx=\\'30\\' cy=\\'30\\' r=\\'2\\' fill=\\'white\\'/></svg>');"></div>

        <div class="relative max-w-4xl mx-auto">
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur text-white/90 text-sm font-medium mb-6">
            <mat-icon class="!text-base">sports_soccer</mat-icon>
            Plataforma de gestion de torneos
          </div>

          <h1 class="text-4xl md:text-6xl font-extrabold text-white mb-4 tracking-tight">
            Torneo<span class="text-yellow-300">360</span>
          </h1>
          <p class="text-xl md:text-2xl text-white/80 mb-8 max-w-2xl mx-auto">
            Gestion integral de torneos de Baby Futbol y Futsal.
            Fixture, resultados en vivo, estadisticas y mas.
          </p>

          <div class="flex flex-wrap gap-4 justify-center">
            <a routerLink="/auth/login"
              class="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-white text-gray-900 font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all">
              <mat-icon>login</mat-icon> Ingresar
            </a>
            @if (torneos.length) {
              <a [href]="'#torneos'"
                class="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-white/15 backdrop-blur text-white font-bold text-lg border border-white/30 hover:bg-white/25 transition-all">
                <mat-icon>emoji_events</mat-icon> Ver Torneos
              </a>
            }
          </div>
        </div>
      </section>

      <!-- ═══ FEATURES ═══ -->
      <section class="py-16 px-6 bg-white">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-3xl font-bold text-gray-900 text-center mb-3">Todo lo que necesitas para tu torneo</h2>
          <p class="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
            Desde la inscripcion hasta la tabla final, Torneo360 cubre cada etapa
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (f of features; track f.icon) {
              <div class="group p-6 rounded-2xl border border-gray-200 hover:border-[var(--color-primario)]/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                  [style.background]="f.bg">
                  <mat-icon class="text-white">{{ f.icon }}</mat-icon>
                </div>
                <h3 class="text-lg font-bold text-gray-900 mb-2">{{ f.title }}</h3>
                <p class="text-sm text-gray-500 leading-relaxed">{{ f.desc }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ═══ TORNEOS ACTIVOS ═══ -->
      @if (torneos.length) {
        <section id="torneos" class="py-16 px-6 bg-gray-50">
          <div class="max-w-4xl mx-auto">
            <h2 class="text-3xl font-bold text-gray-900 text-center mb-3">Torneos</h2>
            <p class="text-gray-500 text-center mb-10">Seguimiento en tiempo real</p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              @for (t of torneos; track t.id) {
                <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                  <div class="h-3" [style.background]="'linear-gradient(90deg, ' + (t.color_primario || '#762c7e') + ', ' + (t.color_acento || '#8cb24d') + ')'"></div>
                  <div class="p-6">
                    <div class="flex items-center gap-4 mb-4">
                      @if (t.logo_url) {
                        <img [src]="resolveUrl(t.logo_url)" class="w-14 h-14 object-contain" alt="">
                      } @else {
                        <div class="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold"
                          [style.background-color]="t.color_primario || '#762c7e'">
                          {{ (t.nombre || '?').charAt(0) }}
                        </div>
                      }
                      <div>
                        <h3 class="text-xl font-bold text-gray-900">{{ t.nombre }}</h3>
                        <p class="text-sm text-gray-500">Temporada {{ t.anio }}</p>
                      </div>
                    </div>

                    <div class="flex items-center justify-between">
                      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                        [class]="t.estado === 'en_curso' ? 'bg-green-100 text-green-700' :
                                  t.estado === 'finalizado' ? 'bg-gray-100 text-gray-600' :
                                  'bg-amber-100 text-amber-700'">
                        @if (t.estado === 'en_curso') { <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> }
                        {{ t.estado === 'en_curso' ? 'En curso' : t.estado === 'finalizado' ? 'Finalizado' : 'Planificacion' }}
                      </span>

                      @if (t._stats) {
                        <div class="flex gap-3 text-xs text-gray-500">
                          <span class="flex items-center gap-1"><mat-icon class="!text-sm !w-4 !h-4">groups</mat-icon> {{ t._stats.clubes }}</span>
                          <span class="flex items-center gap-1"><mat-icon class="!text-sm !w-4 !h-4">event</mat-icon> {{ t._stats.jornadas }}</span>
                        </div>
                      }
                    </div>

                    <!-- Mini tabla de posiciones (top 5 general) -->
                    @if (t._topPosiciones?.length) {
                      <div class="mt-4 pt-4 border-t border-gray-100">
                        <p class="text-[10px] text-gray-400 uppercase font-semibold mb-2">Tabla General (Top 5)</p>
                        <div class="space-y-1.5">
                          @for (pos of t._topPosiciones.slice(0, 5); track pos.club?.id; let i = $index) {
                            <div class="flex items-center gap-2 text-xs">
                              <span class="w-5 text-center font-bold"
                                [class]="i === 0 ? 'text-yellow-600' : i === 1 ? 'text-gray-500' : i === 2 ? 'text-amber-600' : 'text-gray-400'">
                                {{ i + 1 }}
                              </span>
                              @if (pos.club?.escudo_url) {
                                <img [src]="resolveUrl(pos.club.escudo_url)" class="w-5 h-5 object-contain" alt="">
                              } @else {
                                <div class="w-5 h-5 rounded-full flex items-center justify-center text-white text-[7px] font-bold"
                                  [style.background-color]="pos.club?.color_primario || '#762c7e'">
                                  {{ (pos.club?.nombre_corto || '?').substring(0, 2) }}
                                </div>
                              }
                              <span class="flex-1 text-gray-700 truncate font-medium">{{ pos.club?.nombre_corto || pos.club?.nombre }}</span>
                              <span class="font-bold text-[var(--color-primario)]">{{ pos.puntos_totales ?? pos.puntos ?? 0 }} pts</span>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </section>
      }

      <!-- ═══ CTA FINAL ═══ -->
      <section class="py-16 px-6 text-center"
        style="background: linear-gradient(135deg, var(--color-secundario), var(--color-primario));">
        <div class="max-w-2xl mx-auto">
          <h2 class="text-3xl font-bold text-white mb-4">Listo para gestionar tu torneo?</h2>
          <p class="text-white/70 mb-8">Ingresa a la plataforma o contactanos para mas informacion</p>
          <a routerLink="/auth/login"
            class="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-white text-gray-900 font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all">
            <mat-icon>login</mat-icon> Ingresar a Torneo360
          </a>
        </div>
      </section>

      <!-- ═══ FOOTER ═══ -->
      <footer class="py-6 px-6 bg-gray-900 text-center">
        <p class="text-xs text-gray-500">Torneo360 &copy; {{ currentYear }} — Gestion integral de torneos</p>
      </footer>
    </div>
  `,
})
export class LandingComponent implements OnInit {
  torneos: any[] = [];
  currentYear = new Date().getFullYear();

  features = [
    { icon: 'emoji_events', title: 'Torneos y Fixture', desc: 'Crea torneos con zonas, categorias y fixture automatico. Gestiona cruces y jornadas con un click.', bg: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
    { icon: 'sports_soccer', title: 'Partidos en Vivo', desc: 'Panel de control optimizado para tablet. Registra goles, tarjetas y sustituciones en tiempo real.', bg: 'linear-gradient(135deg, #059669, #34d399)' },
    { icon: 'leaderboard', title: 'Posiciones y Estadisticas', desc: 'Tabla de posiciones por zona, goleadores, tarjetas. Se actualizan automaticamente al finalizar un partido.', bg: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' },
    { icon: 'qr_code_scanner', title: 'Scanner de DNI', desc: 'Escanea el DNI argentino (PDF417) para completar datos de jugadores, delegados y arbitros al instante.', bg: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
    { icon: 'draw', title: 'Firma Digital', desc: 'Delegados confirman alineaciones y arbitros cierran partidos con DNI + firma en el dispositivo.', bg: 'linear-gradient(135deg, #ef4444, #f87171)' },
    { icon: 'swap_horiz', title: 'Transicion de Temporada', desc: 'Wizard para crear el torneo del proximo ano: rota categorias, traslada jugadores y staff automaticamente.', bg: 'linear-gradient(135deg, #8b5cf6, #c084fc)' },
  ];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/publico/torneos`).subscribe({
      next: (res) => {
        this.torneos = res.data || [];
        this.cdr.detectChanges();

        // Cargar mini-stats y top 5 posiciones para cada torneo
        for (const t of this.torneos) {
          // Stats: clubes, jornadas
          this.http.get<any>(`${environment.apiUrl}/publico/torneos/${t.id}`).subscribe({
            next: (r) => {
              t._stats = {
                clubes: r.data?.zonas?.reduce((sum: number, z: any) => sum, 0) || 0,
                jornadas: 0,
              };
              // Count zonas for display
              t._stats.clubes = r.data?.zonas?.length || 0;
              this.cdr.detectChanges();
            },
            error: () => {},
          });

          // Top 5 posiciones general
          this.http.get<any>(`${environment.apiUrl}/publico/torneos/${t.id}/posiciones`).subscribe({
            next: (r) => {
              t._topPosiciones = (r.data || [])
                .sort((a: any, b: any) => (b.puntos_totales ?? 0) - (a.puntos_totales ?? 0))
                .slice(0, 5);
              this.cdr.detectChanges();
            },
            error: () => {},
          });
        }
      },
      error: () => {},
    });
  }

  resolveUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return url;
    return `${environment.apiUrl}${url}`;
  }
}
