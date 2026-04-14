import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <mat-card class="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200">
        <mat-card-header class="!justify-center !mb-6">
          <div class="text-center w-full">
            <h1 class="text-2xl font-bold text-green-600 mb-1">Torneo360</h1>
            <p class="text-gray-500 text-sm">Crear cuenta</p>
          </div>
        </mat-card-header>

        <mat-card-content>
          <form (ngSubmit)="onRegister()" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <mat-form-field appearance="outline">
                <mat-label>Nombre</mat-label>
                <input matInput [(ngModel)]="nombre" name="nombre" required>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Apellido</mat-label>
                <input matInput [(ngModel)]="apellido" name="apellido" required>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Email</mat-label>
              <input matInput type="email" [(ngModel)]="email" name="email" required>
              <mat-icon matPrefix>email</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Contrasena</mat-label>
              <input matInput type="password" [(ngModel)]="password" name="password" required minlength="6">
              <mat-icon matPrefix>lock</mat-icon>
            </mat-form-field>

            <button mat-flat-button color="primary" type="submit" class="w-full !h-12" [disabled]="loading">
              @if (loading) {
                <mat-spinner diameter="20" class="inline-block"></mat-spinner>
              } @else {
                Crear cuenta
              }
            </button>
          </form>

          <div class="mt-6 text-center text-sm text-gray-500">
            Ya tenes cuenta? <a routerLink="/auth/login" class="text-green-600 hover:underline">Iniciar sesion</a>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class RegisterComponent {
  nombre = '';
  apellido = '';
  email = '';
  password = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router, private toastr: ToastrService) {}

  onRegister(): void {
    if (!this.nombre || !this.apellido || !this.email || !this.password) return;
    this.loading = true;

    this.auth.register({ nombre: this.nombre, apellido: this.apellido, email: this.email, password: this.password }).subscribe({
      next: (res: any) => {
        this.toastr.success(res.message || 'Cuenta creada. Revisa tu email.');
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error(err.error?.message || 'Error al registrar');
      },
    });
  }
}
