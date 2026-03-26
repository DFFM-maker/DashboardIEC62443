# Architecture Audit — Tecnopack OT Security Dashboard v2
> Generato il 2026-03-26 | FASE 0 — TASK 0.1

---

## 1. Stack Tecnologico

| Layer | Tecnologia |
|-------|-----------|
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 + React Router v6 |
| UI Icons | Lucide React |
| Backend | Node.js + Express 4 |
| Database | SQLite via better-sqlite3 (sync) |
| Real-time | Socket.io (WebSocket) |
| PDF Export | Puppeteer-core |
| Excel Export | ExcelJS |
| File Upload | Multer |

---

## 2. Struttura Directory

```
/opt/ot-dashboard/
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  ← router root
│   │   ├── main.jsx
│   │   ├── lib/api.js               ← HTTP client centralizzato
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── SeverityBadge.jsx
│   │   │   └── StatusBadge.jsx
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       ├── Assessments.jsx
│   │       ├── AssessmentDetail.jsx ← 5 tab: Overview/Asset/Finding/Zone/Report/Log
│   │       ├── Assets.jsx
│   │       ├── Findings.jsx
│   │       ├── Clients.jsx
│   │       ├── Advisories.jsx
│   │       ├── Templates.jsx
│   │       ├── Import.jsx
│   │       └── Settings.jsx
│   ├── tailwind.config.js
│   └── vite.config.js               ← proxy /api → :3001
├── backend/
│   ├── server.js                    ← Express app + Socket.io
│   ├── db/
│   │   ├── database.js              ← better-sqlite3 init + migrations inline
│   │   └── schema.sql               ← schema base
│   ├── routes/
│   │   ├── assessments.js
│   │   ├── assets.js
│   │   ├── findings.js
│   │   ├── clients.js
│   │   ├── advisories.js
│   │   ├── templates.js
│   │   ├── zones.js
│   │   └── export.js
│   └── services/
│       ├── scanner.js (o simile)
│       └── report.js (o simile)
└── assets/
    └── logo-tecnopack-dark.svg
```

---

## 3. API Routes Esistenti

| Method | Path | Descrizione |
|--------|------|-------------|
| GET | /api/assessments | Lista assessment con conteggi aggregati |
| POST | /api/assessments | Crea nuovo assessment |
| GET | /api/assessments/:id | Assessment con nome cliente |
| PUT | /api/assessments/:id | Aggiorna assessment |
| DELETE | /api/assessments/:id | Elimina assessment |
| POST | /api/assessments/:id/scan | Avvia scansione rete |
| GET | /api/assessments/:id/logs | Ultimi 200 log scansione |
| GET | /api/assessments/:id/stats | Statistiche complete |
| POST | /api/assessments/:id/report/:format | Genera report (html/pdf/excel) |
| GET | /api/assets | Lista asset (filtro: assessment_id) |
| GET | /api/assets/:id | Singolo asset |
| PUT | /api/assets/:id | Aggiorna asset |
| DELETE | /api/assets/:id | Elimina asset |
| GET | /api/findings | Lista finding (filtro: assessment_id, severity, status) |
| GET | /api/findings/:id | Singolo finding |
| PUT | /api/findings/:id | Aggiorna finding |
| POST | /api/findings | Crea finding manuale |
| DELETE | /api/findings/:id | Elimina finding |
| GET | /api/clients | Lista clienti |
| POST | /api/clients | Crea cliente |
| GET | /api/clients/:id | Singolo cliente |
| PUT | /api/clients/:id | Aggiorna cliente |
| DELETE | /api/clients/:id | Elimina cliente |
| GET | /api/advisories | Lista advisory (filtri multipli) |
| POST | /api/advisories/refresh | Aggiorna feed advisory |
| GET | /api/advisories/stats | Statistiche advisory |
| GET | /api/templates | Lista template zone |
| POST | /api/templates | Crea template |
| DELETE | /api/templates/:id | Elimina template |
| POST | /api/templates/:id/apply/:assessmentId | Applica template |
| GET | /api/zones | Liste zone (filtro: assessment_id) con asset |
| POST | /api/zones | Crea zona |
| PUT | /api/zones/:id | Aggiorna zona |
| DELETE | /api/zones/:id | Elimina zona |
| POST | /api/zones/:id/assets/:assetId | Aggiunge asset a zona |
| DELETE | /api/zones/:id/assets/:assetId | Rimuove asset da zona |
| GET | /api/conduits | Lista conduit (filtro: assessment_id) |
| POST | /api/export/:id | Esporta assessment (.otsa) |
| POST | /api/import | Importa assessment (.otsa) |
| GET | /api/health | Health check |

---

## 4. Tabelle DB Esistenti

### clients
`id, name, address, city, country, contact_name, contact_email, contact_phone, notes, created_at`

### assessments
`id, client_id, name, subnet, status, created_at, completed_at, assessor, iec62443_target_sl, notes, snmp_community`

### assets
`id, assessment_id, ip, mac, vendor, device_type, device_model, firmware_version, serial_number, security_zone, criticality, notes, classified_by, last_seen`

### open_ports
`id, asset_id, port, protocol, service, version, state, is_required`

### findings
`id, assessment_id, asset_id, finding_code, title, description, cvss_score, cvss_vector, severity, iec62443_sr, iec62443_part, evidence, remediation, remediation_priority, status, cve_ids, advisory_urls, created_at, resolved_at`

### zones
`id, assessment_id, name, security_level, description, color`

### zone_assets
`zone_id, asset_id`

### conduits
`id, assessment_id, name, zone_from_id, zone_to_id, protocols, direction, notes`

