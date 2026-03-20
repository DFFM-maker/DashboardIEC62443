# Claude Code Prompt — Tecnopack OT Security Dashboard IEC 62443
## Stack: Vite + React + Node.js/Express — Kali Linux 172.16.224.250
## Versione: 2.0 — Multi-impianto + Advisory Feed + Branded Tecnopack

---

## OBIETTIVO

Costruisci una web application professionale per OT Security Assessment
conforme IEC 62443, brandizzata Tecnopack. L'app gira su Kali Linux,
esegue scansioni nmap in locale, si connette a CISA ICS-CERT per
advisory live, e produce report PDF/Excel brandizzati con logo Tecnopack.

Accessibile da tutta la rete locale:
- http://172.16.224.250:3000  → Frontend React
- http://172.16.224.250:3001  → Backend API

Layer	Tecnologia
Backend	FastAPI + Uvicorn (Python 3.11+)
Frontend	React 18 + Vite + Tailwind CSS v3
Design	Geist Design System (Vercel)
Animazioni	framer-motion v11
Icone	lucide-react
Streaming	MJPEG via polling Frigate latest.jpg
Real-time	Server-Sent Events (SSE)
---

## ARCHITETTURA

```
Kali Linux 172.16.224.250
├── ~/ot-dashboard/
│   ├── frontend/          # Vite + React + TailwindCSS → porta 3000
│   ├── backend/           # Node.js + Express + Socket.io → porta 3001
│   │   ├── db/            # SQLite (ot_dashboard.db)
│   │   ├── routes/        # REST API
│   │   ├── services/      # scanner, analysis, report, advisory, export
│   │   ├── templates/     # zone templates per tipo impianto
│   │   ├── advisories/    # cache locale advisory CISA
│   │   └── reports/       # output PDF/Excel/HTML + export .otsa
│   └── assets/
│       └── logo-tecnopack.png  # copiare qui il logo prima di avviare
```

---

## FASE 0 — PREREQUISITI SU KALI

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# Tool sistema
sudo apt install -y nmap snmp snmp-mibs-downloader curl \
  netcat-openbsd xsltproc chromium

# sudo senza password per nmap e tcpdump
echo "kali ALL=(ALL) NOPASSWD: /usr/bin/nmap, /usr/bin/tcpdump, /usr/sbin/arp-scan" | \
  sudo tee /etc/sudoers.d/ot-dashboard

# Struttura progetto
mkdir -p ~/ot-dashboard/{frontend,backend,assets}
mkdir -p ~/ot-dashboard/backend/{db,routes,services,templates,advisories,reports/output}
cd ~/ot-dashboard
```

**IMPORTANTE — Logo Tecnopack:**
Sono presenti DUE varianti SVG del logo, entrambe da copiare in `~/ot-dashboard/assets/`:

  logo-tecnopack-light.svg  → su sfondo BIANCO (report PDF/HTML stampabili)
                               colori originali: grigio #404352 + verde #2e9650
  logo-tecnopack-dark.svg   → su sfondo SCURO (sidebar e UI React dark theme)
                               colori invertiti per leggibilità su bg scuro

Uso nel codice:
- Frontend React (sidebar, header UI):     <img src="/assets/logo-tecnopack-dark.svg">
- Report HTML/PDF (cover page, header):    inline SVG o <img> logo-tecnopack-light.svg
- Per incorporare nel PDF (Puppeteer):     leggi il file SVG e incorporalo inline
  in modo che non dipenda da path esterni durante la renderizzazione

Il backend serve la cartella assets staticamente:
  app.use('/assets', express.static(path.join(__dirname, '../../assets')))

NON usare placeholder testuale — i file SVG sono già presenti nel progetto.

---

## FASE 1 — DATABASE SCHEMA COMPLETO

### `backend/db/schema.sql`

```sql
-- ================================================================
-- ANAGRAFICA CLIENTI / IMPIANTI
-- ================================================================
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'IT',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- ASSESSMENT
-- ================================================================
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  name TEXT NOT NULL,
  subnet TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  assessor TEXT,
  iec62443_target_sl TEXT DEFAULT 'SL-2',
  notes TEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- ================================================================
-- ASSET
-- ================================================================
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  ip TEXT NOT NULL,
  mac TEXT,
  vendor TEXT,
  device_type TEXT,
  device_model TEXT,
  firmware_version TEXT,
  serial_number TEXT,
  security_zone TEXT,
  criticality TEXT DEFAULT 'medium',
  notes TEXT,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

-- ================================================================
-- PORTE APERTE
-- ================================================================
CREATE TABLE IF NOT EXISTS open_ports (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  port INTEGER,
  protocol TEXT DEFAULT 'tcp',
  service TEXT,
  version TEXT,
  state TEXT DEFAULT 'open',
  is_required INTEGER DEFAULT 1,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- ================================================================
-- FINDING DI SICUREZZA
-- ================================================================
CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  asset_id TEXT,
  finding_code TEXT,
  title TEXT,
  description TEXT,
  cvss_score REAL,
  cvss_vector TEXT,
  severity TEXT,
  iec62443_sr TEXT,        -- JSON array es. ["SR 4.1","SR 7.7"]
  iec62443_part TEXT DEFAULT '3-3',
  evidence TEXT,
  remediation TEXT,
  remediation_priority TEXT,
  status TEXT DEFAULT 'open',
  cve_ids TEXT,            -- JSON array CVE collegati
  advisory_urls TEXT,      -- JSON array URL advisory vendor
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);

