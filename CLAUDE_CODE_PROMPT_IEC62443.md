# Claude Code — Master Prompt
## Dashboard IEC 62443: Wizard Risk Assessment + Zone/Condotti

> **Progetto base**: https://github.com/DFFM-maker/DashboardIEC62443  
> **ECC Framework**: https://github.com/affaan-m/everything-claude-code  
> **Stack**: React · Vite · Tailwind CSS · Node.js · Express · SQLite · WebSocket · Puppeteer

---

## 🎯 OBIETTIVO STRATEGICO

Trasformare il **Tecnopack OT Security Dashboard v2** nell'unica soluzione open source che copre:
1. **Monitoring operativo continuo** (asset inventory, CVSS scoring, advisory CISA/NVD) — già presente
2. **Risk assessment documentale IEC 62443** (wizard guidato, zone/condotti, Security Level, policy) — da implementare
3. **Report di certificazione** per Machinery Regulation / CRA / NIS2 — da estendere

---

## 🧠 AGENT HARNESS SETUP (everything-claude-code)

Prima di iniziare qualsiasi implementazione, configura l'ambiente agente:

```bash
# 1. Clona il framework ECC nella cartella del progetto
git clone https://github.com/affaan-m/everything-claude-code .ecc

# 2. Copia i file di configurazione Claude Code
cp .ecc/.claude/CLAUDE.md ./CLAUDE.md
cp -r .ecc/.agents/skills ./claude-skills/

# 3. Attiva gli agent specializzati per questo progetto
# Usa: planner → code-reviewer → tdd-guide → security-reviewer
```

### CLAUDE.md da usare nel progetto (da creare in root):

```markdown
# CLAUDE.md — DashboardIEC62443

## Project Context
OT Security Dashboard for IEC 62443 compliance. React frontend + Node.js/Express backend + SQLite.
Stack: React 18, Vite, Tailwind CSS, Lucide Icons, Socket.io, Express, better-sqlite3, Puppeteer.

## Agent Roles
- **Planner**: decompose features into atomic tasks before any code
- **Code Reviewer**: review every PR against IEC 62443 domain correctness + code quality  
- **TDD Guide**: write tests BEFORE implementation (backend: Jest, frontend: Vitest + Testing Library)
- **Security Reviewer**: validate no sensitive OT data leaves the self-hosted perimeter

## Core Rules
1. Research-first: read existing code in /frontend/src and /backend/ before any change
2. No breaking changes to existing assessment and advisory modules
3. All new DB columns must have migrations in /backend/migrations/
4. IEC 62443 domain terms must match the standard exactly (SR, RE, SL, SUC, ZCR, conduit)
5. Markdown reports embed SVG assets from /assets/ — never external URLs

## Test Commands
npm run test:backend   # Jest
npm run test:frontend  # Vitest
npm run test:e2e       # Playwright
```

---

## 📋 IMPLEMENTATION PLAN

### FASE 0 — Research & Architecture (PLANNER AGENT)

```
TASK 0.1 — Code audit completo
Read and summarize:
- /frontend/src/App.jsx → routing structure
- /frontend/src/components/ → existing components
- /backend/server.js → API routes and DB schema
- /backend/database.js → SQLite tables
Output: architecture-audit.md con lista di tutti i route, tabelle DB, componenti React esistenti

TASK 0.2 — DB schema design
Design new SQLite tables (with migrations) for:
- assessments: (id, plant_id, suc_name, suc_function, machine_operation, data_sharing, 
               access_points, physical_boundary, created_at, status)
- zones: (id, assessment_id, name, security_level_target, color, x, y, width, height)
- conduits: (id, assessment_id, source_zone_id, target_zone_id, type, label)
- zone_assets: (id, zone_id, asset_id)  → FK to existing assets table
- risk_events: (id, assessment_id, consequence, dangerous_situation, dangerous_activity,
               risk_description, consequence_text, type, likelihood, safety_impact,
               operational_impact, financial_impact, reputational_impact, calculated_risk,
               calculated_risk_label)
- iec_controls: (id, sr_code, re_code, title, sl1, sl2, sl3, sl4, category, description)
- zone_controls: (id, zone_id, control_id, applicable, present, sl_achieved, 
                 implements, sl_target, policy_text)
- policies: (id, assessment_id, zone_id, control_id, parameters_json, final, created_at)

TASK 0.3 — Seed IEC 62443-3-3 controls database
Populate iec_controls table with all SR/RE from IEC 62443-3-3:
Categories: IAC (Identification & Auth), UC (Use Control), SI (System Integrity),
DC (Data Confidentiality), RDF (Restricted Data Flow), TRE (Timely Response),
RA (Resource Availability)
Include: SR 1.1 through SR 7.8 with all RE sub-requirements and SL applicability flags.
```

