import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface TorneoBranding {
  id: number;
  nombre: string;
  logo_url?: string;
  favicon_url?: string;
  color_primario: string;
  color_secundario: string;
  color_acento: string;
}

const DEFAULTS: TorneoBranding = {
  id: 0,
  nombre: 'Torneo360',
  color_primario: '#762c7e',
  color_secundario: '#4f2f7d',
  color_acento: '#8cb24d',
};

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private brandingSubject = new BehaviorSubject<TorneoBranding>(DEFAULTS);
  branding$ = this.brandingSubject.asObservable();

  private torneoActivoId: number | null = null;

  constructor(private http: HttpClient, private auth: AuthService) {
    // Cargar branding al loguearse
    this.auth.currentUser$.subscribe(user => {
      if (user) {
        this.cargarTorneoActivo();
      } else {
        this.reset();
      }
    });
  }

  /** Carga el branding del primer torneo activo */
  cargarTorneoActivo(): void {
    this.http.get<any>(`${environment.apiUrl}/torneos`).subscribe({
      next: (res) => {
        if (res.data?.length) {
          const torneo = res.data[0];
          this.aplicar(torneo.id);
        }
      },
    });
  }

  /** Aplica branding de un torneo especifico */
  aplicar(torneoId: number): void {
    if (this.torneoActivoId === torneoId) return;
    this.torneoActivoId = torneoId;

    this.http.get<any>(`${environment.apiUrl}/torneos/${torneoId}/branding`).subscribe({
      next: (res) => {
        if (res.data) {
          this.setBranding(res.data);
        }
      },
    });
  }

  /** Fuerza recarga del branding actual (despues de editar) */
  recargar(): void {
    if (this.torneoActivoId) {
      const id = this.torneoActivoId;
      this.torneoActivoId = null; // Reset para forzar recarga
      this.aplicar(id);
    }
  }

  private setBranding(cfg: TorneoBranding): void {
    this.brandingSubject.next(cfg);

    // Aplicar CSS custom properties al :root
    const root = document.documentElement;
    root.style.setProperty('--color-primario', cfg.color_primario || DEFAULTS.color_primario);
    root.style.setProperty('--color-secundario', cfg.color_secundario || DEFAULTS.color_secundario);
    root.style.setProperty('--color-acento', cfg.color_acento || DEFAULTS.color_acento);

    // Favicon dinamico
    if (cfg.favicon_url) {
      const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = this.resolveUrl(cfg.favicon_url);
      document.head.appendChild(link);
    }
  }

  private reset(): void {
    this.torneoActivoId = null;
    this.brandingSubject.next(DEFAULTS);
    const root = document.documentElement;
    root.style.setProperty('--color-primario', DEFAULTS.color_primario);
    root.style.setProperty('--color-secundario', DEFAULTS.color_secundario);
    root.style.setProperty('--color-acento', DEFAULTS.color_acento);
  }

  resolveUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${environment.apiUrl}${url}`;
  }
}
