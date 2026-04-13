import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatDividerModule, MatProgressSpinnerModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <mat-card class="w-full max-w-md !bg-slate-900 !border !border-slate-700">
        <mat-card-header class="!justify-center !mb-6">
          <div class="text-center w-full">
            <h1 class="text-2xl font-bold text-green-400 mb-1">Torneo360</h1>
            <p class="text-slate-400 text-sm">Iniciar sesion</p>
          </div>
        </mat-card-header>

        <mat-card-content>
          <form (ngSubmit)="onLogin()" class="space-y-4">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Email</mat-label>
              <input matInput type="email" [(ngModel)]="email" name="email" required>
              <mat-icon matPrefix>email</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Contrasena</mat-label>
              <input matInput [type]="hidePassword ? 'password' : 'text'" [(ngModel)]="password" name="password" required>
              <mat-icon matPrefix>lock</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <button mat-flat-button color="primary" type="submit" class="w-full !h-12" [disabled]="loading">
              @if (loading) {
                <mat-spinner diameter="20" class="inline-block"></mat-spinner>
              } @else {
                Iniciar sesion
              }
            </button>
          </form>

          <mat-divider class="!my-6"></mat-divider>

          <div class="space-y-3">
            <button mat-stroked-button class="w-full !border-slate-600" (click)="onGoogleLogin()" [disabled]="loading">
              <mat-icon class="mr-2">g_mobiledata</mat-icon>
              Continuar con Google
            </button>
            <button mat-stroked-button class="w-full !border-slate-600" (click)="onMicrosoftLogin()" [disabled]="loading">
              <mat-icon class="mr-2">window</mat-icon>
              Continuar con Microsoft
            </button>
          </div>

          <div class="mt-6 text-center text-sm text-slate-400 space-y-2">
            <p><a routerLink="/auth/forgot-password" class="text-green-400 hover:underline">Olvidaste tu contrasena?</a></p>
            <p>No tenes cuenta? <a routerLink="/auth/register" class="text-green-400 hover:underline">Registrate</a></p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class LoginComponent {
  email = '';
  password = '';
  hidePassword = true;
  loading = false;

  constructor(private auth: AuthService, private router: Router, private toastr: ToastrService) {}

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
      },
    });
  }

  onGoogleLogin(): void {
    // TODO: Integrar Google Sign-In SDK
    this.toastr.info('Google Sign-In pendiente de configuracion');
  }

  onMicrosoftLogin(): void {
    // TODO: Integrar Microsoft MSAL
    this.toastr.info('Microsoft Sign-In pendiente de configuracion');
  }
}
