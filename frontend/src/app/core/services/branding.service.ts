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

export interface TorneoResumen {
  id: number;
  nombre: string;
  anio: number;
  estado: string;
}

const DEFAULTS: TorneoBranding = {
  id: 0,
  nombre: 'Torneo360',
  color_primario: '#762c7e',
  color_secundario: '#4f2f7d',
  color_acento: '#8cb24d',
};

const STORAGE_KEY = 'torneo360_torneo_activo';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private brandingSubject = new BehaviorSubject<TorneoBranding>(DEFAULTS);
  branding$ = this.brandingSubject.asObservable();

  private torneosSubject = new BehaviorSubject<TorneoResumen[]>([]);
  torneos$ = this.torneosSubject.asObservable();

  private torneoActivoIdSubject = new BehaviorSubject<number | null>(null);
  torneoActivoId$ = this.torneoActivoIdSubject.asObservable();

  constructor(private http: HttpClient, private auth: AuthService) {
    this.auth.currentUser$.subscribe(user => {
      if (user) {
        this.cargarTorneos();
      } else {
        this.reset();
      }
    });
  }

  /** ID del torneo activo */
  get torneoActivoId(): number | null {
    return this.torneoActivoIdSubject.value;
  }

  /** Carga la lista de torneos y selecciona el activo */
  cargarTorneos(): void {
    this.http.get<any>(`${environment.apiUrl}/torneos`).subscribe({
      next: (res) => {
        const torneos: TorneoResumen[] = (res.data || []).map((t: any) => ({
          id: t.id, nombre: t.nombre, anio: t.anio, estado: t.estado,
        }));
        this.torneosSubject.next(torneos);

        if (!torneos.length) return;

        // Restaurar seleccion guardada o usar el primero
        const guardado = localStorage.getItem(STORAGE_KEY);
        const guardadoId = guardado ? parseInt(guardado) : null;
        const existe = torneos.find(t => t.id === guardadoId);

        this.seleccionarTorneo(existe ? guardadoId! : torneos[0].id);
      },
    });
  }

  /** Cambia el torneo activo */
  seleccionarTorneo(torneoId: number): void {
    localStorage.setItem(STORAGE_KEY, String(torneoId));
    this.torneoActivoIdSubject.next(torneoId);

    this.http.get<any>(`${environment.apiUrl}/torneos/${torneoId}/branding`).subscribe({
      next: (res) => {
        if (res.data) this.setBranding(res.data);
      },
    });
  }

  /** Fuerza recarga del branding actual */
  recargar(): void {
    const id = this.torneoActivoId;
    if (id) {
      this.torneoActivoIdSubject.next(null);
      this.seleccionarTorneo(id);
    }
  }

  private setBranding(cfg: TorneoBranding): void {
    this.brandingSubject.next(cfg);

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
    this.torneoActivoIdSubject.next(null);
    this.torneosSubject.next([]);
    this.brandingSubject.next(DEFAULTS);
    const root = document.documentElement;
    root.style.setProperty('--color-primario', DEFAULTS.color_primario);
    root.style.setProperty('--color-secundario', DEFAULTS.color_secundario);
    root.style.setProperty('--color-acento', DEFAULTS.color_acento);
  }

  resolveUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    // En produccion, /uploads/ va directo (no por /api/)
    if (url.startsWith('/uploads/')) return url;
    return `${environment.apiUrl}${url}`;
  }
}
