# Release Notes

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