---

### FASE 1 — Wizard IEC 62443 (7-Step) — CORE FEATURE

#### Step 1 — SUC Definition

```
TASK 1.1 — Route: /assessments/new → wizard step 1
Component: WizardStep1_SUC.jsx

Form fields:
- suc_name: string (required)
- suc_function: textarea — "Descrivi la funzione del sistema IACS"
- machine_operation: textarea — "Come opera la macchina?"
- data_sharing: textarea — "Quali dati vengono condivisi e con chi?"
- access_points: textarea — "Quali sono i punti di accesso (rete, fisico, remoto)?"
- physical_boundary: textarea — "Definisci il confine fisico del SUC"

UI: card-based layout, progress stepper in alto (Step 1/7 attivo), 
    pulsante "Next →" abilitato solo se suc_name e suc_function compilati.
    Salva in sessionStorage per navigazione avanti/indietro senza perdere dati.
    Auto-save to DB ogni 30s via PATCH /api/assessments/:id

TDD: 
- test: form validation (suc_name required)
- test: auto-save triggers at 30s interval
- test: Next disabled when required fields empty
```

#### Step 2 — Initial Cyber Security Risk Assessment

```
TASK 1.2 — Route: /assessments/:id/step/2
Component: WizardStep2_RiskAssessment.jsx

Features:
A) Assumptions/Hypotheses textarea
B) Risk event table (add/remove rows) with columns:
   - Cyber Attack Consequence (textarea)
   - Dangerous Situation Over Time (textarea)
   - Dangerous Activity (textarea)
   - Risk (textarea)
   - Consequences (textarea)
   - Type: radio (Immediate | Subsequent)

C) RISK MATRIX INTERATTIVA (ispirata all'immagine allegata: 5x5, colori green/yellow/orange/red)
   - Likelihood slider: 1 (Remote) → 5 (Certain)
   - Impact sliders per categoria:
     * Safety Impact: 1 (Trivial) → 5 (Critical)
     * Operational Impact: 1→5
     * Financial Impact: 1→5
     * Reputational Impact: 1→5
   - Calculated Risk = max(likelihood × impact per categoria)
   - Risk label: 
     * 1-4: LOW (green #22c55e)
     * 5-9: MEDIUM (yellow #eab308)  
     * 10-14: HIGH (orange #f97316)
     * 15-19: CRITICAL (red #ef4444)
     * 20-25: CATASTROPHIC (dark red #991b1b)
   - Risk Matrix SVG 5x5 renderizzata inline con cella evidenziata

RISK MATRIX COMPONENT (RiskMatrix5x5.jsx):
```jsx
// Matrice 5x5 conforme all'immagine risk_matrix.png
// Assi: X = Likelihood (1 Remote → 5 Certain), Y = Impact (1 Trivial → 5 Critical)
// Colori celle:
const RISK_COLORS = {
  low:          '#22c55e',  // 1-4
  medium:       '#eab308',  // 5-9  
  high:         '#f97316',  // 10-14
  critical:     '#ef4444',  // 15-19
  catastrophic: '#991b1b',  // 20-25
};
// Calcolo: risk = likelihood × impact
// Cella (impact, likelihood) evidenziata con bordo bianco 3px + scala 1.1
```

TDD:
- test: risk matrix calculates correctly (3×4 = 12 = HIGH)
- test: risk label boundaries exact (4=LOW, 5=MEDIUM, 9=MEDIUM, 10=HIGH, 25=CATASTROPHIC)
- test: add/remove risk event rows
- test: matrix cell highlight updates on slider change
```

#### Step 3 — Zone & Condotti Canvas

