#!/bin/bash
# deploy.sh — OT Dashboard deployment script
# Usage: ./deploy.sh [--no-restart]
set -e

REPO_DIR="/opt/ot-dashboard"
BACKEND_DIR="$REPO_DIR/backend"
FRONTEND_DIR="$REPO_DIR/frontend"
SERVICE="ot-dashboard"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
fail() { echo -e "${RED}[error]${NC} $1"; exit 1; }

cd "$REPO_DIR"

# 1. Git pull
log "1/4 — git pull"
git pull || fail "git pull failed"

# 2. Backend dependencies
log "2/4 — backend npm install"
cd "$BACKEND_DIR"
/usr/bin/npm install --omit=dev || fail "backend npm install failed"

# 3. Frontend build
log "3/4 — frontend build"
cd "$FRONTEND_DIR"
/usr/bin/npm install || fail "frontend npm install failed"
/usr/bin/npm run build || fail "frontend build failed"
log "Build completata: $(du -sh dist/ | cut -f1) in dist/"

# 4. Restart service + health check with retry
if [[ "$1" != "--no-restart" ]]; then
  log "4/4 — restart $SERVICE"
  sudo systemctl restart "$SERVICE" || fail "systemctl restart failed"

  # Wait for process to come up — retry /api/health up to 15 times (15s)
  HEALTH_URL="http://localhost:3001/api/health"
  MAX_RETRIES=15
  RETRY=0
  log "Attendo che il backend risponda su $HEALTH_URL ..."
  until curl -sf "$HEALTH_URL" > /dev/null 2>&1; do
    RETRY=$((RETRY + 1))
    if [[ $RETRY -ge $MAX_RETRIES ]]; then
      fail "Backend non risponde dopo ${MAX_RETRIES}s — controlla: journalctl -u $SERVICE -n 50"
    fi
    sleep 1
  done

  VERSION=$(curl -sf "$HEALTH_URL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('version','?'))" 2>/dev/null || echo "?")
  log "Backend attivo — v${VERSION} (risposta dopo ${RETRY}s)"
else
  warn "4/4 — restart saltato (--no-restart)"
fi

log "Deploy completato."
