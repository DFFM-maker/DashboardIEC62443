'use strict'

// ================================================================
// OUI MAP: primi 3 ottetti MAC (uppercase, formato XX:XX:XX) → vendor + tipo
// Fonte: IEEE OUI registry + database vendor OT noti
// ================================================================
const OUI_MAP = {
  // Omron
  '3C:F7:D1': { vendor: 'Omron', device_type: 'PLC' },
  '00:00:4C': { vendor: 'Omron', device_type: 'PLC' },

  // Hakko Electronics (Monitouch)
  '00:50:FF': { vendor: 'Hakko Electronics', device_type: 'HMI' },

  // B&R Industrial Automation
  '00:60:65': { vendor: 'B&R Industrial Automation', device_type: 'PLC' },

  // Secomea (gateway VPN OT)
  '00:C0:A2': { vendor: 'Secomea', device_type: 'Router' },

  // Microsoft — Hyper-V virtual NICs (VM in rete OT = anomalia)
  '00:15:5D': { vendor: 'Microsoft (Hyper-V)', device_type: 'Workstation' },

  // Hewlett Packard Enterprise
  'EC:EB:B8': { vendor: 'Hewlett Packard Enterprise', device_type: 'Switch' },
  '3C:D9:2B': { vendor: 'Hewlett Packard Enterprise', device_type: 'Switch' },
  '00:17:A4': { vendor: 'Hewlett Packard Enterprise', device_type: 'Switch' },

  // Siemens
  '00:0E:8C': { vendor: 'Siemens', device_type: 'PLC' },
  '00:1B:1B': { vendor: 'Siemens', device_type: 'PLC' },
  '28:63:36': { vendor: 'Siemens', device_type: 'PLC' },
  'AC:64:17': { vendor: 'Siemens', device_type: 'PLC' },
  '00:1C:06': { vendor: 'Siemens', device_type: 'PLC' },

  // Rockwell Automation / Allen-Bradley
  '00:00:BC': { vendor: 'Rockwell Automation', device_type: 'PLC' },
  '00:1D:9C': { vendor: 'Rockwell Automation', device_type: 'PLC' },
  '00:07:E9': { vendor: 'Rockwell Automation', device_type: 'PLC' },
  '00:00:2C': { vendor: 'Rockwell Automation', device_type: 'PLC' },

  // Schneider Electric
  '00:80:F4': { vendor: 'Schneider Electric', device_type: 'PLC' },
  '00:07:4F': { vendor: 'Schneider Electric', device_type: 'PLC' },
  '00:09:57': { vendor: 'Schneider Electric', device_type: 'PLC' },
  '58:E8:76': { vendor: 'Schneider Electric', device_type: 'PLC' },

  // Beckhoff
  '00:01:05': { vendor: 'Beckhoff', device_type: 'PLC' },

  // Phoenix Contact
  '00:A0:45': { vendor: 'Phoenix Contact', device_type: 'PLC' },
  'A8:74:1D': { vendor: 'Phoenix Contact', device_type: 'PLC' },

  // Moxa Technologies
  '00:90:E8': { vendor: 'Moxa', device_type: 'Gateway' },

  // Advantech
  '00:D0:C9': { vendor: 'Advantech', device_type: 'Gateway' },

  // Wago
  '00:30:DE': { vendor: 'Wago', device_type: 'PLC' },

  // Pilz
  '00:25:90': { vendor: 'Pilz', device_type: 'Safety PLC' },

  // Turck
  '00:07:56': { vendor: 'Turck', device_type: 'Field Device' },

  // ifm electronic
  '00:02:01': { vendor: 'ifm electronic', device_type: 'Field Device' },

  // Pepperl+Fuchs
  '00:07:F7': { vendor: 'Pepperl+Fuchs', device_type: 'Field Device' },

  // Cisco
  '00:17:0E': { vendor: 'Cisco', device_type: 'Switch' },
  '00:1B:2B': { vendor: 'Cisco', device_type: 'Switch' },
  'F4:CF:E2': { vendor: 'Cisco', device_type: 'Switch' },
  '00:E0:A3': { vendor: 'Cisco', device_type: 'Switch' },

  // Hirschmann (Belden)
  '00:80:63': { vendor: 'Hirschmann', device_type: 'Switch' },

  // VMware virtual NICs (VM in rete OT = anomalia)
  '00:50:56': { vendor: 'VMware', device_type: 'Workstation' },
  '00:0C:29': { vendor: 'VMware', device_type: 'Workstation' },
  '00:05:69': { vendor: 'VMware', device_type: 'Workstation' },
}

