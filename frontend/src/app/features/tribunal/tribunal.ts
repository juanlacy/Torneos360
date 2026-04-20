import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { BrandingService } from '../../core/services/branding.service';

type Tab = 'pendientes' | 'historial' | 'reglamento';

@Component({
  selector: 'app-tribunal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="space-y-4 animate-fade-in">
      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <mat-icon class="!text-3xl text-red-700">gavel</mat-icon>
            Tribunal de Disciplina
          </h1>
          <p class="text-sm text-gray-500 mt-0.5">Revisa tarjetas, aplica sanciones y resuelve apelaciones</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="flex border-b border-gray-100">
          @for (t of tabs; track t.id) {
            <button (click)="setTab(t.id)"
              class="px-5 py-3 text-sm font-medium transition-all border-b-2 flex items-center gap-2"
              [class.border-transparent]="tab !== t.id"
              [class.text-gray-500]="tab !== t.id"
              [style.border-color]="tab === t.id ? (branding.branding$ | async)?.color_primario : 'transparent'"
              [style.color]="tab === t.id ? (branding.branding$ | async)?.color_primario : ''">
              <mat-icon class="!text-base !w-5 !h-5">{{ t.icon }}</mat-icon>
              {{ t.label }}
              @if (t.id === 'pendientes' && pendientesTotal > 0) {
                <span class="ml-1 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {{ pendientesTotal }}
                </span>
              }
            </button>
          }
        </div>

        <!-- ═══ TAB: PENDIENTES ═══ -->
        @if (tab === 'pendientes') {
          @if (loading) {
            <div class="py-16 flex justify-center"><mat-spinner [diameter]="36"></mat-spinner></div>
          } @else {
            <div class="p-4 space-y-4">
              <!-- Acumulaciones -->
              <div>
                <h3 class="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <mat-icon class="!text-lg text-amber-500">square</mat-icon>
                  Acumulacion de amarillas ({{ pendientes.acumulaciones.length }})
                </h3>
                @if (!pendientes.acumulaciones.length) {
                  <p class="text-xs text-gray-400 italic py-2 px-2">Sin jugadores con amarillas acumuladas</p>
                } @else {
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    @for (a of pendientes.acumulaciones; track a.persona_id) {
                      <div class="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
                        @if (a.foto_url) {
                          <img [src]="resolveUrl(a.foto_url)" class="w-10 h-10 rounded-full object-cover shrink-0" alt="">
                        } @else {
                          <div class="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold shrink-0">
                            {{ (a.nombre || '?').charAt(0) }}{{ (a.apellido || '').charAt(0) }}
                          </div>
                        }
                        <div class="flex-1 min-w-0">
                          <p class="font-semibold text-gray-900 text-sm truncate">{{ a.apellido }}, {{ a.nombre }}</p>
                          <p class="text-xs text-gray-600 truncate">{{ a.club?.nombre || 'Sin club' }} @if (a.categoria) { · {{ a.categoria }} }</p>
                          <p class="text-[11px] text-amber-700 mt-0.5 font-medium">
                            {{ a.amarillas_total }} amarillas · sugerido {{ a.fechas_sugeridas }} fecha{{ a.fechas_sugeridas === 1 ? '' : 's' }}
                          </p>
                        </div>
                        <div class="flex flex-col gap-1 shrink-0">
                          <button (click)="abrirModalAplicar('acumulacion_amarillas', a, a.fechas_sugeridas)"
                            class="px-2.5 py-1 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700">
                            Aplicar
                          </button>
                          <button (click)="abrirHistorial(a.persona_id)"
                            class="px-2.5 py-1 rounded border border-gray-300 text-xs text-gray-600 hover:bg-gray-50">
                            Historial
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Rojas sin sancion -->
              <div>
                <h3 class="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <mat-icon class="!text-lg text-red-600">square</mat-icon>
                  Rojas sin sancion ({{ pendientes.rojas_sin_sancion.length }})
                </h3>
                @if (!pendientes.rojas_sin_sancion.length) {
                  <p class="text-xs text-gray-400 italic py-2 px-2">Sin rojas pendientes de revision</p>
                } @else {
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    @for (r of pendientes.rojas_sin_sancion; track r.persona_id + '-' + r.partido_id) {
                      <div class="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50">
                        @if (r.foto_url) {
                          <img [src]="resolveUrl(r.foto_url)" class="w-10 h-10 rounded-full object-cover shrink-0" alt="">
                        } @else {
                          <div class="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold shrink-0">
                            {{ (r.nombre || '?').charAt(0) }}{{ (r.apellido || '').charAt(0) }}
                          </div>
                        }
                        <div class="flex-1 min-w-0">
                          <p class="font-semibold text-gray-900 text-sm truncate">{{ r.apellido }}, {{ r.nombre }}</p>
                          <p class="text-xs text-gray-600 truncate">{{ r.categoria }} · {{ r.match }}</p>
                          <p class="text-[11px] text-red-700 mt-0.5 font-medium">
                            {{ r.es_doble_amarilla ? 'Doble amarilla' : 'Roja directa' }} · sugerido {{ r.fechas_sugeridas }} fecha{{ r.fechas_sugeridas === 1 ? '' : 's' }}
                          </p>
                          @if (r.detalle) {
                            <p class="text-[10px] text-gray-500 italic mt-0.5 truncate">{{ r.detalle }}</p>
                          }
                        </div>
                        <div class="flex flex-col gap-1 shrink-0">
                          <button (click)="abrirModalAplicar(r.es_doble_amarilla ? 'doble_amarilla' : 'roja_directa', r, r.fechas_sugeridas, r.partido_id)"
                            class="px-2.5 py-1 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700">
                            Aplicar
                          </button>
                          <button (click)="abrirHistorial(r.persona_id)"
                            class="px-2.5 py-1 rounded border border-gray-300 text-xs text-gray-600 hover:bg-gray-50">
                            Historial
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Sanciones propuestas (pre-existentes) -->
              @if (pendientes.sanciones_propuestas.length) {
                <div>
                  <h3 class="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <mat-icon class="!text-lg text-blue-500">pending_actions</mat-icon>
                    Propuestas pendientes de aplicar ({{ pendientes.sanciones_propuestas.length }})
                  </h3>
                  <div class="space-y-2">
                    @for (s of pendientes.sanciones_propuestas; track s.id) {
                      <div class="flex items-center gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50">
                        <mat-icon class="text-blue-500">pending_actions</mat-icon>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-semibold text-gray-900">{{ s.persona?.apellido }}, {{ s.persona?.nombre }}</p>
                          <p class="text-xs text-gray-600">{{ s.motivo }} · {{ s.fechas_suspension }} fechas</p>
                        </div>
                        <button (click)="aplicarPropuesta(s)" class="px-2.5 py-1 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700">Aplicar</button>
                      </div>
                    }
                  </div>
                </div>
              }

              @if (!pendientes.acumulaciones.length && !pendientes.rojas_sin_sancion.length && !pendientes.sanciones_propuestas.length) {
                <div class="py-12 text-center">
                  <mat-icon class="!text-5xl text-green-500 mb-2">check_circle</mat-icon>
                  <p class="text-sm text-gray-500">No hay casos pendientes de revisar</p>
                </div>
              }
            </div>
          }
        }

        <!-- ═══ TAB: HISTORIAL ═══ -->
        @if (tab === 'historial') {
          <div class="p-4">
            <div class="mb-3 flex gap-2 overflow-x-auto">
              <button (click)="setFiltroEstado('')"
                class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                [class]="filtroEstado === '' ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
                Todas
              </button>
              @for (e of estadosDisp; track e) {
                <button (click)="setFiltroEstado(e)"
                  class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all"
                  [class]="filtroEstado === e ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
                  {{ e }}
                </button>
              }
            </div>

            @if (loading) {
              <div class="py-12 flex justify-center"><mat-spinner [diameter]="32"></mat-spinner></div>
            } @else if (!sanciones.length) {
              <div class="py-12 text-center text-gray-400">
                <mat-icon class="!text-5xl mb-2">assignment_late</mat-icon>
                <p class="text-sm">Sin sanciones en este torneo</p>
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th class="px-3 py-2.5 text-left">Persona</th>
                      <th class="px-3 py-2.5 text-left">Motivo</th>
                      <th class="px-3 py-2.5 text-center">Fechas</th>
                      <th class="px-3 py-2.5 text-center">Estado</th>
                      <th class="px-3 py-2.5 text-left">Detalle</th>
                      <th class="px-3 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (s of sanciones; track s.id) {
                      <tr class="border-t border-gray-100 hover:bg-gray-50">
                        <td class="px-3 py-2.5">
                          <p class="font-semibold text-sm">{{ s.persona?.apellido }}, {{ s.persona?.nombre }}</p>
                          @if (s.persona?.dni) { <p class="text-[10px] text-gray-400">DNI {{ s.persona.dni }}</p> }
                        </td>
                        <td class="px-3 py-2.5 text-xs text-gray-700 capitalize">{{ s.motivo?.replaceAll('_', ' ') }}</td>
                        <td class="px-3 py-2.5 text-center font-bold">{{ s.fechas_suspension }}</td>
                        <td class="px-3 py-2.5 text-center">
                          <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
                            [class]="estadoClass(s.estado)">{{ s.estado }}</span>
                        </td>
                        <td class="px-3 py-2.5 text-xs text-gray-600 max-w-[240px] truncate">{{ s.detalle }}</td>
                        <td class="px-3 py-2.5 whitespace-nowrap">
                          <div class="flex items-center gap-2">
                            <button (click)="abrirHistorial(s.persona_id)"
                              class="text-[11px] text-[var(--color-primario)] hover:underline">Antecedentes</button>
                            @if (s.estado === 'aplicada' && reglamento.permite_apelacion && puedeApelar(s)) {
                              <button (click)="abrirApelar(s)" class="text-[11px] text-amber-600 hover:underline">Apelar</button>
                            }
                            @if (s.estado === 'apelada' && puedeResolver()) {
                              <button (click)="abrirResolver(s)" class="text-[11px] text-green-700 hover:underline font-semibold">Resolver</button>
                            }
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        <!-- ═══ TAB: REGLAMENTO ═══ -->
        @if (tab === 'reglamento') {
          <div class="p-5 max-w-2xl">
            @if (!puedeEditarReglamento()) {
              <div class="mb-3 p-3 rounded-lg bg-gray-50 text-xs text-gray-600">
                <mat-icon class="!text-base align-middle mr-1">lock</mat-icon>
                Solo admin del torneo puede editar el reglamento.
              </div>
            }
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Amarillas para suspension</label>
                <input type="number" min="1" [(ngModel)]="reglamento.amarillas_para_suspension" [disabled]="!puedeEditarReglamento()"
                  class="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-[var(--color-primario)]">
                <p class="text-[11px] text-gray-500 mt-0.5">Cuando un jugador alcanza este numero, se genera una sancion automatica.</p>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Fechas de suspension por acumulacion</label>
                <input type="number" min="0" [(ngModel)]="reglamento.fechas_por_acumulacion_amarillas" [disabled]="!puedeEditarReglamento()"
                  class="w-24 px-2 py-1 border border-gray-300 rounded text-sm">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Fechas de suspension por roja directa</label>
                <input type="number" min="0" [(ngModel)]="reglamento.fechas_por_roja" [disabled]="!puedeEditarReglamento()"
                  class="w-24 px-2 py-1 border border-gray-300 rounded text-sm">
              </div>
              <div class="flex items-center gap-2">
                <input type="checkbox" id="ap" [(ngModel)]="reglamento.permite_apelacion" [disabled]="!puedeEditarReglamento()" class="w-4 h-4">
                <label for="ap" class="text-xs text-gray-700">Permite apelacion</label>
              </div>
              <div class="flex items-center gap-2">
                <input type="checkbox" id="pub" [(ngModel)]="reglamento.publicar_sanciones" [disabled]="!puedeEditarReglamento()" class="w-4 h-4">
                <label for="pub" class="text-xs text-gray-700">Publicar sanciones en la vista publica del torneo</label>
              </div>
              @if (puedeEditarReglamento()) {
                <button (click)="guardarReglamento()" [disabled]="guardandoReglamento"
                  class="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm disabled:opacity-50"
                  [style.background-color]="(branding.branding$ | async)?.color_primario || '#762c7e'">
                  @if (guardandoReglamento) {
                    <mat-icon class="animate-spin !text-base !w-4 !h-4 align-middle mr-1">autorenew</mat-icon>
                  }
                  Guardar reglamento
                </button>
              }
            </div>
          </div>
        }
      </div>

      <!-- ═══ MODAL: aplicar sancion ═══ -->
      @if (modalAplicar) {
        <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" (click)="modalAplicar = null">
          <div class="bg-white rounded-xl shadow-xl w-full max-w-md" (click)="$event.stopPropagation()">
            <div class="px-5 py-4 border-b border-gray-100">
              <h3 class="text-base font-bold text-gray-900">Aplicar sancion</h3>
              <p class="text-xs text-gray-500 mt-0.5">{{ modalAplicar.contexto.apellido }}, {{ modalAplicar.contexto.nombre }} · {{ modalAplicar.motivo.replaceAll('_', ' ') }}</p>
            </div>
            <div class="p-5 space-y-3">
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Fechas de suspension</label>
                <input type="number" min="0" [(ngModel)]="modalAplicar.fechas"
                  class="w-24 px-2 py-1 border border-gray-300 rounded text-sm">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Multa (opcional)</label>
                <input type="number" min="0" [(ngModel)]="modalAplicar.multa"
                  class="w-32 px-2 py-1 border border-gray-300 rounded text-sm" placeholder="—">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Detalle / observaciones</label>
                <textarea [(ngModel)]="modalAplicar.detalle" rows="3"
                  class="w-full px-2 py-1 border border-gray-300 rounded text-sm"></textarea>
              </div>
            </div>
            <div class="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
              <button (click)="modalAplicar = null" class="px-3 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button (click)="confirmarAplicar()" [disabled]="aplicandoSancion"
                class="px-4 py-1.5 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                @if (aplicandoSancion) {
                  <mat-icon class="animate-spin !text-base !w-4 !h-4 align-middle">autorenew</mat-icon>
                }
                Aplicar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ═══ MODAL: apelacion ═══ -->
      @if (modalApelar) {
        <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" (click)="modalApelar = null">
          <div class="bg-white rounded-xl shadow-xl w-full max-w-md" (click)="$event.stopPropagation()">
            <div class="px-5 py-4 border-b border-gray-100">
              <h3 class="text-base font-bold text-gray-900">Registrar apelacion</h3>
              <p class="text-xs text-gray-500 mt-0.5">{{ modalApelar.persona?.apellido }}, {{ modalApelar.persona?.nombre }}</p>
            </div>
            <div class="p-5">
              <label class="block text-xs font-semibold text-gray-700 mb-1">Texto de la apelacion</label>
              <textarea [(ngModel)]="modalApelar._apelacionTexto" rows="5" placeholder="Argumentos del club/persona..."
                class="w-full px-2 py-1 border border-gray-300 rounded text-sm"></textarea>
            </div>
            <div class="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
              <button (click)="modalApelar = null" class="px-3 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button (click)="confirmarApelar()" [disabled]="!modalApelar._apelacionTexto?.trim()"
                class="px-4 py-1.5 rounded bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                Registrar apelacion
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ═══ MODAL: resolver apelacion ═══ -->
      @if (modalResolver) {
        <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" (click)="modalResolver = null">
          <div class="bg-white rounded-xl shadow-xl w-full max-w-md" (click)="$event.stopPropagation()">
            <div class="px-5 py-4 border-b border-gray-100">
              <h3 class="text-base font-bold text-gray-900">Resolver apelacion</h3>
              <p class="text-xs text-gray-500 mt-0.5">{{ modalResolver.persona?.apellido }}, {{ modalResolver.persona?.nombre }}</p>
            </div>
            <div class="p-5 space-y-4">
              @if (modalResolver.apelacion_texto) {
                <div class="p-3 rounded bg-amber-50 border border-amber-200">
                  <p class="text-[10px] uppercase font-semibold text-amber-700 mb-1">Argumento de la apelacion</p>
                  <p class="text-xs text-gray-700 whitespace-pre-wrap">{{ modalResolver.apelacion_texto }}</p>
                </div>
              }
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-2">Resolucion</label>
                <div class="flex gap-2">
                  <button (click)="modalResolver._resolucion = 'confirmada'"
                    class="flex-1 px-3 py-2 rounded text-sm font-medium border transition-all"
                    [class]="modalResolver._resolucion === 'confirmada' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'">
                    Confirmar
                  </button>
                  <button (click)="modalResolver._resolucion = 'reducida'"
                    class="flex-1 px-3 py-2 rounded text-sm font-medium border transition-all"
                    [class]="modalResolver._resolucion === 'reducida' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'">
                    Reducir
                  </button>
                  <button (click)="modalResolver._resolucion = 'revocada'"
                    class="flex-1 px-3 py-2 rounded text-sm font-medium border transition-all"
                    [class]="modalResolver._resolucion === 'revocada' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'">
                    Revocar
                  </button>
                </div>
              </div>
              @if (modalResolver._resolucion === 'reducida') {
                <div>
                  <label class="block text-xs font-semibold text-gray-700 mb-1">Nuevas fechas de suspension</label>
                  <input type="number" min="0" [(ngModel)]="modalResolver._fechasNuevas"
                    class="w-24 px-2 py-1 border border-gray-300 rounded text-sm">
                </div>
              }
            </div>
            <div class="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
              <button (click)="modalResolver = null" class="px-3 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button (click)="confirmarResolver()" [disabled]="!modalResolver._resolucion"
                class="px-4 py-1.5 rounded bg-[var(--color-primario)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                Resolver
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ═══ MODAL: historial de persona ═══ -->
      @if (modalHistorial) {
        <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" (click)="modalHistorial = null">
          <div class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" (click)="$event.stopPropagation()">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 class="text-base font-bold text-gray-900">Antecedentes</h3>
                <p class="text-xs text-gray-500 mt-0.5">{{ modalHistorial.persona?.apellido }}, {{ modalHistorial.persona?.nombre }}</p>
              </div>
              <button (click)="modalHistorial = null" class="text-gray-400 hover:text-gray-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="p-5 overflow-y-auto space-y-4">
              <!-- Stats -->
              <div class="grid grid-cols-2 gap-3">
                <div class="p-3 rounded-lg bg-amber-50 text-center">
                  <p class="text-2xl font-bold text-amber-700">{{ modalHistorial.stats?.amarillas || 0 }}</p>
                  <p class="text-[10px] text-amber-600 uppercase font-semibold">Amarillas en el torneo</p>
                </div>
                <div class="p-3 rounded-lg bg-red-50 text-center">
                  <p class="text-2xl font-bold text-red-700">{{ modalHistorial.stats?.rojas || 0 }}</p>
                  <p class="text-[10px] text-red-600 uppercase font-semibold">Rojas en el torneo</p>
                </div>
              </div>

              <!-- Sanciones en este torneo -->
              <div>
                <h4 class="text-xs font-bold text-gray-700 uppercase mb-2">Sanciones en este torneo</h4>
                @if (!modalHistorial.sanciones?.length) {
                  <p class="text-xs text-gray-400 italic">Sin sanciones en este torneo</p>
                } @else {
                  <ul class="space-y-1.5">
                    @for (s of modalHistorial.sanciones; track s.id) {
                      <li class="text-xs p-2 rounded bg-gray-50 flex items-center justify-between gap-2">
                        <span class="flex-1 truncate">
                          <span class="font-medium capitalize">{{ s.motivo?.replaceAll('_', ' ') }}</span>
                          · {{ s.fechas_suspension }}f
                          @if (s.detalle) { · <span class="text-gray-500">{{ s.detalle }}</span> }
                        </span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded-full capitalize" [class]="estadoClass(s.estado)">{{ s.estado }}</span>
                      </li>
                    }
                  </ul>
                }
              </div>

              <!-- Antecedentes en otros torneos -->
              @if (modalHistorial.antecedentes?.length) {
                <div>
                  <h4 class="text-xs font-bold text-gray-700 uppercase mb-2">Antecedentes en otros torneos</h4>
                  <ul class="space-y-1.5">
                    @for (s of modalHistorial.antecedentes; track s.id) {
                      <li class="text-xs p-2 rounded bg-gray-50">
                        <p class="font-medium">{{ s.torneo?.nombre }} ({{ s.torneo?.anio }})</p>
                        <p class="text-gray-500 capitalize">{{ s.motivo?.replaceAll('_', ' ') }} · {{ s.fechas_suspension }}f · {{ s.estado }}</p>
                      </li>
                    }
                  </ul>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class TribunalComponent implements OnInit, OnDestroy {
  tab: Tab = 'pendientes';
  tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'pendientes', label: 'Pendientes',  icon: 'pending_actions' },
    { id: 'historial',  label: 'Historial',   icon: 'history' },
    { id: 'reglamento', label: 'Reglamento',  icon: 'rule' },
  ];

  torneoId: number | null = null;
  loading = false;

  pendientes: { sanciones_propuestas: any[]; acumulaciones: any[]; rojas_sin_sancion: any[] } = {
    sanciones_propuestas: [], acumulaciones: [], rojas_sin_sancion: [],
  };

  sanciones: any[] = [];
  estadosDisp = ['propuesta', 'aplicada', 'cumplida', 'apelada', 'revocada'];
  filtroEstado = '';

  reglamento: any = {
    amarillas_para_suspension: 5,
    fechas_por_acumulacion_amarillas: 1,
    fechas_por_roja: 2,
    permite_apelacion: true,
    publicar_sanciones: true,
  };
  guardandoReglamento = false;

  modalAplicar: any = null;
  aplicandoSancion = false;
  modalHistorial: any = null;
  modalApelar: any = null;
  modalResolver: any = null;

  private torneoSub?: Subscription;

  constructor(
    private http: HttpClient,
    public auth: AuthService,
    public branding: BrandingService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  get pendientesTotal(): number {
    return this.pendientes.acumulaciones.length + this.pendientes.rojas_sin_sancion.length + this.pendientes.sanciones_propuestas.length;
  }

  ngOnInit() {
    this.torneoSub = this.branding.torneoActivoId$.subscribe(id => {
      this.torneoId = id;
      if (id) this.cargar();
    });
  }

  ngOnDestroy() { this.torneoSub?.unsubscribe(); }

  setTab(t: Tab) { this.tab = t; this.cargar(); }

  setFiltroEstado(e: string) { this.filtroEstado = e; this.cargarHistorial(); }

  puedeEditarReglamento(): boolean {
    if (this.auth.isAdmin()) return true;
    return (this.auth.rolesActivos || []).includes('admin_torneo');
  }

  /** Delegado del club del jugador sancionado, o admin */
  puedeApelar(s: any): boolean {
    if (this.auth.isAdmin()) return true;
    const user = this.auth.getUser();
    const rolesActivos = this.auth.rolesActivos || [];
    const esDelegado = rolesActivos.includes('delegado');
    return esDelegado && user?.club_id && s?.club_id_jugador && user.club_id === s.club_id_jugador;
  }

  /** Tribunal o admin pueden resolver apelaciones */
  puedeResolver(): boolean {
    if (this.auth.isAdmin()) return true;
    return (this.auth.rolesActivos || []).includes('tribunal') || (this.auth.rolesActivos || []).includes('admin_torneo');
  }

  cargar() {
    if (!this.torneoId) return;
    if (this.tab === 'pendientes') this.cargarPendientes();
    if (this.tab === 'historial')  this.cargarHistorial();
    if (this.tab === 'reglamento') this.cargarReglamento();
  }

  cargarPendientes() {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/tribunal/${this.torneoId}/pendientes`).subscribe({
      next: res => {
        this.pendientes = res.data || { sanciones_propuestas: [], acumulaciones: [], rojas_sin_sancion: [] };
        if (res.reglamento) this.reglamento = { ...this.reglamento, ...res.reglamento };
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.toastr.error('Error al cargar pendientes'); this.cdr.detectChanges(); },
    });
  }

  cargarHistorial() {
    if (!this.torneoId) return;
    this.loading = true;
    let url = `${environment.apiUrl}/tribunal/${this.torneoId}/sanciones`;
    if (this.filtroEstado) url += `?estado=${this.filtroEstado}`;
    this.http.get<any>(url).subscribe({
      next: res => { this.sanciones = res.data || []; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); },
    });
  }

  cargarReglamento() {
    this.http.get<any>(`${environment.apiUrl}/torneos/${this.torneoId}`).subscribe({
      next: res => {
        const cfg = res.data?.config || {};
        this.reglamento = {
          amarillas_para_suspension: cfg.amarillas_para_suspension ?? 5,
          fechas_por_acumulacion_amarillas: cfg.fechas_por_acumulacion_amarillas ?? 1,
          fechas_por_roja: cfg.fechas_por_roja ?? 2,
          permite_apelacion: cfg.permite_apelacion ?? true,
          publicar_sanciones: cfg.publicar_sanciones ?? true,
        };
        this.cdr.detectChanges();
      },
    });
  }

  guardarReglamento() {
    this.guardandoReglamento = true;
    this.http.get<any>(`${environment.apiUrl}/torneos/${this.torneoId}`).subscribe({
      next: res => {
        const cfgActual = res.data?.config || {};
        const nuevoConfig = { ...cfgActual, ...this.reglamento };
        this.http.put(`${environment.apiUrl}/torneos/${this.torneoId}`, { config: nuevoConfig }).subscribe({
          next: () => { this.toastr.success('Reglamento guardado'); this.guardandoReglamento = false; this.cdr.detectChanges(); },
          error: (e: any) => { this.toastr.error(e.error?.message || 'Error'); this.guardandoReglamento = false; this.cdr.detectChanges(); },
        });
      },
    });
  }

  // ─── Aplicar sancion ─────────────────────────────────────────────────
  abrirModalAplicar(motivo: string, contexto: any, fechasSugeridas: number, partidoId?: number) {
    this.modalAplicar = {
      motivo,
      contexto,
      fechas: fechasSugeridas,
      multa: null,
      detalle: '',
      partido_id: partidoId || null,
    };
    this.cdr.detectChanges();
  }

  confirmarAplicar() {
    if (!this.modalAplicar || !this.torneoId) return;
    this.aplicandoSancion = true;
    this.http.post(`${environment.apiUrl}/tribunal/sanciones`, {
      torneo_id: this.torneoId,
      persona_id: this.modalAplicar.contexto.persona_id,
      tipo_persona: 'jugador',
      motivo: this.modalAplicar.motivo,
      partido_id: this.modalAplicar.partido_id,
      fechas_suspension: this.modalAplicar.fechas,
      multa: this.modalAplicar.multa,
      detalle: this.modalAplicar.detalle,
      estado: 'aplicada',
    }).subscribe({
      next: () => {
        this.toastr.success('Sancion aplicada');
        this.modalAplicar = null;
        this.aplicandoSancion = false;
        this.cargarPendientes();
      },
      error: (e: any) => {
        this.toastr.error(e.error?.message || 'Error');
        this.aplicandoSancion = false;
        this.cdr.detectChanges();
      },
    });
  }

  aplicarPropuesta(s: any) {
    this.http.put(`${environment.apiUrl}/tribunal/sanciones/${s.id}`, { estado: 'aplicada' }).subscribe({
      next: () => { this.toastr.success('Sancion aplicada'); this.cargarPendientes(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  // ─── Apelacion ───────────────────────────────────────────────────────
  abrirApelar(s: any) {
    this.modalApelar = { ...s, _apelacionTexto: s.apelacion_texto || '' };
    this.cdr.detectChanges();
  }
  confirmarApelar() {
    if (!this.modalApelar) return;
    this.http.put(`${environment.apiUrl}/tribunal/sanciones/${this.modalApelar.id}`, {
      estado: 'apelada',
      apelacion_texto: this.modalApelar._apelacionTexto,
    }).subscribe({
      next: () => { this.toastr.success('Apelacion registrada'); this.modalApelar = null; this.cargarHistorial(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  abrirResolver(s: any) {
    this.modalResolver = { ...s, _resolucion: null, _fechasNuevas: Math.max(0, (s.fechas_suspension || 1) - 1) };
    this.cdr.detectChanges();
  }
  confirmarResolver() {
    if (!this.modalResolver?._resolucion) return;
    const body: any = {
      resolucion_apelacion: this.modalResolver._resolucion,
      estado: this.modalResolver._resolucion === 'revocada' ? 'revocada' : 'aplicada',
    };
    if (this.modalResolver._resolucion === 'reducida') {
      body.fechas_suspension = this.modalResolver._fechasNuevas;
    }
    this.http.put(`${environment.apiUrl}/tribunal/sanciones/${this.modalResolver.id}`, body).subscribe({
      next: () => { this.toastr.success('Apelacion resuelta'); this.modalResolver = null; this.cargarHistorial(); },
      error: (e: any) => this.toastr.error(e.error?.message || 'Error'),
    });
  }

  // ─── Historial ───────────────────────────────────────────────────────
  abrirHistorial(personaId: number) {
    if (!this.torneoId) return;
    this.http.get<any>(`${environment.apiUrl}/tribunal/${this.torneoId}/historial/${personaId}`).subscribe({
      next: res => { this.modalHistorial = res.data; this.cdr.detectChanges(); },
      error: () => this.toastr.error('Error al cargar historial'),
    });
  }

  estadoClass(estado: string): string {
    switch (estado) {
      case 'propuesta': return 'bg-blue-100 text-blue-700';
      case 'aplicada':  return 'bg-red-100 text-red-700';
      case 'cumplida':  return 'bg-green-100 text-green-700';
      case 'apelada':   return 'bg-amber-100 text-amber-700';
      case 'revocada':  return 'bg-gray-200 text-gray-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  resolveUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return url;
    return `${environment.apiUrl}${url}`;
  }
}