```
TASK 1.3 — Route: /assessments/:id/step/3
Component: WizardStep3_ZonesConduits.jsx

CANVAS INTERATTIVO (React Flow o canvas HTML5):
Toolbox panel (sinistra):
  - [+ Add Zone] → crea zona con colore random da palette
  - [+ Add Asset] → seleziona da asset inventory esistente
  - [Import from Library] → zone templates predefiniti (PLC Cell, DMZ, Enterprise, Safety)

Canvas centrale:
  - Zone come rect con bordo colorato + label (nome + SL badge)
  - Asset come icone dentro le zone (draggable)
  - Condotti come linee tracciate tra zone (drag da handle di zona a zona)
  - Conduit label editabile on double-click
  - Auto-arrange Layout button (algoritmo force-directed semplice)

Properties panel (destra):
  - Quando zona selezionata: edit nome, SL target (SL0/SL1/SL2/SL3/SL4), colore
  - Quando conduit selezionato: edit tipo (wired/wireless/fieldbus/remote), encryption

PRESET ZONE TEMPLATES (importabili da libreria):
  - "PLC Cell" → zona L2 con PLC, HMI, switch
  - "SCADA/HMI Level" → zona L3 con server SCADA
  - "Industrial DMZ" → zona DMZ tra L3 e L4  
  - "Enterprise Network" → zona L4 aziendale
  - "Safety System" → zona safety-critical SIL

Persistenza: POST /api/assessments/:id/zones e /api/assessments/:id/conduits
             con coordinate x,y,width,height

LIBRERIA REACT FLOW (usare reactflow@11):
```bash
npm install reactflow
```
Configurazione: sfondo a griglia, minimap opzionale, snap-to-grid 20px

TDD:
- test: add zone creates node in canvas
- test: drag creates conduit between two zones
- test: zone properties panel updates correctly
- test: auto-arrange positions non-overlapping
```

#### Step 4 — Tolerable Risk

```
TASK 1.4 — Route: /assessments/:id/step/4
Component: WizardStep4_TolerableRisk.jsx

Per ogni zona definita nello step 3:
  - Mostra risk score iniziale (dallo step 2)
  - Slider "Target Risk": imposta il livello di rischio tollerabile
  - Calcola: Security Level Target necessario per raggiungere il target
    * P_total < 2 → SL1
    * P_total 2-5 → SL2
    * P_total 6-12 → SL3
    * P_total > 12 → SL4
  - Visual: Risk Matrix con freccia da rischio attuale a target

Formula SL target:
  SL_target = ceil(log2(risk_score / target_threshold))
  (semplificata per UX, allineata alla logica IEC 62443-3-2)

TDD:
- test: SL target computed from risk thresholds
- test: SL target updates when slider changes
```

#### Step 5 — Detailed Risk & Controls (IEC 62443-3-3)

```
TASK 1.5 — Route: /assessments/:id/step/5
Component: WizardStep5_DetailedRisk.jsx

Gap Analysis panel:
  - SL-T (target da step 4) vs SL-A (achieved — calcolato dai controlli presenti)
  - Progress bar: quanti controlli del SL-T sono già presenti
  - Alert se SL-A < SL-T

Tabella controlli IEC 62443-3-3 (per zona selezionata):
Colonne: #, Controllo/Sotto-Controllo, SL1✓, SL2✓, SL3✓, SL4✓, 
         Applicabile☐, Presente☐, SL-A badge, Implementa☐, SL-A Target, Policy⚙

Logica:
  - Checkbox "Applicabile": se disabilitato, controllo non conta per SL-A
  - Checkbox "Presente": se attivo, +1 al SL-A per i livelli coperti
  - "Implementa": se attivo, pianificato ma non ancora presente
  - SL-A calcolato = max SL per cui tutti i controlli applicabili sono presenti
  - Badge SL-A: colore (SL0=red, SL1=orange, SL2=yellow, SL3=blue, SL4=green)

Compliance mappings per controllo (badge cliccabili):
  - NIS2 → articolo rilevante
  - CRA → Annex I requirement
  - NIST → control family
  - Machinery Reg → art. 1.1.9 / 1.2.1

Checksum integrità analisi (SHA-256 dell'assessment JSON):
  - Generato automaticamente ad ogni modifica
  - Mostrato come hex string per audit trail

TDD:
- test: SL-A calculation correct (all SR 1.x present → SL2 achieved)
- test: checksum regenerates on control change
- test: compliance badge links correct for NIS2 art. 18
- test: gap alert shown when SL-A < SL-T
```

