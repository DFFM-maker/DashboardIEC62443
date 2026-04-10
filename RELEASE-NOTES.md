# Release Notes

## v3.5.0 — 2026-04-10

### Wizard Report — Fix Gap Analysis sezioni 3 e 4, HTML endpoint, PDF migliorato

#### Backend — `wizard_report.js` (riscrittura completa)

**Fix logico sezione 3 (Zone di Sicurezza):**
- Le zone senza `zone_controls` (assessment custom, non inizializzate dal wizard Step 5) mostrano ora `N/D` per controlli applicabili/implementati/gap e un avviso: _"⚠ Gap analysis non completata — eseguire il wizard Step 5"_.
- In precedenza questi valori venivano mostrati come `0` dando l'impressione errata di un assessment completo.

**Fix logico sezione 4 (Gap Analysis):**
- La query ora legge esclusivamente i `zone_controls` con `applicable=1` per la zona.
- Tabella doppia per zona: _Controlli implementati (✓)_ separati dai _Controlli in GAP (⚠)_.
- Zone senza `zone_controls` mostrano l'avviso: _"⚠ Gap analysis non disponibile per questa zona"_ invece di una tabella vuota.

**Altri fix nel backend:**
- **Condotti**: la query usa `JOIN zones` per mostrare i nomi leggibili al posto degli UUID.
- **Asset Inventory**: `JOIN zone_assets + zones` aggiunge la colonna `security_zone` a ciascun asset.
- **Policy**: caricamento con JOIN su `iec_controls` (sr_code, titolo) e `zones` (nome zona). De-duplicazione: se esiste una versione `final`, ha la precedenza sulla bozza.
- **SL-A**: aggiunto `SL-0` alla mappatura numerica, evitando che zone con `SL-0` causassero un calcolo errato.
- **Nuovo endpoint HTML**: `GET /wizard-report/html` — report styled direttamente nel browser, senza download.

#### Backend — `reportService.js` (PDF)
- Le zone non analizzate (senza `zone_controls`) mostrano ora la riga di avviso nel PDF invece di causare un crash o mostrare `0/0`.
- Gap Analysis nel PDF: tabella doppia (implementati ✓ + gap ⚠) allineata con la logica Markdown/HTML.

#### Frontend — `WizardStep7_Report.jsx`
- Rimossi gli stati `downloadingMd` / `downloadingPdf` e la logica blob URL che causava errori di download su Chrome.
- Il download MD e PDF ora avviene tramite link diretto all'endpoint backend (anchor tag con `href`), compatibile con tutti i browser.

#### Backend — `zones.js`
- Fix minore nella rotta `DELETE /api/zones/:id`.

**Build frontend: OK. Service restart: OK.**

---

## v3.4.0 — 2026-04-02

### Edit Assessment & Policy Templates Fallback

#### Frontend — Assessments.jsx
- **Bottone Modifica**: Aggiunta icona matita (`Pencil`) nella card di ogni assessment, tra "Dettagli" e il cestino.
- **Modal di Modifica**: Nuovo modal pre-compilato con tutti i dati esistenti dell'assessment (nome, subnet, cliente, assessor, SL target, SNMP community, note). Chiama `PUT /api/assessments/:id` al salvataggio.
- I dati del wizard (SUC, zone, policy) non vengono toccati dalla modifica.

**Build frontend: OK.**

---

## v3.3.0 — 2026-04-02

### Policy Templates Fallback & Sidebar Fix

#### Frontend — WizardStep6_Policies.jsx
- **DEFAULT_POLICY_TEMPLATES**: Aggiunto dizionario di fallback con 12 template in italiano per gli SR più comuni della baseline IEC 62443-3-3 (SR 1.1, 1.2, 1.3, 3.2, 3.4, 4.1, 5.1, 5.2, 6.2, 7.1, 7.3, 7.8).
- **Pre-fill automatico**: Quando il backend non restituisce una policy standard per un SR (zona senza template o SR non coperto), il sistema applica automaticamente il template locale come fallback. Il testo salvato dall'utente non viene mai sovrascritto.
- **SR 4.1 contestualizzata**: Il template SR 4.1 distingue esplicitamente tra traffico interno alla Cell/Area Zone (plaintext per requisiti di latenza deterministica) e traffico remoto perimetrale (cifratura TLS 1.2+/VPN obbligatoria), evitando conflitti con protocolli industriali come CIP Security.
- **Ordine di priorità policy**: testo salvato > standard dal backend > DEFAULT_POLICY_TEMPLATES > vuoto.

#### Frontend — Sidebar.jsx
- **Fix logo "OT Security"**: Risolto il clipping della lettera "Y" nel testo del logo. Layout refactored da verticale a orizzontale (`flex items-center gap-3`), rimossi gli stili inline, applicato `leading-tight` come soluzione Tailwind-only.

**Build frontend: OK.**

---

## v3.2.0 — 2026-04-02

### Persistent Topology Deletion & Standard DMZ Initialization

Migliorata l'affidabilità del canvas delle zone e introdotta una nuova architettura di default conforme alle best practice IEC 62443 per la segmentazione IT/OT.

#### Frontend — WizardStep3_ZonesConduits.jsx
- **Delete Persistente**: Implementati gli handler `onNodesDelete` e `onEdgesDelete` per React Flow.
- **Sincronizzazione API**: La cancellazione di zone e condotti tramite tastiera (Backspace/Delete) ora invoca correttamente i rispettivi endpoint API (`api.deleteZone`, `api.deleteConduit`).
- **Prompt di Conferma**: Aggiunto un popup di conferma (`window.confirm`) prima dell'eliminazione di zone/nodi per prevenire perdite accidentali di dati.
- **Refresh Automatico**: Dopo ogni operazione di eliminazione, il sistema esegue un refresh completo dello stato (`loadAll`) per garantire l'allineamento con il database.