// ================================================================
// SNMP sysDescr patterns → vendor + model + firmware
// ================================================================
const SNMP_PATTERNS = [
  {
    // Omron NJ501-1300 Ver.1.67.02
    match: /OMRON\s+Corporation\s+(\S+)\s+Ver\.([\d.]+)/i,
    vendor: 'Omron',
    extract: (m) => ({ device_model: m[1], firmware_version: `Ver.${m[2]}` })
  },
  {
    match: /OMRON/i,
    vendor: 'Omron',
    extract: () => ({})
  },
  {
    // B&R PLC X20CP1484 V2.7.0
    match: /B&R\s+(.+?)\s+(?:V|SW)?([\d.]+)/i,
    vendor: 'B&R Industrial Automation',
    extract: (m) => ({ device_model: m[1].trim(), firmware_version: m[2] })
  },
  {
    // HP J9777A 2530-8G Switch Software revision YA.16.04.0008
    match: /HP\s+(J\w+)\s+(.+?)\s+Switch.*?revision\s+(\S+)/i,
    vendor: 'Hewlett Packard Enterprise',
    extract: (m) => ({ device_model: `HP ${m[1]} ${m[2].trim()} Switch`, firmware_version: m[3] })
  },
  {
    match: /SIMATIC\s+(\S+)/i,
    vendor: 'Siemens',
    extract: (m) => ({ device_model: `SIMATIC ${m[1]}` })
  },
  {
    match: /Siemens/i,
    vendor: 'Siemens',
    extract: () => ({})
  },
  {
    match: /Allen.Bradley|ControlLogix|CompactLogix|MicroLogix|Studio 5000/i,
    vendor: 'Rockwell Automation',
    extract: () => ({})
  },
  {
    match: /Schneider|Modicon|EcoStruxure/i,
    vendor: 'Schneider Electric',
    extract: () => ({})
  },
  {
    match: /Secomea\s+(\S+)/i,
    vendor: 'Secomea',
    extract: (m) => ({ device_model: m[1] })
  },
  {
    match: /Secomea/i,
    vendor: 'Secomea',
    extract: () => ({})
  },
  {
    match: /Cisco\s+IOS/i,
    vendor: 'Cisco',
    extract: () => ({})
  },
]

// ================================================================
// HTTP banner patterns → vendor + model (da Server header o titolo pagina)
// ================================================================
const HTTP_BANNER_PATTERNS = [
  {
    match: /GR-HTTPD[\/\s]*([\d.]+)/i,
    vendor: 'Hakko Electronics',
    model: () => 'GR-series',
    firmware: (m) => `GR-HTTPD ${m[1]}`
  },
  {
    match: /Monitouch/i,
    vendor: 'Hakko Electronics',
    model: () => 'Monitouch',
    firmware: () => null
  },
  {
    match: /Weintek/i,
    vendor: 'Weintek',
    model: () => 'Weintek HMI',
    firmware: () => null
  },
  {
    match: /eHTTP\s*v?([\d.]+)/i,
    vendor: 'Hewlett Packard Enterprise',
    model: () => null,
    firmware: (m) => `eHTTP v${m[1]}`
  },
  {
    match: /Siemens/i,
    vendor: 'Siemens',
    model: () => 'Siemens Panel',
    firmware: () => null
  },
  {
    match: /Secomea/i,
    vendor: 'Secomea',
    model: () => 'SiteManager',
    firmware: () => null
  },
]

// ================================================================
// Port signatures → device_type + criticality
// Ordine: dal più specifico al più generico
// ================================================================
function classifyByPorts(ports) {
  const portSet = new Set(ports.map(p => p.port))

  // Anomalie — Windows/VMware in rete OT
  if (portSet.has(902) || portSet.has(912)) {
    return { device_type: 'Workstation', criticality: 'high', note: 'VMware host in rete OT — anomalia' }
  }
  if (portSet.has(445) && portSet.has(135)) {
    return { device_type: 'Workstation', criticality: 'high', note: 'Windows SMB/RPC in rete OT — anomalia' }
  }

  // Protocolli OT industriali → PLC/Controller
  if (portSet.has(9600))  return { device_type: 'PLC', criticality: 'high', note: 'FINS/Omron' }
  if (portSet.has(102))   return { device_type: 'PLC', criticality: 'high', note: 'S7Comm/Siemens' }
  if (portSet.has(44818)) return { device_type: 'PLC', criticality: 'high', note: 'EtherNet/IP' }
  if (portSet.has(502))   return { device_type: 'PLC', criticality: 'high', note: 'Modbus TCP' }
  if (portSet.has(50000)) return { device_type: 'PLC', criticality: 'high', note: 'B&R/Idecon proprietario' }
  if (portSet.has(20000)) return { device_type: 'PLC', criticality: 'high', note: 'DNP3' }
  if (portSet.has(4840) && (portSet.has(443) || portSet.has(80))) {
    return { device_type: 'PLC', criticality: 'high', note: 'OPC-UA server' }
  }

  // Switch/infrastruttura — gestione via SSH/Telnet/HTTP senza protocolli OT
  if ((portSet.has(22) || portSet.has(23)) && portSet.has(80) && !portSet.has(44818)) {
    return { device_type: 'Switch', criticality: 'medium', note: 'Network infrastructure' }
  }

  // Solo HTTP/HTTPS → HMI web-based
  if ((portSet.has(80) || portSet.has(443)) && portSet.size <= 3) {
    return { device_type: 'HMI', criticality: 'medium', note: 'Web-based HMI' }
  }

  return null
}

