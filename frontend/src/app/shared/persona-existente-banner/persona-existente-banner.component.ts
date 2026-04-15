import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Persona } from '../../core/services/personas.service';

/**
 * Banner informativo que se muestra cuando el usuario escribe/escanea
 * un DNI y el sistema detecta que la persona ya existe con otros roles.
 *
 * Uso:
 *   @if (personaExistente) {
 *     <app-persona-existente-banner [persona]="personaExistente"></app-persona-existente-banner>
 *   }
 */
@Component({
  selector: 'app-persona-existente-banner',
  standalone: true,
  imports: [MatIconModule],
  template: `
    @if (persona) {
      <div class="rounded-lg border border-blue-200 bg-blue-50 p-3 mb-3 flex items-start gap-3 animate-fade-in">
        <mat-icon class="text-blue-600 shrink-0 mt-0.5">info</mat-icon>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-blue-900">
            Esta persona ya esta registrada: {{ persona.apellido }}, {{ persona.nombre }}
          </p>
          @if (persona.roles_asignados?.length) {
            <p class="text-xs text-blue-700 mt-1">Roles actuales:</p>
            <div class="flex flex-wrap gap-1.5 mt-1">
              @for (r of persona.roles_asignados; track r.id) {
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-white border border-blue-200 text-blue-800"
                  [style.border-color]="r.rol.color || '#93c5fd'">
                  @if (r.rol.icono) {
                    <mat-icon class="!text-xs !w-3 !h-3" [style.color]="r.rol.color">{{ r.rol.icono }}</mat-icon>
                  }
                  <span>{{ r.rol.nombre }}</span>
                  @if (r.club) { <span class="text-blue-500">en {{ r.club.nombre_corto || r.club.nombre }}</span> }
                  @if (r.categoria) { <span class="text-blue-500">({{ r.categoria.nombre }})</span> }
                </span>
              }
            </div>
          } @else {
            <p class="text-xs text-blue-700 mt-1">Sin roles activos actualmente.</p>
          }
          <p class="text-xs text-blue-800 mt-2 italic">
            Al guardar, se le agregara el nuevo rol a esta misma persona (sin duplicar datos).
          </p>
        </div>
      </div>
    }
  `,
})
export class PersonaExistenteBannerComponent {
  @Input() persona: Persona | null = null;
}