#### Step 6 — Policy Generation

```
TASK 1.6 — Route: /assessments/:id/step/6
Component: WizardStep6_Policies.jsx

Per ogni controllo con "Implementa" attivo:
  Modal "Configure Policy: [SR code] — [titolo]"
  
  Policy Specific Parameters (sinistra):
    - Toggle switches per i requirement enhancement applicabili
    - Text fields per parametri specifici (es: "MFA methods", "Approved auth mechanisms")
  
  Policy Preview (destra):
    - Tab: Rendered | Raw
    - Auto-generata da template Markdown con parametri interpolati
    - Sezioni: 1.Policy Statement, 2.Scope, 3.Requirements, 4.Configuration Parameters
    - Checkbox "Mark as Final" → blocca la policy

AI-assisted policy generation (Anthropic API):
  Button: [🤖 Generate with AI]
  Prompt inviato: "Generate an IEC 62443 security policy for control {sr_code} 
                   titled '{title}' for a {suc_function} system. 
                   Parameters: {parameters_json}. 
                   Format as markdown with sections: Policy Statement, Scope, 
                   Requirements, Configuration Parameters."
  
  Backend endpoint: POST /api/assessments/:id/generate-policy
  Model: claude-sonnet-4-20250514

TDD:
- test: policy template renders with parameters
- test: "Mark as Final" disables editing
- test: AI generation endpoint returns valid markdown
- test: policy saved to DB with correct assessment_id
```

#### Step 7 — Report

```
TASK 1.7 — Route: /assessments/:id/step/7 
Component: WizardStep7_Report.jsx

Report generation → POST /api/assessments/:id/report

STRUTTURA REPORT MARKDOWN (con SVG embedded):
```
# Cybersecurity Risk Assessment Report
## {suc_name}
Generated: {date}

![Logo Tecnopack](./assets/tecnopack_logo.svg)
![Logo Siemens](./assets/siemens_logo.svg) <!-- se applicabile -->

---

## Indice dei Documenti
1. Definizione del System Under Consideration (SUC)
2. Analisi dei Rischi Informatici (Cyber Security Risk Assessment)
3. Partizionamento in Zone e Condotti
4. Inventario degli Asset
5. Specifica dei Requisiti di Sicurezza (CRS)
6. Policy di Sicurezza e Procedure di Implementazione
7. Matrice di Conformità Normativa (NIS2, CRA, NIST)
8. Elenco delle Contromisure Compensative

---

## 1. Definizione del System Under Consideration (SUC)
**Nome SUC:** {suc_name}
**Descrizione Funzionale:** {suc_function}
**Operatività Macchina:** {machine_operation}
**Data Sharing:** {data_sharing}
**Access Points:** {access_points}
**Confine Fisico:** {physical_boundary}

## 2. Analisi dei Rischi Informatici
### Risk Matrix
<!-- SVG della risk matrix con la cella del rischio evidenziata -->
{risk_matrix_svg}

### Scenari di Rischio
{risk_events_table}

## 3. Zone e Condotti
<!-- Esporta il canvas come SVG -->
{zones_conduits_svg}

## 4. Inventario degli Asset
{assets_table}

## 5. Specifica dei Requisiti di Sicurezza
{iec_controls_table}

## 6. Policy di Sicurezza
{policies_markdown}

## 7. Matrice di Conformità
| Controllo IEC | NIS2 | CRA Annex I | NIST | Machinery Reg |
|---|---|---|---|---|
{compliance_matrix_rows}

## 8. Contromisure Compensative
{compensating_controls}

---
*Documento generato da Tecnopack OT Security Dashboard v2 — IEC 62443 compliant*
*Checksum integrità: {sha256}*
```

Export buttons:
  - [Export Markdown] → scarica .md
  - [Export PDF] → usa Puppeteer esistente, converti markdown → HTML → PDF
  
PDF styling: font Geist/Inter, colori brand Tecnopack (teal #1D9E75), 
             A4, margini 20mm, header con logo SVG

TDD:
- test: report contains all 8 sections
- test: checksum matches assessment data
- test: PDF export returns 200 with content-type application/pdf
- test: SVG assets are embedded (no external URLs)
```

---

### FASE 2 — Feature Aggiuntive

#### Feature A — NIS2 / CRA Compliance Checker