-- ================================================================
-- ZONE DI SICUREZZA
-- ================================================================
CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  name TEXT,
  security_level TEXT DEFAULT 'SL-1',
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS zone_assets (
  zone_id TEXT,
  asset_id TEXT,
  PRIMARY KEY (zone_id, asset_id),
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- ================================================================
-- CONDUIT TRA ZONE
-- ================================================================
CREATE TABLE IF NOT EXISTS conduits (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  name TEXT,
  zone_from_id TEXT,
  zone_to_id TEXT,
  protocols TEXT,          -- JSON array es. ["FINS","EtherNet/IP"]
  direction TEXT DEFAULT 'bidirectional',
  notes TEXT,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

-- ================================================================
-- TEMPLATE ZONE PER TIPO IMPIANTO
-- ================================================================
CREATE TABLE IF NOT EXISTS zone_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,          -- es. "Impianto Packaging", "Linea Pesatura"
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_builtin INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS zone_template_zones (
  id TEXT PRIMARY KEY,
  template_id TEXT,
  zone_name TEXT,
  security_level TEXT,
  description TEXT,
  color TEXT,
  vendor_hints TEXT,       -- JSON array vendor tipici es. ["Omron","B&R"]
  port_hints TEXT,         -- JSON array porte tipiche
  FOREIGN KEY (template_id) REFERENCES zone_templates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS zone_template_conduits (
  id TEXT PRIMARY KEY,
  template_id TEXT,
  from_zone_name TEXT,
  to_zone_name TEXT,
  protocols TEXT,
  direction TEXT,
  FOREIGN KEY (template_id) REFERENCES zone_templates(id) ON DELETE CASCADE
);

-- ================================================================
-- ADVISORY / CVE CACHE
-- ================================================================
CREATE TABLE IF NOT EXISTS advisories (
  id TEXT PRIMARY KEY,         -- es. "ICSA-24-135-01"
  source TEXT,                 -- "CISA-ICS", "JPCERT", "vendor"
  vendor TEXT,                 -- "Omron", "B&R", "Siemens", etc.
  title TEXT,
  description TEXT,
  cvss_score REAL,
  cve_ids TEXT,                -- JSON array
  affected_products TEXT,      -- JSON array
  url TEXT,
  published_at DATETIME,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- LOG SCANSIONI
-- ================================================================
CREATE TABLE IF NOT EXISTS scan_logs (
  id TEXT PRIMARY KEY,
  assessment_id TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  level TEXT DEFAULT 'info',
  message TEXT,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

-- ================================================================
-- EXPORT JOBS
-- ================================================================
CREATE TABLE IF NOT EXISTS export_jobs (
  id TEXT PRIMARY KEY,
  assessment_id TEXT,
  format TEXT,             -- 'html', 'excel', 'pdf', 'otsa'
  status TEXT DEFAULT 'pending',
  file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id)
);
```

---

## FASE 2 — BACKEND SERVICES

### `backend/services/advisoryService.js`

Servizio che recupera advisory ICS da CISA e vendor in tempo reale
durante ogni assessment. Usa le API pubbliche CISA NVD.

```javascript
const https = require('https')
const db = require('../db/database')

// Vendor → keyword di ricerca su CISA ICS-CERT + URL advisory ufficiali
const VENDOR_CONFIG = {
  'Omron': {
    keywords: ['Omron', 'OMRON'],
    cisaUrl: 'https://www.cisa.gov/ics-advisories',
    advisoryUrl: 'https://www.cisa.gov/news-events/ics-advisories',
    jpcertUrl: 'https://jvn.jp/en/cve/',
    nvdQuery: 'Omron+PLC'
  },
  'B&R': {
    keywords: ['B&R', 'Bernecker', 'Rainer', 'B-R Industrial'],
    advisoryUrl: 'https://www.br-automation.com/en/support/updates-and-upgrades/security-advisories/',
    nvdQuery: 'B%26R+Industrial+Automation'
  },
  'Hakko': {
    keywords: ['Hakko', 'Monitouch'],
    nvdQuery: 'Hakko+HMI'
  },
  'Secomea': {
    keywords: ['Secomea', 'SiteManager'],
    advisoryUrl: 'https://www.secomea.com/support/cybersecurity-advisories/',
    nvdQuery: 'Secomea'
  },
  'Siemens': {
    keywords: ['Siemens', 'SIMATIC', 'SINEC', 'S7'],
    advisoryUrl: 'https://cert-portal.siemens.com/productcert/advisories/',
    nvdQuery: 'Siemens+SIMATIC'
  },
  'Schneider Electric': {
    keywords: ['Schneider', 'Modicon', 'EcoStruxure'],
    advisoryUrl: 'https://www.se.com/ww/en/work/support/cybersecurity/security-notifications.jsp',
    nvdQuery: 'Schneider+Electric+PLC'
  },
  'Rockwell': {
    keywords: ['Rockwell', 'Allen-Bradley', 'ControlLogix', 'Studio 5000'],
    advisoryUrl: 'https://www.rockwellautomation.com/en-us/trust-center/security-advisories.html',
    nvdQuery: 'Rockwell+Automation+Allen-Bradley'
  }
}

// Fetch CVE da NVD API v2 per un vendor
async function fetchNvdAdvisories(vendor) {
  const config = VENDOR_CONFIG[vendor]
  if (!config) return []

  const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?` +
    `keywordSearch=${config.nvdQuery}&` +
    `keywordExactMatch=false&` +
    `cvssV3Severity=HIGH,CRITICAL&` +
    `noRejected&` +
    `resultsPerPage=20`

  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Tecnopack-OT-Dashboard/2.0' }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          const advisories = (json.vulnerabilities || []).map(v => ({
            id: v.cve.id,
            source: 'NVD-CISA',
            vendor: vendor,
            title: v.cve.descriptions?.find(d => d.lang === 'en')?.value?.slice(0, 200) || v.cve.id,
            description: v.cve.descriptions?.find(d => d.lang === 'en')?.value || '',
            cvss_score: v.cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore ||
                        v.cve.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore || null,
            cve_ids: JSON.stringify([v.cve.id]),
            affected_products: JSON.stringify(
              v.cve.configurations?.flatMap(c =>
                c.nodes?.flatMap(n => n.cpeMatch?.map(m => m.criteria) || []) || []
              ).slice(0, 10) || []
            ),
            url: `https://nvd.nist.gov/vuln/detail/${v.cve.id}`,
            published_at: v.cve.published
          }))
          resolve(advisories)
        } catch(e) {
          resolve([])
        }
      })
    })
    req.on('error', () => resolve([]))
    req.setTimeout(10000, () => { req.destroy(); resolve([]) })
  })
}