#### Backend — Deletion Cascade
- **`backend/routes/zones.js`**: Aggiornata la rotta `DELETE /api/zones/:id` per includere la cancellazione manuale in CASCADE dei condotti associati alla zona eliminata. Questo risolve il problema dei "condotti orfani" nel database SQLite.

#### Backend — Standard DMZ Topology
- **`backend/routes/assessments.js`**: Refactoring dell'endpoint `init-zones`. Ora inizializza una topologia a 3 zone basata su architettura DMZ Secomea/Gateway:
    1. **Rete IT Aziendale** (SL-0, Grigia): Zona esterna, solo inventario.
    2. **DMZ Secomea / Gateway** (SL-1, Arancione): Zona di transito per traffico WAN/VPN.
    3. **Rete Piatta Macchina (TCO2357)** (SL-2, Verde): Zona OT/Cell per i componenti critici.
- **Auto-conduits**: Creazione automatica dei condotti tra IT->DMZ (*Traffico WAN / VPN Inbound*) e DMZ->OT (*Port Forwarding / NAT OPC UA*).
- **`backend/data/zone_templates.js`**: Aggiornati i template predefiniti per riflettere la nuova architettura di riferimento.

**Build frontend: OK. Service restart: OK. Verifica persistenza: OK.**

---

## v3.1.0 — 2026-04-01

### Standard Policies IEC 62443-3-3 for Security Zones

Implementato il sistema di policy standard basate sui 15 SR della baseline IEC 62443-3-3, contestualizzate per zona di sicurezza.

#### Backend — policies_seed.js
- Creato il nuovo file `backend/data/policies_seed.js` con policy standard complete per tutti gli SR di baseline
- Copertura completa dei **15 SR della baseline** (1.2, 1.3, 1.7, 2.1, 2.8, 3.2, 3.4, 4.1, 4.3, 5.1, 5.2, 6.2, 7.1, 7.3, 7.8)
- Policy contestualizzate per tipologia di zona: **PLC-Zone**, **HMI-Zone**, **Router-Zone**, **Driver-Zone**
- Testo strutturato secondo le linee guida: **Obiettivo**, **Ambito**, **Requisiti** (3-5 punti operativi e misurabili)
- Linguaggio tecnico ma comprensibile, con riferimenti normativi specifici IEC 62443-3-3
- Esempi di qualità elevata seguendo le linee guida fornite (es. SR 5.1 Network Segmentation, SR 4.1 Information Confidentiality)

#### Backend — Standard Policies Endpoint
- `GET /api/policies/standard?zone_template=...`: Endpoint per recuperare le policy standard filtrate per template di zona
- Restituisce JSON strutturato per facile consumo dal frontend

#### Frontend — WizardStep6_Policies
- **Auto-prefilling migliorato**: Quando si apre lo step 6, se una zona ha un template e non ha ancora policy text, il sistema carica automaticamente le standard da `/api/policies/standard`
- **Source Badges**: Etichette visive per distinguere l'origine della policy:
  - `STANDARD` (Grigio): Policy pre-caricata dallo standard IEC 62443-3-3
  - `AI` (Viola): Policy generate tramite LM Studio (Local LLM)
  - `PERSONALIZZATA` (Verde): Policy modificate manualmente dall'assessor
- Bottone "Genera con AI ✨" disponibile per sovrascrivere la policy standard con una personalizzata per il SUC
- UI migliorata con gestione dei badge e feedback visivo

---

## v3.0.0 — 2026-04-01

### Automated Standard Policies IEC 62443

Implementato il pre-caricamento delle policy standard basate sui 15 SR della baseline IEC 62443-3-3 per zona.

#### Backend — policies_seed.js
Riorganizzato e completato il file `backend/data/policies_seed.js`:
- Copertura completa dei **15 SR della baseline** (1.2, 1.3, 1.7, 2.1, 2.8, 3.2, 3.4, 4.1, 4.3, 5.1, 5.2, 6.2, 7.1, 7.3, 7.8).
- Policy contestualizzate per tipologia di zona: **PLC-Zone**, **HMI-Zone**, **Router-Zone**, **Driver-Zone**.
- Testo strutturato secondo le linee guida: **Obiettivo**, **Ambito**, **Requisiti**.

#### Backend — AI Policy Generation (LM Studio)
- `backend/routes/policies.js`: Mantenuta la generazione tramite **LM Studio** (Local LLM) per garantire privacy e operatività offline.
- Utilizza l'API OpenAI-compatible all'indirizzo `http://172.16.238.200:1234`.
- Supporto per prompt strutturati IEC 62443: **Obiettivo**, **Ambito**, **Requisiti**.
- Risolto errore di avvio server tramite `npm rebuild better-sqlite3`.

#### Backend — Standard Policies Endpoint
- `GET /api/policies/standard?zone_template=...`: Nuovo endpoint per recuperare i testi standard delle policy filtrati per template di zona.

#### Frontend — WizardStep6_Policies
- **Auto-prefilling**: Se una zona ha un template (es. PLC-Zone) e non ha ancora una policy redatta, il sistema pre-carica automaticamente il testo standard.
- **Source Badges**: Introdotte nuove etichette visive per distinguere l'origine della policy:
  - `STANDARD` (Grigio): Testo pre-caricato dal database normativo.
  - `AI` (Viola): Testo generato tramite Google Gemini.
  - `PERSONALIZZATA` (Blu): Testo modificato manualmente dall'assessor.