```
TASK 2.1 — Compliance Module
Route: /compliance
Component: ComplianceDashboard.jsx

Three tabs:
1. NIS2 Art. 18 — checklist 10 misure obbligatorie con stato ✓/✗/◐
2. CRA Annex I — Essential cybersecurity requirements (Security Capabilities, 
                 Vulnerability Handling, Lifecycle Process, Documentation, Reporting)
3. Machinery Regulation — Req 1.1.9 (secure connections) + Req 1.2.1 (HW/SW protection)

Per ogni requisito: link alla norma originale, mapping ai controlli IEC 62443, status badge
Esporta: compliance_report.md con evidence per ogni requisito soddisfatto

TDD:
- test: NIS2 checklist has exactly 10 items from Art. 18
- test: CRA requirements map correctly to IEC 62443 SR codes
```

#### Feature B — Risk Matrix Interattiva Standalone

```
TASK 2.2 — Risk Matrix Widget
Component: RiskMatrixWidget.jsx (riusabile ovunque nel dashboard)

Props:
  - likelihood: number 1-5
  - impact: number 1-5
  - showLegend: boolean
  - interactive: boolean (slider mode vs display mode)
  - onRiskChange: (likelihood, impact, riskScore, riskLabel) => void

Rendering: SVG 5x5 con:
  - Gradiente colori come nella risk_matrix.png allegata
  - Cella attiva con bordo bianco 3px + number score
  - Axis labels: X = Likelihood (Remote/Unlikely/Possible/Likely/Certain)
                 Y = Impact (Trivial/Minor/Moderate/Major/Critical)
  - Legend: LOW/MEDIUM/HIGH/CRITICAL/CATASTROPHIC con colori

Storybook story per ogni combinazione boundary value

TDD:
- test: renders 25 cells
- test: cell (3,3) = MEDIUM score 9
- test: cell (5,5) = CATASTROPHIC score 25
- test: interactive mode emits correct values
```

#### Feature C — Asset Fingerprinting Automatico

```
TASK 2.3 — OT Asset Discovery
Backend: /backend/services/fingerprinting.js (già avviato in v2)

Enhance existing fingerprinting with:
- PROFINET DCP broadcast discovery (UDP port 65535)
- OPC-UA endpoint discovery (TCP 4840)
- Modbus TCP device scan (TCP 502)
- S7comm detection (TCP 102)
- BACnet discovery (UDP 47808)

For each discovered device:
  - Vendor ID → lookup in vendor_db.json (Siemens, B&R, Omron, Rockwell, Schneider)
  - Model detection from response packets
  - Firmware version if disclosed
  - Auto-tag: PLC / HMI / Switch / Drive / Safety / IO-Module

New endpoint: POST /api/discovery/scan { subnet: "192.168.1.0/24", protocols: [...] }
Progress via WebSocket: { type: "scan_progress", found: N, total: M, device: {...} }

TDD (mock network):
- test: PROFINET response parsing extracts MAC and device name
- test: vendor lookup returns correct vendor for Siemens OUI
- test: WebSocket emits progress events
- test: discovered devices are deduplicated by MAC
```

#### Feature D — Vulnerability Advisory Intelligence

```
TASK 2.4 — Enhanced Advisory Feed
Enhance existing advisory module:

New: CVE correlation with discovered assets
  - Match CVE vendor/product to asset inventory
  - Auto-create finding when CVE matches asset
  - Priority: CISA KEV > CVSS 9+ > CVSS 7+

New: ICS-CERT advisory feed (CISA ICS advisories)
  Endpoint: https://www.cisa.gov/cybersecurity-advisories/ics-advisories (RSS)
  Parser: extract affected products, CVEs, mitigations

New: Siemens ProductCERT feed
  Endpoint: https://cert-portal.siemens.com/productcert/rss/advisories.atom
  Parser: extract product name, CVE, CVSS, fix version

Dashboard widget: "Advisory Intelligence" with:
  - Count by severity (Critical/High/Medium)
  - Matched assets counter
  - Unpatched assets list
  - Time-to-patch recommendation based on CVSS

TDD:
- test: CVE matches asset with correct vendor/product
- test: CISA KEV feed parsed correctly
- test: advisory creates finding with CVSS score
```

---

### FASE 3 — Markdown Report con SVG Embedded