// Fetch CISA ICS-CERT advisories via feed JSON pubblico
async function fetchCisaIcsAdvisories() {
  const url = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Tecnopack-OT-Dashboard/2.0' }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          // Filtra solo CVE relativi a vendor OT noti
          const otKeywords = Object.values(VENDOR_CONFIG)
            .flatMap(v => v.keywords)
            .map(k => k.toLowerCase())

          const filtered = (json.vulnerabilities || [])
            .filter(v => {
              const text = (v.vendorProject + ' ' + v.product + ' ' + v.shortDescription).toLowerCase()
              return otKeywords.some(k => text.includes(k.toLowerCase()))
            })
            .slice(0, 50)
            .map(v => {
              const vendor = Object.entries(VENDOR_CONFIG).find(([k, cfg]) =>
                cfg.keywords.some(kw =>
                  (v.vendorProject + ' ' + v.product).toLowerCase().includes(kw.toLowerCase())
                )
              )?.[0] || 'Unknown'

              return {
                id: v.cveID,
                source: 'CISA-KEV',
                vendor,
                title: `${v.vendorProject} ${v.product} — ${v.vulnerabilityName}`,
                description: v.shortDescription,
                cvss_score: null,
                cve_ids: JSON.stringify([v.cveID]),
                affected_products: JSON.stringify([`${v.vendorProject} ${v.product}`]),
                url: `https://nvd.nist.gov/vuln/detail/${v.cveID}`,
                published_at: v.dateAdded
              }
            })
          resolve(filtered)
        } catch(e) {
          resolve([])
        }
      })
    })
    req.on('error', () => resolve([]))
    req.setTimeout(15000, () => { req.destroy(); resolve([]) })
  })
}

