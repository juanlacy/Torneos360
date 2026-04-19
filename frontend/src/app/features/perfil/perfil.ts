import { Component, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

interface RolAsignado {
  rol: string;
  club_nombre?: string;
  torneo_nombre?: string;
}

interface PerfilData {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  oauth_provider?: string;
  ultimo_acceso?: string;
  avatar_url?: string;
  persona?: {
    id: number;
    dni?: string;
    telefono?: string;
    roles_asignados?: RolAsignado[];
  };
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="max-w-3xl mx-auto space-y-6">
      <h1 class="text-2xl font-bold text-gray-800">Mi Perfil</h1>

      @if (loading) {
        <div class="flex justify-center py-16">
          <mat-spinner [diameter]="40"></mat-spinner>
        </div>
      } @else if (perfil) {

        <!-- Header card -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <div class="flex items-center gap-5">
            <!-- Avatar -->
            <div class="relative group">
              @if (perfil.avatar_url) {
                <img [src]="perfil.avatar_url" class="w-20 h-20 rounded-full object-cover border-2 border-gray-200" alt="Avatar">
              } @else {
                <div class="w-20 h-20 rounded-full bg-purple-700 flex items-center justify-center text-white text-2xl font-bold border-2 border-gray-200">
                  {{ perfil.nombre?.charAt(0) }}{{ perfil.apellido?.charAt(0) }}
                </div>
              }
              <button (click)="avatarInput.click()"
                class="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                <mat-icon class="!text-white">photo_camera</mat-icon>
              </button>
              <input #avatarInput type="file" accept="image/*" class="hidden" (change)="onAvatarChange($event)">
            </div>

            <div class="flex-1 min-w-0">
              <h2 class="text-xl font-semibold text-gray-800">{{ perfil.nombre }} {{ perfil.apellido }}</h2>
              <p class="text-sm text-gray-500">{{ perfil.email }}</p>
              @if (perfil.persona?.dni) {
                <p class="text-sm text-gray-400 mt-0.5">DNI: {{ perfil.persona?.dni }}</p>
              }
              @if (uploadingAvatar) {
                <p class="text-xs text-purple-600 mt-1">Subiendo foto...</p>
              }
            </div>
          </div>
        </div>

        <!-- Datos personales -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Datos personales</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
              <input type="text" [(ngModel)]="form.nombre"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Apellido</label>
              <input type="text" [(ngModel)]="form.apellido"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input type="email" [(ngModel)]="form.email"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Telefono</label>
              <input type="text" [value]="perfil.persona?.telefono || '—'" readonly
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed">
            </div>
          </div>
          <div class="mt-5">
            <button (click)="guardarCambios()" [disabled]="saving"
              class="inline-flex items-center gap-2 px-5 py-2 bg-purple-700 text-white text-sm font-medium rounded-lg hover:bg-purple-800 disabled:opacity-50 transition-colors">
              @if (saving) {
                <mat-spinner [diameter]="16"></mat-spinner>
              }
              Guardar cambios
            </button>
          </div>
        </div>

        <!-- Roles -->
        @if (perfil.persona?.roles_asignados?.length) {
          <div class="bg-white rounded-xl border border-gray-200 p-6">
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Mis roles</h3>
            <div class="space-y-2">
              @for (r of perfil.persona!.roles_asignados!; track r.rol + (r.club_nombre || '')) {
                <div class="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
                  <mat-icon class="!text-purple-600">{{ rolIcon(r.rol) }}</mat-icon>
                  <div class="flex-1 min-w-0">
                    <span class="text-sm font-medium text-gray-800 capitalize">{{ r.rol.replace('_', ' ') }}</span>
                  </div>
                  @if (r.club_nombre) {
                    <span class="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">{{ r.club_nombre }}</span>
                  }
                  @if (r.torneo_nombre) {
                    <span class="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium">{{ r.torneo_nombre }}</span>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- Seguridad -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Seguridad</h3>
          <div class="space-y-3 text-sm">
            <div class="flex items-center gap-2">
              <span class="text-gray-500 w-32">Proveedor:</span>
              <span class="text-gray-800 font-medium capitalize">{{ perfil.oauth_provider || 'local' }}</span>
            </div>
            @if (perfil.ultimo_acceso) {
              <div class="flex items-center gap-2">
                <span class="text-gray-500 w-32">Ultimo acceso:</span>
                <span class="text-gray-800">{{ formatFecha(perfil.ultimo_acceso) }}</span>
              </div>
            }
          </div>
          <div class="flex flex-wrap gap-3 mt-5">
            @if (!perfil.oauth_provider || perfil.oauth_provider === 'local') {
              <button (click)="mostrarCambioPassword = !mostrarCambioPassword"
                class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                <mat-icon class="!text-lg">lock</mat-icon>
                Cambiar contrasena
              </button>
            }
            <button (click)="cerrarSesion()"
              class="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 transition-colors">
              <mat-icon class="!text-lg">logout</mat-icon>
              Cerrar sesion
            </button>
          </div>

          <!-- Cambiar password inline -->
          @if (mostrarCambioPassword) {
            <div class="mt-5 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Contrasena actual</label>
                <input type="password" [(ngModel)]="passwordForm.actual"
                  class="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Nueva contrasena</label>
                <input type="password" [(ngModel)]="passwordForm.nueva"
                  class="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none">
              </div>
              <button (click)="cambiarPassword()" [disabled]="savingPassword"
                class="inline-flex items-center gap-2 px-4 py-2 bg-purple-700 text-white text-sm font-medium rounded-lg hover:bg-purple-800 disabled:opacity-50 transition-colors">
                @if (savingPassword) {
                  <mat-spinner [diameter]="16"></mat-spinner>
                }
                Actualizar contrasena
              </button>
            </div>
          }
        </div>

      }

      <!-- Toast -->
      @if (toast) {
        <div class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all"
          [class.bg-green-600]="toast.type === 'success'"
          [class.bg-red-600]="toast.type === 'error'">
          {{ toast.message }}
        </div>
      }
    </div>
  `,
})
export class PerfilComponent {
  private apiUrl = environment.apiUrl;

  perfil: PerfilData | null = null;
  loading = true;
  saving = false;
  savingPassword = false;
  uploadingAvatar = false;
  mostrarCambioPassword = false;

  form = { nombre: '', apellido: '', email: '' };
  passwordForm = { actual: '', nueva: '' };
  toast: { message: string; type: 'success' | 'error' } | null = null;

  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;

  constructor(
    public auth: AuthService,
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarPerfil();
  }

  cargarPerfil(): void {
    this.loading = true;
    this.http.get<{ success: boolean; data: PerfilData }>(`${this.apiUrl}/auth/me`).subscribe({
      next: (res) => {
        if (res.success) {
          this.perfil = res.data;
          this.form = {
            nombre: this.perfil.nombre || '',
            apellido: this.perfil.apellido || '',
            email: this.perfil.email || '',
          };
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.showToast('Error al cargar perfil', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  guardarCambios(): void {
    this.saving = true;
    this.http.put<{ success: boolean; data: any; message?: string }>(`${this.apiUrl}/auth/perfil`, {
      nombre: this.form.nombre,
      apellido: this.form.apellido,
      email: this.form.email,
    }).subscribe({
      next: (res) => {
        this.saving = false;
        if (res.success) {
          // Actualizar datos locales en AuthService
          const current = this.auth.getUser();
          if (current) {
            this.auth.setUser({ ...current, nombre: this.form.nombre, apellido: this.form.apellido, email: this.form.email });
          }
          if (this.perfil) {
            this.perfil.nombre = this.form.nombre;
            this.perfil.apellido = this.form.apellido;
            this.perfil.email = this.form.email;
          }
          this.showToast('Perfil actualizado correctamente', 'success');
        } else {
          this.showToast(res.message || 'Error al actualizar', 'error');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        this.showToast(err.error?.message || 'Error al guardar cambios', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingAvatar = true;
    this.auth.uploadAvatar(file).subscribe({
      next: (res: any) => {
        this.uploadingAvatar = false;
        if (res.success && res.data?.avatar_url) {
          if (this.perfil) this.perfil.avatar_url = res.data.avatar_url;
          this.showToast('Foto actualizada', 'success');
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.uploadingAvatar = false;
        this.showToast('Error al subir la foto', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  cambiarPassword(): void {
    if (!this.passwordForm.actual || !this.passwordForm.nueva) {
      this.showToast('Completa ambos campos', 'error');
      return;
    }
    this.savingPassword = true;
    this.auth.cambiarPassword(this.passwordForm.actual, this.passwordForm.nueva).subscribe({
      next: (res: any) => {
        this.savingPassword = false;
        if (res.success) {
          this.showToast('Contrasena actualizada', 'success');
          this.passwordForm = { actual: '', nueva: '' };
          this.mostrarCambioPassword = false;
        } else {
          this.showToast(res.message || 'Error al cambiar contrasena', 'error');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingPassword = false;
        this.showToast(err.error?.message || 'Error al cambiar contrasena', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  cerrarSesion(): void {
    this.auth.logout();
  }

  rolIcon(rol: string): string {
    const map: Record<string, string> = {
      admin_sistema: 'admin_panel_settings',
      admin_torneo: 'emoji_events',
      delegado: 'emoji_events',
      arbitro: 'sports',
      veedor: 'visibility',
      entrenador: 'sports_soccer',
      publico: 'person',
    };
    return map[rol] || 'person';
  }

  formatFecha(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
        d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast = { message, type };
    setTimeout(() => {
      this.toast = null;
      this.cdr.detectChanges();
    }, 3500);
  }
}
