import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PersonaRolResumen {
  id: number;
  rol: { id: number; codigo: string; nombre: string; icono?: string; color?: string; categoria_fn: string };
  club?: { id: number; nombre: string; nombre_corto?: string };
  torneo?: { id: number; nombre: string };
  categoria?: { id: number; nombre: string };
  numero_camiseta?: number;
  estado_fichaje?: string;
}

export interface Persona {
  id: number;
  dni: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento?: string;
  sexo?: string;
  telefono?: string;
  email?: string;
  foto_url?: string;
  activo: boolean;
  roles_asignados?: PersonaRolResumen[];
}

/**
 * Servicio para interactuar con el endpoint unificado /personas.
 * Uso principal: buscar por DNI antes de crear un jugador/staff/arbitro/veedor
 * para detectar si la persona ya existe en el sistema con otros roles.
 */
@Injectable({ providedIn: 'root' })
export class PersonasService {
  private readonly apiUrl = `${environment.apiUrl}/personas`;

  constructor(private http: HttpClient) {}

  /**
   * Busca una persona por DNI. Devuelve null si no existe.
   * Normaliza el DNI en el cliente (sin puntos ni espacios).
   */
  buscarPorDni(dni: string): Observable<{ success: boolean; data: Persona | null }> {
    const dniNorm = String(dni || '').replace(/[\s.\-]/g, '').trim();
    return this.http.get<{ success: boolean; data: Persona | null }>(`${this.apiUrl}/by-dni/${dniNorm}`);
  }

  listar(params?: Record<string, any>): Observable<{ success: boolean; data: Persona[] }> {
    return this.http.get<{ success: boolean; data: Persona[] }>(this.apiUrl, { params });
  }

  obtener(id: number): Observable<{ success: boolean; data: Persona }> {
    return this.http.get<{ success: boolean; data: Persona }>(`${this.apiUrl}/${id}`);
  }
}
