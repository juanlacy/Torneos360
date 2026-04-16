import { Component, EventEmitter, Input, Output, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

/**
 * Selector visual de Material Icons.
 * Muestra una grilla de iconos agrupados por categoría, con buscador.
 *
 * Uso:
 *   <app-icon-picker [value]="form.icono" (picked)="form.icono = $event"></app-icon-picker>
 */

const ICON_GROUPS: { label: string; icons: string[] }[] = [
  {
    label: 'Deportes',
    icons: [
      'sports_soccer', 'sports', 'sports_handball', 'sports_kabaddi', 'sports_tennis',
      'fitness_center', 'pool', 'directions_run', 'emoji_events', 'military_tech',
      'scoreboard', 'leaderboard', 'timer', 'flag', 'stadium',
    ],
  },
  {
    label: 'Personas',
    icons: [
      'person', 'group', 'groups', 'support_agent', 'admin_panel_settings',
      'assignment_ind', 'badge', 'manage_accounts', 'supervisor_account', 'face',
      'school', 'elderly', 'child_care', 'family_restroom', 'accessibility_new',
    ],
  },
  {
    label: 'Salud y Seguridad',
    icons: [
      'medical_services', 'local_hospital', 'health_and_safety', 'healing',
      'monitor_heart', 'vaccines', 'emergency', 'security', 'shield',
      'verified_user', 'gpp_good', 'privacy_tip', 'local_pharmacy', 'bloodtype',
    ],
  },
  {
    label: 'Trabajo y Organizacion',
    icons: [
      'business_center', 'work', 'handshake', 'inventory_2', 'engineering',
      'construction', 'build', 'settings', 'tune', 'category',
      'account_balance', 'corporate_fare', 'domain', 'store', 'warehouse',
    ],
  },
  {
    label: 'Comunicacion',
    icons: [
      'call', 'email', 'chat', 'forum', 'campaign',
      'notifications', 'record_voice_over', 'mic', 'videocam', 'photo_camera',
    ],
  },
  {
    label: 'Accion',
    icons: [
      'visibility', 'edit', 'delete', 'check_circle', 'cancel',
      'thumb_up', 'thumb_down', 'star', 'favorite', 'bookmark',
      'lock', 'lock_open', 'verified', 'pending', 'schedule',
    ],
  },
];

@Component({
  selector: 'app-icon-picker',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  template: `
    <!-- Trigger: muestra el icono seleccionado -->
    <div class="flex items-center gap-2">
      <button type="button" (click)="open = !open"
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-sm">
        @if (value) {
          <mat-icon class="!text-lg" [style.color]="color || 'var(--color-primario)'">{{ value }}</mat-icon>
          <span class="text-gray-600 text-xs">{{ value }}</span>
        } @else {
          <mat-icon class="!text-lg text-gray-400">add_circle_outline</mat-icon>
          <span class="text-gray-400 text-xs">Elegir icono</span>
        }
        <mat-icon class="!text-sm text-gray-400">expand_more</mat-icon>
      </button>
    </div>

    <!-- Dropdown con grilla de iconos -->
    @if (open) {
      <div class="fixed inset-0 z-[100]" (click)="open = false"></div>
      <div class="absolute z-[101] mt-1 bg-white rounded-xl border border-gray-200 shadow-2xl w-[340px] max-h-[400px] overflow-hidden animate-scale-in">
        <!-- Buscador -->
        <div class="p-2 border-b border-gray-100">
          <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50">
            <mat-icon class="!text-sm text-gray-400">search</mat-icon>
            <input type="text" [(ngModel)]="search" placeholder="Buscar icono..."
              class="flex-1 bg-transparent text-xs outline-none text-gray-700"
              (input)="filtrar()">
          </div>
        </div>

        <!-- Grilla -->
        <div class="overflow-y-auto max-h-[320px] p-2">
          @for (group of filteredGroups; track group.label) {
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1 mt-2 first:mt-0">{{ group.label }}</p>
            <div class="grid grid-cols-8 gap-0.5 mb-2">
              @for (icon of group.icons; track icon) {
                <button type="button" (click)="select(icon)"
                  class="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                  [class]="icon === value ? 'bg-[var(--color-primario)] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'"
                  [title]="icon">
                  <mat-icon class="!text-lg">{{ icon }}</mat-icon>
                </button>
              }
            </div>
          }
          @if (!filteredGroups.length) {
            <p class="text-xs text-gray-400 text-center py-4">No se encontraron iconos</p>
          }
        </div>
      </div>
    }
  `,
  styles: [`:host { position: relative; display: inline-block; }`],
})
export class IconPickerComponent {
  @Input() value: string = '';
  @Input() color: string = '';
  @Output() picked = new EventEmitter<string>();

  open = false;
  search = '';
  filteredGroups = ICON_GROUPS;

  constructor(private cdr: ChangeDetectorRef) {}

  select(icon: string) {
    this.value = icon;
    this.picked.emit(icon);
    this.open = false;
    this.cdr.detectChanges();
  }

  filtrar() {
    const q = this.search.toLowerCase().trim();
    if (!q) {
      this.filteredGroups = ICON_GROUPS;
      return;
    }
    this.filteredGroups = ICON_GROUPS
      .map(g => ({
        label: g.label,
        icons: g.icons.filter(i => i.includes(q) || g.label.toLowerCase().includes(q)),
      }))
      .filter(g => g.icons.length > 0);
  }
}