- UI migliorata con `flex-wrap` per gestire più badge (es. Fonte + Finalizzata).

---

Implementato sistema di template zone guidate dalle Linee Guida Sicurezza OT IEC 62443.

#### DB — Migration 005
Aggiunte 4 nuove colonne alla tabella `zones`:
- `excluded_from_assessment` (INTEGER 0/1): la zona è esclusa da Gap Analysis e scoring SL-A
- `excluded_from_report` (INTEGER 0/1): la zona non appare nel report PDF
- `inventory_only` (INTEGER 0/1): la zona è usata solo come inventario asset
- `zone_template` (TEXT): chiave template di origine (es. `PLC-Zone`, `Management-Zone`)

#### Backend — zone_templates.js
Nuovo file `backend/data/zone_templates.js` con:
- `BASELINE_SR`: 15 SR minimi IEC 62443-3-3 per l'assessment di base
- `ZONE_TEMPLATES`: 5 template (PLC-Zone, HMI-Zone, Router-Zone, Driver-Zone, Management-Zone) con colori, SL e SR di default

#### Backend — POST /api/assessments/:id/init-zones
Nuovo endpoint che crea automaticamente le 5 zone template se l'assessment non ha ancora zone.
- Idempotente: restituisce `{ skipped: true }` se le zone esistono già
- Inserisce zone_controls con `applicable=1, present=0` per gli SR di default di ogni zona
- Management-Zone: `excluded_from_assessment=1`, `excluded_from_report=1`, `inventory_only=1`, nessun SR

#### Backend — Report filtering
- `reportService.js`: query zone filtra `excluded_from_report = 0`; aggiunta nota nel PDF se zone escluse
- `wizard_report.js`: `buildWizardData` filtra `excluded_from_assessment = 0`; nota in markdown per zone escluse

#### Frontend — WizardStep3 (Zone & Conduit Map)
- Chiama automaticamente `POST /init-zones` al mount (idempotente)
- Le 5 zone template appaiono pre-posizionate sul canvas con i colori IEC
- Badge "Solo inventario" per Management-Zone; badge nome template per le altre
- Bordo colorato basato su `zone.color` dal DB; bordo tratteggiato per `inventory_only`

#### Frontend — WizardStep5 (Gap Analysis)
- Filtra le zone con `excluded_from_assessment=1` (non mostrate come tab)
- Banner informativo se ci sono zone escluse: "La Gap Analysis include solo le zone operative"
- SR limitati ai 15 BASELINE_SR di default; toggle "Mostra tutti gli SR IEC 62443-3-3" per utenti avanzati

#### Test
Aggiunto `backend/__tests__/init_zones.test.js` con 9 test case.

---

## v2.9.1 — 2026-03-30

### LM Studio — Sostituzione Gemini con LLM locale

#### `backend/routes/policies.js` — aggiornato
- `POST /api/assessments/:id/generate-policy` — ora chiama **LM Studio** (OpenAI-compatible API)
  anziché Google Gemini. Usa `fetch` nativo verso `ANTHROPIC_BASE_URL/v1/chat/completions`
  con `Authorization: Bearer <ANTHROPIC_AUTH_TOKEN>`. Nessuna dipendenza SDK esterna.
- Rimosso `require('@google/generative-ai')` — dipendenza Gemini non più necessaria.

#### `backend/.env` — aggiornato
- Aggiunte variabili LM Studio:
  - `ANTHROPIC_BASE_URL=http://172.16.238.200:1234`
  - `ANTHROPIC_AUTH_TOKEN=lmstudio`
  - `ANTHROPIC_MODEL=qwen2.5-coder-7b-instruct`

#### `frontend/src/pages/wizard/WizardStep6_Policies.jsx` — aggiornato
- Messaggio errore aggiornato da "Errore generazione AI Gemini" a "Errore generazione AI LM Studio"

---

## v2.9.0 — 2026-03-30

### TASK 1.6 — WizardStep6_Policies: AI Policy Generation + Finalize

#### `backend/routes/policies.js` — aggiornato
- `POST /api/assessments/:id/generate-policy` — ora chiama Google Gemini API (gemini-1.5-flash)
  con prompt IEC 62443 strutturato (Obiettivo / Ambito / Requisiti). Salva in tabella `policies` con `INSERT OR REPLACE` + aggiorna `zone_controls.policy_text`.
  Richiede `GEMINI_API_KEY` configurata nel `.env`.
- `GET /api/assessments/:id/policies` — lista policy per assessment
- `PATCH /api/assessments/:id/policies/:policyId` — aggiorna `final` (0/1) e/o `policy_markdown`

#### `frontend/src/pages/wizard/WizardStep6_Policies.jsx` — riscritto (Premium Aesthetic)
- **UI Ridisegnata**: sfondo nero, glassmorphism, gradienti, animazioni Framer Motion.
- Pulsante **"Genera con AI ✨"** (viola/sfumato): chiama Gemini API, popola card con testo AI via streaming/skeleton state
- **Badge SR code + Titolo**: stili migliorati per ogni card di controllo con gap
- **Checkbox "Finalizza"**: permette di selezionare quali policy includere nel report.
- **Counter "Finalizzate / Totali"**: calcolo automatico cross-zone dei gap mitigati.
- **Next abilitato sempre**: navigazione libera verso lo step finale (Step 7).

