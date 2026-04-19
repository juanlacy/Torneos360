import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { BrandingService } from '../../../core/services/branding.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTabsModule, MatDividerModule],
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-bold text-gray-900">Configuracion</h1>

      <mat-tab-group>

        <!-- ═══ Tab Branding ═══ -->
        <mat-tab label="Identidad Visual">
          <div class="mt-4 space-y-4">
            <mat-card class="bg-white rounded-xl border border-gray-200">
              <mat-card-content>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Colores y Logo del Torneo</h3>
                <p class="text-sm text-gray-500 mb-4">
                  Personaliza la apariencia del sistema. Los colores se aplican al sidebar, botones y elementos destacados.
                </p>

                <div class="flex gap-4 items-end mb-6">
                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <mat-label>Torneo</mat-label>
                    <mat-select [(ngModel)]="brandTorneo" (selectionChange)="cargarBranding()">
                      @for (t of torneos; track t.id) {
                        <mat-option [value]="t">{{ t.nombre }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                </div>

                @if (brandTorneo) {
                  <!-- Logo -->
                  <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Logo del torneo</label>
                    <div class="flex items-center gap-4">
                      @if (brandForm.logo_url) {
                        <img [src]="resolveUrl(brandForm.logo_url)" class="w-16 h-16 rounded-lg object-cover border border-gray-200" alt="Logo">
                      } @else {
                        <div class="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                          <mat-icon>image</mat-icon>
                        </div>
                      }
                      <div>
                        <input type="file" #logoInput accept="image/*" class="hidden" (change)="subirLogo($event)">
                        <button mat-stroked-button (click)="logoInput.click()">
                          <mat-icon>upload</mat-icon> {{ brandForm.logo_url ? 'Cambiar logo' : 'Subir logo' }}
                        </button>
                        <p class="text-xs text-gray-400 mt-1">JPG, PNG, WebP o SVG. Max 2MB.</p>
                      </div>
                    </div>
                  </div>

                  <!-- Colores -->
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Color Primario</label>
                      <div class="flex items-center gap-3">
                        <input type="color" [(ngModel)]="brandForm.color_primario"
                          class="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer p-1">
                        <div>
                          <p class="text-sm font-mono text-gray-900">{{ brandForm.color_primario }}</p>
                          <p class="text-xs text-gray-400">Botones, links, nav activo</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Color Secundario</label>
                      <div class="flex items-center gap-3">
                        <input type="color" [(ngModel)]="brandForm.color_secundario"
                          class="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer p-1">
                        <div>
                          <p class="text-sm font-mono text-gray-900">{{ brandForm.color_secundario }}</p>
                          <p class="text-xs text-gray-400">Fondo del sidebar</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Color Acento</label>
                      <div class="flex items-center gap-3">
                        <input type="color" [(ngModel)]="brandForm.color_acento"
                          class="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer p-1">
                        <div>
                          <p class="text-sm font-mono text-gray-900">{{ brandForm.color_acento }}</p>
                          <p class="text-xs text-gray-400">Highlights, acentos</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Preview -->
                  <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Vista previa</label>
                    <div class="flex rounded-xl border border-gray-200 overflow-hidden h-32">
                      <!-- Mini sidebar -->
                      <div class="w-48 p-3 flex flex-col gap-2" [style.background-color]="brandForm.color_secundario">
                        <div class="flex items-center gap-2">
                          @if (brandForm.logo_url) {
                            <img [src]="resolveUrl(brandForm.logo_url)" class="w-6 h-6 rounded object-cover">
                          } @else {
                            <div class="w-6 h-6 rounded flex items-center justify-center" [style.background-color]="brandForm.color_primario">
                              <mat-icon class="!text-white !text-xs">sports_soccer</mat-icon>
                            </div>
                          }
                          <span class="text-white text-xs font-semibold">{{ brandTorneo.nombre }}</span>
                        </div>
                        <div class="text-[10px] text-white/40 uppercase mt-1">Menu</div>
                        <div class="text-white/70 text-[10px] px-2 py-1 rounded" [style.background-color]="brandForm.color_primario">Dashboard</div>
                        <div class="text-white/70 text-[10px] px-2 py-1">Torneos</div>
                        <div class="text-white/70 text-[10px] px-2 py-1">Clubes</div>
                      </div>
                      <!-- Mini content -->
                      <div class="flex-1 bg-gray-50 p-3">
                        <div class="text-xs font-bold text-gray-900 mb-2">Dashboard</div>
                        <div class="flex gap-2">
                          <div class="bg-white rounded border border-gray-200 p-2 flex-1 text-center">
                            <div class="text-lg font-bold" [style.color]="brandForm.color_primario">12</div>
                            <div class="text-[10px] text-gray-400">Clubes</div>
                          </div>
                          <div class="bg-white rounded border border-gray-200 p-2 flex-1 text-center">
                            <div class="text-lg font-bold" [style.color]="brandForm.color_acento">250</div>
                            <div class="text-[10px] text-gray-400">Jugadores</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button mat-flat-button color="primary" (click)="guardarBranding()">
                    <mat-icon>save</mat-icon> Guardar identidad visual
                  </button>
                }
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- ═══ Tab Reglas ═══ -->
        <mat-tab label="Reglas del Torneo">
          <div class="mt-4 space-y-4">
            <mat-card class="bg-white rounded-xl border border-gray-200">
              <mat-card-content>
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Sistema de Puntos</h3>
                <p class="text-sm text-gray-500 mb-4">Configura los puntos que se otorgan por resultado en cada partido.</p>

                <div class="flex gap-4 items-end">
                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <mat-label>Torneo</mat-label>
                    <mat-select [(ngModel)]="torneoSeleccionado" (selectionChange)="cargarConfigTorneo()">
                      @for (t of torneos; track t.id) {
                        <mat-option [value]="t">{{ t.nombre }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                </div>

                @if (torneoSeleccionado) {
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <mat-form-field appearance="outline">
                      <mat-label>Puntos por victoria</mat-label>
                      <input matInput type="number" [(ngModel)]="configTorneo.puntos_victoria" min="1">
                      <mat-hint>CAFI usa 2 puntos</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Puntos por empate</mat-label>
                      <input matInput type="number" [(ngModel)]="configTorneo.puntos_empate" min="0">
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Puntos por derrota</mat-label>
                      <input matInput type="number" [(ngModel)]="configTorneo.puntos_derrota" min="0">
                    </mat-form-field>
                  </div>

                  <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">Reglas del Partido</h3>
                  <p class="text-sm text-gray-500 mb-4">Configura las reglas aplicables a todos los partidos del torneo. Cada partido puede sobreescribir estas reglas.</p>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <mat-form-field appearance="outline">
                      <mat-label>Cantidad de tiempos</mat-label>
                      <input matInput type="number" [(ngModel)]="configTorneo.cantidad_tiempos" min="1" max="4">
                      <mat-hint>Por defecto 2</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Duracion de cada tiempo (minutos)</mat-label>
                      <input matInput type="number" [(ngModel)]="configTorneo.minutos_por_tiempo" min="1">
                    </mat-form-field>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                    <label class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" [(ngModel)]="configTorneo.tarjeta_azul_habilitada" class="w-5 h-5 rounded">
                      <div>
                        <p class="text-sm font-medium text-gray-900">Tarjeta azul</p>
                        <p class="text-[10px] text-gray-500">Habilita la tarjeta azul en los eventos</p>
                      </div>
                    </label>
                    <label class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" [(ngModel)]="configTorneo.contar_faltas" class="w-5 h-5 rounded">
                      <div>
                        <p class="text-sm font-medium text-gray-900">Contar faltas</p>
                        <p class="text-[10px] text-gray-500">Registra faltas por jugador y equipo</p>
                      </div>
                    </label>
                    <label class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" [(ngModel)]="configTorneo.reloj_parado" class="w-5 h-5 rounded">
                      <div>
                        <p class="text-sm font-medium text-gray-900">Reloj parado</p>
                        <p class="text-[10px] text-gray-500">Permite pausar el cronometro en cada evento</p>
                      </div>
                    </label>
                    <label class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" [(ngModel)]="configTorneo.elegir_mejor_jugador" class="w-5 h-5 rounded">
                      <div>
                        <p class="text-sm font-medium text-gray-900">Elegir mejor jugador</p>
                        <p class="text-[10px] text-gray-500">Al finalizar, permite elegir al MVP del partido</p>
                      </div>
                    </label>
                    <label class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" [(ngModel)]="configTorneo.calificar_arbitro" class="w-5 h-5 rounded">
                      <div>
                        <p class="text-sm font-medium text-gray-900">Calificar arbitro</p>
                        <p class="text-[10px] text-gray-500">Al cerrar el partido, calificar el arbitraje (1-5 estrellas)</p>
                      </div>
                    </label>
                  </div>

                  <h4 class="text-sm font-semibold text-gray-700 mt-4 mb-2">Reglas de tarjetas</h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div class="p-3 rounded-lg border border-gray-200">
                      <label class="text-xs font-medium text-gray-600 mb-1 block">Doble amarilla genera:</label>
                      <select [(ngModel)]="configTorneo.doble_amarilla_genera" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="roja">Tarjeta Roja (expulsion)</option>
                        <option value="azul">Tarjeta Azul (suspension temporal)</option>
                        <option value="nada">Nada (sin acumulacion)</option>
                      </select>
                    </div>
                    <div class="p-3 rounded-lg border border-gray-200">
                      <label class="text-xs font-medium text-gray-600 mb-1 block">Amarillas para suspension:</label>
                      <input type="number" [(ngModel)]="configTorneo.amarillas_para_suspension" min="0" max="10"
                        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="5 (entre partidos)">
                      <p class="text-[10px] text-gray-400 mt-1">Cantidad de amarillas acumuladas entre partidos para suspension automatica (0 = sin limite)</p>
                    </div>
                  </div>

                  <button mat-flat-button color="primary" (click)="guardarConfigTorneo()" class="mt-4">
                    <mat-icon>save</mat-icon> Guardar reglas
                  </button>
                }
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- ═══ Tab IA ═══ -->
        <mat-tab label="Integraciones IA">
          <div class="mt-4 space-y-4">
            <mat-card class="bg-white rounded-xl border border-gray-200">
              <mat-card-content>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Inteligencia Artificial</h3>
                <p class="text-sm text-gray-500 mb-4">Configura las claves de API para transcripcion de audio y generacion de resumenes.</p>

                <mat-form-field appearance="outline" class="mb-4">
                  <mat-label>IA Principal</mat-label>
                  <mat-select [(ngModel)]="iaConfig.ia_principal">
                    <mat-option value="openai">OpenAI (Whisper + GPT)</mat-option>
                    <mat-option value="gemini">Google Gemini</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-divider class="!my-4"></mat-divider>
                <h4 class="text-md font-medium text-gray-700 mb-3">OpenAI</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <mat-form-field appearance="outline">
                    <mat-label>API Key</mat-label>
                    <input matInput type="password" [(ngModel)]="iaConfig.openai_api_key" placeholder="sk-...">
                    <mat-icon matPrefix>key</mat-icon>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Modelo transcripcion</mat-label>
                    <mat-select [(ngModel)]="iaConfig.openai_modelo_transcripcion">
                      <mat-option value="whisper-1">Whisper-1</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Modelo resumen</mat-label>
                    <mat-select [(ngModel)]="iaConfig.openai_modelo_resumen">
                      <mat-option value="gpt-4o-mini">GPT-4o mini</mat-option>
                      <mat-option value="gpt-4o">GPT-4o</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <mat-divider class="!my-4"></mat-divider>
                <h4 class="text-md font-medium text-gray-700 mb-3">Google Gemini</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <mat-form-field appearance="outline">
                    <mat-label>API Key</mat-label>
                    <input matInput type="password" [(ngModel)]="iaConfig.gemini_api_key" placeholder="AIza...">
                    <mat-icon matPrefix>key</mat-icon>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Modelo</mat-label>
                    <mat-select [(ngModel)]="iaConfig.gemini_modelo">
                      <mat-option value="gemini-2.5-flash">Gemini 2.5 Flash</mat-option>
                      <mat-option value="gemini-2.5-pro">Gemini 2.5 Pro</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <button mat-flat-button color="primary" (click)="guardarIA()" class="mt-4">
                  <mat-icon>save</mat-icon> Guardar integraciones
                </button>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
})
export class ConfiguracionComponent implements OnInit {
  torneos: any[] = [];

  // Branding
  brandTorneo: any = null;
  brandForm = { logo_url: '', color_primario: '#762c7e', color_secundario: '#4f2f7d', color_acento: '#8cb24d' };

  // Reglas
  torneoSeleccionado: any = null;
  configTorneo: any = {
    puntos_victoria: 2,
    puntos_empate: 1,
    puntos_derrota: 0,
    cantidad_tiempos: 2,
    minutos_por_tiempo: 25,
    tarjeta_azul_habilitada: false,
    contar_faltas: false,
    reloj_parado: false,
    elegir_mejor_jugador: false,
    calificar_arbitro: false,
    doble_amarilla_genera: 'roja',
    amarillas_para_suspension: 5,
  };

  // IA
  iaConfig: any = {
    ia_principal: 'openai',
    openai_api_key: '', openai_modelo_transcripcion: 'whisper-1', openai_modelo_resumen: 'gpt-4o-mini',
    gemini_api_key: '', gemini_modelo: 'gemini-2.5-flash',
  };

  constructor(private http: HttpClient, private toastr: ToastrService, private branding: BrandingService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/torneos`).subscribe({
      next: res => { this.torneos = res.data; this.cdr.detectChanges(); },
    });
    this.cargarIA();
  }

  // ─── Branding ─────────────────────────────────────────────

  cargarBranding() {
    if (!this.brandTorneo) return;
    this.http.get<any>(`${environment.apiUrl}/torneos/${this.brandTorneo.id}/branding`).subscribe({
      next: res => {
        const d = res.data;
        this.brandForm = {
          logo_url: d.logo_url || '',
          color_primario: d.color_primario || '#762c7e',
          color_secundario: d.color_secundario || '#4f2f7d',
          color_acento: d.color_acento || '#8cb24d',
        };
        this.cdr.detectChanges();
      },
    });
  }

  guardarBranding() {
    this.http.put(`${environment.apiUrl}/torneos/${this.brandTorneo.id}/branding`, this.brandForm).subscribe({
      next: () => {
        this.toastr.success('Identidad visual guardada');
        this.branding.recargar();
        this.cdr.detectChanges();
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  subirLogo(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('logo', file);
    this.http.post<any>(`${environment.apiUrl}/torneos/${this.brandTorneo.id}/upload-logo`, form).subscribe({
      next: (res) => {
        this.brandForm.logo_url = res.data.logo_url;
        this.toastr.success('Logo subido');
        this.branding.recargar();
        this.cdr.detectChanges();
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  resolveUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return url;
    return `${environment.apiUrl}${url}`;
  }

  // ─── Reglas ───────────────────────────────────────────────

  cargarConfigTorneo() {
    if (!this.torneoSeleccionado) return;
    const config = this.torneoSeleccionado.config || {};
    this.configTorneo = {
      puntos_victoria: config.puntos_victoria ?? 2,
      puntos_empate: config.puntos_empate ?? 1,
      puntos_derrota: config.puntos_derrota ?? 0,
      cantidad_tiempos: config.cantidad_tiempos ?? 2,
      minutos_por_tiempo: config.minutos_por_tiempo ?? 25,
      tarjeta_azul_habilitada: config.tarjeta_azul_habilitada ?? false,
      contar_faltas: config.contar_faltas ?? false,
      reloj_parado: config.reloj_parado ?? false,
      elegir_mejor_jugador: config.elegir_mejor_jugador ?? false,
      calificar_arbitro: config.calificar_arbitro ?? false,
      doble_amarilla_genera: config.doble_amarilla_genera ?? 'roja',
      amarillas_para_suspension: config.amarillas_para_suspension ?? 5,
    };
  }

  guardarConfigTorneo() {
    const config = { ...this.torneoSeleccionado.config, ...this.configTorneo };
    this.http.put(`${environment.apiUrl}/torneos/${this.torneoSeleccionado.id}`, { config }).subscribe({
      next: () => { this.toastr.success('Reglas guardadas'); this.torneoSeleccionado.config = config; this.cdr.detectChanges(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  // ─── IA ───────────────────────────────────────────────────

  cargarIA() {
    this.http.get<any>(`${environment.apiUrl}/configuracion/integracion_ia`).subscribe({
      next: res => { if (res.data?.valor) this.iaConfig = { ...this.iaConfig, ...res.data.valor }; this.cdr.detectChanges(); },
      error: () => {},
    });
  }

  guardarIA() {
    this.http.put(`${environment.apiUrl}/configuracion/integracion_ia`, { valor: this.iaConfig }).subscribe({
      next: (res: any) => {
        this.toastr.success('Integraciones IA guardadas');
        if (res.data?.valor) this.iaConfig = { ...this.iaConfig, ...res.data.valor };
        this.cdr.detectChanges();
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }
}
