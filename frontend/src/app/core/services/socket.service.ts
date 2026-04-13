import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
  private connected$ = new Subject<boolean>();

  constructor(private auth: AuthService) {
    this.auth.currentUser$.subscribe(user => {
      if (user) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  private connect(): void {
    if (this.socket?.connected) return;

    const token = this.auth.getToken();
    if (!token) return;

    this.socket = io(environment.apiUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => this.connected$.next(true));
    this.socket.on('disconnect', () => this.connected$.next(false));
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

  /** Escuchar un evento del socket */
  on<T = any>(event: string): Observable<T> {
    return new Observable(subscriber => {
      const handler = (data: T) => subscriber.next(data);
      this.socket?.on(event, handler);
      return () => this.socket?.off(event, handler);
    });
  }

  /** Emitir un evento */
  emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }
}