#### `backend/.env`
- Aggiunta riga `GEMINI_API_KEY=` (compilata con chiave Pro)

#### `@google/generative-ai` — installato (npm install)

---

### TASK 1.7 — WizardStep7_Report: 3 card export + PDF Wizard

#### `backend/routes/wizard_report.js` — nuovo file
- `GET /api/assessments/:id/wizard-report` — genera e scarica markdown completo:
  sezioni 1.SUC / 2.Risk Assessment / 3.Zone e Condotti / 4.Gap Analysis / 5.Policy (finalizzate prioritarie) / 6.Asset Inventory / 7.Finding
- `POST /api/assessments/:id/wizard-report/pdf` — genera PDF wizard tramite reportService.generateWizardPdf()

#### `backend/services/reportService.js` — aggiornato
- Aggiunta funzione `generateWizardPdf(data)`: HTML self-contained con cover, 7 sezioni,
  @page :first CSS trick (no header/footer sulla cover), logo e header standard Tecnopack su pagine 2+
- Export: `module.exports = { generateReport, generateWizardPdf }`

#### `frontend/src/pages/wizard/WizardStep7_Report.jsx` — riscritto
- **Banner di completamento** verde (tutti 7 step completati)
- **3 card export** (griglia 3 colonne):
  1. "Scarica Markdown .md" → `GET /wizard-report` con blob download
  2. "Scarica PDF Wizard" → `POST /wizard-report/pdf` con blob download + spinner
  3. "Apri Report HTML" → link `<a target="_blank">` verso `/api/assessments/:id/report/html`
- Sezioni report invariate (SUC, Risk Events, Zone, Gap & Policy)
- Rimosso pulsante "Print / PDF" (sostituito dalle card)

#### `frontend/src/lib/api.js` — aggiornato
- `generatePolicy(assessmentId, data)` — POST generate-policy
- `getPolicies(assessmentId)` — GET policies
- `patchPolicy(assessmentId, policyId, data)` — PATCH policies/:id
- `downloadWizardMarkdown(assessmentId)` — GET wizard-report (raw fetch)
- `generateWizardPdf(assessmentId)` — POST wizard-report/pdf (raw fetch)

#### `backend/server.js` — aggiornato
- Registrate 2 nuove route: `policies.js` e `wizard_report.js`

**Build frontend: OK. Test endpoint: policies [], wizard-report markdown OK (6.3 KB), wizard PDF OK (180 KB / 1 MB con findings).**

---

## v2.8.0 — 2026-03-26

### Feature: TASK 1.7 — Wizard Step 7 (Report Finale + Export)

Report finale del wizard IEC 62443 con KPI aggregati, export Markdown e print/PDF.

#### `frontend/src/pages/wizard/WizardStep7_Report.jsx` — nuova pagina
- **KPI dashboard**: zone, risk events, copertura % totale, gap residui
- **Sezione SUC**: tutti i campi compilati allo Step 1
- **Tabella Risk Events**: descrizione, likelihood, impact, score, livello
- **Tabella Zone**: SL-T, controlli coperti/totali, copertura %, gap count con icona
- **Sezione Gap & Policy**: lista controlli con gap e policy text redatte allo Step 6
- **Export Markdown**: genera `.md` con `Blob` + `URL.createObjectURL`, download diretto
- **Print / PDF**: chiama `window.print()`, compatibile con `@media print`
- Pulsante "Completa Assessment" torna a `/assessments/:id`

#### `backend/routes/report.js` — nuova route
- `GET /api/assessments/:id/report` — aggregazione completa: assessment, suc, risk_events, zones (con stats gap), gap_controls (con policy_text)
- Calcolo copertura per zona: query `iec_controls` filtrata per SL-T × `zone_controls`

#### `frontend/src/lib/api.js`
- Aggiunto: `getReport(assessmentId)`

#### `frontend/src/App.jsx`
- Route `/assessments/:id/step/7` → `WizardStep7_Report`

**Test: 75/75 frontend + 37/37 backend GREEN. Build pulita.**

---

## v2.7.0 — 2026-03-26

### Feature: TASK 1.6 — Wizard Step 6 (Policy per controlli con Gap)

Redazione e salvataggio delle policy di remediation per i controlli IEC 62443-3-3 con gap.

#### `frontend/src/pages/wizard/WizardStep6_Policies.jsx` — nuova pagina
- Mostra solo i controlli **con gap** (applicable=1, present=0) per la zona attiva
- **Tab per zona** con badge contatore gap e icona ✓ se zero gap
- **Editor textarea** per ogni policy, con auto-fill template per categoria (IAC, UC, SI, DC…)
- **Pulsante "Generate"**: inserisce template Markdown predefinito con checklist azioni
- **Pulsante "Save"**: chiama `POST /api/zone-controls` (upsert) con `policy_text`
- Feedback visivo "Salvato" con auto-hide 2s
- Contatore gap totali cross-zone nell'header
- Navigazione Back → Step 5 / Generate Report → Step 7

#### `frontend/src/App.jsx`
- Route `/assessments/:id/step/6` → `WizardStep6_Policies`

**Test: 75/75 frontend + 37/37 backend GREEN.**

---

## v2.6.0 — 2026-03-26

### Feature: TASK 1.5 — Wizard Step 5 (Gap Analysis SL-T vs SL-A)

Analisi del gap tra Security Level Target (SL-T) e Security Level Achieved (SL-A) per ogni zona, basata sui controlli IEC 62443-3-3.

