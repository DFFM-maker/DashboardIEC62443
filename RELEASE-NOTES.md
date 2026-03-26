# Release Notes

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
