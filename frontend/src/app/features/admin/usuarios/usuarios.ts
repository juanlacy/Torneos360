import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule, MatPaginatorModule],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-200">Usuarios</h1>
      </div>

      <mat-card class="!bg-slate-900 !border !border-slate-700">
        <mat-card-content>
          <div class="flex gap-4 mb-4 items-center">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Buscar</mat-label>
              <input matInput [(ngModel)]="search" (keyup.enter)="loadUsuarios()" placeholder="Nombre, apellido o email">
              <mat-icon matPrefix>search</mat-icon>
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-48">
              <mat-label>Rol</mat-label>
              <mat-select [(ngModel)]="filtroRol" (selectionChange)="loadUsuarios()">
                <mat-option value="">Todos</mat-option>
                @for (r of roles; track r) {
                  <mat-option [value]="r">{{ r }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <table mat-table [dataSource]="usuarios" class="w-full !bg-transparent">
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef class="!text-slate-400">Nombre</th>
              <td mat-cell *matCellDef="let u" class="!text-slate-200">{{ u.nombre }} {{ u.apellido }}</td>
            </ng-container>

            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef class="!text-slate-400">Email</th>
              <td mat-cell *matCellDef="let u" class="!text-slate-300">{{ u.email }}</td>
            </ng-container>

            <ng-container matColumnDef="rol">
              <th mat-header-cell *matHeaderCellDef class="!text-slate-400">Rol</th>
              <td mat-cell *matCellDef="let u">
                <span class="px-2 py-1 rounded text-xs font-medium"
                  [class]="getRolClass(u.rol)">{{ u.rol }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="activo">
              <th mat-header-cell *matHeaderCellDef class="!text-slate-400">Estado</th>
              <td mat-cell *matCellDef="let u">
                <span [class]="u.activo ? 'text-green-400' : 'text-red-400'">
                  {{ u.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover:!bg-slate-800 cursor-pointer"></tr>
          </table>

          <mat-paginator
            [length]="total"
            [pageSize]="pageSize"
            [pageIndex]="page - 1"
            (page)="onPage($event)"
            class="!bg-transparent">
          </mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class UsuariosComponent implements OnInit {
  usuarios: any[] = [];
  displayedColumns = ['nombre', 'email', 'rol', 'activo'];
  roles = ['admin_sistema', 'admin_torneo', 'delegado', 'arbitro', 'veedor', 'entrenador', 'publico'];

  search = '';
  filtroRol = '';
  page = 1;
  pageSize = 20;
  total = 0;

  constructor(private http: HttpClient, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.loadUsuarios();
  }

  loadUsuarios(): void {
    const params: any = { page: this.page, limit: this.pageSize };
    if (this.search) params.search = this.search;
    if (this.filtroRol) params.rol = this.filtroRol;

    this.http.get<any>(`${environment.apiUrl}/admin/usuarios`, { params }).subscribe({
      next: (res) => {
        this.usuarios = res.data;
        this.total = res.pagination.total;
      },
      error: () => this.toastr.error('Error al cargar usuarios'),
    });
  }

  onPage(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadUsuarios();
  }

  getRolClass(rol: string): string {
    const map: Record<string, string> = {
      admin_sistema: 'bg-red-900/50 text-red-300',
      admin_torneo:  'bg-orange-900/50 text-orange-300',
      delegado:      'bg-blue-900/50 text-blue-300',
      arbitro:       'bg-purple-900/50 text-purple-300',
      veedor:        'bg-cyan-900/50 text-cyan-300',
      entrenador:    'bg-green-900/50 text-green-300',
      publico:       'bg-slate-700/50 text-slate-300',
    };
    return map[rol] || 'bg-slate-700/50 text-slate-300';
  }
}