#### `frontend/src/pages/wizard/WizardStep5_GapAnalysis.jsx` — nuova pagina
- **Tab per zona**: una tab per ogni zona con contatore `n/tot controlli coperti`
- **Tabella controlli** filtrata per SL-T della zona, raggruppata per categoria (IAC, UC, SI, DC, RDF, TRE, RA)
- **Checkbox "Present"** per ogni controllo: calcola automaticamente SL-A e salva via `POST /api/zone-controls` (upsert)
- Badge gap: **OK** (verde), **GAP Δn** (giallo), **GAP** (rosso se non implementato)
- Header di zona con badge `SL-T: SL-x`

#### `backend/routes/zone_controls.js` — nuova route
- `GET /api/zone-controls?zone_id=...` — lista controlli per zona
- `GET /api/zone-controls?assessment_id=...` — tutti i controlli di tutte le zone di un assessment
- `POST /api/zone-controls` — **upsert** (crea o aggiorna per zone_id + control_id)

#### `frontend/src/lib/api.js`
- Aggiunti: `getIecControls(params)`, `getZoneControls(params)`, `upsertZoneControl(data)`

#### `frontend/src/App.jsx`
- Route `/assessments/:id/step/5` → `WizardStep5_GapAnalysis`

**Test: 58/58 frontend + 37/37 backend GREEN.**

---

## v2.5.0 — 2026-03-26

### Fix: deploy.sh — health check con retry post-restart

#### `deploy.sh`
- Dopo `systemctl restart`, loop `curl /api/health` fino a 15 tentativi (1s ciascuno)
- Se il backend non risponde entro 15s: `fail` con suggerimento `journalctl`
- Log versione backend estratta dalla risposta JSON al completamento
- Elimina il caso "backend carica il vecchio codice senza accorgersene"

---

## v2.5.0-task1.4 — 2026-03-26

### Feature: TASK 1.4 — Wizard Step 4 (Tolerable Risk — SL-T per zona)

Selezione del Target Security Level per ogni zona sulla base dei rischi identificati nello Step 2.

#### `frontend/src/pages/wizard/WizardStep4_TolerableRisk.jsx` — nuova pagina
- **Tabella zone** con dropdown SL-T inline (SL-1 → SL-4) e save immediato via `PUT /api/zones/:id`
- **Banner contesto** con rischio massimo da Step 2 (se presente)
- **Legenda SL** con descrizione normativa IEC 62443-3-3 per ogni livello
- Colori differenziati per SL: blu (SL-1), verde (SL-2), giallo (SL-3), rosso (SL-4)
- Empty state se nessuna zona definita

#### `frontend/src/App.jsx`
- Route `/assessments/:id/step/4` → `WizardStep4_TolerableRisk`

**Test: 58/58 frontend + 37/37 backend GREEN.**

---

## v2.4.0 — 2026-03-26

### Feature: TASK 1.3 — Wizard Step 3 (Zone & Conduits Canvas) + deploy.sh

Canvas React Flow per la definizione di zone di sicurezza e condotti. Script di deploy automatizzato.

#### `frontend/src/pages/wizard/WizardStep3_ZonesConduits.jsx` — nuova pagina
- Canvas **React Flow** full-height con background grid, Controls, MiniMap
- Sidebar sinistra con lista zone e form inline "Add Zone"
- Drag & drop nodi sul canvas con persistenza posizione via `PUT /api/zones/:id`
- Connessione edge tra zone → crea condotto via `POST /api/conduits`
- Contatore zone/condotti nel pannello top-right
- Navigazione Back → Step 2 / Next → Step 4

#### `frontend/src/components/wizard/ZoneNode.jsx` — nuovo componente
- Nodo React Flow custom con colori per SL-1 (blu) / SL-2 (verde) / SL-3 (giallo) / SL-4 (rosso)
- Handle su 4 lati (source + target) per connessioni multi-direzionali
- Ring visivo quando selezionato

#### `backend/routes/conduits.js` — nuova route
- `GET /api/conduits?assessment_id=...` — lista condotti con nome zone join
- `POST /api/conduits` — crea condotto tra due zone
- `DELETE /api/conduits/:id` — elimina condotto

#### `backend/routes/zones.js`
- `PUT /api/zones/:id` aggiornato per persistere `x`, `y`, `width`, `height` (coordinate canvas React Flow)

#### `frontend/src/lib/api.js`
- Aggiunti: `updateZone`, `deleteZone`, `getConduits`, `createConduit`, `deleteConduit`

#### `frontend/src/App.jsx`
- Route `/assessments/:id/step/3` → `WizardStep3_ZonesConduits`

#### `deploy.sh` — nuovo script radice
- `git pull` → `npm install --omit=dev` (backend) → `npm install && npm run build` (frontend) → `sudo systemctl restart ot-dashboard`
- Supporta flag `--no-restart` per ambienti CI
- Output colorato con log per ogni fase

**@xyflow/react** installato come dipendenza frontend.

**Test: 41/41 frontend + 37/37 backend GREEN. Build pulita (496KB JS gzip: 89KB).**

---

## v2.3.0 — 2026-03-26

### Feature: TASK 1.1 + 1.2 — Wizard Step 1 (SUC) + Step 2 (Risk Assessment)

Sprint 2 del wizard IEC 62443. Aggiunge i primi due step navigabili del wizard con form, auto-save, matrice di rischio interattiva e CRUD degli scenari di rischio.

#### `backend/migrations/004_assumptions_field.sql` — nuova migration
- Aggiunge la colonna `assumptions TEXT` alla tabella `assessments` (Step 2)