```
TASK 3.1 — SVG Asset Pipeline

Directory structure:
/assets/
  logos/
    tecnopack_logo.svg      ← logo Tecnopack (da richiedere/creare)
    siemens_logo.svg        ← logo Siemens 
    logbot_logo.svg         ← logo Logbot (se partnership)
  diagrams/
    iec62443_structure.svg  ← struttura standard IEC 62443 (4 layer)
    purdue_model.svg        ← Purdue Enterprise Reference Architecture
    risk_matrix_template.svg ← template risk matrix 5x5 vuoto
  icons/
    plc.svg, hmi.svg, switch.svg, firewall.svg, server.svg, workstation.svg

SVG embedding in Markdown reports:
  - Inline SVG (per report HTML/PDF): <img src="data:image/svg+xml;base64,{b64}">
  - File reference (per report .md): ![desc](./assets/diagrams/name.svg)

TASK 3.2 — Dynamic SVG Generation
Backend service: /backend/services/svgGenerator.js

Functions:
  generateRiskMatrixSVG(likelihood, impact) → SVG string
  generateZonesConduitsSVG(zones, conduits) → SVG string  
  generateSecurityLevelGaugeSVG(slTarget, slAchieved) → SVG gauge
  generateCompliancePieSVG(compliant, total) → SVG donut chart

All SVGs: self-contained, no external dependencies, dark-mode safe with CSS variables

TDD:
- test: generateRiskMatrixSVG returns valid SVG with 25 cells
- test: highlighted cell matches (likelihood, impact) input
- test: SVG is valid XML (parse with DOMParser)
```

---

### FASE 4 — Testing Strategy (TDD + Code Review)

```
TASK 4.1 — Test Infrastructure Setup

Backend (Jest):
/backend/__tests__/
  wizard.test.js       ← API endpoints wizard steps 1-7
  zones.test.js        ← zone/conduit CRUD
  controls.test.js     ← IEC 62443-3-3 controls DB
  policies.test.js     ← policy generation
  svg.test.js          ← SVG generator functions
  fingerprinting.test.js
  advisory.test.js

Frontend (Vitest + Testing Library):
/frontend/src/__tests__/
  WizardStep1_SUC.test.jsx
  WizardStep2_RiskAssessment.test.jsx
  RiskMatrix5x5.test.jsx          ← visual regression with @vitest/snapshot
  WizardStep3_ZonesConduits.test.jsx
  WizardStep5_DetailedRisk.test.jsx
  WizardStep6_Policies.test.jsx
  WizardStep7_Report.test.jsx

E2E (Playwright):
/e2e/
  complete-assessment-flow.spec.ts  ← full wizard SUC → report
  risk-matrix-interaction.spec.ts
  zone-canvas-interaction.spec.ts
  report-export.spec.ts

TASK 4.2 — Code Review Checklist (CODE-REVIEWER AGENT)

Per ogni PR verificare:
□ IEC 62443 terminology correct (SR not "requirement", SL not "level")
□ No hardcoded IPs or credentials
□ SQLite migrations don't break existing data
□ React components have PropTypes or TypeScript interfaces
□ Tailwind classes use design system (teal-600 for primary, not arbitrary colors)
□ API endpoints validate input with Zod or Joi
□ WebSocket events have type discriminants
□ SVG generation produces valid XML
□ Markdown templates have no XSS vectors
□ All new routes documented in /docs/api.md

TASK 4.3 — Security Review (SECURITY-REVIEWER AGENT)

□ No OT data sent to external services without explicit user opt-in
□ Anthropic API key stored in .env, never committed
□ AI-generated policy text sanitized before DB insert
□ File upload (if any) restricted to SVG/PNG types and size-capped
□ SQLite queries use parameterized statements (no string concatenation)
□ CORS restricted to localhost in development
□ Report PDF generation uses Puppeteer sandbox mode
```

---

### FASE 5 — CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - run: cd backend && npm ci && npm test
      - run: cd backend && npm run test:coverage
      
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - run: cd frontend && npm ci && npm run test
      
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run start & sleep 5 && npm run test:e2e
      
  code-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run ESLint
        run: cd frontend && npm run lint
      - name: Check IEC terminology
        run: grep -r "security level" --include="*.jsx" . | grep -v "Security Level" | wc -l
        # Fails if lowercase "security level" found (should be "Security Level" or "SL")
