// backend/seed.js — dati reali assessment OT_Assessment_Impianto_X 2026-03-19
const { v4: uuidv4 } = require('uuid')
const db = require('./db/database')
const BUILTIN = require('./templates/builtin-templates')
const analysisService = require('./services/analysisService')

console.log('Inizializzazione database con dati reali assessment 2026-03-19...')

// ================================================================
// CLIENTE
// ================================================================
const clientId = uuidv4()
db.run(
  `INSERT OR IGNORE INTO clients (id, name, address, city, country, contact_name, contact_email, contact_phone, notes)
   VALUES (?,?,?,?,?,?,?,?,?)`,
  [clientId, 'Impianto X — Cliente Demo', 'Via Industriale 1', 'Vicenza', 'IT',
   'Mario Rossi', 'mario.rossi@demo.it', '+39 0444 000000', 'Impianto packaging — commissioning 2026']
)

// ================================================================
// ASSESSMENT
// ================================================================
const assessmentId = uuidv4()
db.run(
  `INSERT OR IGNORE INTO assessments (id, client_id, name, subnet, status, created_at, completed_at, assessor, iec62443_target_sl, notes)
   VALUES (?,?,?,?,?,?,?,?,?,?)`,
  [assessmentId, clientId,
   'OT_Assessment_Impianto_X — Marzo 2026',
   '172.16.224.0/20', 'completed',
   '2026-03-19T08:00:00.000Z', '2026-03-19T09:00:00.000Z',
   'OT Security Team — Tecnopack', 'SL-2',
   '17 device trovati (inclusi 3 non documentati). 10 finding: 2 Critical, 4 High, 4 Medium.']
)

// ================================================================
// ZONE TEMPLATES BUILTIN
// ================================================================
for (const tpl of BUILTIN) {
  db.run(`INSERT OR IGNORE INTO zone_templates (id, name, description, is_builtin) VALUES (?,?,?,?)`,
    [tpl.id, tpl.name, tpl.description, tpl.is_builtin])
  for (const zone of tpl.zones) {
    db.run(`INSERT OR IGNORE INTO zone_template_zones (id, template_id, zone_name, security_level, description, color, vendor_hints, port_hints) VALUES (?,?,?,?,?,?,?,?)`,
      [uuidv4(), tpl.id, zone.zone_name, zone.security_level, zone.description || '', zone.color,
       JSON.stringify(zone.vendor_hints || []), JSON.stringify(zone.port_hints || [])])
  }
  for (const conduit of tpl.conduits) {
    db.run(`INSERT OR IGNORE INTO zone_template_conduits (id, template_id, from_zone_name, to_zone_name, protocols, direction) VALUES (?,?,?,?,?,?)`,
      [uuidv4(), tpl.id, conduit.from, conduit.to, JSON.stringify(conduit.protocols), conduit.direction])
  }
}

// ================================================================
// ZONE PER QUESTO ASSESSMENT
// ================================================================
const zoneIds = {
  plc: uuidv4(), hmi: uuidv4(), infra: uuidv4(), remote: uuidv4(), unclass: uuidv4()
}
const zoneData = [
  [zoneIds.plc,    assessmentId, 'PLC Zone',             'SL-2', 'Omron NJ501-1300 + B&R Idecon bilance', '#3b82f6'],
  [zoneIds.hmi,    assessmentId, 'HMI Zone',             'SL-1', 'Hakko GR-series pannelli operatore',    '#22c55e'],
  [zoneIds.infra,  assessmentId, 'Infrastructure Zone',  'SL-2', 'HPE 2530-8G switch OT',                '#06b6d4'],
  [zoneIds.remote, assessmentId, 'Remote Access Zone',   'SL-2', 'Secomea SiteManager gateway remoto',   '#f97316'],
  [zoneIds.unclass,assessmentId, 'Unclassified',         'SL-T', 'Device non classificati da verificare','#6b7280'],
]
for (const z of zoneData) {
  db.run(`INSERT OR IGNORE INTO zones (id, assessment_id, name, security_level, description, color) VALUES (?,?,?,?,?,?)`, z)
}