#### `backend/routes/assessments.js`
- Nuovo endpoint `PATCH /api/assessments/:id` con whitelist sicura dei campi modificabili (previene SQL injection)
- Campo `assumptions` aggiunto alla whitelist

#### `backend/routes/risk_events.js` — nuova route
- `GET /api/assessments/:id/risk-events` — lista scenari di rischio per assessment
- `POST /api/assessments/:id/risk-events` — crea nuovo scenario
- `PUT /api/assessments/:id/risk-events/:eventId` — aggiorna scenario
- `DELETE /api/assessments/:id/risk-events/:eventId` — elimina scenario
- Whitelist campi: `consequence`, `risk_description`, `likelihood`, `safety_impact`, `calculated_risk`, `calculated_risk_label`, ecc.

#### `backend/__tests__/wizard_api.test.js` — nuovi test
- 6 test sulla logica PATCH (whitelist, partial update, campo non valido)

#### `frontend/src/pages/wizard/WizardStep1_SUC.jsx` — nuova pagina
- Form 6 campi SUC (`suc_name`*, `suc_function`*, `machine_operation`, `data_sharing`, `access_points`, `physical_boundary`)
- **SessionStorage** persistenza immediata ad ogni modifica
- **Auto-save** debounced 30s via `PATCH /api/assessments/:id`
- Pulsante **Next** disabilitato fino a compilazione campi obbligatori

#### `frontend/src/pages/wizard/WizardStep2_RiskAssessment.jsx` — nuova pagina
- Textarea **Assumptions** con sessionStorage + auto-save 30s
- Tabella **Risk Events** con stato empty state, edit e delete per riga
- Modal form per creare/modificare scenari con **RiskMatrix5x5 interattiva** integrata
- Navigazione Back → Step 1 / Next → Step 3

#### `frontend/src/components/wizard/WizardStepper.jsx` — nuovo componente
- Stepper orizzontale 7 step con indicatore attivo in `brand-green`
- Step completati cliccabili con icona check; step futuri disabilitati
- Label step corrente sotto il cerchio attivo

#### `frontend/src/components/wizard/RiskMatrix5x5.jsx` — nuovo componente
- Griglia 5×5 con score = likelihood × impact
- 5 livelli di rischio con colori distinti: LOW / MEDIUM / HIGH / CRITICAL / CATASTROPHIC
- Props: `likelihood`, `impact`, `interactive`, `showLegend`, `onRiskChange(l, i, score, label)`
- Attributi `data-cell`, `data-active`, `data-score`, `data-label` per test e accessibilità
- Legenda opzionale (`data-testid="risk-legend"`)

#### `frontend/src/lib/api.js`
- Aggiunti: `patchAssessment`, `getRiskEvents`, `createRiskEvent`, `updateRiskEvent`, `deleteRiskEvent`

#### `frontend/src/App.jsx`
- Route `/assessments/:id/step/1` → `WizardStep1_SUC`
- Route `/assessments/:id/step/2` → `WizardStep2_RiskAssessment`

#### `frontend/src/__tests__/`
- `WizardStep1_SUC.test.jsx` — 8 test (form validation, stepper, sessionStorage, auto-save)
- `WizardStep2_RiskAssessment.test.jsx` — 12 test (rendering, lista eventi, navigazione, sessionStorage)
- `RiskMatrix5x5.test.jsx` — 13 test (25 celle, label assi, score boundaries, modalità interattiva, legenda)

**Test totali:** 68/68 GREEN (37 backend Jest + 31 frontend Vitest)

---

## v2.2.0 — 2026-03-26

### Feature: FASE 0 — Fondamenta Wizard IEC 62443-3-3

Primo sprint del wizard IEC 62443 a 7 step. Aggiunge lo schema DB, il database normativo dei controlli e l'infrastruttura di test.

#### `backend/db/database.js`
- Nuovo **migration runner file-based**: legge ed esegue in ordine alfabetico tutti i file `.sql` in `backend/migrations/`, idempotente (ignora `duplicate column name`)
- **Seed automatico** dei controlli IEC 62443-3-3 all'avvio tramite `backend/data/iec_controls_seed.js`

#### `backend/migrations/` — nuova directory
- **001_wizard_fields.sql**: aggiunge a `assessments` i campi SUC (`suc_name`, `suc_function`, `machine_operation`, `data_sharing`, `access_points`, `physical_boundary`)
- **002_canvas_coords.sql**: aggiunge a `zones` le coordinate canvas (`x`, `y`, `width`, `height`) e a `conduits` i campi (`type`, `label`, `encryption`) per React Flow
- **003_wizard_tables.sql**: crea le tabelle `risk_events`, `iec_controls`, `zone_controls`, `policies`

#### `backend/data/iec_controls_seed.js` — nuovo file
- **105 controlli IEC 62443-3-3** (SR + RE) suddivisi in 7 categorie: IAC, UC, SI, DC, RDF, TRE, RA
- Copertura SR 1.1 → SR 7.8 con tutti i Requirement Enhancements e flag di applicabilità per SL1/SL2/SL3/SL4
- Seed idempotente: non duplica se già presenti

#### `backend/routes/iec_controls.js` — nuova route
- `GET /api/iec-controls` — lista controlli con filtri opzionali: `?category=IAC`, `?sl=2`, `?sr_code=SR+1.1`
- `GET /api/iec-controls/:id` — singolo controllo

#### `backend/server.js`
- Registrata la route `/api/iec-controls`

