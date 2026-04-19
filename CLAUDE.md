# Torneo360 - Convenciones del Proyecto

## Stack
- **Backend**: Node.js + Express 5 (ES Modules), Sequelize 6 + PostgreSQL, puerto 7300
- **Frontend**: Angular 21 standalone components, Tailwind CSS 4 + Angular Material 21, puerto 4300
- **Auth**: JWT + Google OAuth (GIS renderButton) + Microsoft MSAL (redirect) + email/password
- **Permisos**: PermisoDefaultRol + PermisoUsuario (override) + multi-rol (union) + ver_sensibles
- **Tiempo real**: Socket.io (WebSockets)
- **Email**: Amazon SES v2 + Nodemailer (fallback SMTP)
- **Timezone**: America/Argentina/Buenos_Aires (UTC-3)
- **Deploy**: VPS + PM2 + Nginx (aaPanel), script `deploy.sh`
- **PWA**: Angular Service Worker con iconos custom desde logo Torneo360

## Estructura
```
Torneo360/
├── backend/src/
│   ├── controllers/   (20: auth, personas, jugadores, staff, arbitros, veedores, clubes,
│   │                       instituciones, torneos, fixture, partidos, posiciones, estadisticas,
│   │                       permisos, configuracion, informes, documentos, publico, rolesStaff, admin)
│   ├── models/        (22: Persona, PersonaRol, Rol, Usuario, Club, Institucion, Torneo, Zona,
│   │                       Categoria, Partido, PartidoEvento, PartidoAlineacion, PartidoConfirmacion,
│   │                       FixtureJornada, TablaPosiciones, TablaPosicionesClub, InformeArbitro,
│   │                       Documento, Configuracion, PermisoDefaultRol, PermisoUsuario, AuditLog)
│   ├── routes/        (20 archivos de rutas, incluyendo /publico sin auth)
│   ├── services/      (standings, clone, transicion, upload, IA, email, audit)
│   ├── middleware/     (auth, permisos, club-scoping, tienePermiso, ocultarSensibles)
│   ├── migrations/    (migraciones Sequelize CLI)
│   ├── seeders/       (reset, export/import backup, personas, fixture, simulacion, consolidacion)
│   ├── sockets/       (matchSocket para tiempo real)
│   └── config/        (db, logger)
├── frontend/src/app/
│   ├── auth/          (login, register, completar-perfil, forgot/reset password)
│   ├── core/
│   │   ├── layout/    (layout admin con sidebar, public-layout sin auth)
│   │   ├── guards/    (authGuard, adminGuard, guestGuard, isLoggedInMatch, requirePerfilCompleto)
│   │   └── services/  (auth, branding, socket, personas, view-preference)
│   ├── features/      (20 pantallas)
│   │   ├── admin/     (usuarios, permisos, roles-staff, instituciones, configuracion, transicion)
│   │   ├── partidos/  (panel-control, partido-detalle, marcador-vivo)
│   │   ├── publico/   (landing page marketinera)
│   │   ├── perfil/    (mi perfil con roles, avatar, seguridad)
│   │   └── ...        (dashboard, torneos, clubes, jugadores, staff, arbitros, veedores, fixture, posiciones)
│   └── shared/        (dni-scanner, dni-firma-modal, documentos-upload, icon-picker, persona-existente-banner)
├── deploy.sh          (deploy automatizado: git pull, migrate, build, PM2 restart)
├── backend/scripts/generate-icons.js (genera favicon + iconos PWA desde logo Torneos360)
└── CLAUDE.md          (este archivo)
```

## Arquitectura de datos (Party Pattern)

### Entidades principales
- **Persona** — tabla unificada por DNI (unica). Un DNI = una persona.
- **PersonaRol** — N:M con contexto. Una persona puede tener muchos roles: jugador + DT + delegado.
- **Rol** — catalogo editable (jugador, delegado_general, delegado_auxiliar, entrenador, ayudante, dirigente, arbitro, veedor, coordinador).
- **Institucion** — club "platonico" (nombre, escudo, colores). Global, no depende de torneo.
- **Club** — participacion de una institucion en un torneo (FK a institucion + torneo + zona). Campo `sufijo` para equipos multiples (A/B). Virtuals `nombre`, `escudo_url`, etc que delegan a Institucion.
- **Usuario** — tabla de sesion/auth. Tiene `persona_id` FK para vincular con persona del dominio.

