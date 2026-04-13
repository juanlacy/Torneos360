import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-200">Dashboard</h1>
        <p class="text-slate-400 mt-1">Bienvenido, {{ auth.getUser()?.nombre }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <mat-card class="!bg-slate-900 !border !border-slate-700">
          <mat-card-content class="flex items-center gap-4 p-4">
            <mat-icon class="!text-4xl text-green-400">groups</mat-icon>
            <div>
              <p class="text-2xl font-bold text-slate-200">--</p>
              <p class="text-sm text-slate-400">Clubes</p>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="!bg-slate-900 !border !border-slate-700">
          <mat-card-content class="flex items-center gap-4 p-4">
            <mat-icon class="!text-4xl text-yellow-400">sports_soccer</mat-icon>
            <div>
              <p class="text-2xl font-bold text-slate-200">--</p>
              <p class="text-sm text-slate-400">Jugadores</p>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="!bg-slate-900 !border !border-slate-700">
          <mat-card-content class="flex items-center gap-4 p-4">
            <mat-icon class="!text-4xl text-blue-400">calendar_month</mat-icon>
            <div>
              <p class="text-2xl font-bold text-slate-200">--</p>
              <p class="text-sm text-slate-400">Jornadas</p>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="!bg-slate-900 !border !border-slate-700">
          <mat-card-content class="flex items-center gap-4 p-4">
            <mat-icon class="!text-4xl text-red-400">scoreboard</mat-icon>
            <div>
              <p class="text-2xl font-bold text-slate-200">--</p>
              <p class="text-sm text-slate-400">Partidos</p>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="!bg-slate-900 !border !border-slate-700">
        <mat-card-content class="p-6 text-center text-slate-400">
          <mat-icon class="!text-6xl text-slate-600 mb-4">construction</mat-icon>
          <p class="text-lg">El dashboard se completara en la Fase 2 con datos reales del torneo.</p>
          <p class="text-sm mt-2">Rol actual: <span class="text-green-400">{{ auth.getUser()?.rol }}</span></p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class DashboardComponent {
  constructor(public auth: AuthService) {}
}