#### `backend/package.json`
- `better-sqlite3` aggiornato a **v12.8.0** (compatibilità Node.js v22 sistema + v24 nvm)
- Aggiunto **Jest** (`jest`, `@jest/globals`, `supertest`) come devDependencies
- Script `npm test` configurato

#### `frontend/package.json` + `frontend/vite.config.js`
- Aggiunti **Vitest** + `@testing-library/react` + `@testing-library/jest-dom` + `jsdom`
- Script `npm test` e `npm run test:watch` configurati
- Vitest configurato con environment `jsdom` e setup file

#### `backend/__tests__/` — nuova directory test
- `migrations.test.js` — 21 test sulle colonne e tabelle delle migrations (TDD)
- `iec_controls.test.js` — 10 test sul seed IEC 62443-3-3
- `helpers/testDb.js` — helper DB in-memory per test isolati

#### `architecture-audit.md` — nuovo documento
- Audit completo dell'architettura esistente: 19 API routes, 15 tabelle DB, 10 pagine React
- Gap analysis con lista completa di tabelle, route e componenti da aggiungere per il wizard

**Test:** 31/31 GREEN (`npm test`)

---

## v2.1.7 — 2026-03-26

### Feature: SNMP Community String configurabile per assessment

**Obiettivo:** supportare impianti con community SNMP non standard (`public`) senza modificare il codice.

#### `backend/db/database.js`
- Migration automatica: colonna `snmp_community TEXT DEFAULT 'public'` sulla tabella `assessments`

#### `backend/routes/assessments.js`
- POST e PUT `/api/assessments` accettano e persistono il campo `snmp_community`
- Download report: aggiunto header `Content-Type: application/octet-stream` per forzare il salvataggio file anziché l'anteprima browser

#### `backend/services/scannerService.js`
- Il scanner legge `snmp_community` dall'assessment prima di avviare la scansione
- Il valore viene passato a `grabSnmpDescr()` al posto del precedente `'public'` hardcoded

#### `frontend/src/pages/Assessments.jsx`
- Campo **SNMP Community** aggiunto al form "Nuovo Assessment" (default `tecnopack2026`)

### Bug Fix: race condition su download report/export

**File:** `frontend/src/pages/AssessmentDetail.jsx`

**Causa:** `URL.revokeObjectURL()` veniva chiamato immediatamente dopo il click sul link sintetico.
Su alcuni browser il download non aveva ancora iniziato a leggere il blob, causando un file vuoto o corrotto.

**Fix:** `revokeObjectURL` posticipato di 10 secondi tramite `setTimeout`.

### Bug Fix: logo SVG nel report non rispettava le proporzioni

**File:** `backend/services/reportService.js`

**Causa:** L'SVG privo di `viewBox` non poteva scalare correttamente una volta rimossi gli attributi `height`/`width` originali.

**Fix:** Aggiunto `viewBox="0 0 949.6 205.44"` e `display:block` al tag `<svg>` iniettato nella copertina del report.

---

## v2.1.6 — 2026-03-20

### Bug Fix: redirect automatico se ID assessment non esiste

**File:** `frontend/src/pages/AssessmentDetail.jsx`

**Causa:** Navigando su un assessment con ID inesistente (es. dopo eliminazione), la pagina rimaneva bloccata in stato di caricamento senza feedback.

**Fix:** Se il backend risponde con 404 o l'assessment è null, l'utente viene reindirizzato automaticamente a `/assessments`.

---

## v2.1.5 — 2026-03-20

### Bug Fix: errori download report/export mostrati con alert()

**File:** `frontend/src/pages/AssessmentDetail.jsx`

**Causa:** Gli errori nel download del report e nell'export `.otsa` usavano `alert()` bloccante.

**Fix:** Sostituiti con `showToast()` non bloccante, coerente con il resto dell'UI.

---

## v2.1.4 — 2026-03-20

### Bug Fix: warning React Router v6 in console

**File:** `frontend/src/main.jsx` (o entry point router)

**Causa:** React Router v6 emetteva warning su future flags non dichiarati (`v7_startTransition`, `v7_relativeSplatPath`).

**Fix:** Aggiunti i future flags richiesti alla configurazione del router per eliminare i warning.

---

## v2.1.3 — 2026-03-20

### Bug Fix: `confirm()` / `alert()` residui nel frontend

**File:** `frontend/src/pages/` (varie pagine)

**Causa:** Alcune pagine usavano ancora `window.confirm()` o `window.alert()` nativi, bloccanti e non stilizzati.

**Fix:** Sostituiti sistematicamente con modali React o toast non bloccanti in tutto il frontend.

---

## v2.1.2 — 2026-03-20

### Bug Fix: avvio scansione bloccato da `confirm()`

**File:** `frontend/src/pages/AssessmentDetail.jsx`

**Causa:** Il pulsante "Avvia scansione" mostrava un `window.confirm()` che alcuni browser bloccano silenziosamente, impedendo l'avvio della scansione.

**Fix:** Sostituita la `confirm()` con una modale React con pulsante di conferma esplicito.

---

## v2.1.1 — 2026-03-20

### Bug Fix: Tasto elimina assessment non funzionava

**File:** `frontend/src/pages/Assessments.jsx`

**Causa:** Il codice usava `window.confirm()` per la conferma di cancellazione.
Alcuni browser bloccano silenziosamente i dialog `confirm()` (ritornano `false`
senza mostrare nulla), rendendo il tasto cestino apparentemente non funzionante.

