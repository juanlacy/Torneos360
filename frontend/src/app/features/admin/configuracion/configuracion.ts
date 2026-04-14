import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTabsModule, MatDividerModule],
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-bold text-gray-900">Configuracion</h1>

      <mat-tab-group>
        <!-- Tab Torneo -->
        <mat-tab label="Reglas del Torneo">
          <div class="mt-4 space-y-4">
            <mat-card class="bg-white rounded-xl border border-gray-200">
              <mat-card-content>
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Sistema de Puntos</h3>
                <p class="text-sm text-gray-500 mb-4">Configura los puntos que se otorgan por resultado en cada partido. Estos valores se guardan en la configuracion del torneo.</p>

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
                  <button mat-flat-button color="primary" (click)="guardarConfigTorneo()" class="mt-2">
                    <mat-icon>save</mat-icon> Guardar reglas
                  </button>
                }
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Tab Integraciones IA -->
        <mat-tab label="Integraciones IA">
          <div class="mt-4 space-y-4">
            <mat-card class="bg-white rounded-xl border border-gray-200">
              <mat-card-content>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Inteligencia Artificial</h3>
                <p class="text-sm text-gray-500 mb-4">
                  Configura las claves de API para transcripcion de audio y generacion de resumenes en los informes de arbitros.
                </p>

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
                      <mat-option value="gpt-4.1-mini">GPT-4.1 mini</mat-option>
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
  torneoSeleccionado: any = null;
  configTorneo: any = { puntos_victoria: 2, puntos_empate: 1, puntos_derrota: 0 };

  iaConfig: any = {
    ia_principal: 'openai',
    openai_api_key: '', openai_modelo_transcripcion: 'whisper-1', openai_modelo_resumen: 'gpt-4o-mini',
    gemini_api_key: '', gemini_modelo: 'gemini-2.5-flash',
  };

  constructor(private http: HttpClient, private toastr: ToastrService) {}

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/torneos`).subscribe({
      next: res => this.torneos = res.data,
    });
    this.cargarIA();
  }

  cargarConfigTorneo() {
    if (!this.torneoSeleccionado) return;
    const config = this.torneoSeleccionado.config || {};
    this.configTorneo = {
      puntos_victoria: config.puntos_victoria ?? 2,
      puntos_empate: config.puntos_empate ?? 1,
      puntos_derrota: config.puntos_derrota ?? 0,
    };
  }

  guardarConfigTorneo() {
    const config = { ...this.torneoSeleccionado.config, ...this.configTorneo };
    this.http.put(`${environment.apiUrl}/torneos/${this.torneoSeleccionado.id}`, { config }).subscribe({
      next: () => {
        this.toastr.success('Reglas del torneo guardadas');
        this.torneoSeleccionado.config = config;
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  cargarIA() {
    this.http.get<any>(`${environment.apiUrl}/configuracion/integracion_ia`).subscribe({
      next: res => { if (res.data?.valor) this.iaConfig = { ...this.iaConfig, ...res.data.valor }; },
      error: () => {}, // No configurada aun, usar defaults
    });
  }

  guardarIA() {
    this.http.put(`${environment.apiUrl}/configuracion/integracion_ia`, { valor: this.iaConfig }).subscribe({
      next: (res: any) => {
        this.toastr.success('Integraciones IA guardadas');
        if (res.data?.valor) this.iaConfig = { ...this.iaConfig, ...res.data.valor };
      },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }
}
