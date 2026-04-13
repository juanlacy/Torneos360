# Torneo360 - Bitacora del Proyecto

## 2026-04-13 — Inicio del proyecto (Fase 1: Fundacion)

### Creado
- **Backend completo** (Fase 1):
  - Scaffolding: Express 5, Sequelize 6, PostgreSQL, Socket.io
  - Modelos: Usuario, PermisoDefaultRol, PermisoUsuario, AuditLog, Torneo
  - Middleware: authMiddleware (JWT, roles, permisos granulares, club-scoping), errorHandler, requestLogger
  - Servicios: auditService, emailService (SES + SMTP)
  - Controllers: authController (login, Google, Microsoft, register, verify, reset, refresh, permisos), permisosController, adminController
  - Rutas: /auth, /permisos, /admin
  - Entry point con Socket.io integrado
  - 5 migraciones + 2 seeders (permisos por defecto + usuario admin)

- **Frontend completo** (Fase 1):
  - Angular 21 + Tailwind CSS 4 + Angular Material 21
  - Core: AuthService (con permisos), SocketService, authInterceptor, guards (auth, admin, guest, role)
  - Layout: Sidenav responsive con menu adaptativo por permisos
  - Auth pages: Login, Register, Verify Email, Forgot Password, Reset Password
  - Features: Dashboard (placeholder), Admin Usuarios (tabla con filtros), Admin Permisos (editor de matriz)
  - Routing con lazy loading y guards

### Decisiones tecnicas
- PostgreSQL en vez de MySQL (mejor para JSONB, concurrencia)
- Socket.io para tiempo real (ideal para tablets en cancha)
- Sistema de permisos de SistemaGH (PermisoDefaultRol + PermisoUsuario)
- Dark theme verde (identidad Baby Futbol)

### Proximos pasos (Fase 2)
- Modelos: Zona, Club, Categoria, Jugador, Staff, Arbitro, Veedor
- CRUD completo de entidades del torneo
- Fichaje de jugadores con fichas medicas
