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

### Disciplina
- **SancionDisciplinaria** — caso del tribunal con FK a torneo + persona (+ partido opcional)
  - motivo: acumulacion_amarillas | roja_directa | doble_amarilla | informe_arbitro | otro
  - estado: propuesta | aplicada | cumplida | apelada | revocada
  - apelacion_texto + resolucion_apelacion (confirmada/reducida/revocada)
- **Reglamento** vive en `torneo.config` (JSONB):
  - amarillas_para_suspension (default 5)
  - fechas_por_acumulacion_amarillas (default 1)
  - fechas_por_roja (default 2)
  - permite_apelacion (default true)
  - publicar_sanciones (default true)

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
- `tribunal` — miembro del Tribunal de Disciplina. Ve tarjetas, historial,
  aplica sanciones, resuelve apelaciones. ver_sensibles en jugadores/staff.
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
node src/seeders/simular-fechas-demo.js --torneo-id=2 --fase=ida --hasta-fecha=6
node src/seeders/export-torneo-backup.js

# Setup completo de ambiente en 1 comando (CAFI 2026 + CAFI 2026 DEMO)
#   - CAFI 2026: fixture + fechas calendario, sin personas
#   - CAFI 2026 DEMO: mismo fixture + personas + 6 IDA simuladas
node src/seeders/setup-entorno-demo.js --start=2026-04-25 --apply
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
- `fechas_por_acumulacion_amarillas` (default 1) — fechas de suspension por llegar al limite
- `fechas_por_roja` (default 2) — fechas de suspension por roja directa
- `permite_apelacion` (default true)
- `publicar_sanciones` (default true) — expone GET /publico/torneos/:id/sanciones

## OAuth credentials (en environment.ts y .env)
- **Google**: `googleClientId` en frontend environment + `GOOGLE_CLIENT_ID` en backend .env
- **Microsoft**: `microsoftClientId` + `microsoftTenantId` en frontend environment + `MICROSOFT_CLIENT_ID` + `MICROSOFT_CLIENT_SECRET` + `MICROSOFT_TENANT_ID` en backend .env
- **Azure redirect URI (SPA)**: `https://torneos360.huelemu.com.ar/auth/login`

## Pendientes para proxima sesion
- **Notificaciones** — sistema de alertas (partidos sin arbitro/veedor proximos,
  informes pendientes, confirmaciones faltantes). Widget en dashboard + badge
  en header. Paso 2 del plan de asignacion de arbitros/veedores.
- **Polish responsive mobile** — pase especifico en pantallas admin (tablets
  del partido funcionan bien, pero listados podrian mejorar)
- **Probar flujo MVP + calificacion arbitro** — test manual en /partidos/:id/control
  con `elegir_mejor_jugador` y `calificar_arbitro` en config del torneo
- **Estadisticas avanzadas**: agregar exportar CSV ademas de PDF

## Cambios recientes importantes (sesion 3 — 2026-04-20)

### Estructura / Datos
- **Consolidacion 12 de Octubre A/B**: institucion base unica (id=29), clubes con
  sufijo 'A'/'B' correctamente asignados. Clubes A juegan en Blanca, B en Celeste.
  Hubo un proceso de diagnostico: 1) consolidar-instituciones-sufijo, 2) ajustar
  zona_id del Club, 3) swap de sufijos para que matchee la zona donde realmente
  juegan sus partidos.
- **Virtual `sufijo`**: Club.nombre virtual concatena el sufijo ("12 de Octubre A"),
  pero el virtual necesita que el atributo `sufijo` este en el SELECT. Agregado
  `'sufijo'` a los `attributes: ['id', 'sufijo', 'nombre', ...]` en todos los
  includes de Club de los controllers (fixture, jugadores, partidos, personas,
  posiciones, publico, staff, torneos).
- **Filtrado por torneo en Staff**: staffController.listar agrega filtro por
  torneo_id (antes aparecia el mismo staff en ambos torneos).