// Aggiorna cache DB e restituisce advisory rilevanti per i vendor trovati
async function fetchAndCacheAdvisories(vendorsFound, io, assessmentId) {
  const emitLog = (msg) => {
    io?.to(assessmentId).emit('log', {
      level: 'info',
      message: msg,
      timestamp: new Date()
    })
  }

  emitLog('🔍 Recupero advisory CISA ICS-CERT e NVD...')

  // CISA KEV (Known Exploited Vulnerabilities) — tutti i vendor OT
  const cisaAdvisories = await fetchCisaIcsAdvisories()
  emitLog(`  → CISA KEV: ${cisaAdvisories.length} advisory OT trovati`)

  // NVD per ogni vendor specifico trovato nell'impianto
  const nvdAdvisories = []
  for (const vendor of vendorsFound) {
    const normalized = Object.keys(VENDOR_CONFIG).find(k =>
      vendor.toLowerCase().includes(k.toLowerCase())
    )
    if (normalized) {
      emitLog(`  → NVD: recupero advisory per ${normalized}...`)
      const results = await fetchNvdAdvisories(normalized)
      nvdAdvisories.push(...results)
      emitLog(`     trovati ${results.length} CVE HIGH/CRITICAL`)
      // Rate limit NVD API (5 req/30s senza API key)
      await new Promise(r => setTimeout(r, 7000))
    }
  }

  const allAdvisories = [...cisaAdvisories, ...nvdAdvisories]

  // Salva in cache DB (upsert)
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO advisories
    (id, source, vendor, title, description, cvss_score,
     cve_ids, affected_products, url, published_at, fetched_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
  `)

  for (const adv of allAdvisories) {
    try {
      upsert.run(
        adv.id, adv.source, adv.vendor, adv.title,
        adv.description, adv.cvss_score, adv.cve_ids,
        adv.affected_products, adv.url, adv.published_at
      )
    } catch(e) { /* skip duplicati */ }
  }

  emitLog(`✅ Advisory aggiornati: ${allAdvisories.length} totali in cache`)
  return allAdvisories
}

// Cerca advisory rilevanti per un asset specifico
function getAdvisoriesForAsset(vendor, model) {
  const normalized = Object.keys(VENDOR_CONFIG).find(k =>
    vendor?.toLowerCase().includes(k.toLowerCase())
  )
  if (!normalized) return []

  const keywords = VENDOR_CONFIG[normalized]?.keywords || []
  const placeholders = keywords.map(() => "title LIKE ? OR description LIKE ?").join(' OR ')
  const params = keywords.flatMap(k => [`%${k}%`, `%${k}%`])

  return db.all(
    `SELECT * FROM advisories WHERE vendor = ? OR (${placeholders})
     ORDER BY cvss_score DESC LIMIT 10`,
    [normalized, ...params]
  )
}

// URL advisory ufficiali per vendor
function getVendorAdvisoryUrls(vendor) {
  const normalized = Object.keys(VENDOR_CONFIG).find(k =>
    vendor?.toLowerCase().includes(k.toLowerCase())
  )
  if (!normalized) return []
  const cfg = VENDOR_CONFIG[normalized]
  return [
    cfg.advisoryUrl,
    cfg.jpcertUrl,
    cfg.cisaUrl
  ].filter(Boolean)
}

module.exports = {
  fetchAndCacheAdvisories,
  getAdvisoriesForAsset,
  getVendorAdvisoryUrls,
  VENDOR_CONFIG
}
```

### `backend/services/exportService.js`

Gestisce export/import assessment in formato `.otsa`
(OT Security Assessment — formato JSON proprietario Tecnopack):

```javascript
const fs = require('fs')
const path = require('path')
const db = require('../db/database')

// Esporta assessment completo in file .otsa (JSON compresso)
async function exportAssessment(assessmentId) {
  const assessment = db.get(
    'SELECT a.*, c.name as client_name FROM assessments a ' +
    'LEFT JOIN clients c ON a.client_id = c.id WHERE a.id = ?',
    [assessmentId]
  )
  const assets = db.all(
    'SELECT * FROM assets WHERE assessment_id = ?', [assessmentId]
  )
  const ports = db.all(
    `SELECT op.* FROM open_ports op
     JOIN assets a ON op.asset_id = a.id
     WHERE a.assessment_id = ?`, [assessmentId]
  )
  const findings = db.all(
    'SELECT * FROM findings WHERE assessment_id = ?', [assessmentId]
  )
  const zones = db.all(
    'SELECT * FROM zones WHERE assessment_id = ?', [assessmentId]
  )
  const conduits = db.all(
    'SELECT * FROM conduits WHERE assessment_id = ?', [assessmentId]
  )
  const zoneAssets = db.all(
    `SELECT za.* FROM zone_assets za
     JOIN zones z ON za.zone_id = z.id
     WHERE z.assessment_id = ?`, [assessmentId]
  )

  const exportData = {
    format: 'otsa',
    version: '2.0',
    exported_at: new Date().toISOString(),
    exported_by: 'Tecnopack OT Security Dashboard',
    assessment,
    assets,
    ports,
    findings,
    zones,
    conduits,
    zone_assets: zoneAssets
  }

  const fileName = `${assessment.name.replace(/[^a-z0-9]/gi, '_')}_${
    new Date().toISOString().slice(0,10)
  }.otsa`
  const filePath = path.join('./reports/output', fileName)

  fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2))
  return { filePath, fileName }
}

// Importa assessment da file .otsa
async function importAssessment(otsaFilePath, newClientId = null) {
  const raw = fs.readFileSync(otsaFilePath, 'utf8')
  const data = JSON.parse(raw)

  if (data.format !== 'otsa') {
    throw new Error('File non valido — formato non riconosciuto')
  }

  const { v4: uuidv4 } = require('uuid')
  const idMap = {} // vecchi ID → nuovi ID

  // Nuovo assessment con nuovo ID
  const newAssessmentId = uuidv4()
  idMap[data.assessment.id] = newAssessmentId

  db.run(
    `INSERT INTO assessments
     (id, client_id, name, subnet, status, created_at, completed_at,
      assessor, iec62443_target_sl, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      newAssessmentId,
      newClientId || data.assessment.client_id,
      `[IMPORTATO] ${data.assessment.name}`,
      data.assessment.subnet,
      data.assessment.status,
      data.assessment.created_at,
      data.assessment.completed_at,
      data.assessment.assessor,
      data.assessment.iec62443_target_sl,
      data.assessment.notes
    ]
  )

  // Asset con nuovi ID
  for (const asset of data.assets) {
    const newAssetId = uuidv4()
    idMap[asset.id] = newAssetId
    db.run(
      `INSERT INTO assets
       (id, assessment_id, ip, mac, vendor, device_type, device_model,
        firmware_version, serial_number, security_zone, criticality, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [newAssetId, newAssessmentId, asset.ip, asset.mac, asset.vendor,
       asset.device_type, asset.device_model, asset.firmware_version,
       asset.serial_number, asset.security_zone, asset.criticality, asset.notes]
    )
  }

  // Porte
  for (const port of data.ports) {
    db.run(
      `INSERT INTO open_ports (id, asset_id, port, protocol, service, version, state)
       VALUES (?,?,?,?,?,?,?)`,
      [uuidv4(), idMap[port.asset_id], port.port, port.protocol,
       port.service, port.version, port.state]
    )
  }

  // Finding
  for (const finding of data.findings) {
    db.run(
      `INSERT INTO findings
       (id, assessment_id, asset_id, finding_code, title, description,
        cvss_score, cvss_vector, severity, iec62443_sr, evidence,
        remediation, remediation_priority, status, cve_ids, advisory_urls)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [uuidv4(), newAssessmentId, idMap[finding.asset_id] || null,
       finding.finding_code, finding.title, finding.description,
       finding.cvss_score, finding.cvss_vector, finding.severity,
       finding.iec62443_sr, finding.evidence, finding.remediation,
       finding.remediation_priority, finding.status,
       finding.cve_ids, finding.advisory_urls]
    )
  }

  // Zone e conduit
  const zoneIdMap = {}
  for (const zone of data.zones) {
    const newZoneId = uuidv4()
    zoneIdMap[zone.id] = newZoneId
    db.run(
      `INSERT INTO zones (id, assessment_id, name, security_level, description, color)
       VALUES (?,?,?,?,?,?)`,
      [newZoneId, newAssessmentId, zone.name, zone.security_level,
       zone.description, zone.color]
    )
  }

  for (const za of data.zone_assets) {
    if (zoneIdMap[za.zone_id] && idMap[za.asset_id]) {
      db.run(
        'INSERT OR IGNORE INTO zone_assets (zone_id, asset_id) VALUES (?,?)',
        [zoneIdMap[za.zone_id], idMap[za.asset_id]]
      )
    }
  }

  for (const conduit of data.conduits) {
    db.run(
      `INSERT INTO conduits
       (id, assessment_id, name, zone_from_id, zone_to_id, protocols, direction)
       VALUES (?,?,?,?,?,?,?)`,
      [uuidv4(), newAssessmentId, conduit.name,
       zoneIdMap[conduit.zone_from_id], zoneIdMap[conduit.zone_to_id],
       conduit.protocols, conduit.direction]
    )
  }

  return newAssessmentId
}

