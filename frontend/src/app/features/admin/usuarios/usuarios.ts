import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
        <h1 class="text-2xl font-bold text-gray-900">Usuarios</h1>
      </div>

      <mat-card class="bg-white rounded-xl border border-gray-200">
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
              <th mat-header-cell *matHeaderCellDef class="!text-gray-500">Nombre</th>
              <td mat-cell *matCellDef="let u" class="!text-gray-900">{{ u.nombre }} {{ u.apellido }}</td>
            </ng-container>

            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef class="!text-gray-500">Email</th>
              <td mat-cell *matCellDef="let u" class="!text-gray-700">{{ u.email }}</td>
            </ng-container>

            <ng-container matColumnDef="rol">
              <th mat-header-cell *matHeaderCellDef class="!text-gray-500">Rol</th>
              <td mat-cell *matCellDef="let u">
                <span class="px-2 py-1 rounded text-xs font-medium"
                  [class]="getRolClass(u.rol)">{{ u.rol }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="activo">
              <th mat-header-cell *matHeaderCellDef class="!text-gray-500">Estado</th>
              <td mat-cell *matCellDef="let u">
                <span [class]="u.activo ? 'text-green-600' : 'text-red-500'">
                  {{ u.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover:bg-gray-50 cursor-pointer"></tr>
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

  constructor(private http: HttpClient, private toastr: ToastrService, private cdr: ChangeDetectorRef) {}

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
        this.cdr.detectChanges();
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
      admin_sistema: 'bg-red-50 text-red-700',
      admin_torneo:  'bg-orange-50 text-orange-700',
      delegado:      'bg-blue-50 text-blue-700',
      arbitro:       'bg-purple-50 text-purple-700',
      veedor:        'bg-cyan-50 text-cyan-700',
      entrenador:    'bg-green-50 text-green-700',
      publico:       'bg-gray-100 text-gray-700',
    };
    return map[rol] || 'bg-gray-100 text-gray-700';
  }
}
