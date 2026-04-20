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
          <ul class="divide-y divide-gray-100">
            @for (g of goleadores; track g.persona_id; let i = $index) {
              <li class="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                <span class="inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                  [class]="i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-amber-100 text-amber-700' : 'text-gray-400'">
                  {{ i + 1 }}
                </span>
                @if (g.foto_url) {
                  <img [src]="resolveUrl(g.foto_url)" class="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="">
                } @else {
                  <div class="w-10 h-10 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {{ (g.nombre || '?').charAt(0) }}{{ (g.apellido || '').charAt(0) }}
                  </div>
                }
                <div class="flex-1 min-w-0">
                  <p class="font-bold text-gray-900 truncate">{{ g.apellido }}, {{ g.nombre }}</p>
                  <div class="flex items-center gap-2 mt-0.5">
                    @if (g.club?.escudo_url) {
                      <img [src]="resolveUrl(g.club.escudo_url)" class="w-4 h-4 object-contain" alt="">
                    }
                    <span class="text-xs text-gray-500 truncate">{{ g.club?.nombre_corto || g.club?.nombre }}</span>
                    @if (g.categoria) {
                      <span class="text-[10px] text-gray-400">· {{ g.categoria.nombre }}</span>
                    }
                  </div>
                </div>
                <span class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white font-bold text-sm flex-shrink-0"
                  [style.background-color]="branding.color_primario || '#762c7e'">
                  ⚽ {{ g.goles }}
                </span>
              </li>
            }
          </ul>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-wider">
                <tr>
                  <th class="px-3 py-2 text-center w-10">#</th>
                  <th class="px-3 py-2 text-left">Jugador</th>
                  <th class="px-3 py-2 text-left hidden sm:table-cell">Club</th>
                  <th class="px-2 py-2 text-center">🟡</th>
                  <th class="px-2 py-2 text-center">🔴</th>
                  <th class="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                @for (t of tarjetas; track t.persona_id; let i = $index) {
                  <tr class="border-t border-gray-100 hover:bg-gray-50">
                    <td class="px-3 py-2 text-center text-gray-400 font-medium">{{ i + 1 }}</td>
                    <td class="px-3 py-2">
                      <div class="flex items-center gap-2.5 min-w-0">
                        @if (t.foto_url) {
                          <img [src]="resolveUrl(t.foto_url)" class="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="">
                        } @else {
                          <div class="w-8 h-8 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                            {{ (t.nombre || '?').charAt(0) }}{{ (t.apellido || '').charAt(0) }}
                          </div>
                        }
                        <div class="min-w-0">
                          <p class="font-semibold text-gray-900 truncate text-sm">{{ t.apellido }}, {{ t.nombre }}</p>
                          <p class="sm:hidden text-xs text-gray-500 truncate">{{ t.club?.nombre_corto || t.club?.nombre }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-3 py-2 hidden sm:table-cell">
                      <div class="flex items-center gap-2">
                        @if (t.club?.escudo_url) {
                          <img [src]="resolveUrl(t.club.escudo_url)" class="w-5 h-5 object-contain" alt="">
                        }
                        <span class="text-xs text-gray-700 truncate">{{ t.club?.nombre_corto || t.club?.nombre }}</span>
                      </div>
                    </td>
                    <td class="px-2 py-2 text-center font-bold text-yellow-600">{{ t.amarillas }}</td>
                    <td class="px-2 py-2 text-center font-bold text-red-600">{{ t.rojas }}</td>
                    <td class="px-3 py-2 text-right">
                      <span class="inline-block min-w-[32px] px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700">
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

    // Tabla
    if (this.tab === 'goleadores') {
      autoTable(doc, {
        startY: 110,
        head: [['#', 'Jugador', 'Club', 'Categoria', 'Goles']],
        body: this.goleadores.map((g, i) => [
          i + 1,
          `${g.apellido || ''}, ${g.nombre || ''}`,
          g.club?.nombre_corto || g.club?.nombre || '-',
          g.categoria?.nombre || '-',
          g.goles,
        ]),
        headStyles: { fillColor: this.hexToRgb(primary), textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 32, halign: 'center' },
          4: { cellWidth: 50, halign: 'center', fontStyle: 'bold' },
        },
        styles: { fontSize: 10, cellPadding: 6 },
        margin: { left: margin, right: margin },
      });
    } else {
      autoTable(doc, {
        startY: 110,
        head: [['#', 'Jugador', 'Club', 'Amarillas', 'Rojas', 'Total']],
        body: this.tarjetas.map((t, i) => [
          i + 1,
          `${t.apellido || ''}, ${t.nombre || ''}`,
          t.club?.nombre_corto || t.club?.nombre || '-',
          t.amarillas,
          t.rojas,
          t.rojas * 3 + t.amarillas,
        ]),
        headStyles: { fillColor: this.hexToRgb(primary), textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 32, halign: 'center' },
          3: { cellWidth: 60, halign: 'center' },
          4: { cellWidth: 50, halign: 'center' },
          5: { cellWidth: 50, halign: 'center', fontStyle: 'bold' },
        },
        styles: { fontSize: 10, cellPadding: 6 },
        margin: { left: margin, right: margin },
      });
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