### Seeders / Entorno
- **setup-entorno-demo.js**: script orquestador que deja la DB con:
  CAFI 2026 (fixture + fechas calendario) + CAFI 2026 DEMO (+ personas + 6 IDA
  simuladas). Crea admin si no existe, pipeline de 7 pasos. Flag --apply.
- **simular-fechas-demo.js** acepta `--fase=ida|vuelta` y `--hasta-fecha=N`.
- **export-torneo-backup.js** tambien copia a `torneo-backup-latest.json`.

### UI — Unificacion por zonas (patron dashboard)
Todas las tablas/listas principales se dividen por zona en 2 columnas:
- **/posiciones**: chips (General + categorias) + tablas por zona
- **/estadisticas**: Goleadores y Tarjetas 2 columnas por zona + export PDF con
  subheader coloreado por zona
- **/torneo/:id publico**: las 5 tabs (General, Por Categoria, Goleadores,
  Tarjetas, Fixture) dividen por zona. Chips en vez de dropdowns.
- **/fixture admin**: 2 columnas por zona, chips Ida/Vuelta, ya no dropdown zona
- **Dashboard Goleadores + Resultados**: 2 columnas por zona. Chips de fechas
  consolidados (1 por fase+numero, carga ambas jornadas en paralelo)

### Fixture
- Estados visuales precomputados en backend: `_estadoVisual` + `_partidosCount`.
  Icono (check/pulso rojo/pause/reloj) + borde de color en cada jornada sin
  necesidad de expandir. badges femeninos y masculinos en CSS.
- Edicion de fecha calendario por jornada con checkbox "Aplicar a la otra zona"
- **Cargar resultados + asignar arbitro/veedor desde el cruce**: dentro del
  detalle del cruce, fila por partido con input de goles + dropdown arbitro +
  dropdown veedor (solo coordinador/admin). Boton Guardar guarda todo en
  paralelo. Usa resultado-rapido para goles y PUT /partidos/:id para asignacion.
- Fecha calendario formateada ("Sab 3 may") con fix timezone `T12:00:00Z`

### Partidos
- **POST /partidos/:id/resultado-rapido**: nuevo endpoint que acepta partido en
  cualquier estado, setea goles + finaliza + recalcula posiciones.
- **Vista partido finalizado mejorada**: barra con colores de ambos clubes,
  escudos grandes, trofeo al ganador, MVP + arbitro + estrellas de calificacion.
  Card "Resumen del partido" con goleadores/amarillas/rojas agrupados x cantidad.
- **Panel de Control — contador de faltas**: rediseniado con color por cantidad
  (gris/amarillo/naranja/rojo pulsante), mensaje central dinamico
  (acumuladas / alerta 5ta / tiro libre directo).
- Bugfixes: calcEventosJugador matcheaba por `jugador_id` inexistente — fixed
  a `persona_id`. Se llama tambien al cargar partido (antes solo al cargar
  alineacion, provocando contadores vacios por race condition).

### Publico
- **Banner "En Vivo"** en /torneo/:id cuando hay partidos en curso (polling 30s)
- **PDF con jspdf-autotable** en /estadisticas — tabla por zona + subheader
  coloreado con branding del torneo
- Nueva ruta top-level `/torneo/:id` (accesible con o sin auth)
- Endpoint publico GET /publico/torneos/:id/en-vivo (sin auth)
- Tabs + chips en vez de dropdowns

### Auth / Perfiles
- `/auth/me` ahora incluye `telefono` + `torneo` en roles asignados
- Email editable solo para cuentas locales (OAuth retorna 400) + validacion de
  unicidad
- `GET /jugadores/:id` aplica ocultarSensibles (antes leakeaba DNI/tel/email)

### Rendering / UX
- **Iconos PWA + favicon**: script en backend/scripts/generate-icons.js que
  genera desde el logo Torneos360. Tamanos chicos usan solo el isotipo
  (pelota+orbita) sobre purpura; grandes usan el logo completo.
- Widgets del dashboard con max-h + overflow-y-auto (scroll interno, simetria
  visual)

## Git
- Rama principal: `main`
- Commits en español
- Prefijos: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Co-Authored-By en commits generados
