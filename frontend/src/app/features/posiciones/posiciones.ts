import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-posiciones',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatTableModule, MatTabsModule],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Tabla de Posiciones</h1>
        <div class="flex gap-2 items-center">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Torneo</mat-label>
            <mat-select [(ngModel)]="torneoId" (selectionChange)="cargar()">
              @for (t of torneos; track t.id) {
                <mat-option [value]="t.id">{{ t.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          @if (auth.isAdmin() && torneoId) {
            <button mat-stroked-button (click)="recalcular()">
              <mat-icon>refresh</mat-icon> Recalcular
            </button>
          }
        </div>
      </div>

      <mat-tab-group class="posiciones-tabs" (selectedTabChange)="onTabChange($event)">
        <!-- Tab General -->
        <mat-tab label="General Club">
          <mat-card class="bg-white rounded-xl border border-gray-200 mt-4">
            <mat-card-content>
              <table mat-table [dataSource]="posicionesClub" class="w-full !bg-transparent">
                <ng-container matColumnDef="pos">
                  <th mat-header-cell *matHeaderCellDef class="!text-gray-500 w-12">#</th>
                  <td mat-cell *matCellDef="let p; let i = index" class="!text-gray-700 font-bold">{{ i + 1 }}</td>
                </ng-container>
                <ng-container matColumnDef="club">
                  <th mat-header-cell *matHeaderCellDef class="!text-gray-500">Club</th>
                  <td mat-cell *matCellDef="let p" class="!text-gray-900 font-medium">{{ p.club?.nombre }}</td>
                </ng-container>
                <ng-container matColumnDef="puntos">
                  <th mat-header-cell *matHeaderCellDef class="!text-gray-500 text-center">Pts</th>
                  <td mat-cell *matCellDef="let p" class="!text-green-600 font-bold text-center text-lg">{{ p.puntos_totales }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="['pos', 'club', 'puntos']"></tr>
                <tr mat-row *matRowDef="let row; columns: ['pos', 'club', 'puntos'];" class="hover:bg-gray-50"></tr>
              </table>
              @if (!posicionesClub.length) {
                <p class="text-center text-gray-500 py-6">Sin datos. Los puntos se calculan al finalizar partidos.</p>
              }
            </mat-card-content>
          </mat-card>
        </mat-tab>

        <!-- Tab por Categoria -->
        <mat-tab label="Por Categoria">
          <div class="mt-4 mb-2">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Categoria</mat-label>
              <mat-select [(ngModel)]="filtroCategoria" (selectionChange)="cargarPorCategoria()">
                @for (cat of categorias; track cat.id) {
                  <mat-option [value]="cat.id">{{ cat.nombre }} {{ cat.es_preliminar ? '(Preliminar)' : '' }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <mat-card class="bg-white rounded-xl border border-gray-200">
            <mat-card-content>
              <table mat-table [dataSource]="posicionesCategoria" class="w-full !bg-transparent">
                <ng-container matColumnDef="pos">
                  <th mat-header-cell *matHeaderCellDef class="!text-gray-500 w-12">#</th>
                  <td mat-cell *matCellDef="let p; let i = index" class="!text-gray-700 font-bold">{{ i + 1 }}</td>
                </ng-container>
                <ng-container matColumnDef="club">
                  <th mat-header-cell *matHeaderCellDef class="!text-gray-500">Club</th>
                  <td mat-cell *matCellDef="let p" class="!text-gray-900 font-medium">{{ p.club?.nombre_corto || p.club?.nombre }}</td>
                </ng-container>
                <ng-container matColumnDef="pj">
                  <th mat-header-cell *matHeaderCellDef class="!text-gray-500 text-center">PJ</th>
                  <td mat-cell *matCellDef="let p" class="!text-gray-700 text-center">{{ p.pj }}</td>
                </ng-container>
                <ng-container matColumnDef="pg">
                  <th mat-header-cell *matHeaderCellDef class="!text-gray-500 text-center">PG</th>
                  <td mat-cell *matCellDef="let p" class="!text-gray-700 text-center">{{ p.pg }}</td>
                </ng-container>
                <ng-container matColumnDef="pe">
                  <th mat-header-cell *matHeaderCellDef class="!text-gray-500 text-center">PE</th>
                  <td mat-cell *matCellDef="let p" class="!text-gray-700 text-center">{{ p.pe }}</td>
                </ng-container>
                <ng-container matColumnDef="pp">
                  <th mat-header-cell *matHeaderCellDef class="!text-gray-500 text-center">PP</th>
                  <td mat-cell *matCellDef="let p" class="!text-gray-700 text-center">{{ p.pp }}</td>
                </ng-container>
                <ng-container matColumnDef="gf">
                  <th mat-header-cell *matHeaderCellDef class="!text-gray-500 text-center">GF</th>
                  <td mat-cell *matCellDef="let p" class="!text-gray-700 text-center">{{ p.gf }}</td>
                </ng-container>
                <ng-container matColumnDef="gc">
                  <th mat-header-cell *matHeaderCellDef class="!text-gray-500 text-center">GC</th>
                  <td mat-cell *matCellDef="let p" class="!text-gray-700 text-center">{{ p.gc }}</td>
                </ng-container>
                <ng-container matColumnDef="dg">
                  <th mat-header-cell *matHeaderCellDef class="!text-gray-500 text-center">DG</th>
                  <td mat-cell *matCellDef="let p" class="!text-gray-700 text-center">{{ p.dg }}</td>
                </ng-container>
                <ng-container matColumnDef="pts">
                  <th mat-header-cell *matHeaderCellDef class="!text-gray-500 text-center">Pts</th>
                  <td mat-cell *matCellDef="let p" class="!text-green-600 font-bold text-center">{{ p.puntos }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="columnasCategoria"></tr>
                <tr mat-row *matRowDef="let row; columns: columnasCategoria;" class="hover:bg-gray-50"></tr>
              </table>
              @if (!posicionesCategoria.length) {
                <p class="text-center text-gray-500 py-6">Selecciona una categoria para ver las posiciones</p>
              }
            </mat-card-content>
          </mat-card>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    ::ng-deep .posiciones-tabs .mdc-tab { color: #6b7280 !important; }
    ::ng-deep .posiciones-tabs .mdc-tab--active { color: #16a34a !important; }
    ::ng-deep .posiciones-tabs .mdc-tab-indicator__content--underline { border-color: #16a34a !important; }
  `],
})
export class PosicionesComponent implements OnInit {
  torneos: any[] = [];
  categorias: any[] = [];
  torneoId: number | null = null;
  posicionesClub: any[] = [];
  posicionesCategoria: any[] = [];
  filtroCategoria: number | null = null;
  columnasCategoria = ['pos', 'club', 'pj', 'pg', 'pe', 'pp', 'gf', 'gc', 'dg', 'pts'];

  constructor(private http: HttpClient, public auth: AuthService, private toastr: ToastrService) {}

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/torneos`).subscribe({
      next: res => {
        this.torneos = res.data;
        if (this.torneos.length) {
          this.torneoId = this.torneos[0].id;
          this.categorias = this.torneos[0].categorias || [];
          this.cargar();
        }
      },
    });
  }

  cargar() {
    if (!this.torneoId) return;
    const torneo = this.torneos.find(t => t.id === this.torneoId);
    this.categorias = torneo?.categorias || [];

    this.http.get<any>(`${environment.apiUrl}/posiciones/${this.torneoId}/general`).subscribe({
      next: res => this.posicionesClub = res.data,
    });

    if (this.filtroCategoria) this.cargarPorCategoria();
  }

  cargarPorCategoria() {
    if (!this.torneoId || !this.filtroCategoria) return;
    this.http.get<any>(`${environment.apiUrl}/posiciones/${this.torneoId}/categorias`, {
      params: { categoria_id: this.filtroCategoria },
    }).subscribe({
      next: res => this.posicionesCategoria = res.data,
    });
  }

  onTabChange(event: any) {
    if (event.index === 1 && this.categorias.length && !this.filtroCategoria) {
      this.filtroCategoria = this.categorias[0].id;
      this.cargarPorCategoria();
    }
  }

  recalcular() {
    this.http.post<any>(`${environment.apiUrl}/posiciones/${this.torneoId}/recalcular`, {}).subscribe({
      next: (res) => { this.toastr.success(res.message); this.cargar(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }
}
