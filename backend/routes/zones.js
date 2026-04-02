const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')

// GET /api/zones?assessment_id=...
router.get('/', (req, res) => {
  const { assessment_id } = req.query
  let sql = 'SELECT * FROM zones WHERE 1=1'
  const params = []
  if (assessment_id) { sql += ' AND assessment_id = ?'; params.push(assessment_id) }
  const zones = db.all(sql, params)
  for (const z of zones) {
    z.assets = db.all(
      'SELECT a.* FROM assets a JOIN zone_assets za ON a.id = za.asset_id WHERE za.zone_id = ?',
      [z.id]
    )
  }
  res.json(zones)
})

// POST /api/zones
router.post('/', (req, res) => {
  const { assessment_id, name, security_level, description, color } = req.body
  if (!assessment_id || !name) return res.status(400).json({ error: 'assessment_id e name obbligatori' })
  const id = uuidv4()
  db.run(
    'INSERT INTO zones (id, assessment_id, name, security_level, description, color) VALUES (?,?,?,?,?,?)',
    [id, assessment_id, name, security_level || 'SL-1', description || '', color || '#3b82f6']
  )
  res.json(db.get('SELECT * FROM zones WHERE id = ?', [id]))
})

// PUT /api/zones/:id
router.put('/:id', (req, res) => {
  const allowed = ['name', 'security_level', 'description', 'color', 'x', 'y', 'width', 'height',
                   'excluded_from_assessment', 'excluded_from_report', 'inventory_only', 'zone_template']
  const fields = []
  const values = []
  for (const key of allowed) {
    if (key in req.body) {
      fields.push(`${key} = ?`)
      values.push(req.body[key])
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: 'Nessun campo da aggiornare' })
  values.push(req.params.id)
  db.run(`UPDATE zones SET ${fields.join(', ')} WHERE id = ?`, values)
  res.json(db.get('SELECT * FROM zones WHERE id = ?', [req.params.id]))
})

// DELETE /api/zones/:id
router.delete('/:id', (req, res) => {
  try {
    // Manual CASCADE for conduits as they are not set up with ON DELETE CASCADE to zones
    db.run('DELETE FROM conduits WHERE zone_from_id = ? OR zone_to_id = ?', [req.params.id, req.params.id])
    db.run('DELETE FROM zone_assets WHERE zone_id = ?', [req.params.id])
    db.run('DELETE FROM zones WHERE id = ?', [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('Error deleting zone:', err)
    res.status(500).json({ error: 'Errore durante l\'eliminazione della zona' })
  }
})

// POST /api/zones/:id/assets/:assetId
router.post('/:id/assets/:assetId', (req, res) => {
  db.run('INSERT OR IGNORE INTO zone_assets (zone_id, asset_id) VALUES (?,?)', [req.params.id, req.params.assetId])
  const zone = db.get('SELECT name FROM zones WHERE id = ?', [req.params.id])
  if (zone) db.run('UPDATE assets SET security_zone = ? WHERE id = ?', [zone.name, req.params.assetId])
  res.json({ ok: true })
})

// DELETE /api/zones/:id/assets/:assetId
router.delete('/:id/assets/:assetId', (req, res) => {
  db.run('DELETE FROM zone_assets WHERE zone_id = ? AND asset_id = ?', [req.params.id, req.params.assetId])
  res.json({ ok: true })
})

module.exports = router
