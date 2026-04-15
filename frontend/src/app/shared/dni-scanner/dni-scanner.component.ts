import { Component, EventEmitter, Output, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

export interface DniData {
  dni: string;
  apellido: string;
  nombre: string;
  sexo: string;
  fecha_nacimiento: string; // formato YYYY-MM-DD
  raw: string;
}

/**
 * Componente modal para escanear DNI argentino (codigo PDF417) usando la camara.
 *
 * Uso:
 *   <app-dni-scanner (scanned)="onScan($event)" (cancelled)="close()"></app-dni-scanner>
 *
 * El formato del DNI argentino tiene esta estructura (separado por "@"):
 *   tramite@apellido@nombre@sexo@numero_dni@ejemplar@fecha_nac@fecha_emi@...
 *
 * Ejemplo:
 *   00000000@GONZALEZ@JUAN MARCOS@M@12345678@A@01/01/2000@01/01/2020@000
 */
@Component({
  selector: 'app-dni-scanner',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 flex items-center gap-2">
            <mat-icon class="text-[var(--color-primario)]">qr_code_scanner</mat-icon>
            Escanear DNI
          </h3>
          <button (click)="cancel()" class="text-gray-400 hover:text-gray-700">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="p-5 space-y-3">
          <div class="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video #videoElement class="w-full h-full object-cover" autoplay playsinline></video>
            <!-- Mira -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="border-2 border-green-400 rounded-lg" style="width: 85%; height: 60%;">
                <div class="w-full h-1 bg-green-400 animate-pulse" style="box-shadow: 0 0 8px rgb(74 222 128);"></div>
              </div>
            </div>
            @if (error) {
              <div class="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-sm text-center p-4">
                {{ error }}
              </div>
            }
          </div>

          <p class="text-xs text-center text-gray-500">
            Enfoca el codigo de barras PDF417 del DNI argentino (reverso)
          </p>
        </div>

        <div class="px-5 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          <button mat-stroked-button (click)="cancel()">Cancelar</button>
          @if (cameras.length > 1) {
            <button mat-stroked-button (click)="switchCamera()">
              <mat-icon>flip_camera_ios</mat-icon> Cambiar
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class DniScannerComponent implements AfterViewInit, OnDestroy {
  @Output() scanned = new EventEmitter<DniData>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  private reader: BrowserMultiFormatReader;
  cameras: MediaDeviceInfo[] = [];
  currentCameraIndex = 0;
  error: string | null = null;

  constructor(private cdr: ChangeDetectorRef) {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417, BarcodeFormat.QR_CODE]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    this.reader = new BrowserMultiFormatReader(hints);
  }

  async ngAfterViewInit() {
    try {
      this.cameras = await this.reader.listVideoInputDevices();
      if (!this.cameras.length) {
        this.error = 'No se encontro ninguna camara';
        this.cdr.detectChanges();
        return;
      }
      // Preferir camara trasera
      const back = this.cameras.find(c => /back|rear|trasera/i.test(c.label));
      if (back) this.currentCameraIndex = this.cameras.indexOf(back);
      this.startScanning();
    } catch (err: any) {
      this.error = err?.message || 'Error al acceder a la camara';
      this.cdr.detectChanges();
    }
  }

  private startScanning() {
    const cam = this.cameras[this.currentCameraIndex];
    if (!cam) return;
    this.reader.decodeFromVideoDevice(cam.deviceId, this.videoElement.nativeElement, (result, err) => {
      if (result) {
        const raw = result.getText();
        const parsed = this.parseDni(raw);
        if (parsed) {
          this.scanned.emit(parsed);
          this.ngOnDestroy();
        }
      }
    }).catch(err => {
      this.error = err?.message || 'Error iniciando scanner';
      this.cdr.detectChanges();
    });
  }

  /**
   * Parsea el texto del DNI argentino.
   * Soporta tanto el formato viejo (PDF417) con "@" como el nuevo.
   */
  private parseDni(raw: string): DniData | null {
    if (!raw) return null;

    // Formato nuevo con "@": tramite@apellido@nombre@sexo@numero@ejemplar@fecha_nac@...
    if (raw.includes('@')) {
      const parts = raw.split('@');
      if (parts.length >= 7) {
        const [_tramite, apellido, nombre, sexo, numero, _ejemplar, fechaNac] = parts;
        return {
          dni: (numero || '').trim(),
          apellido: (apellido || '').trim(),
          nombre: (nombre || '').trim(),
          sexo: (sexo || '').trim(),
          fecha_nacimiento: this.normalizeDate(fechaNac),
          raw,
        };
      }
    }

    // Sin @ — intentar extraer al menos numero (fallback)
    const numeroMatch = raw.match(/\d{7,9}/);
    if (numeroMatch) {
      return {
        dni: numeroMatch[0],
        apellido: '',
        nombre: '',
        sexo: '',
        fecha_nacimiento: '',
        raw,
      };
    }

    return null;
  }

  /** Convierte "01/01/2000" a "2000-01-01" */
  private normalizeDate(d: string): string {
    if (!d) return '';
    const parts = d.trim().split('/');
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
    return '';
  }

  switchCamera() {
    this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameras.length;
    this.reader.reset();
    this.startScanning();
  }

  cancel() {
    this.cancelled.emit();
    this.ngOnDestroy();
  }

  ngOnDestroy() {
    try { this.reader.reset(); } catch {}
  }
}
