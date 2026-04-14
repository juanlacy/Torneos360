import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <mat-card class="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 text-center p-8">
        @if (loading) {
          <mat-spinner class="mx-auto mb-4"></mat-spinner>
          <p class="text-gray-500">Verificando email...</p>
        } @else if (success) {
          <mat-icon class="!text-6xl text-green-600 mb-4">check_circle</mat-icon>
          <h2 class="text-xl font-bold text-gray-900 mb-2">Email verificado</h2>
          <p class="text-gray-500 mb-6">Ya podes iniciar sesion.</p>
          <a mat-flat-button color="primary" routerLink="/auth/login">Iniciar sesion</a>
        } @else {
          <mat-icon class="!text-6xl text-red-500 mb-4">error</mat-icon>
          <h2 class="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p class="text-gray-500 mb-6">{{ errorMsg }}</p>
          <a mat-stroked-button routerLink="/auth/login">Volver al login</a>
        }
      </mat-card>
    </div>
  `,
})
export class VerifyEmailComponent implements OnInit {
  loading = true;
  success = false;
  errorMsg = 'Token invalido o expirado';

  constructor(private route: ActivatedRoute, private auth: AuthService) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading = false;
      this.errorMsg = 'Token no proporcionado';
      return;
    }

    this.auth.verifyEmail(token).subscribe({
      next: () => { this.loading = false; this.success = true; },
      error: (err) => { this.loading = false; this.errorMsg = err.error?.message || 'Error al verificar'; },
    });
  }
}
