#!/usr/bin/env bash
# =============================================================================
# OT Security Dashboard — Script di setup per Ubuntu Server
# =============================================================================
# Uso: sudo bash setup-ubuntu.sh [IP_O_DOMINIO]
# Esempio: sudo bash setup-ubuntu.sh 192.168.1.100
# =============================================================================

set -e

SERVER_HOST="${1:-localhost}"
APP_DIR="/opt/ot-dashboard"
APP_USER="${SUDO_USER:-ubuntu}"
NODE_MIN=22

RED='\033[0;31m'; GRN='\033[0;32m'; YEL='\033[1;33m'; NC='\033[0m'
ok()  { echo -e "${GRN}[OK]${NC}  $*"; }
warn(){ echo -e "${YEL}[WARN]${NC} $*"; }
die() { echo -e "${RED}[ERR]${NC}  $*"; exit 1; }

echo "======================================================"
echo "  OT Security Dashboard — Setup Ubuntu"
echo "  Target host: $SERVER_HOST"
echo "======================================================"

# --- 1. Dipendenze di sistema -----------------------------------------------
echo ""
echo ">>> Installazione dipendenze di sistema..."
apt-get update -q
apt-get install -y -q \
  curl git nginx nmap \
  snmp snmp-mibs-downloader \
  libasound2t64 \
  libatk-bridge2.0-0 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxrandr2 libgbm1

# Chromium: su Ubuntu 24.04 il pacchetto è "chromium" (non chromium-browser che è uno snap)
apt-get install -y -q chromium || apt-get install -y -q chromium-browser

# Node.js >= 18
NODE_VER=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1 || echo 0)
if [ "$NODE_VER" -lt "$NODE_MIN" ]; then
  warn "Node.js $NODE_VER trovato (minimo $NODE_MIN). Installazione Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
ok "Node.js $(node -v)"

# --- 2. Permessi nmap (senza sudo per l'utente di servizio) ------------------
NMAP_BIN=$(which nmap)
setcap cap_net_raw,cap_net_admin+eip "$NMAP_BIN" && ok "setcap nmap: $NMAP_BIN" \
  || warn "setcap fallito — aggiungere $APP_USER a sudoers per nmap se le scansioni non funzionano"

# --- 3. Clone / aggiornamento repo -------------------------------------------
echo ""
echo ">>> Configurazione directory applicazione: $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  warn "Repo già presente, eseguo git pull..."
  git -C "$APP_DIR" pull
else
  git clone https://github.com/DFFM-maker/DashboardIEC62443.git "$APP_DIR"
fi
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
ok "Repository: $APP_DIR"

# --- 4. File .env ------------------------------------------------------------
ENV_FILE="$APP_DIR/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<EOF
PORT=3001
GITHUB_TOKEN=INSERIRE_IL_NUOVO_TOKEN_QUI
EOF
  chown "$APP_USER":"$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  warn "Creato $ENV_FILE — modificare GITHUB_TOKEN prima di avviare il servizio!"
else
  ok ".env già presente: $ENV_FILE"
fi

# --- 5. Installazione dipendenze Node ----------------------------------------
echo ""
echo ">>> npm install backend..."
sudo -u "$APP_USER" bash -c "cd $APP_DIR/backend && npm install --omit=dev --silent"
ok "Backend dipendenze installate"

echo ">>> npm install + build frontend..."
sudo -u "$APP_USER" bash -c "cd $APP_DIR/frontend && npm install --silent && npm run build"
ok "Frontend buildato in $APP_DIR/frontend/dist"

# --- 6. Directory report output ----------------------------------------------
mkdir -p "$APP_DIR/backend/reports/output"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR/backend/reports"

# --- 7. Seed database (se vuoto) ---------------------------------------------
echo ""
echo ">>> Verifica database..."
sudo -u "$APP_USER" bash -c "cd '$APP_DIR/backend' && node -e \"
  const db = require('./db/database')
  const count = db.get('SELECT COUNT(*) as n FROM assessments')
  if (count.n === 0) { require('./seed'); console.log('Seed eseguito.') }
  else { console.log('DB esistente (' + count.n + ' assessments), seed saltato.') }
\""
ok "Database pronto"

# --- 8. Systemd service ------------------------------------------------------
echo ""
echo ">>> Configurazione servizio systemd..."
cp "$APP_DIR/deploy/ot-dashboard.service" /etc/systemd/system/ot-dashboard.service
sed -i "s|__APP_USER__|$APP_USER|g" /etc/systemd/system/ot-dashboard.service
sed -i "s|__APP_DIR__|$APP_DIR|g"   /etc/systemd/system/ot-dashboard.service
systemctl daemon-reload
systemctl enable ot-dashboard
systemctl restart ot-dashboard
sleep 2
systemctl is-active --quiet ot-dashboard && ok "Servizio ot-dashboard attivo" \
  || die "Servizio non avviato — verificare: journalctl -u ot-dashboard -n 50"

# --- 9. Nginx ----------------------------------------------------------------
echo ""
echo ">>> Configurazione Nginx..."
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/ot-dashboard
sed -i "s|__SERVER_HOST__|$SERVER_HOST|g" /etc/nginx/sites-available/ot-dashboard
sed -i "s|__APP_DIR__|$APP_DIR|g"         /etc/nginx/sites-available/ot-dashboard
ln -sf /etc/nginx/sites-available/ot-dashboard /etc/nginx/sites-enabled/ot-dashboard
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx && ok "Nginx configurato" \
  || die "Errore configurazione Nginx — verificare: nginx -t"

# --- 10. Firewall ------------------------------------------------------------
if command -v ufw &>/dev/null; then
  ufw allow 80/tcp  &>/dev/null
  ufw allow 22/tcp  &>/dev/null
  ok "Firewall: porta 80 e 22 aperte"
fi

# --- Fine -------------------------------------------------------------------
echo ""
echo "======================================================"
echo -e "  ${GRN}Setup completato!${NC}"
echo ""
echo "  Dashboard:  http://$SERVER_HOST/"
echo "  API health: http://$SERVER_HOST/api/health"
echo "  Log:        journalctl -u ot-dashboard -f"
echo "======================================================"
echo ""
[ -f "$ENV_FILE" ] && grep -q "INSERIRE_IL_NUOVO_TOKEN" "$ENV_FILE" && \
  warn "Ricordare di aggiornare GITHUB_TOKEN in $ENV_FILE e riavviare: systemctl restart ot-dashboard"