### zone_templates
`id, name, description, created_at, is_builtin`

### zone_template_zones
`id, template_id, zone_name, security_level, description, color, vendor_hints, port_hints`

### zone_template_conduits
`id, template_id, from_zone_name, to_zone_name, protocols, direction`

### advisories
`id, source, vendor, title, description, cvss_score, cve_ids, affected_products, url, published_at, fetched_at`

### scan_logs
`id, assessment_id, timestamp, level, message`

### export_jobs
`id, assessment_id, format, status, file_path, created_at, completed_at`

---

## 5. Componenti Frontend

### Pagine (routes)
| Route | Component | Descrizione |
|-------|-----------|-------------|
| /dashboard | Dashboard.jsx | KPI cards + severity chart + recent findings + recent assessments |
| /clients | Clients.jsx | CRUD clienti/impianti |
| /assessments | Assessments.jsx | Lista assessment con status |
| /assessments/:id | AssessmentDetail.jsx | Dettaglio con 6 tab |
| /assets | Assets.jsx | Asset inventory globale |
| /findings | Findings.jsx | Finding con filtri severity/status |
| /advisories | Advisories.jsx | Feed advisory CVE |
| /templates | Templates.jsx | Template zone predefiniti |
| /import | Import.jsx | Import file .otsa |
| /settings | Settings.jsx | Impostazioni app |

### Componenti Shared
| Component | Uso |
|-----------|-----|
| Sidebar.jsx | Navigazione collassabile con NavLink |
| SeverityBadge.jsx | Badge colorato per Critical/High/Medium/Low |
| StatusBadge.jsx | Badge stato assessment/finding |

### Design System (Tailwind)
- Primary brand: `brand.green: #2e9650`
- Dark variant: `brand.dark: #1e3a5f`
- Font sans: Inter, font mono: JetBrains Mono
- Background app: `bg-gray-950`
- Cards: `bg-gray-900`, border `border-gray-800`

---

## 6. Gap Analysis — Wizard IEC 62443

### Campi mancanti nelle tabelle esistenti

| Tabella | Colonne mancanti per wizard |
|---------|----------------------------|
| assessments | suc_name, suc_function, machine_operation, data_sharing, access_points, physical_boundary |
| zones | x, y, width, height (coordinate canvas React Flow) |
| conduits | type (wired/wireless/fieldbus/remote), label, encryption |

### Tabelle nuove da creare

| Tabella | Scopo |
|---------|-------|
| risk_events | Scenari di rischio dello step 2 wizard con matrice 5×5 |
| iec_controls | Database SR/RE IEC 62443-3-3 (seed statico) |
| zone_controls | Stato controlli per zona (applicabile/presente/SL-A) |
| policies | Policy generate per ogni controllo |

### Route API mancanti

| Method | Path | Scopo |
|--------|------|-------|
| PATCH | /api/assessments/:id | Auto-save parziale dati wizard |
| GET/POST/PUT/DELETE | /api/assessments/:id/risk-events | CRUD eventi di rischio |
| GET | /api/iec-controls | Lista controlli IEC 62443-3-3 |
| GET/PUT | /api/zones/:id/controls | Gap analysis controlli per zona |
| GET/POST | /api/assessments/:id/policies | Gestione policy |
| POST | /api/assessments/:id/generate-policy | AI policy generation |
| POST | /api/assessments/:id/report | Report wizard completo |

### Componenti React mancanti

| Component | Route | Step |
|-----------|-------|------|
| WizardStep1_SUC.jsx | /assessments/new | Step 1: SUC Definition |
| WizardStep2_RiskAssessment.jsx | /assessments/:id/step/2 | Step 2: Risk Assessment |
| RiskMatrix5x5.jsx | (shared) | Matrice 5×5 interattiva |
| WizardStep3_ZonesConduits.jsx | /assessments/:id/step/3 | Step 3: Zone/Conduit Canvas |
| WizardStep4_TolerableRisk.jsx | /assessments/:id/step/4 | Step 4: Tolerable Risk |
| WizardStep5_DetailedRisk.jsx | /assessments/:id/step/5 | Step 5: Gap Analysis |
| WizardStep6_Policies.jsx | /assessments/:id/step/6 | Step 6: Policy Generation |
| WizardStep7_Report.jsx | /assessments/:id/step/7 | Step 7: Report |
| ComplianceDashboard.jsx | /compliance | NIS2/CRA/Machinery Reg |
| RiskMatrixWidget.jsx | (shared) | Widget riutilizzabile |

### Dipendenze npm mancanti

**Backend:**
- `zod` — validazione input API
- `jest`, `@jest/globals` — test framework

**Frontend:**
- `reactflow` — canvas zone/condotti interattivo
- `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` — test

---

## 7. WebSocket Events Esistenti

| Event | Direzione | Payload |
|-------|-----------|---------|
| `join` | client→server | assessmentId |
| `scan_start` | server→client | { assessmentId } |
| `scan_log` | server→client | { level, message } |
| `scan_progress` | server→client | { found, total } |
| `scan_complete` | server→client | { assessmentId, stats } |
| `scan_error` | server→client | { error } |

---

## 8. Configurazione Dev

- Backend: `http://localhost:3001` (PORT env var)
- Frontend dev: `http://localhost:3000` (Vite), proxy → :3001
- DB: `/opt/ot-dashboard/backend/db/ot_dashboard.db`
- CORS: `origin: '*'` (da restringere in produzione)

---

*Audit completato — pronto per implementazione FASE 0 TASK 0.2 → 0.3*
