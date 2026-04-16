import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, EMPTY, tap, switchMap, take, catchError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface UsuarioSesion {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  avatar_url?: string;
  club_id?: number;
  entidad_tipo?: string;
  entidad_id?: number;
  persona_id?: number | null;
}

export interface PermisosMap {
  [modulo: string]: { [accion: string]: boolean };
}

interface AuthResponse {
  success: boolean;
  token: string;
  refresh_token?: string;
  refresh_token_expires?: string;
  usuario: UsuarioSesion;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private tokenKey = 'torneo360_token';
  private userKey = 'torneo360_user';
  private refreshKey = 'torneo360_refresh_token';

  private currentUserSubject = new BehaviorSubject<UsuarioSesion | null>(this.getStoredUser());
  currentUser$ = this.currentUserSubject.asObservable();

  private permisosSubject = new BehaviorSubject<PermisosMap | null>(null);
  permisos$ = this.permisosSubject.asObservable();

  private refreshTimer: any;
  private isRefreshing = false;
  private refreshDone$ = new Subject<string | null>();

  constructor(private http: HttpClient, private router: Router) {
    if (this.getToken()) {
      this.scheduleRefresh();
      this.cargarPermisos();
    }
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): UsuarioSesion | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    const rol = this.getUser()?.rol;
    return rol === 'admin_sistema' || rol === 'admin_torneo';
  }

  needsProfileCompletion(): boolean {
    const user = this.getUser();
    if (!user) return false;
    if (user.rol === 'admin_sistema') return false;
    return !user.persona_id;
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.scheduleRefresh();
  }

  setUser(user: UsuarioSesion): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.currentUserSubject.next(user);
    this.cargarPermisos();
  }

  /** Verifica si el usuario tiene un permiso especifico */
  puede(modulo: string, accion: string): boolean {
    const user = this.getUser();
    if (!user) return false;
    if (user.rol === 'admin_sistema') return true;

    const permisos = this.permisosSubject.value;
    return permisos?.[modulo]?.[accion] ?? false;
  }

  private getStoredUser(): UsuarioSesion | null {
    try {
      const raw = localStorage.getItem(this.userKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // ─── Permisos ─────────────────────────────────────────────────────────────

  cargarPermisos(): void {
    this.http.get<{ success: boolean; data: PermisosMap }>(`${this.apiUrl}/mis-permisos`).subscribe({
      next: (res) => {
        if (res.success) this.permisosSubject.next(res.data);
      },
      error: () => {},
    });
  }

  // ─── Auth methods ─────────────────────────────────────────────────────────

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(res => this.handleAuthResponse(res))
    );
  }

  loginGoogle(credential: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/google`, { credential }).pipe(
      tap(res => this.handleAuthResponse(res))
    );
  }

  loginMicrosoft(accessToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/microsoft`, { accessToken }).pipe(
      tap(res => this.handleAuthResponse(res))
    );
  }

  register(data: { nombre: string; apellido: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  verifyEmail(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-email`, { token });
  }

  resendVerification(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/resend-verification`, { email });
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { token, password });
  }

  updatePerfil(data: { nombre?: string; apellido?: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/perfil`, data).pipe(
      tap((res: any) => {
        if (res.success && res.data) {
          const updated = { ...this.getUser(), ...res.data };
          localStorage.setItem(this.userKey, JSON.stringify(updated));
          this.currentUserSubject.next(updated);
        }
      })
    );
  }

  cambiarPassword(password_actual: string, password_nuevo: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/cambiar-password`, { password_actual, password_nuevo });
  }

  uploadAvatar(file: File): Observable<any> {
    const form = new FormData();
    form.append('avatar', file);
    return this.http.post(`${this.apiUrl}/avatar`, form).pipe(
      tap((res: any) => {
        if (res.success && res.data?.avatar_url) {
          const current = this.getUser();
          if (!current) return;
          const updated: UsuarioSesion = { ...current, avatar_url: res.data.avatar_url };
          localStorage.setItem(this.userKey, JSON.stringify(updated));
          this.currentUserSubject.next(updated);
        }
      })
    );
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({ error: () => {} });
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  // ─── Session management ───────────────────────────────────────────────────

  private handleAuthResponse(res: AuthResponse): void {
    if (res.success && res.token) {
      localStorage.setItem(this.tokenKey, res.token);
      localStorage.setItem(this.userKey, JSON.stringify(res.usuario));
      if (res.refresh_token) {
        localStorage.setItem(this.refreshKey, res.refresh_token);
      }
      this.currentUserSubject.next(res.usuario);
      this.scheduleRefresh();
      this.cargarPermisos();
    }
  }

  private clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.refreshKey);
    this.currentUserSubject.next(null);
    this.permisosSubject.next(null);
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
  }

  private scheduleRefresh(): void {
    const token = this.getToken();
    if (!token) return;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const refreshIn = payload.exp * 1000 - Date.now() - 5 * 60 * 1000;

      if (refreshIn > 0) {
        this.refreshTimer = setTimeout(() => this.doRefresh(), refreshIn);
      } else {
        this.doRefresh();
      }
    } catch {
      this.clearSession();
      this.router.navigate(['/auth/login'], { queryParams: { expired: '1' } });
    }
  }

  private doRefresh(): void {
    if (this.isRefreshing) return;
    const stored = localStorage.getItem(this.refreshKey);
    if (!stored) {
      this.clearSession();
      this.router.navigate(['/auth/login'], { queryParams: { expired: '1' } });
      return;
    }

    this.isRefreshing = true;
    this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, { refresh_token: stored }).subscribe({
      next: (res) => {
        this.isRefreshing = false;
        if (res.success && res.token) {
          localStorage.setItem(this.tokenKey, res.token);
          if (res.refresh_token) localStorage.setItem(this.refreshKey, res.refresh_token);
          this.refreshDone$.next(res.token);
          this.scheduleRefresh();
        } else {
          this.refreshDone$.next(null);
          this.clearSession();
          this.router.navigate(['/auth/login'], { queryParams: { expired: '1' } });
        }
      },
      error: () => {
        this.isRefreshing = false;
        this.refreshDone$.next(null);
        this.clearSession();
        this.router.navigate(['/auth/login'], { queryParams: { expired: '1' } });
      },
    });
  }

  tryRefreshAndRetry(req: HttpRequest<any>, next: HttpHandlerFn): Observable<any> {
    if (this.isRefreshing) {
      return this.refreshDone$.pipe(
        take(1),
        switchMap(newToken => {
          if (!newToken) return EMPTY;
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }));
        })
      );
    }

    const stored = localStorage.getItem(this.refreshKey);
    if (!stored) {
      this.clearSession();
      this.router.navigate(['/auth/login'], { queryParams: { expired: '1' } });
      return EMPTY;
    }

    this.isRefreshing = true;
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, { refresh_token: stored }).pipe(
      switchMap((res) => {
        this.isRefreshing = false;
        if (res.success && res.token) {
          localStorage.setItem(this.tokenKey, res.token);
          if (res.refresh_token) localStorage.setItem(this.refreshKey, res.refresh_token);
          this.refreshDone$.next(res.token);
          this.scheduleRefresh();
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${res.token}` } }));
        }
        this.refreshDone$.next(null);
        this.clearSession();
        this.router.navigate(['/auth/login'], { queryParams: { expired: '1' } });
        return EMPTY;
      }),
      catchError(() => {
        this.isRefreshing = false;
        this.refreshDone$.next(null);
        this.clearSession();
        this.router.navigate(['/auth/login'], { queryParams: { expired: '1' } });
        return EMPTY;
      })
    );
  }
}