// ================================================================
// CONDUIT
// ================================================================
const conduitData = [
  [uuidv4(), assessmentId, 'C1: HMI → PLC', zoneIds.hmi, zoneIds.plc, JSON.stringify(['FINS', 'EtherNet/IP', 'OPC-UA']), 'bidirectional'],
  [uuidv4(), assessmentId, 'C2: Remote → PLC', zoneIds.remote, zoneIds.plc, JSON.stringify(['HTTPS']), 'inbound'],
  [uuidv4(), assessmentId, 'C3: Unclass → PLC (da bloccare)', zoneIds.unclass, zoneIds.plc, JSON.stringify(['SMB', 'RPC']), 'bidirectional'],
]
for (const c of conduitData) {
  db.run(`INSERT OR IGNORE INTO conduits (id, assessment_id, name, zone_from_id, zone_to_id, protocols, direction) VALUES (?,?,?,?,?,?,?)`, c)
}

// ================================================================
// ASSET — 17 device reali da assessment 2026-03-19
// ================================================================
const seedAssets = [
  // === ZONE 1 - PLC ===
  { ip:'172.16.224.21', mac:'3C:F7:D1:80:3A:8F', vendor:'Omron Corporation',
    device_type:'PLC', device_model:'NJ501-1300', firmware_version:'Rev 2.9',
    security_zone:'PLC Zone', criticality:'high',
    notes:'S/N: 0x01c5f556 | Status: Running (0x0030)',
    zoneId: zoneIds.plc,
    ports:[
      {port:443,   protocol:'tcp', service:'https',       version:'',                state:'open', is_required:1},
      {port:4840,  protocol:'tcp', service:'opcua-tcp',   version:'',                state:'open', is_required:1},
      {port:9600,  protocol:'tcp', service:'fins',        version:'',                state:'open', is_required:0},
      {port:44818, protocol:'tcp', service:'EtherNet/IP', version:'',                state:'open', is_required:0},
    ]},
  { ip:'172.16.224.22', mac:'3C:F7:D1:80:4E:BB', vendor:'Omron Corporation',
    device_type:'PLC', device_model:'NJ501-1300', firmware_version:'Rev 2.9',
    security_zone:'PLC Zone', criticality:'high',
    notes:'S/N: 0x01c5fbd8 | Status: Minor Fault (0x0034)',
    zoneId: zoneIds.plc,
    ports:[
      {port:443,   protocol:'tcp', service:'https',       version:'', state:'open', is_required:1},
      {port:4840,  protocol:'tcp', service:'opcua-tcp',   version:'', state:'open', is_required:1},
      {port:9600,  protocol:'tcp', service:'fins',        version:'', state:'open', is_required:0},
      {port:44818, protocol:'tcp', service:'EtherNet/IP', version:'', state:'open', is_required:0},
    ]},
  { ip:'172.16.224.23', mac:'3C:F7:D1:80:3A:85', vendor:'Omron Corporation',
    device_type:'PLC', device_model:'NJ501-1300', firmware_version:'Rev 2.9',
    security_zone:'PLC Zone', criticality:'high',
    notes:'S/N: 0x01c5f551 | Status: Running (0x0030)',
    zoneId: zoneIds.plc,
    ports:[
      {port:443,   protocol:'tcp', service:'https',       version:'', state:'open', is_required:1},
      {port:4840,  protocol:'tcp', service:'opcua-tcp',   version:'', state:'open', is_required:1},
      {port:9600,  protocol:'tcp', service:'fins',        version:'', state:'open', is_required:0},
      {port:44818, protocol:'tcp', service:'EtherNet/IP', version:'', state:'open', is_required:0},
    ]},
  { ip:'172.16.224.24', mac:'3C:F7:D1:80:4E:C9', vendor:'Omron Corporation',
    device_type:'PLC', device_model:'NJ501-1300', firmware_version:'Rev 2.9',
    security_zone:'PLC Zone', criticality:'high',
    notes:'S/N: 0x01c5fbe5 | Status: Running (0x0030)',
    zoneId: zoneIds.plc,
    ports:[
      {port:443,   protocol:'tcp', service:'https',       version:'', state:'open', is_required:1},
      {port:4840,  protocol:'tcp', service:'opcua-tcp',   version:'', state:'open', is_required:1},
      {port:9600,  protocol:'tcp', service:'fins',        version:'', state:'open', is_required:0},
      {port:44818, protocol:'tcp', service:'EtherNet/IP', version:'', state:'open', is_required:0},
    ]},
  { ip:'172.16.224.111', mac:'3C:F7:D1:80:3B:DB', vendor:'Omron Corporation',
    device_type:'PLC', device_model:'NJ501-1300', firmware_version:'Rev 2.9',
    security_zone:'PLC Zone', criticality:'high',
    notes:'*** ASSET NON DOCUMENTATO *** S/N: 0x01c5f5b8 | Status: Minor Fault (0x0034)',
    zoneId: zoneIds.plc,
    ports:[
      {port:443,   protocol:'tcp', service:'https',       version:'', state:'open', is_required:1},
      {port:4840,  protocol:'tcp', service:'opcua-tcp',   version:'', state:'open', is_required:1},
      {port:9600,  protocol:'tcp', service:'fins',        version:'', state:'open', is_required:0},
      {port:44818, protocol:'tcp', service:'EtherNet/IP', version:'', state:'open', is_required:0},
    ]},
  { ip:'172.16.224.201', mac:'00:60:65:AF:ED:F4', vendor:'B&R Industrial Automation',
    device_type:'PLC', device_model:'Idecon Codeline Scale Controller', firmware_version:'',
    security_zone:'PLC Zone', criticality:'high',
    notes:'ID: 02795 | Banner TCP/50000: "226g|codeline|ID 02795|supervisor" — DATI PROD IN CHIARO',
    zoneId: zoneIds.plc,
    ports:[{port:50000, protocol:'tcp', service:'Idecon-proprietary', version:'', state:'open', is_required:0}]},
  { ip:'172.16.224.202', mac:'00:60:65:AF:EE:0A', vendor:'B&R Industrial Automation',
    device_type:'PLC', device_model:'Idecon Codeline Scale Controller', firmware_version:'',
    security_zone:'PLC Zone', criticality:'high',
    notes:'ID: 02792 | Banner: "ORDINE_PLC_TEST|226g|ID 02792|supervisor"',
    zoneId: zoneIds.plc,
    ports:[{port:50000, protocol:'tcp', service:'Idecon-proprietary', version:'', state:'open', is_required:0}]},
  { ip:'172.16.224.203', mac:'00:60:65:AF:EE:10', vendor:'B&R Industrial Automation',
    device_type:'PLC', device_model:'Idecon Codeline Scale Controller', firmware_version:'',
    security_zone:'PLC Zone', criticality:'high',
    notes:'ID: 02794 | Banner: "900 g|codeline|ID 02794|supervisor"',
    zoneId: zoneIds.plc,
    ports:[{port:50000, protocol:'tcp', service:'Idecon-proprietary', version:'', state:'open', is_required:0}]},
  { ip:'172.16.224.204', mac:'00:60:65:AF:E7:56', vendor:'B&R Industrial Automation',
    device_type:'PLC', device_model:'Idecon Codeline Scale Controller', firmware_version:'',
    security_zone:'PLC Zone', criticality:'high',
    notes:'ID: 02793 | Banner: "ORD1000|400 g|ID 02793|supervisor"',
    zoneId: zoneIds.plc,
    ports:[{port:50000, protocol:'tcp', service:'Idecon-proprietary', version:'', state:'open', is_required:0}]},

  // === ZONE 2 - HMI ===
  { ip:'172.16.224.41', mac:'00:50:FF:14:C5:37', vendor:'Hakko Electronics',
    device_type:'HMI', device_model:'GR-series', firmware_version:'GR-HTTPD Server/2.20',
    security_zone:'HMI Zone', criticality:'medium', notes:'',
    zoneId: zoneIds.hmi,
    ports:[{port:80, protocol:'tcp', service:'http', version:'GR-HTTPD 2.20', state:'open', is_required:0}]},
  { ip:'172.16.224.42', mac:'00:50:FF:14:CF:D6', vendor:'Hakko Electronics',
    device_type:'HMI', device_model:'GR-series', firmware_version:'GR-HTTPD Server/2.20',
    security_zone:'HMI Zone', criticality:'medium', notes:'',
    zoneId: zoneIds.hmi,
    ports:[{port:80, protocol:'tcp', service:'http', version:'GR-HTTPD 2.20', state:'open', is_required:0}]},
  { ip:'172.16.224.43', mac:'00:50:FF:15:37:85', vendor:'Hakko Electronics',
    device_type:'HMI', device_model:'GR-series', firmware_version:'GR-HTTPD Server/2.20',
    security_zone:'HMI Zone', criticality:'medium', notes:'',
    zoneId: zoneIds.hmi,
    ports:[{port:80, protocol:'tcp', service:'http', version:'GR-HTTPD 2.20', state:'open', is_required:0}]},
  { ip:'172.16.224.44', mac:'00:50:FF:15:37:6D', vendor:'Hakko Electronics',
    device_type:'HMI', device_model:'GR-series', firmware_version:'GR-HTTPD Server/2.20',
    security_zone:'HMI Zone', criticality:'medium', notes:'',
    zoneId: zoneIds.hmi,
    ports:[{port:80, protocol:'tcp', service:'http', version:'GR-HTTPD 2.20', state:'open', is_required:0}]},
  { ip:'172.16.224.121', mac:'00:50:FF:15:CA:46', vendor:'Hakko Electronics',
    device_type:'HMI', device_model:'GR-series (variante)', firmware_version:'Dropbear SSH 2022.83',
    security_zone:'HMI Zone', criticality:'medium',
    notes:'*** ASSET NON DOCUMENTATO *** SSH Dropbear 2022.83 + LPD printer (515) invece di HTTP. OS: Linux confermato.',
    zoneId: zoneIds.hmi,
    ports:[
      {port:22,  protocol:'tcp', service:'ssh',     version:'Dropbear sshd 2022.83', state:'open', is_required:0},
      {port:515, protocol:'tcp', service:'printer',  version:'',                     state:'open', is_required:0},
    ]},

  // === ZONE 3 - INFRASTRUCTURE / REMOTE ===
  { ip:'172.16.239.2', mac:'EC:EB:B8:B5:09:50', vendor:'Hewlett Packard Enterprise',
    device_type:'Switch', device_model:'HP J9777A 2530-8G Switch', firmware_version:'YA.16.04.0008 (2017)',
    security_zone:'Infrastructure Zone', criticality:'high',
    notes:'*** TELNET ABILITATO *** Switch OT principale. SSH: Mocana NanoSSH 6.3. HTTP: eHTTP v2.0. Firmware 2017 obsoleto.',
    zoneId: zoneIds.infra,
    ports:[
      {port:22, protocol:'tcp', service:'ssh',    version:'Mocana NanoSSH 6.3', state:'open', is_required:1},
      {port:23, protocol:'tcp', service:'telnet', version:'',                   state:'open', is_required:0},
      {port:80, protocol:'tcp', service:'http',   version:'eHTTP v2.0',         state:'open', is_required:0},
    ]},
  { ip:'172.16.239.254', mac:'00:C0:A2:09:60:C4', vendor:'Secomea (Intermedium A/S)',
    device_type:'Router', device_model:'SiteManager', firmware_version:'Apache httpd',
    security_zone:'Remote Access Zone', criticality:'high',
    notes:'Router accesso remoto OT. HTTPS autenticato (401). Porta 8080 da verificare.',
    zoneId: zoneIds.remote,
    ports:[
      {port:443,  protocol:'tcp', service:'https',      version:'Apache httpd', state:'open', is_required:1},
      {port:8080, protocol:'tcp', service:'http-proxy',  version:'',            state:'open', is_required:0},
    ]},

  // === ZONE 4 - UNCLASSIFIED ===
  { ip:'172.16.224.10', mac:'14:4F:D7:CD:E5:44', vendor:'D&S Cable Industries (HK)',
    device_type:'Unknown', device_model:'Windows/VMware host', firmware_version:'',
    security_zone:'Unclassified', criticality:'high',
    notes:'*** ASSET NON DOCUMENTATO *** Windows+VMware in rete OT. SMB 445 aperto. Porte VMware 902,912.',
    zoneId: zoneIds.unclass,
    ports:[
      {port:135, protocol:'tcp', service:'msrpc',        version:'', state:'open',          is_required:0},
      {port:139, protocol:'tcp', service:'netbios-ssn',  version:'', state:'open',          is_required:0},
      {port:445, protocol:'tcp', service:'microsoft-ds', version:'', state:'open',          is_required:0},
      {port:902, protocol:'tcp', service:'VMware SOAP',  version:'', state:'open',          is_required:0},
      {port:912, protocol:'tcp', service:'VMware Auth',  version:'', state:'open',          is_required:0},
      {port:161, protocol:'udp', service:'snmp',         version:'', state:'open|filtered', is_required:0},
    ]},
]

