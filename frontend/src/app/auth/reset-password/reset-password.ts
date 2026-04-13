import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <mat-card class="w-full max-w-md !bg-slate-900 !border !border-slate-700">
        <mat-card-header class="!justify-center !mb-6">
          <div class="text-center w-full">
            <h1 class="text-2xl font-bold text-green-400 mb-1">Torneo360</h1>
            <p class="text-slate-400 text-sm">Nueva contrasena</p>
          </div>
        </mat-card-header>

        <mat-card-content>
          <form (ngSubmit)="onSubmit()" class="space-y-4">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Nueva contrasena</mat-label>
              <input matInput type="password" [(ngModel)]="password" name="password" required minlength="6">
              <mat-icon matPrefix>lock</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Confirmar contrasena</mat-label>
              <input matInput type="password" [(ngModel)]="confirmPassword" name="confirmPassword" required>
              <mat-icon matPrefix>lock</mat-icon>
            </mat-form-field>

            <button mat-flat-button color="primary" type="submit" class="w-full !h-12" [disabled]="loading">
              Restablecer contrasena
            </button>
          </form>

          <div class="mt-6 text-center">
            <a routerLink="/auth/login" class="text-green-400 text-sm hover:underline">Volver al login</a>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class ResetPasswordComponent {
  password = '';
  confirmPassword = '';
  loading = false;
  private token: string | null = null;

  constructor(private route: ActivatedRoute, private auth: AuthService, private router: Router, private toastr: ToastrService) {
    this.token = this.route.snapshot.queryParamMap.get('token');
  }

  onSubmit(): void {
    if (!this.token) { this.toastr.error('Token no proporcionado'); return; }
    if (this.password !== this.confirmPassword) { this.toastr.error('Las contrasenas no coinciden'); return; }
    if (this.password.length < 6) { this.toastr.error('La contrasena debe tener al menos 6 caracteres'); return; }

    this.loading = true;
    this.auth.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.toastr.success('Contrasena actualizada');
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error(err.error?.message || 'Error al restablecer');
      },
    });
  }
}
