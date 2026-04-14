import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
  private connected$ = new Subject<boolean>();

  constructor(private auth: AuthService, private zone: NgZone) {
    this.auth.currentUser$.subscribe(user => {
      if (user) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  /**
   * URL base para Socket.io. En prod usa el mismo dominio (Nginx proxea /socket.io/).
   * En dev apunta al backend directo.
   */
  private getSocketUrl(): string {
    // En prod, apiUrl = '/api' pero Socket.io NO va bajo /api, va directo al dominio
    // Usamos window.location.origin para que el socket se conecte al mismo host
    if (window.location.hostname !== 'localhost') {
      return window.location.origin;
    }
    return 'http://localhost:7300';
  }

  private connect(): void {
    if (this.socket?.connected) return;

    const token = this.auth.getToken();
    if (!token) return;

    // Conectar FUERA de zone.js para no afectar performance
    this.zone.runOutsideAngular(() => {
      this.socket = io(this.getSocketUrl(), {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        this.zone.run(() => this.connected$.next(true));
      });
      this.socket.on('disconnect', () => {
        this.zone.run(() => this.connected$.next(false));
      });
    });
  }

  private disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /** Unirse a la room de un partido */
  joinMatch(matchId: number): void {
    this.socket?.emit('match:join', matchId);
  }

  /** Salir de la room de un partido */
  leaveMatch(matchId: number): void {
    this.socket?.emit('match:leave', matchId);
  }

  /** Unirse a la room de una jornada */
  joinJornada(jornadaId: number): void {
    this.socket?.emit('jornada:join', jornadaId);
  }

  /** Salir de la room de una jornada */
  leaveJornada(jornadaId: number): void {
    this.socket?.emit('jornada:leave', jornadaId);
  }

  /**
   * Escuchar un evento del socket.
   * IMPORTANTE: las emisiones se ejecutan dentro de NgZone para
   * que Angular detecte los cambios automaticamente.
   */
  on<T = any>(event: string): Observable<T> {
    return new Observable(subscriber => {
      const handler = (data: T) => {
        this.zone.run(() => subscriber.next(data));
      };
      this.socket?.on(event, handler);
      return () => this.socket?.off(event, handler);
    });
  }

  /** Emitir un evento */
  emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }
}
