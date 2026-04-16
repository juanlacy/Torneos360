import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';

interface Documento {
  id: number;
  tipo: string;
  archivo_url: string;
  nombre_original: string;
  mime_type: string;
  tamano: number;
  descripcion: string;
  creado_en: string;
}

const TIPO_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  foto: { label: 'Foto carnet', icon: 'photo_camera', color: '#7c3aed' },
  dni: { label: 'DNI (frente/dorso)', icon: 'badge', color: '#0ea5e9' },
  apto_medico: { label: 'Apto medico', icon: 'medical_services', color: '#059669' },
  ficha: { label: 'Ficha medica', icon: 'description', color: '#f59e0b' },
  contrato: { label: 'Contrato/Acuerdo', icon: 'handshake', color: '#8b5cf6' },
  otro: { label: 'Otro documento', icon: 'attach_file', color: '#64748b' },
};

/**
 * Componente reutilizable para subir/ver/eliminar documentos de una entidad.
 *
 * Uso:
 *   <app-documentos-upload
 *     entidadTipo="personas"
 *     [entidadId]="persona.id">
 *   </app-documentos-upload>
 */
@Component({
  selector: 'app-documentos-upload',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    @if (entidadId) {
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <mat-icon class="!text-base text-gray-400">folder</mat-icon>
            Documentos
          </h4>
          <span class="text-xs text-gray-400">{{ documentos.length }} archivo(s)</span>
        </div>

        <!-- Lista de documentos existentes -->
        @if (documentos.length) {
          <div class="space-y-2">
            @for (doc of documentos; track doc.id) {
              <div class="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-white transition-colors group">
                <!-- Thumbnail o icono -->
                @if (doc.mime_type?.startsWith('image/')) {
                  <img [src]="resolveUrl(doc.archivo_url)" class="w-10 h-10 rounded object-cover border border-gray-200 shrink-0" alt="">
                } @else {
                  <div class="w-10 h-10 rounded flex items-center justify-center shrink-0"
                    [style.background-color]="getTipoInfo(doc.tipo).color + '15'">
                    <mat-icon [style.color]="getTipoInfo(doc.tipo).color" class="!text-lg">{{ getTipoInfo(doc.tipo).icon }}</mat-icon>
                  </div>
                }

                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-gray-800 truncate">{{ doc.nombre_original || doc.archivo_url }}</p>
                  <p class="text-[10px] text-gray-400">
                    {{ getTipoInfo(doc.tipo).label }}
                    @if (doc.tamano) { · {{ formatSize(doc.tamano) }} }
                  </p>
                </div>

                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a [href]="resolveUrl(doc.archivo_url)" target="_blank"
                    class="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                    <mat-icon class="!text-sm">open_in_new</mat-icon>
                  </a>
                  <button (click)="eliminar(doc)"
                    class="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50">
                    <mat-icon class="!text-sm">delete</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- Botones de subir por tipo -->
        <div class="flex flex-wrap gap-2">
          @for (t of tiposDisponibles; track t.key) {
            <label
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border border-dashed transition-colors"
              [style.border-color]="t.color + '60'"
              [style.color]="t.color"
              [class]="'hover:bg-opacity-10'"
              [style.background-color]="t.color + '08'">
              <mat-icon class="!text-sm !w-4 !h-4">{{ t.icon }}</mat-icon>
              {{ t.label }}
              <input type="file" class="hidden" [accept]="t.key === 'foto' ? 'image/*' : 'image/*,.pdf'"
                (change)="onFileSelected($event, t.key)">
            </label>
          }
        </div>

        @if (uploading) {
          <div class="flex items-center gap-2 text-xs text-[var(--color-primario)]">
            <mat-icon class="!text-sm animate-spin">autorenew</mat-icon> Subiendo...
          </div>
        }
      </div>
    }
  `,
})
export class DocumentosUploadComponent implements OnInit, OnChanges {
  @Input() entidadTipo = 'personas';
  @Input() entidadId: number | null = null;

  documentos: Documento[] = [];
  uploading = false;

  tiposDisponibles = Object.entries(TIPO_LABELS).map(([key, v]) => ({ key, ...v }));

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() { this.cargar(); }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['entidadId'] && !changes['entidadId'].firstChange) {
      this.cargar();
    }
  }

  cargar() {
    if (!this.entidadId) return;
    this.http.get<any>(`${environment.apiUrl}/documentos`, {
      params: { entidad_tipo: this.entidadTipo, entidad_id: String(this.entidadId) },
    }).subscribe({
      next: (res) => { this.documentos = res.data || []; this.cdr.detectChanges(); },
      error: () => {},
    });
  }

  onFileSelected(event: Event, tipo: string) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.entidadId) return;

    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('entidad_tipo', this.entidadTipo);
    formData.append('entidad_id', String(this.entidadId));
    formData.append('tipo', tipo);

    this.uploading = true;
    this.cdr.detectChanges();

    this.http.post<any>(`${environment.apiUrl}/documentos`, formData).subscribe({
      next: (res) => {
        this.toastr.success(`${this.getTipoInfo(tipo).label} subido`);
        this.uploading = false;
        this.cargar();
        input.value = '';
      },
      error: (e) => {
        this.toastr.error(e.error?.message || 'Error al subir');
        this.uploading = false;
        this.cdr.detectChanges();
        input.value = '';
      },
    });
  }

  eliminar(doc: Documento) {
    if (!confirm(`Eliminar ${doc.nombre_original || 'documento'}?`)) return;
    this.http.delete<any>(`${environment.apiUrl}/documentos/${doc.id}`).subscribe({
      next: () => { this.toastr.success('Documento eliminado'); this.cargar(); },
      error: (e) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  getTipoInfo(tipo: string) {
    return TIPO_LABELS[tipo] || TIPO_LABELS['otro'];
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  resolveUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return url;
    return `${environment.apiUrl}${url}`;
  }
}
