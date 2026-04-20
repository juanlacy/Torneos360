import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BrandingService } from './branding.service';
import { AuthService } from './auth.service';

export interface NotifItem {
  tipo: 'partido_sin_arbitro' | 'partido_sin_veedor' | 'partido_sin_confirmar';
  severidad: 'danger' | 'warning' | 'info';
  partido_id: number;
  jornada_id: number;
  fase: string;
  numero_jornada: number;
  zona_id: number;
  fecha: string | null;
  dias_hasta: number | null;
  categoria: string;
  local: string;
  visitante: string;
  estado: string;
}

export interface NotifData {
  total: number;
  items: NotifItem[];
  por_tipo: { sin_arbitro: number; sin_veedor: number; sin_confirmar: number };
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService implements OnDestroy {
  private dataSubject = new BehaviorSubject<NotifData>({ total: 0, items: [], por_tipo: { sin_arbitro: 0, sin_veedor: 0, sin_confirmar: 0 } });
  data$ = this.dataSubject.asObservable();
  private pollHandle: any = null;

  constructor(
    private http: HttpClient,
    private branding: BrandingService,
    private auth: AuthService,
  ) {
    // Cargar + polling cada 90s mientras haya usuario logueado y torneo activo
    this.auth.currentUser$.subscribe(user => {
      this.cleanup();
      if (user) this.startPolling();
    });
    this.branding.torneoActivoId$.subscribe(() => {
      if (this.auth.isLoggedIn()) this.refresh();
    });
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private startPolling() {
    this.refresh();
    this.pollHandle = setInterval(() => this.refresh(), 90_000);
  }

  private cleanup() {
    if (this.pollHandle) { clearInterval(this.pollHandle); this.pollHandle = null; }
  }

  refresh() {
    const torneoId = this.branding.torneoActivoId;
    if (!torneoId) return;
    this.http.get<any>(`${environment.apiUrl}/notificaciones`, { params: { torneo_id: torneoId } }).subscribe({
      next: (res) => {
        if (res?.success) this.dataSubject.next({ total: res.total, items: res.items || [], por_tipo: res.por_tipo });
      },
      error: () => {},
    });
  }
}
