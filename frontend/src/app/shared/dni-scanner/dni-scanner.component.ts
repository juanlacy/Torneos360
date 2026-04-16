import { Component, EventEmitter, Output, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface DniData {
  dni: string;
  apellido: string;
  nombre: string;
  sexo: string;
  fecha_nacimiento: string; // formato YYYY-MM-DD
  raw: string;
}

/**
 * Componente modal para escanear el codigo PDF417 del DNI argentino.
 *
 * Estrategia de decodificacion:
 *  1. Si el browser soporta BarcodeDetector nativo (Chrome 83+, Edge, Safari 17.4+):
 *     usa el motor nativo del OS que lee PDF417 mucho mejor que cualquier lib JS.
 *  2. Si no, cae a @zxing/library como fallback.
 *
 * La camara se pide en alta resolucion (1920x1080) con autofocus continuo,
 * ambos criticos para que PDF417 se decodifique correctamente.
 *
 * Formato del DNI argentino (separado por "@"):
 *   tramite@apellido@nombre@sexo@numero_dni@ejemplar@fecha_nac@fecha_emi@...
 */
@Component({
  selector: 'app-dni-scanner',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 flex items-center gap-2">
            <mat-icon class="text-[var(--color-primario)]">qr_code_scanner</mat-icon>
            Escanear DNI
          </h3>
          <button (click)="cancel()" class="text-gray-400 hover:text-gray-700">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="p-4 space-y-3">
          <div class="relative bg-black rounded-lg overflow-hidden" style="aspect-ratio: 4/3;">
            <video #videoElement class="w-full h-full object-cover" autoplay playsinline muted></video>
            <!-- Canvas oculto para captura de frames -->
            <canvas #canvasElement class="hidden"></canvas>
            <!-- Mira de escaneo -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="border-2 rounded-lg transition-colors duration-300"
                [class]="scanning ? 'border-green-400' : 'border-yellow-400'"
                style="width: 90%; height: 50%;">
                <div class="w-full h-0.5 animate-pulse transition-colors duration-300"
                  [class]="scanning ? 'bg-green-400' : 'bg-yellow-400'"
                  [style.box-shadow]="scanning ? '0 0 8px rgb(74 222 128)' : '0 0 8px rgb(250 204 21)'"></div>
              </div>
            </div>
            @if (error) {
              <div class="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-sm text-center p-4">
                <div>
                  <mat-icon class="!text-3xl text-red-400 mb-2">error_outline</mat-icon>
                  <p>{{ error }}</p>
                </div>
              </div>
            }
          </div>

          <div class="flex items-center justify-between">
            <p class="text-xs text-gray-500">
              @if (useNative) {
                Motor nativo (alta precision)
              } @else {
                Motor @zxing (compatibilidad)
              }
            </p>
            <p class="text-xs font-medium" [class]="scanning ? 'text-green-600' : 'text-yellow-600'">
              @if (scanning) {
                <span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse"></span>
                Escaneando...
              } @else {
                Iniciando camara...
              }
            </p>
          </div>

          <p class="text-xs text-center text-gray-400">
            Apunta al codigo de barras del <strong>reverso</strong> del DNI. Mantene el celular firme y a ~15cm.
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
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  cameras: MediaDeviceInfo[] = [];
  currentCameraIndex = 0;
  error: string | null = null;
  scanning = false;
  useNative = false;

  private stream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private nativeDetector: any = null;
  private zxingReader: any = null;
  private destroyed = false;

  constructor(private cdr: ChangeDetectorRef) {}

  async ngAfterViewInit() {
    try {
      // Detectar si BarcodeDetector nativo esta disponible con PDF417
      if ('BarcodeDetector' in window) {
        try {
          const formats = await (window as any).BarcodeDetector.getSupportedFormats();
          if (formats.includes('pdf417')) {
            this.nativeDetector = new (window as any).BarcodeDetector({ formats: ['pdf417'] });
            this.useNative = true;
          }
        } catch {}
      }

      if (!this.useNative) {
        // Fallback: cargar @zxing/library dinamicamente
        const zxing = await import('@zxing/library');
        const hints = new Map();
        hints.set(zxing.DecodeHintType.POSSIBLE_FORMATS, [zxing.BarcodeFormat.PDF_417, zxing.BarcodeFormat.QR_CODE]);
        hints.set(zxing.DecodeHintType.TRY_HARDER, true);
        this.zxingReader = new zxing.BrowserMultiFormatReader(hints);
      }

      // Listar camaras
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.cameras = devices.filter(d => d.kind === 'videoinput');

      if (!this.cameras.length) {
        this.error = 'No se encontro ninguna camara';
        this.cdr.detectChanges();
        return;
      }

      // Preferir camara trasera
      const backIdx = this.cameras.findIndex(c => /back|rear|trasera|environment/i.test(c.label));
      if (backIdx >= 0) this.currentCameraIndex = backIdx;

      await this.startCamera();
    } catch (err: any) {
      this.error = err?.message || 'Error al acceder a la camara';
      this.cdr.detectChanges();
    }
  }

  /** Inicia la camara con alta resolucion y autofocus */
  private async startCamera() {
    this.stopCamera();

    const cam = this.cameras[this.currentCameraIndex];
    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: cam?.deviceId ? { exact: cam.deviceId } : undefined,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: { ideal: 'environment' },
        // @ts-ignore — focusMode no está en los types pero funciona
        focusMode: { ideal: 'continuous' },
      },
      audio: false,
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      const video = this.videoElement.nativeElement;
      video.srcObject = this.stream;
      await video.play();

      // Intentar activar autofocus continuo via track capabilities
      const track = this.stream.getVideoTracks()[0];
      const caps: any = track.getCapabilities?.();
      if (caps?.focusMode?.includes('continuous')) {
        await (track as any).applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
      }

      this.scanning = true;
      this.cdr.detectChanges();

      // Iniciar escaneo segun el motor disponible
      if (this.useNative) {
        this.scanWithNative();
      } else {
        this.scanWithZxing();
      }
    } catch (err: any) {
      this.error = `Error de camara: ${err.message}. Verifica los permisos.`;
      this.cdr.detectChanges();
    }
  }

  /** Escaneo continuo con BarcodeDetector nativo (mejor para PDF417) */
  private scanWithNative() {
    if (this.destroyed || !this.nativeDetector) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const ctx = canvas.getContext('2d')!;

    const scan = async () => {
      if (this.destroyed || !this.scanning) return;

      if (video.readyState >= video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        try {
          const barcodes = await this.nativeDetector.detect(canvas);
          if (barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            const parsed = this.parseDni(raw);
            if (parsed) {
              this.scanning = false;
              this.scanned.emit(parsed);
              this.cleanup();
              return;
            }
          }
        } catch {}
      }

      this.animFrameId = requestAnimationFrame(scan);
    };

    this.animFrameId = requestAnimationFrame(scan);
  }

  /** Escaneo con @zxing/library como fallback */
  private scanWithZxing() {
    if (this.destroyed || !this.zxingReader) return;

    const cam = this.cameras[this.currentCameraIndex];
    if (!cam) return;

    this.zxingReader.decodeFromVideoDevice(
      cam.deviceId,
      this.videoElement.nativeElement,
      (result: any, err: any) => {
        if (result) {
          const raw = result.getText();
          const parsed = this.parseDni(raw);
          if (parsed) {
            this.scanning = false;
            this.scanned.emit(parsed);
            this.cleanup();
          }
        }
      },
    ).catch((err: any) => {
      this.error = err?.message || 'Error iniciando scanner';
      this.cdr.detectChanges();
    });
  }

  /** Parsea el texto del DNI argentino */
  private parseDni(raw: string): DniData | null {
    if (!raw) return null;

    // Formato con "@": tramite@apellido@nombre@sexo@numero@ejemplar@fecha_nac@...
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
    this.startCamera();
  }

  cancel() {
    this.cancelled.emit();
    this.cleanup();
  }

  private stopCamera() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }

  private cleanup() {
    this.destroyed = true;
    this.scanning = false;
    this.stopCamera();
    try { this.zxingReader?.reset(); } catch {}
  }

  ngOnDestroy() {
    this.cleanup();
  }
}
