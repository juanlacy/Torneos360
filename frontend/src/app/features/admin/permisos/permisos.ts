import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-permisos',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatTabsModule, MatCheckboxModule, MatSelectModule, MatFormFieldModule],
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-bold text-slate-200">Permisos por Rol</h1>

      <mat-card class="!bg-slate-900 !border !border-slate-700">
        <mat-card-content>
          <mat-form-field appearance="outline" class="mb-4">
            <mat-label>Rol</mat-label>
            <mat-select [(ngModel)]="selectedRol" (selectionChange)="onRolChange()">
              @for (r of roles; track r) {
                <mat-option [value]="r">{{ r }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          @if (selectedRol && modulos.length) {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-700">
                    <th class="text-left p-2 text-slate-400">Modulo</th>
                    @for (a of acciones; track a) {
                      <th class="text-center p-2 text-slate-400 capitalize">{{ a }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (m of modulos; track m) {
                    <tr class="border-b border-slate-800 hover:bg-slate-800/50">
                      <td class="p-2 text-slate-200 capitalize">{{ m }}</td>
                      @for (a of acciones; track a) {
                        <td class="text-center p-2">
                          <mat-checkbox
                            [checked]="getPermiso(m, a)"
                            (change)="togglePermiso(m, a, $event.checked)"
                            color="primary">
                          </mat-checkbox>
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class PermisosComponent implements OnInit {
  roles = ['admin_torneo', 'delegado', 'arbitro', 'veedor', 'entrenador', 'publico'];
  modulos: string[] = [];
  acciones: string[] = [];
  selectedRol = 'admin_torneo';
  permisosMap: Record<string, Record<string, Record<string, boolean>>> = {};

  constructor(private http: HttpClient, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.loadDefaults();
  }

  loadDefaults(): void {
    this.http.get<any>(`${environment.apiUrl}/permisos/defaults`).subscribe({
      next: (res) => {
        this.permisosMap = res.data;
        this.modulos = res.modulos;
        this.acciones = res.acciones;
      },
      error: () => this.toastr.error('Error al cargar permisos'),
    });
  }

  onRolChange(): void {
    // Data already loaded, just re-render
  }

  getPermiso(modulo: string, accion: string): boolean {
    return this.permisosMap[this.selectedRol]?.[modulo]?.[accion] ?? false;
  }

  togglePermiso(modulo: string, accion: string, permite: boolean | null): void {
    this.http.put(`${environment.apiUrl}/permisos/defaults`, {
      rol: this.selectedRol, modulo, accion, permite: !!permite,
    }).subscribe({
      next: () => {
        if (!this.permisosMap[this.selectedRol]) this.permisosMap[this.selectedRol] = {};
        if (!this.permisosMap[this.selectedRol][modulo]) this.permisosMap[this.selectedRol][modulo] = {};
        this.permisosMap[this.selectedRol][modulo][accion] = !!permite;
      },
      error: () => this.toastr.error('Error al actualizar permiso'),
    });
  }
}
