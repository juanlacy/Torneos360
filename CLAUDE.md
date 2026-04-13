# Torneo360 - Convenciones del Proyecto

## Stack
- **Backend**: Node.js + Express 5 (ES Modules), Sequelize 6 + PostgreSQL, puerto 7300
- **Frontend**: Angular 21 standalone components, Tailwind CSS 4 + Angular Material 21, puerto 4300
- **Auth**: JWT + Google OAuth + Microsoft MSAL + email/password con verificacion
- **Permisos**: PermisoDefaultRol + PermisoUsuario (override por usuario)
- **Tiempo real**: Socket.io (WebSockets)
- **Email**: Amazon SES v2 + Nodemailer (fallback SMTP)
- **Timezone**: America/Argentina/Buenos_Aires (UTC-3)

## Estructura
```
Torneo360/
├── backend/src/   (controllers, models, routes, services, middleware, config, sockets, migrations, seeders)
├── frontend/src/  (app/auth, app/core, app/features, app/shared)
├── BITACORA.md    (documento vivo del proyecto)
└── CLAUDE.md      (este archivo)
```

## Convenciones Backend
- ES Modules (`import/export`), no CommonJS (excepto .cjs para Sequelize CLI)
- Modelos Sequelize con `timestamps: false`, campos manuales `creado_en`/`actualizado_en`
- Respuestas API: `{ success: boolean, data?, message?, error? }`
- Auth via JWT en header `Authorization: Bearer <token>`
- Roles: `admin_sistema`, `admin_torneo`, `delegado`, `arbitro`, `veedor`, `entrenador`, `publico`
- Permisos granulares: modulo + accion (ver, crear, editar, eliminar)
- Rate limiting en endpoints publicos de auth
- Logger Winston con `logSystem`, `logAuth`, `logRequest`
- Audit log con JSONB para datos anteriores/nuevos
- Club-scoping: `clubWhere(req)`, `clubData(req)`, `tieneAccesoAlClub(req, clubId)`

## Convenciones Frontend
- Standalone components (no NgModules)
- Lazy loading via `loadComponent` en routes
- Auth state en `AuthService` con `BehaviorSubject`
- Permisos en `AuthService.puede(modulo, accion)`
- LocalStorage keys: `torneo360_token`, `torneo360_user`, `torneo360_refresh_token`
- Template inline en components (no archivos .html separados excepto cuando el template es muy largo)
- Tailwind para layout, Material para componentes interactivos
- Dark theme (slate-950 bg, slate-900 cards)

## Comandos
```bash
# Backend
cd backend && npm run dev     # nodemon en puerto 7300

# Frontend
cd frontend && npx ng serve --port 4300   # dev server en puerto 4300

# Migraciones
cd backend && npm run migrate
cd backend && npm run seed

# Build frontend
cd frontend && npx ng build
```

## Base de datos
- PostgreSQL, JSONB para campos flexibles
- En dev: `sequelize.sync({ alter: true })` (auto-sync)
- En prod: usar migraciones (`npx sequelize-cli db:migrate`)

## Git
- Rama principal: `main`
- Commits en espanol
- Prefijos: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