module.exports = { exportAssessment, importAssessment }
```

### `backend/templates/builtin-templates.js`

Template di zona pre-configurati per tipi di impianto comuni:

```javascript
const BUILTIN_TEMPLATES = [
  {
    id: 'tpl-packaging',
    name: 'Linea Packaging',
    description: 'Impianto di confezionamento tipico con PLC, HMI e pesatura',
    is_builtin: 1,
    zones: [
      {
        zone_name: 'PLC Zone',
        security_level: 'SL-2',
        description: 'Controller logica macchina',
        color: '#3b82f6',
        vendor_hints: ['Omron', 'Siemens', 'Rockwell', 'Schneider'],
        port_hints: [44818, 102, 502, 9600, 4840]
      },
      {
        zone_name: 'Scale Zone',
        security_level: 'SL-2',
        description: 'Controller bilancie e dosatori',
        color: '#8b5cf6',
        vendor_hints: ['B&R', 'Mettler', 'Sartorius'],
        port_hints: [50000, 502]
      },
      {
        zone_name: 'HMI Zone',
        security_level: 'SL-1',
        description: 'Pannelli operatore e supervisione',
        color: '#22c55e',
        vendor_hints: ['Hakko', 'Weintek', 'Siemens', 'Rockwell'],
        port_hints: [80, 443, 4000]
      },
      {
        zone_name: 'Remote Access Zone',
        security_level: 'SL-2',
        description: 'Gateway accesso remoto',
        color: '#f97316',
        vendor_hints: ['Secomea', 'Tosibox', 'Cisco'],
        port_hints: [443, 8080, 22]
      },
      {
        zone_name: 'Unclassified',
        security_level: 'SL-T',
        description: 'Device non classificati da verificare',
        color: '#6b7280',
        vendor_hints: [],
        port_hints: []
      }
    ],
    conduits: [
      { from: 'HMI Zone', to: 'PLC Zone',
        protocols: ['FINS', 'EtherNet/IP', 'Modbus TCP'], direction: 'bidirectional' },
      { from: 'HMI Zone', to: 'Scale Zone',
        protocols: ['TCP/50000', 'Modbus TCP'], direction: 'bidirectional' },
      { from: 'Remote Access Zone', to: 'HMI Zone',
        protocols: ['HTTPS', 'VPN'], direction: 'inbound' },
      { from: 'Remote Access Zone', to: 'PLC Zone',
        protocols: ['HTTPS', 'VPN'], direction: 'inbound' }
    ]
  },
  {
    id: 'tpl-process',
    name: 'Impianto Process Control',
    description: 'Impianto process con DCS, field devices e historian',
    is_builtin: 1,
    zones: [
      { zone_name: 'Field Zone', security_level: 'SL-2', color: '#ef4444',
        vendor_hints: ['Siemens', 'Emerson', 'Honeywell'],
        port_hints: [502, 20000, 102] },
      { zone_name: 'Control Zone', security_level: 'SL-2', color: '#3b82f6',
        vendor_hints: ['Rockwell', 'Schneider', 'ABB'],
        port_hints: [44818, 4840, 102] },
      { zone_name: 'Supervisory Zone', security_level: 'SL-1', color: '#22c55e',
        vendor_hints: ['Wonderware', 'Ignition', 'FactoryTalk'],
        port_hints: [80, 443, 4840] },
      { zone_name: 'DMZ', security_level: 'SL-2', color: '#f97316',
        vendor_hints: [], port_hints: [443, 22] },
      { zone_name: 'Unclassified', security_level: 'SL-T', color: '#6b7280',
        vendor_hints: [], port_hints: [] }
    ],
    conduits: [
      { from: 'Supervisory Zone', to: 'Control Zone',
        protocols: ['OPC-UA', 'EtherNet/IP'], direction: 'bidirectional' },
      { from: 'Control Zone', to: 'Field Zone',
        protocols: ['Modbus TCP', 'DNP3', 'PROFINET'], direction: 'bidirectional' },
      { from: 'DMZ', to: 'Supervisory Zone',
        protocols: ['HTTPS'], direction: 'inbound' }
    ]
  },
  {
    id: 'tpl-discrete',
    name: 'Manifattura Discreta',
    description: 'Linea assemblaggio con robot e isole CNC',
    is_builtin: 1,
    zones: [
      { zone_name: 'Robot Zone', security_level: 'SL-2', color: '#ef4444',
        vendor_hints: ['KUKA', 'Fanuc', 'ABB', 'Yaskawa'],
        port_hints: [80, 443, 7000] },
      { zone_name: 'PLC Zone', security_level: 'SL-2', color: '#3b82f6',
        vendor_hints: ['Siemens', 'Rockwell', 'Omron'],
        port_hints: [102, 44818, 9600] },
      { zone_name: 'SCADA Zone', security_level: 'SL-1', color: '#22c55e',
        vendor_hints: [], port_hints: [80, 443, 4840] },
      { zone_name: 'Remote Access Zone', security_level: 'SL-2', color: '#f97316',
        vendor_hints: ['Secomea', 'Cisco'], port_hints: [443, 8080] },
      { zone_name: 'Unclassified', security_level: 'SL-T', color: '#6b7280',
        vendor_hints: [], port_hints: [] }
    ],
    conduits: [
      { from: 'SCADA Zone', to: 'PLC Zone',
        protocols: ['EtherNet/IP', 'S7Comm', 'FINS'], direction: 'bidirectional' },
      { from: 'SCADA Zone', to: 'Robot Zone',
        protocols: ['TCP', 'OPC-UA'], direction: 'bidirectional' },
      { from: 'Remote Access Zone', to: 'SCADA Zone',
        protocols: ['HTTPS'], direction: 'inbound' }
    ]
  }
]

