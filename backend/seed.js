// backend/seed.js — scaffolding iniziale generico (nessun IP hardcoded)
// Crea: template built-in, cliente demo, assessment vuoto pronto per la scansione.
// Gli asset vengono scoperti dalla scansione nmap/SNMP su qualsiasi impianto.
const { v4: uuidv4 } = require('uuid')
const db = require('./db/database')
const BUILTIN = require('./templates/builtin-templates')

console.log('Inizializzazione database (seed generico)...')

// ================================================================
// ZONE TEMPLATES BUILTIN
// ================================================================
for (const tpl of BUILTIN) {
  db.run(
    `INSERT OR IGNORE INTO zone_templates (id, name, description, is_builtin) VALUES (?,?,?,?)`,
    [tpl.id, tpl.name, tpl.description, tpl.is_builtin]
  )
  for (const zone of tpl.zones) {
    db.run(
      `INSERT OR IGNORE INTO zone_template_zones
       (id, template_id, zone_name, security_level, description, color, vendor_hints, port_hints)
       VALUES (?,?,?,?,?,?,?,?)`,
      [uuidv4(), tpl.id, zone.zone_name, zone.security_level,
       zone.description || '', zone.color,
       JSON.stringify(zone.vendor_hints || []),
       JSON.stringify(zone.port_hints || [])]
    )
  }
  for (const conduit of tpl.conduits) {
    db.run(
      `INSERT OR IGNORE INTO zone_template_conduits
       (id, template_id, from_zone_name, to_zone_name, protocols, direction)
       VALUES (?,?,?,?,?,?)`,
      [uuidv4(), tpl.id, conduit.from, conduit.to,
       JSON.stringify(conduit.protocols), conduit.direction]
    )
  }
}

// ================================================================
// CLIENTE DEMO
// ================================================================
const clientId = uuidv4()
db.run(
  `INSERT OR IGNORE INTO clients (id, name, city, country, notes)
   VALUES (?,?,?,?,?)`,
  [clientId, 'Tecnopack Demo', 'Milano', 'IT',
   'Cliente demo — sostituire con il cliente reale prima dell\'assessment']
)

// ================================================================
// ASSESSMENT VUOTO — pronto per la scansione
// Subnet da configurare nella UI prima di avviare la scansione
// ================================================================
const assessmentId = uuidv4()
db.run(
  `INSERT OR IGNORE INTO assessments
   (id, client_id, name, subnet, status, assessor, iec62443_target_sl, notes)
   VALUES (?,?,?,?,?,?,?,?)`,
  [assessmentId, clientId,
   'Nuovo Assessment OT',
   '192.168.1.0/24',
   'pending',
   '',
   'SL-2',
   'Configura subnet e avvia la scansione. Gli asset vengono rilevati automaticamente.']
)

console.log('Database inizializzato:')
console.log(`  - ${BUILTIN.length} template zona built-in`)
console.log('  - 1 cliente demo (Tecnopack Demo)')
console.log('  - 1 assessment vuoto pronto per la scansione')
console.log('  - 0 asset — verranno scoperti dalla scansione')
