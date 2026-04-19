# Torneo360 - Convenciones del Proyecto

## Stack
- **Backend**: Node.js + Express 5 (ES Modules), Sequelize 6 + PostgreSQL, puerto 7300
- **Frontend**: Angular 21 standalone components, Tailwind CSS 4 + Angular Material 21, puerto 4300
- **Auth**: JWT + Google OAuth (GIS) + Microsoft MSAL + email/password con verificacion
- **Permisos**: PermisoDefaultRol + PermisoUsuario (override por usuario) + multi-rol (union)
- **Tiempo real**: Socket.io (WebSockets)
- **Email**: Amazon SES v2 + Nodemailer (fallback SMTP)
- **Timezone**: America/Argentina/Buenos_Aires (UTC-3)
- **Deploy**: VPS + PM2 + Nginx (aaPanel), script `deploy.sh`

## Estructura
```
Torneo360/
├── backend/src/
│   ├── controllers/   (20 controllers)
│   ├── models/        (22 modelos Sequelize)
│   ├── routes/        (20 archivos de rutas)
│   ├── services/      (standings, clone, transicion, upload, IA, email, audit)
│   ├── middleware/     (auth, permisos, club-scoping)
│   ├── migrations/    (migraciones Sequelize CLI)
│   ├── seeders/       (reset, export/import, personas, fixture, simulacion)
│   ├── sockets/       (matchSocket para tiempo real)
│   └── config/        (db, logger)
├── frontend/src/app/
│   ├── auth/          (login, register, completar-perfil, forgot/reset password)
│   ├── core/          (layout, public-layout, guards, services: auth, branding, socket, personas, view-pref)
│   ├── features/      (20 pantallas)
│   │   ├── admin/     (usuarios, permisos, roles-staff, instituciones, configuracion, transicion)
│   │   ├── partidos/  (panel-control, partido-detalle, marcador-vivo)
│   │   ├── publico/   (landing page marketinera)
│   │   └── ...        (dashboard, torneos, clubes, jugadores, staff, arbitros, veedores, fixture, posiciones)
│   └── shared/        (dni-scanner, dni-firma-modal, documentos-upload, icon-picker, persona-existente-banner)
├── deploy.sh          (deploy automatizado: git pull, migrate, build, PM2 restart)
└── CLAUDE.md          (este archivo)
```

## Arquitectura de datos (Party Pattern)

### Entidades principales
- **Persona** — tabla unificada por DNI (unica). Un DNI = una persona.
- **PersonaRol** — N:M con contexto. Una persona puede tener muchos roles: jugador + DT + delegado.
- **Rol** — catalogo editable (jugador, delegado_general, delegado_auxiliar, entrenador, ayudante, dirigente, arbitro, veedor, coordinador).
- **Institucion** — club "platonico" (nombre, escudo, colores). Global, no depende de torneo.
- **Club** — participacion de una institucion en un torneo (FK a institucion + torneo + zona). Campo `sufijo` para equipos multiples (A/B).
- **Usuario** — tabla de sesion/auth. Tiene `persona_id` FK para vincular con persona del dominio.

### Competencia
- **Torneo** → Zona[] → Club[] (via institucion_id)
- **Torneo** → Categoria[] (auto-generadas por año: 2013-2019 + Preliminar)
- **FixtureJornada** → Partido[] (local, visitante, categoria, arbitro, veedor)
- **Partido** → PartidoEvento[] (gol, amarilla, azul, roja, falta, sustitucion, inicio/fin periodo)
- **Partido** → PartidoAlineacion[] (persona_id + dorsal + titular + confirmado)
- **Partido** → PartidoConfirmacion[] (DNI + firma del delegado/arbitro)

### Permisos
- **PermisoDefaultRol**: matriz RBAC (rol × modulo × accion)
- **PermisoUsuario**: override por usuario individual
- **Acciones**: ver, crear, editar, eliminar, ver_sensibles
- **Multi-rol**: permisos se combinan con OR (union de todos los roles de la persona)
- **Admin bypass**: admin_sistema puede confirmar alineaciones y cerrar partidos con su propio DNI

