import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { environment } from '../../../environments/environment';
import { BrandingService } from '../../core/services/branding.service';

type Tab = 'goleadores' | 'tarjetas';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="space-y-4">

      <!-- Header -->
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Estadisticas</h1>
          <p class="text-sm text-gray-500">Goleadores y tarjetas del torneo</p>
        </div>
        <button (click)="exportarPDF()" [disabled]="!currentRows().length"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primario)] text-white text-sm font-medium shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          <mat-icon class="!text-lg !w-5 !h-5">picture_as_pdf</mat-icon>
          Exportar PDF
        </button>
      </div>

      <!-- Tabs + filtros -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="flex items-center border-b border-gray-100">
          @for (t of tabs; track t.id) {
            <button (click)="setTab(t.id)"
              class="px-5 py-3 text-sm font-medium transition-all border-b-2 flex items-center gap-2"
              [class.border-transparent]="tab !== t.id"
              [class.text-gray-500]="tab !== t.id"
              [class.hover:text-gray-700]="tab !== t.id"
              [style.border-color]="tab === t.id ? (branding.color_primario || '#762c7e') : 'transparent'"
              [style.color]="tab === t.id ? (branding.color_primario || '#762c7e') : ''">
              <mat-icon class="!text-base !w-5 !h-5">{{ t.icon }}</mat-icon>
              {{ t.label }}
            </button>
          }
        </div>

        <!-- Chips de categoria -->
        <div class="px-5 py-2.5 border-b border-gray-100 flex gap-2 overflow-x-auto bg-gray-50">
          <button (click)="selectCategoria(null)"
            class="shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
            [class]="categoriaId === null ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            [style.background-color]="categoriaId === null ? (branding.color_primario || '#762c7e') : ''">
            Todas
          </button>
          @for (c of categorias; track c.id) {
            <button (click)="selectCategoria(c.id)"
              class="shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
              [class]="categoriaId === c.id ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              [style.background-color]="categoriaId === c.id ? (branding.color_primario || '#762c7e') : ''">
              {{ c.nombre }}
            </button>
          }
          @if (zonas.length > 1) {
            <span class="shrink-0 w-px self-stretch bg-gray-200 mx-1"></span>
            <button (click)="selectZona(null)"
              class="shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
              [class]="zonaId === null ? 'bg-gray-700 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
              Todas las zonas
            </button>
            @for (z of zonas; track z.id) {
              <button (click)="selectZona(z.id)"
                class="shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
                [class]="zonaId === z.id ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                [style.background-color]="zonaId === z.id ? (z.color || '#374151') : ''">
                {{ z.nombre }}
              </button>
            }
          }
          <span class="ml-auto shrink-0 text-xs text-gray-400 self-center">
            @if (!loading) { {{ currentRows().length }} resultados }
          </span>
        </div>

        <!-- Contenido -->
        @if (loading) {
          <div class="py-16 flex justify-center">
            <mat-spinner [diameter]="36"></mat-spinner>
          </div>
        } @else if (!currentRows().length) {
          <div class="py-16 text-center text-gray-400">
            <mat-icon class="!text-5xl !w-12 !h-12 mb-2">{{ tab === 'goleadores' ? 'sports_soccer' : 'style' }}</mat-icon>
            <p class="text-sm">Sin datos para los filtros seleccionados</p>
          </div>
        } @else if (tab === 'goleadores') {
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-gray-200">
            @for (g of gruposPorZona(goleadores); track g.zona.id) {
              <div>
                <div class="h-1" [style.background-color]="g.zona.color || 'var(--color-primario)'"></div>
                <div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full" [style.background-color]="g.zona.color || '#6b7280'"></span>
                  <span class="text-xs font-bold text-gray-700 uppercase tracking-wide">{{ g.zona.nombre }}</span>
                  <span class="ml-auto text-[10px] text-gray-400">{{ g.rows.length }} jugadores</span>
                </div>
                <ul class="divide-y divide-gray-100">
                  @for (j of g.rows; track j.persona_id; let i = $index) {
                    <li class="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50">
                      <span class="inline-flex w-6 h-6 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0"
                        [class]="i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-amber-100 text-amber-700' : 'text-gray-400'">
                        {{ i + 1 }}
                      </span>
                      @if (j.foto_url) {
                        <img [src]="resolveUrl(j.foto_url)" class="w-9 h-9 rounded-full object-cover flex-shrink-0" alt="">
                      } @else {
                        <div class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                          [style.background-color]="j.club?.color_primario || 'var(--color-primario)'">
                          {{ (j.nombre || '?').charAt(0) }}{{ (j.apellido || '').charAt(0) }}
                        </div>
                      }
                      <div class="flex-1 min-w-0">
                        <p class="font-semibold text-gray-900 text-sm truncate">{{ j.apellido }}, {{ j.nombre }}</p>
                        <div class="flex items-center gap-1.5 mt-0.5">
                          @if (j.club?.escudo_url) {
                            <img [src]="resolveUrl(j.club.escudo_url)" class="w-4 h-4 object-contain" alt="">
                          }
                          <span class="text-[11px] text-gray-500 truncate">{{ j.club?.nombre_corto || j.club?.nombre }}</span>
                          @if (j.categoria?.nombre) {
                            <span class="inline-flex px-1.5 py-0 rounded text-[9px] font-medium bg-blue-50 text-blue-600">{{ j.categoria.nombre }}</span>
                          }
                        </div>
                      </div>
                      <span class="shrink-0 text-right">
                        <span class="text-base font-extrabold text-gray-900">{{ j.goles }}</span>
                        <p class="text-[9px] text-gray-400 uppercase leading-none">goles</p>
                      </span>
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
        } @else {
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-gray-200">
            @for (g of gruposPorZona(tarjetas); track g.zona.id) {
              <div class="overflow-x-auto">
                <div class="h-1" [style.background-color]="g.zona.color || 'var(--color-primario)'"></div>
                <div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full" [style.background-color]="g.zona.color || '#6b7280'"></span>
                  <span class="text-xs font-bold text-gray-700 uppercase tracking-wide">{{ g.zona.nombre }}</span>
                  <span class="ml-auto text-[10px] text-gray-400">{{ g.rows.length }} jugadores</span>
                </div>
                <table class="w-full text-sm">
                  <thead class="bg-gray-50/50 text-gray-400 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th class="px-3 py-2 text-center w-10">#</th>
                      <th class="px-3 py-2 text-left">Jugador</th>
                      <th class="px-2 py-2 text-center">🟡</th>
                      <th class="px-2 py-2 text-center">🔴</th>
                      <th class="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (t of g.rows; track t.persona_id; let i = $index) {
                      <tr class="border-t border-gray-100 hover:bg-gray-50">
                        <td class="px-3 py-2 text-center text-gray-400 text-xs font-medium">{{ i + 1 }}</td>
                        <td class="px-3 py-2">
                          <div class="flex items-center gap-2 min-w-0">
                            @if (t.foto_url) {
                              <img [src]="resolveUrl(t.foto_url)" class="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="">
                            } @else {
                              <div class="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
                                [style.background-color]="t.club?.color_primario || 'var(--color-primario)'">
                                {{ (t.nombre || '?').charAt(0) }}{{ (t.apellido || '').charAt(0) }}
                              </div>
                            }
                            <div class="min-w-0">
                              <p class="font-semibold text-gray-900 truncate text-xs">{{ t.apellido }}, {{ t.nombre }}</p>
                              <p class="text-[10px] text-gray-500 truncate">{{ t.club?.nombre_corto || t.club?.nombre }}</p>
                            </div>
                          </div>
                        </td>
                        <td class="px-2 py-2 text-center font-bold text-yellow-600 text-xs">{{ t.amarillas }}</td>
                        <td class="px-2 py-2 text-center font-bold text-red-600 text-xs">{{ t.rojas }}</td>
                        <td class="px-3 py-2 text-right">
                          <span class="inline-block min-w-[28px] px-1.5 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-700">
                            {{ t.rojas * 3 + t.amarillas }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class EstadisticasComponent implements OnInit {
  loading = true;
  tab: Tab = 'goleadores';
  tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'goleadores', label: 'Goleadores', icon: 'sports_soccer' },
    { id: 'tarjetas',   label: 'Tarjetas',   icon: 'style' },
  ];

  goleadores: any[] = [];
  tarjetas: any[] = [];

  categorias: any[] = [];
  zonas: any[] = [];
  categoriaId: number | null = null;
  zonaId: number | null = null;

  branding: any = {};
  torneoNombre = '';

  constructor(
    private http: HttpClient,
    public brandingSvc: BrandingService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.brandingSvc.branding$.subscribe(b => { this.branding = b; this.cdr.detectChanges(); });
    this.brandingSvc.torneoActivoId$.subscribe(id => {
      if (id) this.cargarTorneoYDatos(id);
    });
  }

  private cargarTorneoYDatos(torneoId: number) {
    this.http.get<any>(`${environment.apiUrl}/torneos/${torneoId}`).subscribe({
      next: (res) => {
        const t = res.data || {};
        this.torneoNombre = t.nombre || '';
        this.categorias = (t.categorias || []).sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
        this.zonas = t.zonas || [];
        this.cargar();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); },
    });
  }

  setTab(t: Tab) {
    this.tab = t;
    if ((t === 'goleadores' && !this.goleadores.length) || (t === 'tarjetas' && !this.tarjetas.length)) {
      this.cargar();
    }
    this.cdr.detectChanges();
  }

  selectCategoria(id: number | null) {
    this.categoriaId = id;
    this.cargar();
  }

  selectZona(id: number | null) {
    this.zonaId = id;
    this.cargar();
  }

  cargar() {
    const torneoId = this.brandingSvc.torneoActivoId;
    if (!torneoId) return;
    this.loading = true;

    const params: string[] = [];
    if (this.categoriaId) params.push(`categoria_id=${this.categoriaId}`);
    if (this.zonaId) params.push(`zona_id=${this.zonaId}`);
    const qs = params.length ? `?${params.join('&')}` : '';

    const endpoint = this.tab === 'goleadores' ? 'goleadores' : 'tarjetas';
    this.http.get<any>(`${environment.apiUrl}/estadisticas/${torneoId}/${endpoint}${qs}`).subscribe({
      next: (res) => {
        if (this.tab === 'goleadores') this.goleadores = res.data || [];
        else this.tarjetas = res.data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); },
    });
  }

  currentRows(): any[] {
    return this.tab === 'goleadores' ? this.goleadores : this.tarjetas;
  }

  /** Agrupa filas por zona (via r.club.zona_id) respetando orden de this.zonas. */
  gruposPorZona(rows: any[]): { zona: any; rows: any[] }[] {
    const map = new Map<number, { zona: any; rows: any[] }>();
    for (const z of this.zonas) map.set(z.id, { zona: z, rows: [] });
    const sinZona: any[] = [];
    for (const r of rows) {
      const zid = r.club?.zona_id;
      if (zid && map.has(zid)) map.get(zid)!.rows.push(r);
      else sinZona.push(r);
    }
    const result = [...map.values()].filter(g => g.rows.length);
    if (sinZona.length) result.push({ zona: { id: 0, nombre: 'Sin zona', color: '#94a3b8' }, rows: sinZona });
    return result;
  }

  exportarPDF() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const margin = 40;
    const primary = this.branding.color_primario || '#762c7e';

    // Titulo
    doc.setFillColor(primary);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 70, 'F');
    doc.setTextColor(255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(this.torneoNombre || 'Torneo360', margin, 32);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(this.tab === 'goleadores' ? 'Tabla de Goleadores' : 'Tabla de Tarjetas', margin, 52);

    // Filtros aplicados
    const filtros: string[] = [];
    if (this.categoriaId) {
      const c = this.categorias.find(c => c.id === this.categoriaId);
      if (c) filtros.push(`Categoria: ${c.nombre}`);
    }
    if (this.zonaId) {
      const z = this.zonas.find(z => z.id === this.zonaId);
      if (z) filtros.push(`Zona: ${z.nombre}`);
    }
    doc.setTextColor(100);
    doc.setFontSize(9);
    doc.text(
      `${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}${filtros.length ? '  ·  ' + filtros.join('  ·  ') : ''}`,
      margin, 90,
    );

    // Tablas — una por zona (o una sola si no hay zonas)
    const grupos = this.gruposPorZona(this.currentRows());
    let startY = 110;

    for (const g of grupos) {
      // Subheader de zona
      doc.setFillColor(...this.hexToRgb(g.zona.color || primary));
      doc.rect(margin, startY, doc.internal.pageSize.getWidth() - margin * 2, 18, 'F');
      doc.setTextColor(255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Zona ${g.zona.nombre}  ·  ${g.rows.length} jugadores`, margin + 8, startY + 12);
      startY += 18;

      if (this.tab === 'goleadores') {
        autoTable(doc, {
          startY,
          head: [['#', 'Jugador', 'Club', 'Categoria', 'Goles']],
          body: g.rows.map((r, i) => [
            i + 1,
            `${r.apellido || ''}, ${r.nombre || ''}`,
            r.club?.nombre_corto || r.club?.nombre || '-',
            r.categoria?.nombre || '-',
            r.goles,
          ]),
          headStyles: { fillColor: this.hexToRgb(primary), textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 32, halign: 'center' },
            4: { cellWidth: 50, halign: 'center', fontStyle: 'bold' },
          },
          styles: { fontSize: 9, cellPadding: 5 },
          margin: { left: margin, right: margin },
        });
      } else {
        autoTable(doc, {
          startY,
          head: [['#', 'Jugador', 'Club', 'Amarillas', 'Rojas', 'Total']],
          body: g.rows.map((r, i) => [
            i + 1,
            `${r.apellido || ''}, ${r.nombre || ''}`,
            r.club?.nombre_corto || r.club?.nombre || '-',
            r.amarillas,
            r.rojas,
            r.rojas * 3 + r.amarillas,
          ]),
          headStyles: { fillColor: this.hexToRgb(primary), textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 32, halign: 'center' },
            3: { cellWidth: 60, halign: 'center' },
            4: { cellWidth: 50, halign: 'center' },
            5: { cellWidth: 50, halign: 'center', fontStyle: 'bold' },
          },
          styles: { fontSize: 9, cellPadding: 5 },
          margin: { left: margin, right: margin },
        });
      }

      startY = (doc as any).lastAutoTable.finalY + 16;
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Torneo360 · Pagina ${i} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 20,
        { align: 'center' },
      );
    }

    const nombre = `${this.torneoNombre || 'torneo'}-${this.tab}-${new Date().toISOString().slice(0, 10)}.pdf`.replace(/\s+/g, '_').toLowerCase();
    doc.save(nombre);
  }

  private hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  resolveUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return url;
    return `${environment.apiUrl}${url}`;
  }
}
