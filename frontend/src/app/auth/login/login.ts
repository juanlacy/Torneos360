import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatDividerModule],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4"
      style="background: radial-gradient(ellipse at top, #2d1a4e 0%, #1a0e2e 60%, #0f0a1a 100%);">

      <div class="w-full max-w-md">

        <!-- Brand header -->
        <div class="text-center mb-8">
          <img src="Torneos360_Logo_Blanco.png"
            alt="Torneo360"
            class="h-32 mx-auto object-contain drop-shadow-2xl mb-3" />
          <h1 class="text-2xl font-bold text-white tracking-wide">Torneo<span class="text-[#8cb24d]">360</span></h1>
          <p class="text-sm text-slate-400 mt-1">Gestion integral de torneos</p>
        </div>

        <!-- Card de login -->
        <div class="bg-slate-800/80 border border-slate-700/80 backdrop-blur rounded-2xl overflow-hidden">
          <div class="p-6">
            <h2 class="text-lg font-semibold text-white mb-6 text-center">Iniciar sesion</h2>

            <!-- OAuth buttons -->
            <div class="space-y-3 mb-5">
              <!-- Google Sign-In (renderizado por GIS SDK) -->
              <div class="flex justify-center">
                <div id="google-signin-btn"></div>
              </div>
              @if (!googleLoaded) {
                <button (click)="onGoogleFallback()" [disabled]="loading"
                  class="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
                  <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continuar con Google
                </button>
              }

              @if (showMicrosoft) {
                <button (click)="onMicrosoftLogin()" [disabled]="loading"
                  class="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
                  <svg class="w-5 h-5 shrink-0" viewBox="0 0 21 21">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                  </svg>
                  Continuar con Microsoft
                </button>
              }
            </div>

            <!-- Separador -->
            <div class="flex items-center gap-3 my-5">
              <div class="flex-1 h-px bg-slate-600"></div>
              <button (click)="mostrarEmail = !mostrarEmail"
                class="text-xs text-slate-400 hover:text-slate-300 transition-colors whitespace-nowrap">
                {{ mostrarEmail ? 'Ocultar' : 'Usar correo electronico' }}
              </button>
              <div class="flex-1 h-px bg-slate-600"></div>
            </div>

            <!-- Email/password (colapsable) -->
            @if (mostrarEmail) {
              <form (ngSubmit)="onLogin()" class="space-y-4 animate-fade-in">
                <mat-form-field appearance="outline" class="w-full dark-field">
                  <mat-label>Email</mat-label>
                  <input matInput type="email" [(ngModel)]="email" name="email" required autocomplete="email">
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full dark-field">
                  <mat-label>Contrasena</mat-label>
                  <input matInput [type]="hidePassword ? 'password' : 'text'" [(ngModel)]="password" name="password" required autocomplete="current-password">
                  <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword" tabindex="-1">
                    <mat-icon class="!text-slate-400">{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                </mat-form-field>

                <button mat-flat-button type="submit" class="w-full !h-11 !bg-[#762c7e] !text-white !rounded-lg" [disabled]="loading">
                  @if (loading) {
                    <mat-icon class="animate-spin !text-lg mr-1">autorenew</mat-icon>
                  }
                  Iniciar sesion
                </button>

                <div class="flex justify-between text-xs">
                  <a routerLink="/auth/forgot-password" class="text-blue-400 hover:text-blue-300">Olvidaste tu contrasena?</a>
                  <a routerLink="/auth/register" class="text-blue-400 hover:text-blue-300">Crear cuenta</a>
                </div>
              </form>
            }
          </div>
        </div>

        <!-- Footer -->
        <p class="text-center text-[10px] text-slate-600 mt-6">
          Torneo360 &copy; {{ currentYear }}
        </p>
      </div>
    </div>
  `,
  styles: [`
    /* Dark theme overrides para form fields dentro del login */
    :host ::ng-deep .dark-field .mdc-text-field--outlined .mdc-notched-outline__leading,
    :host ::ng-deep .dark-field .mdc-text-field--outlined .mdc-notched-outline__trailing,
    :host ::ng-deep .dark-field .mdc-text-field--outlined .mdc-notched-outline__notch {
      border-color: #475569 !important;
    }
    :host ::ng-deep .dark-field .mat-mdc-form-field-focus-indicator { display: none; }
    :host ::ng-deep .dark-field .mdc-floating-label { color: #94a3b8 !important; }
    :host ::ng-deep .dark-field input.mat-mdc-input-element { color: white !important; }
  `],
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  hidePassword = true;
  loading = false;
  mostrarEmail = false;
  showMicrosoft = false;
  googleLoaded = false;
  currentYear = new Date().getFullYear();

  constructor(
    private auth: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit() {
    this.showMicrosoft = !!environment.microsoftClientId;
    this.initGoogleSignIn();
    this.checkPendingMsalToken();
  }

  /** Si main.ts guardo un token de MSAL en sessionStorage, procesarlo */
  private checkPendingMsalToken() {
    const pendingToken = sessionStorage.getItem('msal_pending_token');
    if (pendingToken) {
      sessionStorage.removeItem('msal_pending_token');
      this.processMicrosoftToken(pendingToken);
    }
  }

  // ─── Google Identity Services (igual que Predict) ───────────────────────
  private initGoogleSignIn() {
    if (!environment.googleClientId) return;

    const callback = (response: any) => {
      this.ngZone.run(() => {
        this.loading = true;
        this.cdr.detectChanges();
        this.auth.loginGoogle(response.credential).subscribe({
          next: () => this.router.navigate(['/dashboard']),
          error: (err) => {
            this.loading = false;
            this.toastr.error(err.error?.message || 'Error con Google Sign-In');
            this.cdr.detectChanges();
          },
        });
      });
    };

    const init = () => {
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback,
        cancel_on_tap_outside: false,
      });

      const cardWidth = Math.min(window.innerWidth - 48, 400);
      google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        {
          theme: 'filled_black',
          size: 'large',
          width: cardWidth,
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        },
      );
      this.googleLoaded = true;
      this.cdr.detectChanges();
    };

    if (typeof google !== 'undefined' && google.accounts) {
      init();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = init;
      document.head.appendChild(script);
    }
  }

  onGoogleFallback() {
    this.toastr.warning('Google Sign-In cargando... Intenta de nuevo en unos segundos.');
  }

  // ─── Microsoft MSAL (igual que Predict) ─────────────────────────────────
  /** Microsoft login — replica exacta del patron de Predict */
  async onMicrosoftLogin(): Promise<void> {
    try {
      const { PublicClientApplication } = await import('@azure/msal-browser');
      const msalInstance = new PublicClientApplication({
        auth: {
          clientId: environment.microsoftClientId,
          authority: `https://login.microsoftonline.com/${environment.microsoftTenantId}`,
          redirectUri: window.location.origin,
        },
      });
      await msalInstance.initialize();

      const result = await msalInstance.loginPopup({
        scopes: ['User.Read'],
      });

      if (result.accessToken) {
        this.loading = true;
        this.cdr.detectChanges();
        this.auth.loginMicrosoft(result.accessToken).subscribe({
          next: () => this.router.navigate(['/dashboard']),
          error: (err) => {
            this.loading = false;
            this.toastr.error(err.error?.message || 'Error con Microsoft');
            this.cdr.detectChanges();
          },
        });
      }
    } catch (err: any) {
      if (err?.errorCode !== 'user_cancelled') {
        this.toastr.error('Error al iniciar sesion con Microsoft');
        console.error('MSAL error:', err);
      }
    }
  }

  // ─── Email/Password ─────────────────────────────────────────────────────
  onLogin(): void {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.loading = false;
        this.toastr.error(err.error?.message || 'Error al iniciar sesion');
        this.cdr.detectChanges();
      },
    });
  }
}