**Fix:** Sostituita la `confirm()` con una modale React dedicata con bordo rosso,
nome dell'assessment da eliminare, avviso chiaro e pulsante "Elimina" esplicito.

---

## v2.1.0 — 2026-03-20

### Feature: Fingerprinting automatico — zero IP hardcoded

**Obiettivo:** portabilità completa tra impianti. Crea assessment, inserisci subnet, avvia scan.

#### `backend/seed.js` — refactoring completo
- Eliminati tutti gli IP hardcoded (172.16.224.x)
- Ora crea solo: 3 template zona built-in + cliente "Tecnopack Demo" + assessment vuoto
- Gli asset vengono scoperti interamente dalla scansione

#### `backend/services/fingerprintService.js` — nuovo modulo
- **OUI MAC table**: 30+ vendor OT mappati (Omron, Hakko, B&R, Secomea, HPE, Siemens, Rockwell,
  Schneider, Beckhoff, Phoenix Contact, Moxa, Advantech, Wago, Pilz, Turck, ifm, Pepperl+Fuchs,
  Cisco, Hirschmann, VMware, Microsoft Hyper-V)
- **SNMP sysDescr parser**: estrae vendor, modello e firmware da banner SNMP (Omron, Siemens,
  HPE switch, B&R, Secomea, Rockwell, Schneider)
- **HTTP banner parser**: rileva HMI Hakko (GR-HTTPD), Weintek, Siemens panel, Secomea
- **Port signature classifier**: EtherNet/IP→PLC, FINS→Omron PLC, S7Comm→Siemens PLC,
  Modbus→PLC, B&R 50000→PLC, OPC-UA→PLC, Windows SMB/RPC→Workstation anomalia,
  VMware 902/912→Workstation anomalia
- **`classifyDevice(mac, ports, snmpDescr, httpBanner)`** → `{vendor, device_type, device_model, firmware_version, criticality}`
- **`assignZone(device_type, vendor, availableZones)`**: assegna zona automatica dalle zone
  dell'assessment (create dal template); fallback `Unclassified`

#### `backend/services/scannerService.js` — integrazione fingerprinting
- Rimossa logica `guessDeviceType()` / `guessZone()` basata su vendor nmap
- Aggiunta Fase 4: grab SNMP sysDescr + HTTP banner per ogni host
- Fase 5: `classifyDevice()` + `assignZone()` su ogni device
- Asset salvati con `classified_by = 'auto'`
- Port scan esteso con porte anomalia: 135, 139, 445 (Windows SMB), 902/912 (VMware)

#### `backend/db/schema.sql` + `database.js`
- Colonna `classified_by TEXT DEFAULT 'auto'` su tabella assets
- Migration automatica su DB esistenti (`ALTER TABLE ... ADD COLUMN`)

#### `backend/routes/assets.js`
- PUT asset imposta `classified_by = 'manual'` quando l'assessor modifica un campo

#### `frontend/src/pages/Assets.jsx`
- Badge **Auto** (grigio, icona chip) per asset classificati dalla scansione
- Badge **Manuale** (blu, icona penna) per asset modificati dall'assessor

---

## v2.0.2 — 2026-03-20

### Bug Fix: Nessun advisory NVD recuperato per nessun vendor (Omron, Siemens, Rockwell…)

**File:** `backend/services/advisoryService.js`

**Causa:** L'URL di query all'API NVD includeva il parametro
`keywordExactMatch=false`. L'API NVD v2.0 tratta `keywordExactMatch` come un
flag booleano puro (presenza = attivo, assenza = disattivo) e **non ammette
un valore esplicito**. Passando `=false`, il server rispondeva HTTP 404 con
il messaggio `"keywordExactMatch parameter cannot have a value."` — il body
era vuoto, il parsing JSON falliva silenziosamente e il fetch restituiva
sempre `[]`.

**Fix:** Rimosso il parametro `keywordExactMatch=false` dall'URL. Il
comportamento di ricerca non-esatta è il default dell'API e non richiede
parametri aggiuntivi.

---

## v2.0.1 — 2026-03-20

### Bug Fix: Vulnerability Advisories non visualizzate

**File:** `frontend/src/lib/api.js`

**Causa:** La funzione `api.getAdvisories()` costruiva la query string tramite
`URLSearchParams({ vendor: undefined, source: undefined })`, che produceva
la stringa letterale `"vendor=undefined&source=undefined"`.
Il backend riceveva questo filtro e non trovava nessun advisory nel DB
corrispondente al vendor `"undefined"`, restituendo un array vuoto.

**Fix:** I valori `null` e `undefined` vengono ora esclusi dall'oggetto prima
di passarlo a `URLSearchParams`, in modo che la chiamata senza filtri attivi
raggiunga il backend senza parametri spurî.

---

### Bug Fix: Logo Tecnopack di dimensioni eccessive nei report HTML/PDF

**File:** `backend/services/reportService.js`

**Causa:** Il file SVG del logo (`logo-tecnopack-light.svg`) contiene gli
attributi `height="205.44"` e `width="949.6"` hardcoded nel tag radice.
La funzione `getLogoInlineForPdf()` aggiungeva un secondo attributo
`height="60"` senza rimuovere quelli preesistenti; il browser/renderer
usava i valori originali dell'SVG, mostrando il logo a dimensione piena
(~949×205 px) nella copertina del report.

**Fix:** Prima di iniettare il valore corretto, gli attributi `height` e
`width` originali vengono rimossi tramite regex; viene poi aggiunto
`height="60" style="width:auto"` per mantenere le proporzioni.
