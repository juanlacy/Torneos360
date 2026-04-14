# Torneo360 - Bitacora del Proyecto

> Sistema de Gestion Integral de Torneos de Baby Futbol
> Desarrollado por Juan Lacy

---

## Stack Tecnologico

| Componente | Tecnologia |
|-----------|------------|
| Backend | Node.js + Express 5 (ES Modules), puerto 7300 |
| Base de datos | PostgreSQL + Sequelize 6 (JSONB) |
| Frontend | Angular 21 + Tailwind CSS 4 + Angular Material 21, puerto 4300 |
| Tiempo real | Socket.io (WebSockets) |
| Auth | JWT + Google OAuth + Microsoft MSAL |
| Permisos | PermisoDefaultRol + PermisoUsuario (granular) |
| Email | Amazon SES v2 + Nodemailer (SMTP fallback) |
| Deploy | VPS + PM2 + Nginx (aaPanel) |
| Repositorio | [GitHub](https://github.com/juanlacy/Torneos360) |
| Produccion | https://torneos360.huelemu.com.ar |

---

## Roles del Sistema

| Rol | Descripcion |
|-----|-------------|
| `admin_sistema` | Acceso total al sistema |
| `admin_torneo` | Administra torneos, clubes, jugadores, fixture, arbitros |
| `delegado` | Gestiona su club, opera el panel de control en partidos |
| `arbitro` | Valida y cierra partidos |
| `veedor` | Supervisa partidos (lectura + observaciones) |
| `entrenador` | Ve datos de su equipo |
| `publico` | Ve posiciones, resultados y calendario |

---

## Fases del Proyecto

| Fase | Descripcion | Estado |
|------|-------------|--------|
| 1 | Fundacion (Auth, Permisos, Layout) | Completada |
| 2 | Entidades Core (Clubes, Jugadores, Staff) | Completada |
| 3 | Competencia (Fixture, Partidos, Posiciones) | Completada |
| 4 | Control de Partidos en Tiempo Real | Completada |
| 5 | PWA (Progressive Web App) | Completada |
| 6 | Estadisticas y Reportes | Pendiente |

---

## Registro de Cambios

### 2026-04-14 — PWA (Progressive Web App)

- Angular Service Worker habilitado con `@angular/pwa`
- **manifest.webmanifest**: nombre Torneo360, colores CAFI (#762c7e), iconos
- **Meta tags iOS**: apple-mobile-web-app-capable, status-bar-style, touch-icon
- **ngsw-config.json** con cache inteligente:
  - App shell: prefetch (carga offline inmediata)
  - API torneos/clubes: freshness con timeout 5s, cache 1h
  - API fixture/posiciones: freshness 3s, cache 5m (datos que cambian en vivo)
  - API jugadores: freshness 5s, cache 30m
  - Uploads (imagenes): performance, cache 30 dias
  - Google Fonts: performance, cache 1 anio
- **Nginx**: service worker sin cache (no-store, must-revalidate)
- La app se puede instalar en celular/tablet como app nativa
- Funciona offline con datos cacheados

---

### 2026-04-14 — Fase 4: Control de Partidos en Tiempo Real (Socket.io)

#### Backend
- **matchSocket.js**: handlers de emision para todos los eventos del partido
  - `match:start` — partido iniciado
  - `match:event` — nuevo evento (gol, tarjeta, sustitucion) con marcador actualizado
  - `match:score` — actualizacion de marcador
  - `match:end` — partido finalizado
  - `match:confirm` — arbitro confirmo resultado
  - `standings:update` — posiciones recalculadas
  - `global:match_update` — broadcast global para dashboards
- **partidosController** actualizado: cada accion (iniciar, evento, finalizar, confirmar) emite via Socket.io
- Rooms por partido (`match:${id}`) y por jornada (`jornada:${id}`) para segmentar audiencia

#### Frontend
- **Partido Detalle** ahora es en tiempo real:
  - Se suscribe a la room del partido al entrar
  - Recibe goles, tarjetas y cambios de estado sin recargar
  - Se desuscribe al salir (OnDestroy)
- **Marcador en Vivo** (nueva pantalla):
  - Muestra todos los partidos de una jornada en tiempo real
  - Cards con marcador grande, indicador "EN VIVO" con animacion pulse
  - Ultimo evento visible debajo del marcador
  - Agrupado por categoria
  - Se actualiza instantaneamente via Socket.io al recibir eventos
- Menu lateral: nuevo item "En Vivo" con icono rojo

---

### 2026-04-14 — Configuracion, Informes de Arbitro e Integraciones IA

#### Reglas configurables del torneo
- El campo `config` JSONB del torneo ahora almacena `puntos_victoria` y `puntos_empate`
- CAFI usa **2 puntos por victoria** y **1 punto por empate** (diferente al default de 3)
- El calculador de posiciones lee estos valores dinamicamente del torneo
- Pantalla de admin para configurar el sistema de puntos por torneo

#### Informes del arbitro con audio + IA
- **Modelo InformeArbitro**: tipo (general, disciplinario, incidente, suspension), audio, transcripcion, resumen, metadata
- El arbitro puede **grabar audio** desde el celular/tablet directamente en la pantalla del partido
- El audio se envia al backend y se procesa con IA:
  - **OpenAI**: Whisper (transcripcion) + GPT-4o-mini (resumen)
  - **Google Gemini**: transcripcion + resumen en una sola llamada
- Fallback automatico: si la IA principal falla, intenta con la secundaria
- Si la IA no esta configurada, el audio se guarda igual (transcripcion pendiente)
- El arbitro puede editar la transcripcion y confirmar el informe

#### Modulo de Configuraciones
- **Tabla `configuraciones`**: clave-valor con JSONB, reutilizable para cualquier config futura
- **Tab "Reglas del Torneo"**: puntos por victoria/empate/derrota por torneo
- **Tab "Integraciones IA"**: configurar API keys de OpenAI y Gemini, elegir IA principal, seleccionar modelos
- Las API keys se sanitizan: nunca se devuelven al frontend (solo `***configurada***`)
- Fallback a variables de entorno (`OPENAI_API_KEY`, `GEMINI_API_KEY`) si no hay config en BD

#### Frontend
- **Pantalla Configuracion** en Admin: dos tabs (Reglas Torneo + Integraciones IA)
- **Pantalla Partido Detalle** ampliada con seccion de Informes:
  - Crear informe, grabar audio con MediaRecorder API, reproducir, enviar y transcribir
  - Indicador visual de grabacion, boton para generar resumen IA
  - Timeline de informes con tipo, estado, resumen y audio player

---

### 2026-04-14 — Fase 3: Competencia (Fixture, Partidos, Posiciones)

#### Backend
- **5 nuevos modelos**: FixtureJornada, Partido, PartidoEvento, TablaPosiciones, TablaPosicionesClub
- **5 migraciones** con foreign keys completas
- **Servicio fixtureGeneratorService**: algoritmo de Berger (round-robin) para generar fixture automatico
  - Genera jornadas de IDA y VUELTA por cada zona
  - Para cada jornada, crea un partido por cada categoria (7 partidos por fecha)
  - Soporta clubes sin zona y numero impar de clubes (bye/descansa)
- **Servicio standingsCalculatorService**: recalculo de posiciones
  - Calcula tabla por categoria: PJ, PG, PE, PP, GF, GC, DG, Puntos
  - Calcula tabla general del club: suma de puntos de las 6 categorias principales (excluye preliminar)
  - Recalculo automatico al finalizar cada partido
  - Usa transaccion de BD para consistencia
- **Controller fixtureController**: generar/eliminar fixture, listar jornadas, partidos por jornada, actualizar fecha/estado
- **Controller partidosController**: flujo completo del partido
  - `POST /partidos/:id/iniciar` — inicia el partido
  - `POST /partidos/:id/evento` — registra gol, tarjeta, sustitucion (actualiza marcador automaticamente en goles)
  - `POST /partidos/:id/finalizar` — finaliza y recalcula posiciones
  - `POST /partidos/:id/confirmar` — arbitro confirma resultado
  - `POST /partidos/:id/suspender` — suspender con motivo
- **Controller posicionesController**: consulta por categoria, general del club, recalcular manual

#### Frontend
- **Pantalla Fixture**: generar/eliminar fixture con un click, lista de jornadas expandibles con filtros (zona, fase ida/vuelta), ver partidos por jornada con resultado y estado
- **Pantalla Partido Detalle**: marcador grande con colores por estado, botones de flujo (iniciar/finalizar/confirmar), formulario para registrar eventos en tiempo real (gol, amarilla, roja, sustitucion, informe), timeline de eventos con iconos y colores
- **Pantalla Posiciones**: dos tabs — General Club (ranking por puntos totales) y Por Categoria (tabla completa PJ/PG/PE/PP/GF/GC/DG/Pts), boton de recalcular manual, filtro por categoria

---

### 2026-04-13 — Fase 2: Entidades Core del Torneo

#### Backend
- **7 nuevos modelos**: Zona, Club, Categoria, Jugador, Staff, Arbitro, Veedor
- **7 migraciones** con foreign keys e indices
- **6 controllers CRUD** con validaciones de negocio:
  - **Torneos**: CRUD + generar las 7 categorias automaticas del anio + gestion de zonas
  - **Clubes**: CRUD + upload de escudo + listado de jugadores por club
  - **Jugadores**: CRUD completo con:
    - Validacion de DNI unico por torneo
    - Control de limite de jugadores por categoria (20-25)
    - Validacion de edad vs anio de nacimiento de la categoria
    - Flujo de fichaje: pendiente → aprobado/rechazado/baja
    - Upload de foto del jugador
  - **Staff**: CRUD con club-scoping (entrenadores, ayudantes, delegados generales y auxiliares)
  - **Arbitros**: CRUD por torneo
  - **Veedores**: CRUD por torneo
- **Asociaciones completas**: Torneo → Zonas → Clubes → Jugadores/Staff, Torneo → Categorias, etc.
- Todas las rutas protegidas con `requirePermiso(modulo, accion)`
- Club-scoping automatico para delegados y entrenadores

#### Frontend
- **Pantalla Torneos**: crear/editar torneos, generar categorias con un click, gestionar zonas
- **Pantalla Clubes**: grilla de cards con escudo y colores del club, filtro por torneo/zona
- **Pantalla Jugadores**: tabla con filtros multiples (club, categoria, estado fichaje, busqueda libre), formulario de alta, aprobacion/rechazo de fichaje desde menu contextual
- Menu lateral actualizado con seccion "Torneo" (Torneos, Clubes, Jugadores)

#### Fixes
- Corregido `RouterLink` no usado en ClubesComponent

---

### 2026-04-13 — Fase 1: Fundacion del Proyecto

#### Backend
- Scaffolding completo: Express 5, Sequelize 6, PostgreSQL, Socket.io
- **5 modelos**: Usuario (7 roles), PermisoDefaultRol, PermisoUsuario, AuditLog, Torneo
- **Middleware**: authMiddleware (JWT, roles, permisos granulares, club-scoping con `clubWhere`/`clubData`/`tieneAccesoAlClub`), errorHandler con clases de error tipadas, requestLogger
- **Servicios**: auditService (registro con JSONB, sanitizacion de datos sensibles), emailService (SES v2 + SMTP fallback, templates HTML dark theme)
- **Auth completo**: login local + Google OAuth + Microsoft MSAL, register con verificacion de email, forgot/reset password, refresh token con rotacion, upload de avatar
- **5 migraciones** + **2 seeders** (matriz de permisos por rol + usuario admin)
- Entry point con Socket.io integrado (auth JWT en handshake, rooms por match/jornada/club)
- Swagger UI en `/api-docs`
- Health check en `/health`

#### Frontend
- Angular 21 standalone components + Tailwind CSS 4 + Angular Material 21
- **AuthService** con BehaviorSubject, JWT refresh proactivo, cache de permisos, metodo `puede(modulo, accion)`
- **SocketService** wrapper de Socket.io con auto-connect/disconnect segun sesion
- **Interceptor** HTTP con inyeccion de token + retry en 401 via refresh
- **Guards**: authGuard, adminGuard, guestGuard, roleGuard factory
- **Layout**: Sidenav responsive con menu adaptativo segun rol y permisos, toolbar con menu de usuario
- **5 paginas de auth**: Login (local + Google + Microsoft), Register, Verify Email, Forgot Password, Reset Password
- **Dashboard** placeholder con cards de estadisticas
- **Admin Usuarios**: tabla con busqueda, filtro por rol, paginacion
- **Admin Permisos**: editor visual de matriz de permisos por rol (checkbox grid)

#### Infraestructura
- Deploy script (`deploy.sh`) con PM2 + Nginx + migraciones automaticas
- Config Nginx para aaPanel con proxy al backend + WebSocket upgrade para Socket.io
- `ecosystem.config.cjs` para PM2

#### Decisiones tecnicas
- **PostgreSQL** en vez de MySQL: mejor soporte JSONB, mejor concurrencia para tiempo real
- **Socket.io** para tiempo real: bidireccional, ideal para tablets en cada mesa de control
- **Sistema de permisos** adaptado de SistemaGH: dos niveles (default por rol + override por usuario)
- **Dark theme verde/amarillo**: identidad visual de Baby Futbol
- **Deteccion automatica de entorno** (`window.location.hostname`) para apiUrl prod/dev

#### Fixes post-deploy
- MSAL inicializado lazy para evitar crash sin credenciales configuradas
- Sass `@import` migrado a `@use` (deprecation Dart Sass 3.0)
- Budget de bundle ajustado a 1MB/2MB (normal con Angular Material)
- Config Nginx actualizada con paths reales de aaPanel

---

## Estructura de la Base de Datos

### Auth y Admin
- `usuarios` — 7 roles, OAuth, vinculacion a entidad, club-scoping
- `permisos_default_rol` — Permisos por defecto segun rol
- `permisos_usuario` — Override individual por usuario
- `audit_logs` — Registro de cambios con JSONB

### Torneo
- `torneos` — Contenedor anual con estado y config JSONB
- `zonas` — Divisiones del torneo (Blanca, Celeste)
- `categorias` — Por anio de nacimiento (2013-2019), flag `es_preliminar`
- `clubes` — Con zona, escudo, colores, contacto JSONB

### Personas
- `jugadores` — DNI, foto, estado fichaje, ficha medica JSONB, datos personales JSONB
- `staff` — Entrenadores, ayudantes, delegados (por club)
- `arbitros` — Por torneo
- `veedores` — Por torneo

### Competencia (Fase 3)
- `fixture_jornadas` — Fechas con zona y fase (ida/vuelta)
- `partidos` — Por jornada + categoria, con estado y confirmacion del arbitro
- `partido_jugadores` — Roster validado pre-partido
- `partido_eventos` — Goles, tarjetas, sustituciones en tiempo real
- `tabla_posiciones` — Por categoria + zona
- `tabla_posiciones_club` — Total del club (suma de 6 categorias, excluye preliminar)
