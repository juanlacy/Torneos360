import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ViewMode = 'cards' | 'list';

/**
 * Servicio para persistir la preferencia de visualizacion (tarjetas o lista)
 * por pantalla. Cada pantalla usa su propia key.
 */
@Injectable({ providedIn: 'root' })
export class ViewPreferenceService {
  private subjects: Record<string, BehaviorSubject<ViewMode>> = {};

  /** Obtiene el modo actual para una clave (ej: 'clubes', 'jugadores') */
  get(key: string, defaultMode: ViewMode = 'cards'): BehaviorSubject<ViewMode> {
    if (!this.subjects[key]) {
      const stored = localStorage.getItem(`view_${key}`) as ViewMode | null;
      const initial = stored === 'list' || stored === 'cards' ? stored : defaultMode;
      this.subjects[key] = new BehaviorSubject<ViewMode>(initial);
    }
    return this.subjects[key];
  }

  /** Cambia el modo y persiste en localStorage */
  set(key: string, mode: ViewMode): void {
    localStorage.setItem(`view_${key}`, mode);
    this.get(key).next(mode);
  }
}
