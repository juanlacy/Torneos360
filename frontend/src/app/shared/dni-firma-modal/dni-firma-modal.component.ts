import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DniScannerComponent, DniData } from '../dni-scanner/dni-scanner.component';

export interface DniFirmaResult {
  dni: string;
  firma: string; // data URL base64 PNG
}

/**
 * Modal reutilizable para confirmar una accion con DNI + firma digital.
 *
 * Uso:
 *   <app-dni-firma-modal
 *     titulo="Confirmar alineacion Local"
 *     subtitulo="El delegado debe confirmar"
 *     (confirmed)="onConfirm($event)"
 *     (cancelled)="close()">
 *   </app-dni-firma-modal>
 */
@Component({
  selector: 'app-dni-firma-modal',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, DniScannerComponent],
  template: `
    <div class="fixed inset-0 z-[9998] bg-black/70 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-in">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 text-lg">{{ titulo }}</h3>
          @if (subtitulo) {
            <p class="text-sm text-gray-500 mt-0.5">{{ subtitulo }}</p>
          }
        </div>

        <!-- Body -->
        <div class="p-5 space-y-4">
          <!-- DNI input -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Documento (DNI)</label>
            <div class="flex gap-2">
              <input
                type="text"
                [(ngModel)]="dni"
                placeholder="00000000"
                maxlength="9"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]">
              <button mat-stroked-button (click)="mostrarScanner = true" type="button">
                <mat-icon>qr_code_scanner</mat-icon>
              </button>
            </div>
            @if (datosEscaneados) {
              <p class="text-xs text-green-600 mt-1 flex items-center gap-1">
                <mat-icon class="!text-xs !w-3 !h-3">check_circle</mat-icon>
                {{ datosEscaneados.apellido }} {{ datosEscaneados.nombre }}
              </p>
            }
          </div>

          <!-- Firma -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Firma</label>
            <div class="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden"
              [class.border-solid]="hayFirma"
              [class.border-green-500]="hayFirma">
              <canvas #canvas width="500" height="180" class="w-full touch-none cursor-crosshair bg-white"></canvas>
            </div>
            <div class="flex items-center justify-between mt-1">
              <p class="text-[10px] text-gray-500">
                @if (!hayFirma) { Firma con el dedo o el mouse }
                @else { Firma capturada }
              </p>
              <button mat-button class="!text-xs" (click)="limpiarFirma()" type="button">
                <mat-icon class="!text-sm !w-4 !h-4">refresh</mat-icon> Borrar
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-5 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          <button mat-stroked-button (click)="cancel()" type="button">Cancelar</button>
          <button mat-flat-button color="primary" (click)="confirm()" [disabled]="!puedeConfirmar()">
            <mat-icon>check</mat-icon> Confirmar
          </button>
        </div>
      </div>
    </div>

    <!-- DNI Scanner modal -->
    @if (mostrarScanner) {
      <app-dni-scanner
        (scanned)="onDniEscaneado($event)"
        (cancelled)="mostrarScanner = false">
      </app-dni-scanner>
    }
  `,
})
export class DniFirmaModalComponent implements AfterViewInit {
  @Input() titulo = 'Confirmar';
  @Input() subtitulo?: string;
  @Output() confirmed = new EventEmitter<DniFirmaResult>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;

  dni = '';
  mostrarScanner = false;
  hayFirma = false;
  datosEscaneados: DniData | null = null;

  private ctx!: CanvasRenderingContext2D;
  private drawing = false;
  private lastX = 0;
  private lastY = 0;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    setTimeout(() => this.setupCanvas(), 50);
  }

  private setupCanvas() {
    const canvas = this.canvas.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#1e293b';

    // Mouse events
    canvas.addEventListener('mousedown', (e) => this.startDraw(e.offsetX, e.offsetY));
    canvas.addEventListener('mousemove', (e) => this.draw(e.offsetX, e.offsetY));
    canvas.addEventListener('mouseup', () => this.stopDraw());
    canvas.addEventListener('mouseleave', () => this.stopDraw());

    // Touch events
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      this.startDraw(touch.clientX - rect.left, touch.clientY - rect.top);
    });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      this.draw(touch.clientX - rect.left, touch.clientY - rect.top);
    });
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.stopDraw();
    });
  }

  private startDraw(x: number, y: number) {
    this.drawing = true;
    this.lastX = x;
    this.lastY = y;
    this.hayFirma = true;
    this.cdr.detectChanges();
  }

  private draw(x: number, y: number) {
    if (!this.drawing) return;
    const canvas = this.canvas.nativeElement;
    const scaleX = canvas.width / canvas.clientWidth;
    const scaleY = canvas.height / canvas.clientHeight;
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX * scaleX, this.lastY * scaleY);
    this.ctx.lineTo(x * scaleX, y * scaleY);
    this.ctx.stroke();
    this.lastX = x;
    this.lastY = y;
  }

  private stopDraw() {
    this.drawing = false;
  }

  limpiarFirma() {
    const canvas = this.canvas.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.hayFirma = false;
    this.cdr.detectChanges();
  }

  onDniEscaneado(data: DniData) {
    this.dni = data.dni;
    this.datosEscaneados = data;
    this.mostrarScanner = false;
    this.cdr.detectChanges();
  }

  puedeConfirmar(): boolean {
    return this.dni.trim().length >= 7 && this.hayFirma;
  }

  confirm() {
    if (!this.puedeConfirmar()) return;
    const firma = this.canvas.nativeElement.toDataURL('image/png');
    this.confirmed.emit({ dni: this.dni.trim(), firma });
  }

  cancel() {
    this.cancelled.emit();
  }
}