module.exports = BUILTIN_TEMPLATES
```

### `backend/services/scannerService.js`

Uguale alla versione precedente ma con queste aggiunte:
- Dopo service detection, chiama `advisoryService.fetchAndCacheAdvisories()`
  con la lista dei vendor trovati
- In `analysisService.analyze()`, per ogni finding collega gli advisory
  pertinenti via `advisoryService.getAdvisoriesForAsset(vendor, model)`
- Aggiunge ai finding i campi `cve_ids` e `advisory_urls`

### `backend/services/reportService.js`

**Aggiornamenti per Tecnopack branding:**

```javascript
const fs = require('fs')
const path = require('path')

// Logo light (sfondo bianco) — per report PDF/HTML
function getLogoLightSvg() {
  const p = path.join(__dirname, '../../assets/logo-tecnopack-light.svg')
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null
}

// Logo dark (sfondo scuro) — per UI React (servito staticamente)
function getLogoDarkPath() {
  return '/assets/logo-tecnopack-dark.svg'
}

// Incorpora SVG light inline nel PDF (evita dipendenze path esterni in Puppeteer)
function getLogoInlineForPdf() {
  const svg = getLogoLightSvg()
  if (!svg) return '<span style="font-size:24px;font-weight:bold;color:#2e9650">TECNOPACK</span>'
  // Ridimensiona per il report: altezza fissa 50px, larghezza proporzionale
  return svg.replace('<svg ', '<svg height="50" ')
}
```

**Header report HTML/PDF:**
```html
<!-- Cover page -->
<div class="cover">
  <div class="logo-section">
    <!-- Logo Tecnopack light — SVG inline per indipendenza da path -->
    ${getLogoInlineForPdf()}
  </div>
  <div class="report-title">
    <h1>OT Security Assessment Report</h1>
    <h2>Conformità IEC 62443</h2>
  </div>
  <div class="report-meta">
    <table>
      <tr><td>Cliente:</td><td>${client.name}</td></tr>
      <tr><td>Impianto:</td><td>${assessment.name}</td></tr>
      <tr><td>Indirizzo:</td><td>${client.address}, ${client.city}</td></tr>
      <tr><td>Referente cliente:</td><td>${client.contact_name}</td></tr>
      <tr><td>Assessor:</td><td>${assessment.assessor}</td></tr>
      <tr><td>Data:</td><td>${assessment.created_at}</td></tr>
      <tr><td>Subnet analizzata:</td><td>${assessment.subnet}</td></tr>
      <tr><td>SL Target:</td><td>${assessment.iec62443_target_sl}</td></tr>
    </table>
  </div>
  <div class="footer-cover">
    <p>Documento riservato — Tecnopack S.r.l.</p>
    <p>Generato da Tecnopack OT Security Dashboard v2.0</p>
  </div>
</div>
```

**Sezione Advisory nel report:**
Per ogni finding che ha `cve_ids` o `advisory_urls`, aggiungi:
```html
<div class="advisory-section">
  <h4>🔗 Vulnerability Advisories correlati</h4>
  <ul>
    <li><a href="https://nvd.nist.gov/vuln/detail/CVE-XXXX-YYYY">CVE-XXXX-YYYY — NVD</a></li>
    <li><a href="https://www.cisa.gov/...">ICSA-24-XXX-XX — CISA ICS-CERT</a></li>
    <li><a href="${vendorAdvisoryUrl}">Advisory ufficiale ${vendor}</a></li>
  </ul>
