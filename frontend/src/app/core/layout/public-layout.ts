import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';

const LS_TORNEO_KEY = 'torneo360_publico_torneo_id';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="min-h-screen flex flex-col bg-gray-50">

      <!-- ═══ HEADER ═══ -->
      <header class="h-16 bg-white border-b border-gray-200 flex items-center px-4 md:px-6 shrink-0 sticky top-0 z-30">

        <!-- Izquierda: logo + nombre -->
        <a routerLink="/" class="flex items-center gap-3 min-w-0">
          @if (torneoActivo?.logo_url) {
            <img [src]="resolveUrl(torneoActivo.logo_url)" class="w-9 h-9 rounded-lg object-contain bg-white border border-gray-200" alt="Logo">
          } @else {
            <div class="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold"
              [style.background-color]="torneoActivo?.color_primario || '#762c7e'">
              <mat-icon class="!text-xl !text-white">sports_soccer</mat-icon>
            </div>
          }
          <span class="text-sm font-bold text-gray-900 truncate hidden sm:inline">{{ torneoActivo?.nombre || 'Torneo360' }}</span>
        </a>

        <!-- Centro: selector de torneo -->
        @if (torneos.length > 1) {
          <div class="relative ml-4">
            <button (click)="torneoDropdown = !torneoDropdown"
              class="flex items-center gap-2 px-3 py-1.5 border border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors">
              <mat-icon class="!text-base" [style.color]="torneoActivo?.color_primario">emoji_events</mat-icon>
              <span class="text-gray-700 font-medium hidden md:inline">{{ torneoActivo?.nombre }}</span>
              <mat-icon class="!text-sm text-gray-400">expand_more</mat-icon>
            </button>
            @if (torneoDropdown) {
              <div class="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                @for (t of torneos; track t.id) {
                  <button (click)="seleccionarTorneo(t)"
                    class="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between transition-colors first:rounded-t-lg last:rounded-b-lg"
                    [class.font-semibold]="t.id === torneoActivo?.id"
                    [style.color]="t.id === torneoActivo?.id ? torneoActivo?.color_primario : ''">
                    <span>{{ t.nombre }}</span>
                    @if (t.id === torneoActivo?.id) {
                      <mat-icon class="!text-base">check</mat-icon>
                    }
                  </button>
                }
              </div>
              <div class="fixed inset-0 z-40" (click)="torneoDropdown = false"></div>
            }
          </div>
        }

        <span class="flex-1"></span>

        <!-- Derecha: boton Ingresar -->
        <a mat-flat-button routerLink="/auth/login" color="primary" class="!text-sm">
          <mat-icon class="!text-base mr-1">login</mat-icon>
          Ingresar
        </a>
      </header>

      <!-- ═══ CONTENIDO ═══ -->
      <main class="flex-1">
        <router-outlet />
      </main>

      <!-- ═══ FOOTER ═══ -->
      <footer class="py-4 text-center border-t border-gray-100 bg-white">
        <p class="text-xs text-gray-400">
          Torneo360 — Gestion de torneos
          <span class="mx-2">|</span>
          <a routerLink="/dashboard" class="hover:text-gray-600 transition-colors">Administracion</a>
        </p>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `],
})
export class PublicLayoutComponent implements OnInit, OnDestroy {
  torneos: any[] = [];
  torneoActivo: any = null;
  torneoDropdown = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/publico/torneos`).subscribe({
      next: res => {
        this.torneos = res.data || res || [];
        if (!this.torneos.length) return;

        // Buscar torneo guardado o el que este en_curso o el primero
        const savedId = localStorage.getItem(LS_TORNEO_KEY);
        let activo = savedId ? this.torneos.find((t: any) => t.id === +savedId) : null;
        if (!activo) activo = this.torneos.find((t: any) => t.estado === 'en_curso') || this.torneos[0];
        this.setTorneo(activo);
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  ngOnDestroy() {}

  seleccionarTorneo(torneo: any) {
    this.torneoDropdown = false;
    this.setTorneo(torneo);
  }

  private setTorneo(torneo: any) {
    this.torneoActivo = torneo;
    localStorage.setItem(LS_TORNEO_KEY, String(torneo.id));
    if (torneo.color_primario) {
      document.documentElement.style.setProperty('--color-primario', torneo.color_primario);
    }
    if (torneo.color_secundario) {
      document.documentElement.style.setProperty('--color-secundario', torneo.color_secundario);
    }
  }

  resolveUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${environment.apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }
}
