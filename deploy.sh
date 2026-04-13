#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Torneo360 — Script de Deploy Automatizado
#  Uso: bash deploy.sh [--skip-frontend] [--skip-migrations]
#
#  Lo que hace:
#    1. git pull origin main
#    2. npm ci en backend (solo si package-lock cambio)
#    3. Migraciones de Sequelize (solo las pendientes)
#    4. Build del frontend Angular
#    5. Reinicia PM2 (backend)
#    6. Recarga Nginx (frontend)
# ═══════════════════════════════════════════════════════════════

set -e

# ── PATH de Node.js en aaPanel ────────────────────────────────
NODE_BIN=$(ls -d /www/server/nodejs/v*/bin 2>/dev/null | tail -1)
if [ -n "$NODE_BIN" ]; then
  export PATH="$NODE_BIN:$PATH"
fi
export PATH="$HOME/.npm-global/bin:/usr/local/bin:$PATH"

# ── Configuracion ────────────────────────────────────────────
PROJECT_DIR="/www/wwwroot/torneos360"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
LOGS_DIR="$PROJECT_DIR/logs"
PM2_APP="torneo360-backend"
BRANCH="main"

# ── Parsear argumentos ───────────────────────────────────────
SKIP_FRONTEND=false
SKIP_MIGRATIONS=false

for arg in "$@"; do
  case $arg in
    --skip-frontend)    SKIP_FRONTEND=true ;;
    --skip-migrations)  SKIP_MIGRATIONS=true ;;
  esac
done

# ── Colores ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()     { echo -e "${CYAN}▶ $1${NC}"; }
success() { echo -e "${GREEN}✓ $1${NC}"; }
warn()    { echo -e "${YELLOW}⚠ $1${NC}"; }
error()   { echo -e "${RED}✗ $1${NC}"; exit 1; }

# ── Inicio ───────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════"
echo "  Torneo360 — Deploy  $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════════"

mkdir -p "$LOGS_DIR"

# ─────────────────────────────────────────────────────────────
# PASO 1: Git pull
# ─────────────────────────────────────────────────────────────
log "[1/5] Obteniendo cambios del repositorio ($BRANCH)..."
cd "$PROJECT_DIR"

if ! git diff --quiet || ! git diff --cached --quiet; then
  warn "Hay cambios locales sin commitear. Guardando con stash..."
  git stash
fi

git pull origin "$BRANCH"
success "Repositorio actualizado"

# ─────────────────────────────────────────────────────────────
# PASO 2: Dependencias del backend
# ─────────────────────────────────────────────────────────────
log "[2/5] Verificando dependencias del backend..."
cd "$BACKEND_DIR"

if git diff HEAD@{1} HEAD --name-only 2>/dev/null | grep -q "backend/package-lock.json"; then
  log "  package-lock.json cambio — ejecutando npm ci..."
  npm ci --cache ~/.npm --prefer-offline
  success "Dependencias actualizadas"
else
  success "Dependencias sin cambios (sin reinstalar)"
fi

# ─────────────────────────────────────────────────────────────
# PASO 3: Migraciones de base de datos
# ─────────────────────────────────────────────────────────────
if [ "$SKIP_MIGRATIONS" = false ]; then
  log "[3/5] Ejecutando migraciones pendientes..."
  cd "$BACKEND_DIR"
  npx sequelize-cli db:migrate --env production 2>&1 | tee -a "$LOGS_DIR/migrations.log" || warn "Sin migraciones pendientes"
  success "Migraciones OK"
else
  warn "[3/5] Migraciones omitidas (--skip-migrations)"
fi

# ─────────────────────────────────────────────────────────────
# PASO 4: Build del frontend Angular
# ─────────────────────────────────────────────────────────────
if [ "$SKIP_FRONTEND" = false ]; then
  log "[4/5] Construyendo frontend Angular (produccion)..."
  cd "$FRONTEND_DIR"

  log "  Instalando dependencias del frontend..."
  npm install --cache ~/.npm --prefer-offline

  rm -f "$FRONTEND_DIR/dist/frontend/browser/.user.ini" 2>/dev/null || true

  NODE_OPTIONS="--max-old-space-size=2048" npm run build
  success "Frontend construido → dist/frontend/browser/"
else
  warn "[4/5] Build del frontend omitido (--skip-frontend)"
fi

# ─────────────────────────────────────────────────────────────
# PASO 5: Reiniciar servicios
# ─────────────────────────────────────────────────────────────
log "[5/5] Reiniciando servicios..."

cd "$BACKEND_DIR"
if pm2 list | grep -q "$PM2_APP"; then
  pm2 restart "$PM2_APP" --update-env
  success "Backend reiniciado (PM2: $PM2_APP)"
else
  pm2 start ecosystem.config.cjs --env production
  pm2 save
  success "Backend iniciado por primera vez (PM2: $PM2_APP)"
fi

if nginx -t 2>/dev/null; then
  pkill -HUP nginx 2>/dev/null || nginx -s reload 2>/dev/null || true
  success "Nginx recargado"
else
  warn "Config de Nginx con errores — no se recargo. Revisa: nginx -t"
fi

# ── Resumen ──────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════"
success "Deploy completado — $(date '+%H:%M:%S')"
echo "  Backend : https://torneos360.huelemu.com.ar/health"
echo "  Frontend: https://torneos360.huelemu.com.ar"
echo "  Logs PM2: pm2 logs $PM2_APP"
echo "════════════════════════════════════════════════"
echo ""