### Competencia
- **Torneo** → Zona[] → Club[] (via institucion_id)
- **Torneo** → Categoria[] (auto-generadas por año: 2013-2019 + Preliminar)
- **FixtureJornada** → Partido[] (local, visitante, categoria, arbitro, veedor)
- **Partido** → PartidoEvento[] (gol, amarilla, azul, roja, falta, sustitucion, inicio/fin periodo)
- **Partido** → PartidoAlineacion[] (persona_id + dorsal + titular + confirmado)
- **Partido** → PartidoConfirmacion[] (DNI + firma del delegado/arbitro)
- **Partido** → mejor_jugador_id, calificacion_arbitro, comentario_arbitro

### Permisos
- **PermisoDefaultRol**: matriz RBAC (rol × modulo × accion)
- **PermisoUsuario**: override por usuario individual
- **Acciones**: ver, crear, editar, eliminar, ver_sensibles
- **Multi-rol**: permisos se combinan con OR (union de todos los roles de la persona)
- **Admin bypass**: admin_sistema puede confirmar alineaciones y cerrar partidos con su propio DNI
- **Campos sensibles**: tienePermiso(req, modulo, 'ver_sensibles') + ocultarSensibles()

## Roles del sistema
- `admin_sistema` — acceso total, bypass DNI, todos los permisos
- `admin_torneo` — gestion completa del torneo, bypass DNI
- `coordinador` — asigna arbitros/veedores, gestiona fixture
- `delegado` — gestiona su club (jugadores, staff, confirma alineaciones)
- `arbitro` — cierra partidos, informes
- `veedor` — observador del torneo
- `entrenador` — vista de su equipo
- `publico` — solo lectura basica

## Auth y vinculacion DNI
- **Google OAuth**: Google Identity Services SDK, renderButton nativo (theme filled_black)
- **Microsoft OAuth**: MSAL loginRedirect (no popup). redirectUri = /auth/login. main.ts redirige #code= a /auth/login si llega a /
- **Vinculacion DNI**: al primer login, guard `requirePerfilCompleto` redirige a /perfil/completar. El usuario ingresa su DNI, el backend busca en personas, auto-detecta rol y club, genera nuevo JWT.
- **Token JWT**: contiene id, email, nombre, apellido, rol, club_id, persona_id (8h expiry, refresh 30d)

## Convenciones Backend
- ES Modules (`import/export`), no CommonJS (excepto .cjs para Sequelize CLI)
- Modelos Sequelize con `timestamps: false`, campos manuales `creado_en`/`actualizado_en`
- Respuestas API: `{ success: boolean, data?, message?, error? }`
- Auth via JWT en header `Authorization: Bearer <token>`
- Permisos: `requirePermiso(modulo, accion)` middleware + `tienePermiso(req, m, a)` helper
- Campos sensibles: `ocultarSensibles(data, ocultar)` remueve DNI/telefono/email
- Club virtual fields: modelo Club usa VIRTUAL que delegan a Institucion (siempre incluir institucion en includes)
- Endpoints publicos sin auth: `/publico/torneos/*`
- Doble amarilla: automaticamente genera roja o azul segun config `doble_amarilla_genera`

## Convenciones Frontend
- Standalone components (no NgModules)
- Lazy loading via `loadComponent` en routes
- Auth state en `AuthService` con `BehaviorSubject`, `persona_id`, `rolesActivos[]`
- Permisos: `auth.puede(modulo, accion)` + layout re-renderiza cuando permisos cargan (fix refresh)
- Layout: canShow() retorna true por defecto hasta que permisos carguen (permisosLoaded flag)
- Routing: `canMatch: [isLoggedInMatch]` para diferenciar publico vs autenticado
- Guard `requirePerfilCompleto` redirige a `/perfil/completar` si no tiene `persona_id`
- Torneo activo via `BrandingService.torneoActivoId$` — todas las pantallas filtran por este
- Edicion via drawer lateral (clase CSS `.edit-drawer` + `.edit-drawer-overlay`)
- Acciones via iconos directos (clase `.action-btn`) en vez de menu 3 puntos
- Scanner DNI con BarcodeDetector nativo (PDF417) + fallback @zxing/library
- Material density -1 (semi-compacto), botones 36px rounded-lg, font 14px Inter
- Login: dark theme, logo Torneos360_Logo_Blanco.png, Google renderButton + Microsoft redirect
- Header: avatar + nombre + roles (click → /perfil) + logout. Sidebar: solo navegacion.