</div>
```

**Footer PDF (ogni pagina):**
```
Tecnopack S.r.l. — OT Security Assessment — [Nome Cliente] — [Data] — Pag. N di TOT
```

---

## FASE 3 — NUOVE API ROUTES

### `backend/routes/clients.js`
```javascript
// GET    /api/clients              — lista clienti
// POST   /api/clients              — crea cliente
// GET    /api/clients/:id          — dettaglio + assessment list
// PUT    /api/clients/:id          — modifica
// DELETE /api/clients/:id          — elimina (solo se no assessment)
```

### `backend/routes/advisories.js`
```javascript
// GET /api/advisories                    — tutti gli advisory in cache
// GET /api/advisories?vendor=Omron       — filtro vendor
// POST /api/advisories/refresh           — forza refresh da CISA/NVD
// GET /api/advisories/asset/:assetId     — advisory per asset specifico
```

### `backend/routes/templates.js`
```javascript
// GET  /api/templates              — lista template (builtin + custom)
// POST /api/templates              — crea template custom
// GET  /api/templates/:id          — dettaglio template
// PUT  /api/templates/:id          — modifica (solo custom)
// DELETE /api/templates/:id        — elimina (solo custom)

// POST /api/templates/:id/apply/:assessmentId
// → Applica template a un assessment
// → Crea zone e conduit basati sul template
// → Auto-assegna asset alle zone per vendor/porta match
```

### `backend/routes/export.js`
```javascript
// POST /api/export/:assessmentId   — genera file .otsa
// GET  /api/export/:assessmentId   — scarica file .otsa

// POST /api/import                 — importa file .otsa (multipart upload)
//   body: { file: <.otsa>, client_id: <optional> }
//   → chiama importService.importAssessment()
//   → restituisce nuovo assessment_id
```

---

## FASE 4 — FRONTEND AGGIORNATO

### Nuove pagine e componenti

**`src/pages/Clients.jsx` — Anagrafica Clienti/Impianti**

Lista clienti con:
- Card per ogni cliente: nome, città, N° assessment, ultimo assessment
- Click → dettaglio cliente con lista assessment
- Bottone "Nuovo Cliente" → modal form:
  - Nome azienda (required)
  - Indirizzo, CAP, Città, Paese
  - Nome referente, email, telefono
  - Note
- Bottone "Nuovo Assessment" direttamente dalla card cliente

**`src/pages/Templates.jsx` — Template Zone**

Due sezioni:
1. **Template built-in** (sola lettura): Packaging, Process, Discreta
   - Card con nome, descrizione, preview zone colorate
   - Bottone "Usa questo template" → modal scelta assessment

2. **Template personalizzati** (CRUD completo):
   - Crea da zero o clona da built-in
   - Editor zone: nome, SL, colore, vendor hints, port hints
   - Editor conduit: from → to, protocolli, direzione
   - Salva come template riutilizzabile

**`src/pages/Advisories.jsx` — Vulnerability Advisories**

Dashboard advisory con:
- Filtri: vendor, severity (CVSS), fonte (CISA-KEV / NVD)
- Tabella: ID | Vendor | Titolo | CVSS | CVE | Data | Link
- Badge CISA-KEV in rosso per Known Exploited Vulnerabilities
- Bottone "Aggiorna da CISA/NVD" → spinner → toast risultato
- Ultima sincronizzazione timestamp

**Aggiornamento `src/pages/AssessmentDetail.jsx`**

Nel modal "Nuovo Assessment" aggiungi:
- Select cliente (da lista clienti) — required
- Select template zone → applica automaticamente zone al salvataggio
- Campo SL Target (SL-1 / SL-2 / SL-3)

Nel Tab Reports aggiungi card:
```
┌──────────────────────┐
│  📦 Export .otsa     │
│  Portabile           │
│  Importabile su      │
│  altra installazione │
│  [Esporta]          │
└──────────────────────┘
```

Nel Tab Findings, per ogni finding che ha advisory collegati:
```
┌─────────────────────────────────────────────┐
│ 🔗 Advisory correlati (2)                   │
│  • CVE-2023-1234 [CVSS 9.1] → NVD          │
│  • ICSA-23-045-02 → CISA ICS-CERT          │
│  • Advisory ufficiale Omron →               │
└─────────────────────────────────────────────┘
```

**Aggiornamento Sidebar:**
```
🛡 OT Security                [IEC 62443]
─────────────────────────────────────
📊 Dashboard
🏭 Impianti / Clienti         ← NUOVO
📋 Assessment
🖥  Asset Inventory
🔴 Finding
📰 Advisory                   ← NUOVO
🗂  Template Zone              ← NUOVO
─────────────────────────────────────
⚙️  Impostazioni
```

**`src/pages/Settings.jsx` — Impostazioni**

- Logo Tecnopack: upload file + preview
- Nome azienda per report: "Tecnopack S.r.l."
- Dati assessor default
- Subnet default
- Intervallo refresh advisory (ore)
- Test connessione CISA/NVD

---

## FASE 5 — IMPORT PAGE

**`src/pages/Import.jsx`**

Drag & drop area per file `.otsa`:
```
┌─────────────────────────────────────┐
│                                     │
│   📂 Trascina qui il file .otsa    │
│      o clicca per selezionare       │
│                                     │
│   Importa assessment da un'altra    │
│   installazione Tecnopack           │
│                                     │
└─────────────────────────────────────┘
```

Dopo upload:
- Preview dati: nome assessment, data, N° asset, N° finding
- Select "Associa a cliente esistente" o "Crea nuovo cliente"
- Bottone "Importa" → naviga al nuovo assessment

---

## FASE 6 — SEED DATA AGGIORNATO

```javascript
// backend/seed.js

