#!/bin/bash
clear
echo "╔══════════════════════════════════════════════════╗"
echo "║   TECNOPACK OT Security Dashboard v2.0           ║"
echo "║   IEC 62443 — Multi-Impianto                     ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

DASHBOARD_DIR="$HOME/ot-dashboard"

# Verifica logo
if [ ! -f "$DASHBOARD_DIR/assets/logo-tecnopack-light.svg" ]; then
  echo "⚠  Logo Tecnopack light non trovato in $DASHBOARD_DIR/assets/"
else
  echo "✓  Logo Tecnopack light trovato"
fi
if [ ! -f "$DASHBOARD_DIR/assets/logo-tecnopack-dark.svg" ]; then
  echo "⚠  Logo Tecnopack dark non trovato in $DASHBOARD_DIR/assets/"
else
  echo "✓  Logo Tecnopack dark trovato"
fi

# Crea dir reports se manca
mkdir -p "$DASHBOARD_DIR/backend/reports/output"

# Installa dipendenze backend
cd "$DASHBOARD_DIR/backend"
if [ ! -d "node_modules" ]; then
  echo ""
  echo "Installazione dipendenze backend..."
  npm install --silent
  echo "✓  Backend installato"
fi

# Installa dipendenze frontend
cd "$DASHBOARD_DIR/frontend"
if [ ! -d "node_modules" ]; then
  echo ""
  echo "Installazione dipendenze frontend..."
  npm install --silent
  echo "✓  Frontend installato"
fi

# Seed DB se vuoto
cd "$DASHBOARD_DIR/backend"
node -e "
const db = require('./db/database');
try {
  const count = db.get('SELECT COUNT(*) as n FROM assessments');
  if(count.n === 0) {
    require('./seed');
    console.log('✓  Database inizializzato con dati assessment reali (17 asset, 10+ finding)');
  } else {
    console.log('✓  Database esistente — ' + count.n + ' assessment trovati');
  }
} catch(e) { console.log('⚠  Seed: ' + e.message); }
"

echo ""

# Avvia backend
cd "$DASHBOARD_DIR/backend"
node server.js > /tmp/ot-backend.log 2>&1 &
BACKEND_PID=$!
sleep 2

# Verifica backend
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
  echo "✓  Backend API     → http://172.16.224.250:3001"
else
  echo "✗  Backend non risponde!"
  echo "   Controlla: tail -20 /tmp/ot-backend.log"
fi

# Avvia frontend
cd "$DASHBOARD_DIR/frontend"
npm run dev > /tmp/ot-frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 3

# Verifica frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "✓  Frontend React  → http://172.16.224.250:3000"
else
  echo "✓  Frontend avviato (o in avvio)"
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✓  Dashboard disponibile:                       ║"
echo "║                                                  ║"
echo "║  → http://172.16.224.250:3000  (Frontend)        ║"
echo "║  → http://172.16.224.250:3001  (Backend API)     ║"
echo "║                                                  ║"
echo "║  Accessibile da tutta la rete 172.16.224.0/20    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Log backend:  tail -f /tmp/ot-backend.log"
echo "  Log frontend: tail -f /tmp/ot-frontend.log"
echo ""
echo "  CTRL+C per fermare tutto"
echo ""

cleanup() {
  echo ""
  echo "Arresto dashboard..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  echo "Dashboard fermata."
}
trap cleanup EXIT INT TERM

wait