## Comandos
```bash
# Backend dev
cd backend && npm run dev

# Frontend dev
cd frontend && npx ng serve --port 4300

# Migraciones
cd backend && npm run migrate

# Build frontend
cd frontend && npx ng build

# Deploy (en el VPS)
cd /www/wwwroot/torneos360 && bash deploy.sh

# Generar favicon + iconos PWA desde logo Torneos360
#   - tamanos <=152: isotipo (pelota + orbita) sobre fondo purpura #762c7e
#   - tamanos >=192: logo completo sobre fondo purpura
cd backend && node scripts/generate-icons.js

# Seeders utiles (en el VPS)
node src/seeders/reset-datos.js --apply --i-know-what-im-doing
node src/seeders/import-torneo-backup.js --rename="CAFI 2026"
node src/seeders/cafi-2026-personas.js --torneo-id=2
node src/seeders/simular-fechas-demo.js --torneo-id=2 --cantidad=7
node src/seeders/export-torneo-backup.js
```

## Config del torneo (JSONB en torneo.config)
- `puntos_victoria` (default 2 para CAFI), `puntos_empate` (default 1)
- `tarjeta_azul_habilitada` (boolean)
- `contar_faltas` (boolean) — muestra contador de faltas por periodo en el marcador
- `reloj_parado` (boolean) — permite pausar el cronometro
- `cantidad_tiempos` (default 2), `minutos_por_tiempo` (default 25)
- `elegir_mejor_jugador` (boolean) — seleccionar MVP al finalizar
- `calificar_arbitro` (boolean) — estrellas 1-5 post-cierre (delegados/veedores)
- `doble_amarilla_genera` ('roja'|'azul'|'nada')
- `amarillas_para_suspension` (default 5, entre partidos)

## OAuth credentials (en environment.ts y .env)
- **Google**: `googleClientId` en frontend environment + `GOOGLE_CLIENT_ID` en backend .env
- **Microsoft**: `microsoftClientId` + `microsoftTenantId` en frontend environment + `MICROSOFT_CLIENT_ID` + `MICROSOFT_CLIENT_SECRET` + `MICROSOFT_TENANT_ID` en backend .env
- **Azure redirect URI (SPA)**: `https://torneos360.huelemu.com.ar/auth/login`

## Pendientes para proxima sesion
- Consolidar 12 de Octubre A/B (correr script en VPS)
- Pulir UI: responsive mobile, loading states, empty states
- Probar flujo MVP + calificacion arbitro con config habilitada
- Estadisticas avanzadas: exportar PDF, tabla de tarjetas
- Vista publica de datos: /torneo/:id con posiciones completas
- Probar en server los fixes de la sesion 2 (ver abajo)

## Verificaciones completadas (2026-04-19 sesion 2)
- **Mi Perfil**: backend `/auth/me` ahora incluye `telefono` + `torneo` en roles asignados.
  Email editable solo para cuentas locales (OAuth retorna 400). Valida unicidad.
- **`/admin/permisos` con ver_sensibles**: `GET /jugadores/:id` ahora aplica
  `ocultarSensibles` (antes leakeaba DNI/tel/email en el detalle singular).
- **Panel de Control**: acumuladores por jugador (goles/amarillas/azules/roja)
  matcheaban por `jugador_id` inexistente → fixed a `persona_id`. `calcEventosJugador`
  tambien se llama al cargar el partido (antes solo al cargar alineacion, que podia
  correr antes que partido y dejar los contadores vacios).

## Git
- Rama principal: `main`
- Commits en español
- Prefijos: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Co-Authored-By en commits generados