// Cliente Tecnopack test
const clientId = uuidv4()
db.run(`INSERT INTO clients VALUES (?,?,?,?,?,?,?,?,?)`, [
  clientId,
  'Impianto Test — Cliente Demo',
  'Via Industriale 1',
  'Vicenza',
  'IT',
  'Mario Rossi',
  'mario.rossi@demo.it',
  '+39 0444 000000',
  'Impianto di test per commissioning'
])

// Assessment collegato al cliente
// (con tutti i 15 device già scansionati oggi)
// Assessment id: assessmentId
db.run(`INSERT INTO assessments VALUES (?,?,?,?,?,?,?,?,?,?)`, [
  assessmentId, clientId,
  'Assessment Commissioning — Marzo 2026',
  '172.16.224.0/20', 'completed',
  '2026-03-19T08:00:00.000Z',
  '2026-03-19T09:00:00.000Z',
  'OT Security Team — Tecnopack',
  'SL-2', ''
])

// Inserisci template built-in da builtin-templates.js
const BUILTIN = require('./templates/builtin-templates')
for (const tpl of BUILTIN) {
  db.run(`INSERT OR IGNORE INTO zone_templates VALUES (?,?,?,?)`,
    [tpl.id, tpl.name, tpl.description, tpl.is_builtin])
  for (const zone of tpl.zones) {
    db.run(`INSERT INTO zone_template_zones VALUES (?,?,?,?,?,?,?,?)`,
      [uuidv4(), tpl.id, zone.zone_name, zone.security_level,
       zone.description, zone.color,
       JSON.stringify(zone.vendor_hints),
       JSON.stringify(zone.port_hints)])
  }
  for (const conduit of tpl.conduits) {
    db.run(`INSERT INTO zone_template_conduits VALUES (?,?,?,?,?,?)`,
      [uuidv4(), tpl.id, conduit.from, conduit.to,
       JSON.stringify(conduit.protocols), conduit.direction])
  }
}

// Applica template Packaging ai device già scoperti
// (auto-assign zone per vendor match)

// Genera finding con advisory CISA/NVD
// (usa cache locale per il seed — non fetch live)
```

---

## FASE 7 — START SCRIPT

### `start.sh`
```bash
#!/bin/bash
clear
echo "╔══════════════════════════════════════════════╗"
echo "║   TECNOPACK OT Security Dashboard v2.0       ║"
echo "║   IEC 62443 — Multi-Impianto                 ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Verifica logo
if [ ! -f ~/ot-dashboard/assets/logo-tecnopack-light.svg ]; then
  echo "⚠️  Logo Tecnopack non trovato — assicurati di aver copiato:"
  echo "   logo-tecnopack-light.svg → ~/ot-dashboard/assets/"
  echo "   logo-tecnopack-dark.svg  → ~/ot-dashboard/assets/"
  echo ""
else
  echo "✅ Logo Tecnopack trovato"
fi

# Install dipendenze
cd ~/ot-dashboard/backend
[ ! -d node_modules ] && echo "📦 Installazione backend..." && npm install --silent
cd ~/ot-dashboard/frontend
[ ! -d node_modules ] && echo "📦 Installazione frontend..." && npm install --silent

# Seed DB se vuoto
cd ~/ot-dashboard/backend
node -e "
const db = require('./db/database');
try {
  const count = db.get('SELECT COUNT(*) as n FROM assessments');
  if(count.n === 0) {
    require('./seed');
    console.log('✅ Database inizializzato con dati demo');
  } else {
    console.log('✅ Database esistente — ' + count.n + ' assessment');
  }
} catch(e) { console.log('⚠️ Seed:', e.message); }
"

# Avvia backend
cd ~/ot-dashboard/backend
npm start > /tmp/ot-backend.log 2>&1 &
BACKEND_PID=$!
sleep 2

# Verifica backend
if curl -s http://localhost:3001/api/assessments > /dev/null 2>&1; then
  echo "✅ Backend API → http://172.16.224.250:3001"
else
  echo "❌ Backend non risponde — controlla /tmp/ot-backend.log"
fi

# Avvia frontend
cd ~/ot-dashboard/frontend
npm run dev > /tmp/ot-frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 3

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ Dashboard disponibile su:                ║"
echo "║                                              ║"
echo "║  → http://172.16.224.250:3000               ║"
echo "║  → http://localhost:3000                    ║"
echo "║                                              ║"
echo "║  Apri dal browser su qualsiasi PC della     ║"
echo "║  rete 172.16.224.0/20                       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "CTRL+C per fermare tutto"
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Dashboard fermata.'" EXIT
wait
```

---

## NOTE FINALI PER CLAUDE CODE

- Scrivi tutto il codice — nessun placeholder, nessun TODO
- Il logo Tecnopack viene caricato da `~/ot-dashboard/assets/` — usa
  `getLogoBase64()` che fa fallback automatico al placeholder SVG
- Le chiamate NVD API hanno rate limit: rispetta i 7 secondi tra richieste
- Il formato `.otsa` deve essere retrocompatibile — versiona il campo `version`
- I template built-in vengono inseriti nel DB solo al primo avvio (seed)
- L'import .otsa deve funzionare anche se il cliente non esiste ancora
- Testa che apply-template auto-assegni correttamente le zone per vendor
- Genera README.md completo con: installazione, uso, troubleshooting,
  struttura .otsa, lista vendor supportati, disclaimer legale

---

*Tecnopack OT Security Dashboard v2.0 — IEC 62443 — Marzo 2026*