// ================================================================
// Funzione principale di classificazione
// Input: mac (stringa), ports (array {port, protocol}),
//        snmpDescr (stringa sysDescr), httpBanner (stringa header HTTP)
// Output: { vendor, device_type, device_model, firmware_version, criticality }
// ================================================================
function classifyDevice(mac, ports = [], snmpDescr = '', httpBanner = '') {
  let vendor = null
  let device_type = null
  let device_model = null
  let firmware_version = null
  let criticality = 'medium'
  const notes = []

  // 1. OUI lookup (MAC vendor)
  if (mac) {
    const oui = mac.toUpperCase().slice(0, 8) // "XX:XX:XX"
    const ouiEntry = OUI_MAP[oui]
    if (ouiEntry) {
      vendor = ouiEntry.vendor
      device_type = ouiEntry.device_type
    }
  }

  // 2. SNMP sysDescr — aggiunge/raffina vendor, modello, firmware
  if (snmpDescr) {
    for (const pattern of SNMP_PATTERNS) {
      const m = snmpDescr.match(pattern.match)
      if (m) {
        if (!vendor) vendor = pattern.vendor
        const extracted = pattern.extract(m)
        if (extracted.device_model) device_model = extracted.device_model
        if (extracted.firmware_version) firmware_version = extracted.firmware_version
        break
      }
    }
  }

  // 3. HTTP banner — HMI e panel detection
  if (httpBanner) {
    for (const pattern of HTTP_BANNER_PATTERNS) {
      const m = httpBanner.match(pattern.match)
      if (m) {
        if (!vendor && pattern.vendor) vendor = pattern.vendor
        if (!device_model && pattern.model) {
          const model = pattern.model(m)
          if (model) device_model = model
        }
        if (!firmware_version && pattern.firmware) {
          const fw = pattern.firmware(m)
          if (fw) firmware_version = fw
        }
        if (vendor && ['Hakko Electronics', 'Weintek'].includes(vendor)) {
          device_type = 'HMI'
        }
        break
      }
    }
  }

  // 4. Port signatures — override se segnale più forte (anomalie Windows/VMware sempre vincono)
  const portClass = classifyByPorts(ports)
  if (portClass) {
    const isAnomaly = portClass.device_type === 'Workstation'
    if (!device_type || isAnomaly) {
      device_type = portClass.device_type
      if (portClass.note) notes.push(portClass.note)
    }
    criticality = portClass.criticality
  }

  // 5. Criticità finale per tipo
  if (!device_type) device_type = 'Unknown'
  if (device_type === 'PLC' || device_type === 'Safety PLC') criticality = 'high'
  else if (device_type === 'Router') criticality = 'high'
  else if (device_type === 'Workstation') criticality = 'high'
  else if (device_type === 'HMI') criticality = 'medium'
  else if (device_type === 'Switch') criticality = 'medium'
  else if (device_type === 'Unknown') criticality = 'medium'

  // VM in rete OT è sempre anomalia high
  if (vendor && (vendor.includes('Hyper-V') || vendor === 'VMware')) {
    criticality = 'high'
    device_type = 'Workstation'
    if (!notes.some(n => n.includes('VM'))) notes.push('VM in rete OT — anomalia')
  }

  return {
    vendor: vendor || null,
    device_type,
    device_model: device_model || null,
    firmware_version: firmware_version || null,
    criticality,
    classification_notes: notes.join('; ')
  }
}

// ================================================================
// Auto-assegnazione zona: dato device_type + vendor,
// cerca la zona più adatta tra quelle già create per l'assessment.
// Fallback: 'Unclassified'
// ================================================================
const ZONE_PRIORITY = {
  'PLC':        ['PLC Zone', 'Scale Zone', 'Field Zone', 'Control Zone', 'Robot Zone'],
  'Safety PLC': ['PLC Zone', 'Control Zone'],
  'HMI':        ['HMI Zone', 'Supervisory Zone', 'SCADA Zone'],
  'Switch':     ['Infrastructure Zone'],
  'Router':     ['Remote Access Zone'],
  'Gateway':    ['Remote Access Zone', 'Infrastructure Zone'],
  'Workstation':['Unclassified'],
  'Field Device':['Field Zone', 'PLC Zone'],
  'Unknown':    ['Unclassified'],
}

function assignZone(device_type, vendor, availableZones) {
  const candidates = ZONE_PRIORITY[device_type] || ['Unclassified']
  for (const name of candidates) {
    const zone = availableZones.find(z => z.name === name)
    if (zone) return zone.name
  }
  // Fallback: Unclassified se esiste, altrimenti prima zona disponibile
  const unclass = availableZones.find(z => z.name === 'Unclassified')
  return unclass ? 'Unclassified' : (availableZones[0]?.name || 'Unclassified')
}

module.exports = { classifyDevice, assignZone, OUI_MAP }
