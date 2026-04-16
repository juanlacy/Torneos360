import { Component, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DniScannerComponent, DniData } from '../../shared/dni-scanner/dni-scanner.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-completar-perfil',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, DniScannerComponent],
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-lg max-w-md w-full overflow-hidden">
        <!-- Header con gradiente -->
        <div class="h-2 bg-gradient-to-r from-[var(--color-primario)] to-[var(--color-acento)]"></div>
        <div class="p-8 text-center">
          <mat-icon class="!text-5xl text-[var(--color-primario)] mb-3">badge</mat-icon>
          <h1 class="text-xl font-bold text-gray-900 mb-1">Completa tu perfil</h1>
          <p class="text-sm text-gray-500 mb-6">
            Ingresa tu DNI para vincularte con el torneo
          </p>

          <!-- Estado: input -->
          @if (estado === 'input') {
            <div class="space-y-4">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Numero de DNI</mat-label>
                <input matInput [(ngModel)]="dni" placeholder="12345678"
                  (keyup.enter)="vincular()">
                <mat-icon matSuffix class="text-gray-400">badge</mat-icon>
              </mat-form-field>

              <div class="flex gap-2">
                <button mat-flat-button color="primary" (click)="vincular()"
                  [disabled]="vinculando || !dni" class="flex-1">
                  @if (vinculando) {
                    <mat-icon class="animate-spin !text-lg">autorenew</mat-icon>
                  } @else {
                    Verificar
                  }
                </button>
                <button mat-stroked-button (click)="abrirScanner()" class="!px-3">
                  <mat-icon>qr_code_scanner</mat-icon>
                </button>
              </div>
            </div>
          }

          <!-- Estado: resultado -->
          @if (estado === 'resultado') {
            <div class="space-y-4 animate-fade-in">
              @if (resultado?.roles?.length) {
                <!-- Persona encontrada CON roles -->
                <div class="p-4 rounded-xl bg-green-50 border border-green-200">
                  <mat-icon class="!text-3xl text-green-600 mb-2">verified</mat-icon>
                  <p class="font-semibold text-green-900">{{ resultado.persona.nombre }} {{ resultado.persona.apellido }}</p>
                  <div class="flex flex-wrap gap-1.5 mt-2 justify-center">
                    @for (r of resultado.roles; track r.rol) {
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-white border"
                        [style.border-color]="r.color || '#d1d5db'" [style.color]="r.color || '#374151'">
                        @if (r.icono) { <mat-icon class="!text-xs !w-3 !h-3">{{ r.icono }}</mat-icon> }
                        {{ r.rol }}
                        @if (r.club) { <span class="text-gray-400">&middot; {{ r.club }}</span> }
                      </span>
                    }
                  </div>
                </div>
              } @else if (resultado?.persona_creada) {
                <!-- Persona nueva -->
                <div class="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <mat-icon class="!text-3xl text-blue-600 mb-2">person_add</mat-icon>
                  <p class="font-semibold text-blue-900">Perfil creado</p>
                  <p class="text-xs text-blue-600 mt-1">Un administrador te asignara un rol</p>
                </div>
              } @else {
                <!-- Persona existente sin roles -->
                <div class="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <mat-icon class="!text-3xl text-amber-600 mb-2">info</mat-icon>
                  <p class="font-semibold text-amber-900">{{ resultado.persona.nombre }} {{ resultado.persona.apellido }}</p>
                  <p class="text-xs text-amber-600 mt-1">Sin rol asignado. Contacta al administrador.</p>
                </div>
              }

              <button mat-flat-button color="primary" (click)="continuar()" class="w-full">
                Continuar
              </button>
            </div>
          }

          @if (error) {
            <div class="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{{ error }}</div>
          }
        </div>
      </div>
    </div>

    <!-- Scanner DNI -->
    @if (mostrarScanner) {
      <app-dni-scanner (scanned)="onDniScanned($event)" (cancelled)="mostrarScanner = false"></app-dni-scanner>
    }
  `,
})
export class CompletarPerfilComponent {
  private apiUrl = environment.apiUrl;

  estado: 'input' | 'resultado' = 'input';
  dni = '';
  vinculando = false;
  mostrarScanner = false;
  error = '';
  resultado: any = null;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  vincular() {
    if (!this.dni || this.dni.length < 7) return;
    this.vinculando = true;
    this.error = '';
    this.http.post<any>(`${this.apiUrl}/auth/vincular-dni`, { dni: this.dni }).subscribe({
      next: (res) => {
        this.resultado = res.data;
        this.estado = 'resultado';
        this.auth.setToken(res.data.token);
        this.auth.setUser(res.data.user);
        this.vinculando = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.error = e.error?.message || 'Error al vincular';
        this.vinculando = false;
        this.cdr.detectChanges();
      },
    });
  }

  continuar() {
    this.router.navigate(['/dashboard']);
  }

  abrirScanner() {
    this.mostrarScanner = true;
  }

  onDniScanned(data: DniData) {
    this.dni = data.dni;
    this.mostrarScanner = false;
    this.cdr.detectChanges();
    this.vincular();
  }
}
