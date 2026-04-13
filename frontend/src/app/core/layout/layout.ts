import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule, MatButtonModule, MatMenuModule],
  template: `
    <mat-sidenav-container class="h-full">
      <mat-sidenav #sidenav mode="side" opened class="w-64 bg-slate-900 border-r border-slate-700">
        <div class="p-4 border-b border-slate-700">
          <h1 class="text-xl font-bold text-green-400">Torneo360</h1>
          <p class="text-xs text-slate-400 mt-1">Gestion de Torneos</p>
        </div>

        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard" routerLinkActive="!bg-slate-800">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>

          @if (auth.puede('torneos', 'ver')) {
            <div class="px-4 pt-4 pb-1 text-xs font-semibold text-slate-500 uppercase">Torneo</div>
          }
          @if (auth.puede('clubes', 'ver')) {
            <a mat-list-item routerLink="/clubes" routerLinkActive="!bg-slate-800">
              <mat-icon matListItemIcon>groups</mat-icon>
              <span matListItemTitle>Clubes</span>
            </a>
          }
          @if (auth.puede('jugadores', 'ver')) {
            <a mat-list-item routerLink="/jugadores" routerLinkActive="!bg-slate-800">
              <mat-icon matListItemIcon>sports_soccer</mat-icon>
              <span matListItemTitle>Jugadores</span>
            </a>
          }
          @if (auth.puede('fixture', 'ver')) {
            <a mat-list-item routerLink="/fixture" routerLinkActive="!bg-slate-800">
              <mat-icon matListItemIcon>calendar_month</mat-icon>
              <span matListItemTitle>Fixture</span>
            </a>
          }
          @if (auth.puede('partidos', 'ver')) {
            <a mat-list-item routerLink="/partidos" routerLinkActive="!bg-slate-800">
              <mat-icon matListItemIcon>scoreboard</mat-icon>
              <span matListItemTitle>Partidos</span>
            </a>
          }
          @if (auth.puede('posiciones', 'ver')) {
            <a mat-list-item routerLink="/posiciones" routerLinkActive="!bg-slate-800">
              <mat-icon matListItemIcon>leaderboard</mat-icon>
              <span matListItemTitle>Posiciones</span>
            </a>
          }

          @if (auth.isAdmin()) {
            <div class="px-4 pt-4 pb-1 text-xs font-semibold text-slate-500 uppercase">Admin</div>
            <a mat-list-item routerLink="/admin/usuarios" routerLinkActive="!bg-slate-800">
              <mat-icon matListItemIcon>manage_accounts</mat-icon>
              <span matListItemTitle>Usuarios</span>
            </a>
            <a mat-list-item routerLink="/admin/permisos" routerLinkActive="!bg-slate-800">
              <mat-icon matListItemIcon>security</mat-icon>
              <span matListItemTitle>Permisos</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="bg-slate-950">
        <mat-toolbar class="!bg-slate-900 border-b border-slate-700">
          <button mat-icon-button (click)="sidenav.toggle()">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="flex-1"></span>

          @if (auth.getUser(); as user) {
            <button mat-button [matMenuTriggerFor]="userMenu" class="!text-slate-300">
              <mat-icon class="mr-1">person</mat-icon>
              {{ user.nombre }} {{ user.apellido }}
            </button>
            <mat-menu #userMenu="matMenu">
              <div class="px-4 py-2 text-xs text-slate-400">{{ user.email }}</div>
              <div class="px-4 pb-2 text-xs text-green-400">{{ user.rol }}</div>
              <mat-divider></mat-divider>
              <button mat-menu-item routerLink="/perfil">
                <mat-icon>person</mat-icon>
                <span>Mi perfil</span>
              </button>
              <button mat-menu-item (click)="auth.logout()">
                <mat-icon>logout</mat-icon>
                <span>Cerrar sesion</span>
              </button>
            </mat-menu>
          }
        </mat-toolbar>

        <main class="p-6">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    mat-sidenav { background-color: #0f172a !important; }
    mat-sidenav-content { background-color: #020617 !important; }
    mat-toolbar { height: 56px !important; }
  `],
})
export class LayoutComponent {
  constructor(public auth: AuthService) {}
}
