import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4"
      style="background: linear-gradient(135deg, var(--color-secundario) 0%, var(--color-primario) 50%, var(--color-acento) 100%);">

      <div class="w-full max-w-sm">
        <!-- Card principal -->
        <div class="bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in">

          <!-- Header con logo -->
          <div class="px-8 pt-8 pb-4 text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg"
              style="background: linear-gradient(135deg, var(--color-primario), var(--color-acento));">
              <mat-icon class="!text-3xl text-white">sports_soccer</mat-icon>
            </div>
            <h1 class="text-xl font-bold text-gray-900">Torneo<span class="text-[var(--color-primario)]">360</span></h1>
            <p class="text-xs text-gray-400 mt-1">Ingresa a tu cuenta</p>
          </div>

          <div class="px-8 pb-8">
            <!-- OAuth buttons (prominentes) -->
            <div class="space-y-2.5 mb-5">
              <button (click)="onGoogleLogin()" [disabled]="loading"
                class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-md transition-all text-sm font-medium text-gray-700 disabled:opacity-50">
                <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </button>

              <button (click)="onMicrosoftLogin()" [disabled]="loading"
                class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-md transition-all text-sm font-medium text-gray-700 disabled:opacity-50">
                <svg class="w-5 h-5 shrink-0" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                Continuar con Microsoft
              </button>
            </div>

            <!-- Separador -->
            <div class="flex items-center gap-3 mb-4">
              <div class="flex-1 h-px bg-gray-200"></div>
              <button (click)="mostrarEmail = !mostrarEmail"
                class="text-[10px] text-gray-400 hover:text-gray-600 transition-colors whitespace-nowrap">
                {{ mostrarEmail ? 'Ocultar' : 'Usar correo electronico' }}
              </button>
              <div class="flex-1 h-px bg-gray-200"></div>
            </div>

            <!-- Email/password (colapsable) -->
            @if (mostrarEmail) {
              <form (ngSubmit)="onLogin()" class="space-y-3 animate-fade-in">
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Email</mat-label>
                  <input matInput type="email" [(ngModel)]="email" name="email" required>
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Contrasena</mat-label>
                  <input matInput [type]="hidePassword ? 'password' : 'text'" [(ngModel)]="password" name="password" required>
                  <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword" tabindex="-1">
                    <mat-icon class="!text-base text-gray-400">{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                </mat-form-field>

                <button mat-flat-button color="primary" type="submit" class="w-full" [disabled]="loading">
                  @if (loading) {
                    <mat-icon class="animate-spin !text-lg">autorenew</mat-icon>
                  } @else {
                    Iniciar sesion
                  }
                </button>

                <div class="flex justify-between text-[11px]">
                  <a routerLink="/auth/forgot-password" class="text-gray-400 hover:text-[var(--color-primario)]">Olvidaste tu contrasena?</a>
                  <a routerLink="/auth/register" class="text-gray-400 hover:text-[var(--color-primario)]">Crear cuenta</a>
                </div>
              </form>
            }
          </div>
        </div>

        <!-- Footer -->
        <p class="text-center text-[10px] text-white/50 mt-6">
          Torneo360 &copy; {{ currentYear }}
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  hidePassword = true;
  loading = false;
  mostrarEmail = false;
  currentYear = new Date().getFullYear();

  private googleClientId = environment.googleClientId;
  private microsoftClientId = environment.microsoftClientId;
  private microsoftTenantId = environment.microsoftTenantId;

  constructor(
    private auth: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit() {
    this.loadGoogleSdk();
  }

  // ─── Email/Password ─────────────────────────────────────────────────────
  onLogin(): void {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.toastr.success('Bienvenido!');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error(err.error?.message || 'Error al iniciar sesion');
        this.cdr.detectChanges();
      },
    });
  }

  // ─── Google Identity Services ───────────────────────────────────────────
  private loadGoogleSdk() {
    if (!this.googleClientId) return;

    // Cargar el script de Google Identity Services
    if (document.getElementById('google-gsi')) return;
    const script = document.createElement('script');
    script.id = 'google-gsi';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => this.initGoogle();
    document.head.appendChild(script);
  }

  private initGoogle() {
    if (typeof google === 'undefined' || !google.accounts) return;
    google.accounts.id.initialize({
      client_id: this.googleClientId,
      callback: (response: any) => {
        this.ngZone.run(() => this.handleGoogleCredential(response.credential));
      },
    });
  }

  onGoogleLogin(): void {
    if (!this.googleClientId) {
      this.toastr.warning('Google Sign-In no esta configurado. Contacta al administrador.');
      return;
    }

    if (typeof google === 'undefined' || !google.accounts) {
      this.toastr.error('Error cargando Google SDK. Intenta de nuevo.');
      return;
    }

    // Usar el popup de Google One Tap
    google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback: abrir popup manual
        google.accounts.oauth2.initCodeClient({
          client_id: this.googleClientId,
          scope: 'openid email profile',
          ux_mode: 'popup',
          callback: (response: any) => {
            // Code flow — no es lo que necesitamos. Usar credential flow.
          },
        });
        // Alternativa: usar el boton de Google renderizado
        this.toastr.info('Permitir popups de Google para continuar');
      }
    });
  }

  private handleGoogleCredential(credential: string) {
    this.loading = true;
    this.cdr.detectChanges();

    this.auth.loginGoogle(credential).subscribe({
      next: () => {
        this.toastr.success('Bienvenido!');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error(err.error?.message || 'Error con Google Sign-In');
        this.cdr.detectChanges();
      },
    });
  }

  // ─── Microsoft MSAL (popup) ─────────────────────────────────────────────
  async onMicrosoftLogin(): Promise<void> {
    if (!this.microsoftClientId) {
      this.toastr.warning('Microsoft Sign-In no esta configurado. Contacta al administrador.');
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    try {
      // Cargar MSAL.js dinámicamente
      const msal = await import('@azure/msal-browser');

      const msalInstance = new msal.PublicClientApplication({
        auth: {
          clientId: this.microsoftClientId,
          authority: this.microsoftTenantId
            ? `https://login.microsoftonline.com/${this.microsoftTenantId}`
            : 'https://login.microsoftonline.com/common',
          redirectUri: window.location.origin,
        },
      });

      await msalInstance.initialize();

      const result = await msalInstance.loginPopup({
        scopes: ['User.Read'],
      });

      if (result?.accessToken) {
        this.auth.loginMicrosoft(result.accessToken).subscribe({
          next: () => {
            this.ngZone.run(() => {
              this.toastr.success('Bienvenido!');
              this.router.navigate(['/dashboard']);
            });
          },
          error: (err) => {
            this.ngZone.run(() => {
              this.loading = false;
              this.toastr.error(err.error?.message || 'Error con Microsoft Sign-In');
              this.cdr.detectChanges();
            });
          },
        });
      }
    } catch (err: any) {
      this.loading = false;
      if (err?.errorCode === 'user_cancelled') {
        // El usuario cerro el popup — no mostrar error
      } else {
        this.toastr.error(err?.message || 'Error con Microsoft Sign-In');
      }
      this.cdr.detectChanges();
    }
  }
}
