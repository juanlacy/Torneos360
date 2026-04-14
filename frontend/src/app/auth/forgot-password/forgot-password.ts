import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <mat-card class="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200">
        <mat-card-header class="!justify-center !mb-6">
          <div class="text-center w-full">
            <h1 class="text-2xl font-bold text-green-600 mb-1">Torneo360</h1>
            <p class="text-gray-500 text-sm">Recuperar contrasena</p>
          </div>
        </mat-card-header>

        <mat-card-content>
          @if (!sent) {
            <form (ngSubmit)="onSubmit()" class="space-y-4">
              <p class="text-gray-500 text-sm">Ingresa tu email y te enviaremos un enlace para restablecer tu contrasena.</p>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Email</mat-label>
                <input matInput type="email" [(ngModel)]="email" name="email" required>
                <mat-icon matPrefix>email</mat-icon>
              </mat-form-field>
              <button mat-flat-button color="primary" type="submit" class="w-full !h-12">Enviar enlace</button>
            </form>
          } @else {
            <div class="text-center">
              <mat-icon class="!text-5xl text-green-600 mb-4">mark_email_read</mat-icon>
              <p class="text-gray-700">Si el email existe, recibiras un enlace para restablecer tu contrasena.</p>
            </div>
          }
          <div class="mt-6 text-center">
            <a routerLink="/auth/login" class="text-green-600 text-sm hover:underline">Volver al login</a>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class ForgotPasswordComponent {
  email = '';
  sent = false;

  constructor(private auth: AuthService, private toastr: ToastrService) {}

  onSubmit(): void {
    if (!this.email) return;
    this.auth.forgotPassword(this.email).subscribe({
      next: () => { this.sent = true; },
      error: () => { this.toastr.error('Error al enviar el enlace'); },
    });
  }
}