## Roles del sistema
- `admin_sistema` — acceso total, bypass DNI
- `admin_torneo` — gestion completa del torneo, bypass DNI
- `coordinador` — asigna arbitros/veedores, gestiona fixture
- `delegado` — gestiona su club (jugadores, staff, confirma alineaciones)
- `arbitro` — cierra partidos, informes
- `veedor` — observador del torneo
- `entrenador` — vista de su equipo
- `publico` — solo lectura basica

## Convenciones Backend
- ES Modules (`import/export`), no CommonJS (excepto .cjs para Sequelize CLI)
- Modelos Sequelize con `timestamps: false`, campos manuales `creado_en`/`actualizado_en`
- Respuestas API: `{ success: boolean, data?, message?, error? }`
- Auth via JWT en header `Authorization: Bearer <token>`
- Permisos granulares: `requirePermiso(modulo, accion)` middleware
- Helper `tienePermiso(req, modulo, accion)` para uso programatico
- Campos sensibles: `ocultarSensibles(data, ocultar)` remueve DNI/telefono/email
- Club virtual fields: modelo Club usa VIRTUAL que delegan a Institucion (siempre incluir institucion)
- Rate limiting en endpoints publicos de auth
- Endpoints publicos sin auth: `/publico/torneos/*`

## Convenciones Frontend
- Standalone components (no NgModules)
- Lazy loading via `loadComponent` en routes
- Auth state en `AuthService` con `BehaviorSubject`, `persona_id`, `rolesActivos[]`
- Permisos en `AuthService.puede(modulo, accion)`
- Routing: `canMatch: [isLoggedInMatch]` para diferenciar publico vs autenticado
- Guard `requirePerfilCompleto` redirige a `/perfil/completar` si no tiene `persona_id`
- Torneo activo via `BrandingService.torneoActivoId$` — todas las pantallas filtran por este
- Edicion via drawer lateral (clase CSS `.edit-drawer` + `.edit-drawer-overlay`)
- Acciones via iconos directos (clase `.action-btn`) en vez de menu 3 puntos
- Scanner DNI con BarcodeDetector nativo (PDF417) + fallback @zxing/library
- Material density -1 (semi-compacto), botones 36px rounded-lg, font 14px Inter
- Toastr para notificaciones, `cdr.detectChanges()` despues de subscribes

## Comandos
```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npx ng serve --port 4300

# Migraciones
cd backend && npm run migrate

# Build frontend
cd frontend && npx ng build

# Deploy (en el VPS)
cd /www/wwwroot/torneos360 && bash deploy.sh

# Seeders utiles (en el VPS)
node src/seeders/reset-datos.js --apply --i-know-what-im-doing
node src/seeders/import-torneo-backup.js --rename="CAFI 2026"
node src/seeders/cafi-2026-personas.js --torneo-id=2
node src/seeders/simular-fechas-demo.js --torneo-id=2 --cantidad=7
node src/seeders/export-torneo-backup.js
node src/seeders/consolidar-instituciones-sufijo.js --apply
node src/seeders/limpiar-duplicados-seeder.js --torneo-id=2 --apply
```

## Config del torneo (JSONB en torneo.config)
- `puntos_victoria` (default 3), `puntos_empate` (default 1)
- `tarjeta_azul_habilitada` (boolean)
- `contar_faltas` (boolean)
- `reloj_parado` (boolean)
- `cantidad_tiempos` (default 2), `minutos_por_tiempo` (default 25)
- `elegir_mejor_jugador` (boolean) — MVP al final del partido
- `calificar_arbitro` (boolean) — calificacion 1-5 estrellas

## Git
- Rama principal: `main`
- Commits en español
- Prefijos: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Co-Authored-By en commits generados