```

---

## 🚀 EXECUTION ORDER

Incolla questo prompt in una sessione Claude Code con il repo clonato localmente.
Usa il comando `/plan` per generare il task breakdown dettagliato prima di codificare.

```bash
# Setup iniziale
git clone https://github.com/DFFM-maker/DashboardIEC62443.git
cd DashboardIEC62443

# Installa nuove dipendenze
cd backend && npm install zod jest @jest/globals
cd ../frontend && npm install reactflow vitest @testing-library/react @testing-library/jest-dom

# Avvia Claude Code con tutto il contesto
claude code
```

### Ordine di implementazione (priorità):

| Sprint | Task | Output atteso |
|--------|------|---------------|
| 1 | TASK 0.1 + 0.2 + 0.3 | Audit, schema DB, seed controls |
| 2 | TASK 1.1 + 1.2 | Steps 1-2 wizard + Risk Matrix SVG |
| 3 | TASK 1.3 | Zone/condotti canvas (React Flow) |
| 4 | TASK 1.4 + 1.5 | Tolerable risk + Gap analysis SL |
| 5 | TASK 1.6 + 1.7 | Policy gen + Report Markdown+PDF |
| 6 | TASK 2.1 + 2.2 | NIS2/CRA checker + Risk Matrix widget |
| 7 | TASK 2.3 + 2.4 | Asset fingerprint + Advisory intel |
| 8 | TASK 3.1 + 3.2 | SVG pipeline + report embedding |
| 9 | TASK 4.1 + 4.2 + 4.3 | Full test suite + reviews |
| 10 | TASK 5 | CI/CD pipeline |

---

## 📐 DESIGN SYSTEM

```css
/* Tailwind custom colors — aggiungi a tailwind.config.js */
colors: {
  ot: {
    teal:    '#1D9E75',  /* primary brand */
    dark:    '#085041',  /* dark variant */
    light:   '#E1F5EE',  /* backgrounds */
  },
  risk: {
    low:          '#22c55e',
    medium:       '#eab308',
    high:         '#f97316',
    critical:     '#ef4444',
    catastrophic: '#991b1b',
  },
  sl: {
    sl0: '#9ca3af',
    sl1: '#f97316',
    sl2: '#eab308',
    sl3: '#3b82f6',
    sl4: '#22c55e',
  }
}
```

---

## 📎 ASSET ALLEGATI

- **risk_matrix.png** → implementa esattamente questa matrice 5×5 in RiskMatrix5x5.jsx
  - Colori: verde (1-5), giallo (6-9), arancione (10-14), rosso (15-25)
  - Assi: Y = Impact (Trivial/Minor/Moderate/Major/Critical), X = Likelihood (Remote/Unlikely/Possible/Likely/Certain)
  - Score = Likelihood × Impact
  - Font bianco bold per i numeri nelle celle colorate

- **Logo SVG**: creare /assets/logos/dashboard_iec62443.svg con testo "OT Security" 
  e icona shield in teal #1D9E75

---

## 🔗 RIFERIMENTI NORMATIVI EMBEDDED NEL CODICE

```javascript
// /backend/data/iec62443_references.js
export const NORMATIVE_REFERENCES = {
  IEC62443: {
    '2-1': 'Establishing an IACS security program',
    '2-4': 'Requirements for IACS service providers', 
    '3-2': 'Security risk assessment for system design',
    '3-3': 'System security requirements and security levels',
    '4-1': 'Product security development life-cycle requirements',
    '4-2': 'Technical security requirements for IACS components',
  },
  NIS2: {
    art18: 'Cybersecurity risk management measures',
    art23: 'Reporting obligations',
  },
  CRA: {
    annexI: 'Essential cybersecurity requirements',
    art13: 'Obligations of manufacturers',
  },
  MachineryReg: {
    req1_1_9: 'Protection against corruption — cybersecurity',
    req1_2_1: 'Safety and reliability of control systems',
  }
};
```

---

*Prompt generato il 26 marzo 2026 — Dashboard IEC 62443 v2.x Roadmap*  
*Compatibile con: Claude Code, Cursor, Opencode, GitHub Copilot Agent*  
*Framework: everything-claude-code (affaan-m) — Skills: planner, code-reviewer, tdd-guide, security-reviewer*