const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')

// GET /api/templates
router.get('/', (req, res) => {
  const templates = db.all('SELECT * FROM zone_templates ORDER BY is_builtin DESC, name')
  for (const tpl of templates) {
    tpl.zones = db.all('SELECT * FROM zone_template_zones WHERE template_id = ?', [tpl.id])
    tpl.conduits = db.all('SELECT * FROM zone_template_conduits WHERE template_id = ?', [tpl.id])
    for (const z of tpl.zones) {
      try { z.vendor_hints = JSON.parse(z.vendor_hints || '[]') } catch (e) {}
      try { z.port_hints = JSON.parse(z.port_hints || '[]') } catch (e) {}
    }
    for (const c of tpl.conduits) {
      try { c.protocols = JSON.parse(c.protocols || '[]') } catch (e) {}
    }
  }
  res.json(templates)
})

// POST /api/templates
router.post('/', (req, res) => {
  const { name, description, zones, conduits } = req.body
  if (!name) return res.status(400).json({ error: 'name obbligatorio' })
  const id = uuidv4()
  db.run('INSERT INTO zone_templates (id, name, description, is_builtin) VALUES (?,?,?,0)', [id, name, description || ''])
  for (const z of (zones || [])) {
    db.run(
      'INSERT INTO zone_template_zones (id, template_id, zone_name, security_level, description, color, vendor_hints, port_hints) VALUES (?,?,?,?,?,?,?,?)',
      [uuidv4(), id, z.zone_name, z.security_level, z.description || '', z.color || '#6b7280', JSON.stringify(z.vendor_hints || []), JSON.stringify(z.port_hints || [])]
    )
  }
  for (const c of (conduits || [])) {
    db.run(
      'INSERT INTO zone_template_conduits (id, template_id, from_zone_name, to_zone_name, protocols, direction) VALUES (?,?,?,?,?,?)',
      [uuidv4(), id, c.from, c.to, JSON.stringify(c.protocols || []), c.direction || 'bidirectional']
    )
  }
  res.json(db.get('SELECT * FROM zone_templates WHERE id = ?', [id]))
})

// GET /api/templates/:id
router.get('/:id', (req, res) => {
  const tpl = db.get('SELECT * FROM zone_templates WHERE id = ?', [req.params.id])
  if (!tpl) return res.status(404).json({ error: 'Template non trovato' })
  tpl.zones = db.all('SELECT * FROM zone_template_zones WHERE template_id = ?', [tpl.id])
  tpl.conduits = db.all('SELECT * FROM zone_template_conduits WHERE template_id = ?', [tpl.id])
  res.json(tpl)
})

// DELETE /api/templates/:id
router.delete('/:id', (req, res) => {
  const tpl = db.get('SELECT * FROM zone_templates WHERE id = ?', [req.params.id])
  if (!tpl) return res.status(404).json({ error: 'Template non trovato' })
  if (tpl.is_builtin) return res.status(403).json({ error: 'I template built-in non possono essere eliminati' })
  db.run('DELETE FROM zone_template_zones WHERE template_id = ?', [req.params.id])
  db.run('DELETE FROM zone_template_conduits WHERE template_id = ?', [req.params.id])
  db.run('DELETE FROM zone_templates WHERE id = ?', [req.params.id])
  res.json({ ok: true })
})

// POST /api/templates/:id/apply/:assessmentId
router.post('/:id/apply/:assessmentId', (req, res) => {
  const tpl = db.get('SELECT * FROM zone_templates WHERE id = ?', [req.params.id])
  if (!tpl) return res.status(404).json({ error: 'Template non trovato' })

  const tplZones = db.all('SELECT * FROM zone_template_zones WHERE template_id = ?', [tpl.id])
  const tplConduits = db.all('SELECT * FROM zone_template_conduits WHERE template_id = ?', [tpl.id])
  const assets = db.all('SELECT * FROM assets WHERE assessment_id = ?', [req.params.assessmentId])

  // Create zones
  const zoneIdMap = {}
  for (const tz of tplZones) {
    const zoneId = uuidv4()
    db.run(
      'INSERT OR IGNORE INTO zones (id, assessment_id, name, security_level, description, color) VALUES (?,?,?,?,?,?)',
      [zoneId, req.params.assessmentId, tz.zone_name, tz.security_level, tz.description || '', tz.color || '#6b7280']
    )
    zoneIdMap[tz.zone_name] = zoneId

    // Auto-assign assets by vendor/port hints
    let vendorHints = [], portHints = []
    try { vendorHints = JSON.parse(tz.vendor_hints || '[]') } catch (e) {}
    try { portHints = JSON.parse(tz.port_hints || '[]') } catch (e) {}

    for (const asset of assets) {
      const vendorMatch = vendorHints.some(vh => (asset.vendor || '').toLowerCase().includes(vh.toLowerCase()))
      const assetPorts = db.all('SELECT port FROM open_ports WHERE asset_id = ?', [asset.id])
      const portMatch = portHints.some(ph => assetPorts.some(ap => ap.port === ph))
      if (vendorMatch || portMatch) {
        db.run('INSERT OR IGNORE INTO zone_assets (zone_id, asset_id) VALUES (?,?)', [zoneId, asset.id])
        db.run('UPDATE assets SET security_zone = ? WHERE id = ?', [tz.zone_name, asset.id])
      }
    }
  }

  // Create conduits
  for (const tc of tplConduits) {
    let protocols = []
    try { protocols = JSON.parse(tc.protocols || '[]') } catch (e) {}
    db.run(
      'INSERT INTO conduits (id, assessment_id, name, zone_from_id, zone_to_id, protocols, direction) VALUES (?,?,?,?,?,?,?)',
      [uuidv4(), req.params.assessmentId, `${tc.from_zone_name} → ${tc.to_zone_name}`,
       zoneIdMap[tc.from_zone_name], zoneIdMap[tc.to_zone_name],
       JSON.stringify(protocols), tc.direction]
    )
  }

  res.json({ ok: true, zones_created: tplZones.length, conduits_created: tplConduits.length })
})

module.exports = router