// Insert assets and ports
const savedAssets = []
const portsMap = {}

for (const assetDef of seedAssets) {
  const { ports, zoneId, ...assetFields } = assetDef
  const assetId = uuidv4()
  db.run(
    `INSERT OR IGNORE INTO assets (id, assessment_id, ip, mac, vendor, device_type, device_model, firmware_version, security_zone, criticality, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [assetId, assessmentId, assetFields.ip, assetFields.mac, assetFields.vendor,
     assetFields.device_type, assetFields.device_model, assetFields.firmware_version,
     assetFields.security_zone, assetFields.criticality, assetFields.notes]
  )

  // Link to zone
  if (zoneId) {
    db.run('INSERT OR IGNORE INTO zone_assets (zone_id, asset_id) VALUES (?,?)', [zoneId, assetId])
  }

  const portRows = []
  for (const p of (ports || [])) {
    const portId = uuidv4()
    db.run(
      `INSERT OR IGNORE INTO open_ports (id, asset_id, port, protocol, service, version, state, is_required) VALUES (?,?,?,?,?,?,?,?)`,
      [portId, assetId, p.port, p.protocol, p.service, p.version || '', p.state, p.is_required]
    )
    portRows.push({ ...p, id: portId, asset_id: assetId })
  }

  savedAssets.push({ id: assetId, ...assetFields })
  portsMap[assetId] = portRows
}

// ================================================================
// FINDINGS — analisi automatica con regole IEC 62443
// ================================================================
const findings = analysisService.analyze(savedAssets, portsMap)

// Add real evidence from report.md
const evidenceOverrides = {
  'F-TELNET-OPEN': `nmap -sV 172.16.239.2:\n  23/tcp open telnet\nBanner: "HP J9777A 2530-8G Switch\n  Software revision YA.16.04.0008\n  (C) Copyright 2017 Hewlett Packard Enterprise\n  Username: "`,
  'F-BR-NOAUTH-PRODUCTION': `nc 172.16.224.201 50000: EVENT=19/03/2026 14:34:18|||226g|codeline|ID 02795|Cod. 1012|Remote connection : Local|supervisor|\nnc 172.16.224.202 50000: EVENT=19/03/2026 14:37:07|ORDINE_PLC_TEST||226g|ID 02792|supervisor|\nnc 172.16.224.203 50000: EVENT=19/03/2026 14:35:20|||900 g|ID 02794|supervisor|\nnc 172.16.224.204 50000: EVENT=19/03/2026 14:33:54|ORD1000||400 g|ID 02793|supervisor|`,
  'F-FINS-NOAUTH': `nmap --script omron-info 172.16.224.21-24,111:\n  Tutti 5 PLC rispondono FINS senza autenticazione.\n  .22 e .111: status 0x0034 (Minor Fault)`,
  'F-ENIP-DISCLOSURE': `enip-info: NJ501-1300, Omron (47), rev 2.9, SN 0x01c5f556 — List Identity senza autenticazione`,
  'F-SMB-IN-OT': `nmap 172.16.224.10:\n  135/tcp open msrpc\n  139/tcp open netbios-ssn\n  445/tcp open microsoft-ds\n  902/tcp open VMware SOAP\n  912/tcp open VMware Auth\n  Device non documentato in inventario OT`,
}

for (const finding of findings) {
  if (evidenceOverrides[finding.finding_code]) {
    finding.evidence = evidenceOverrides[finding.finding_code]
  }
  db.run(
    `INSERT OR IGNORE INTO findings
     (id, assessment_id, asset_id, finding_code, title, description,
      cvss_score, cvss_vector, severity, iec62443_sr, iec62443_part,
      evidence, remediation, remediation_priority, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [uuidv4(), assessmentId, finding.asset_id, finding.finding_code,
     finding.title, finding.description, finding.cvss_score, finding.cvss_vector,
     finding.severity, finding.iec62443_sr, finding.iec62443_part,
     finding.evidence, finding.remediation, finding.remediation_priority, 'open']
  )
}

console.log(`Database inizializzato:`)
console.log(`  - 1 cliente, 1 assessment`)
console.log(`  - ${seedAssets.length} asset (17 device reali)`)
console.log(`  - ${findings.length} finding di sicurezza`)
console.log(`  - ${BUILTIN.length} template zona built-in`)
console.log(`  - 5 zone + 3 conduit per assessment`)
