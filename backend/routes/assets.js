const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')
const advisoryService = require('../services/advisoryService')

// GET /api/assets?assessment_id=...
router.get('/', (req, res) => {
  const { assessment_id, zone } = req.query
  let sql = 'SELECT * FROM assets WHERE 1=1'
  const params = []
  if (assessment_id) { sql += ' AND assessment_id = ?'; params.push(assessment_id) }
  if (zone) { sql += ' AND security_zone = ?'; params.push(zone) }
  sql += ' ORDER BY ip'
  const assets = db.all(sql, params)

  // Attach ports
  for (const a of assets) {
    a.ports = db.all('SELECT * FROM open_ports WHERE asset_id = ? ORDER BY port', [a.id])
  }
  res.json(assets)
})

// GET /api/assets/:id
router.get('/:id', (req, res) => {
  const asset = db.get('SELECT * FROM assets WHERE id = ?', [req.params.id])
  if (!asset) return res.status(404).json({ error: 'Asset non trovato' })
  asset.ports = db.all('SELECT * FROM open_ports WHERE asset_id = ? ORDER BY port', [req.params.id])
  asset.findings = db.all('SELECT * FROM findings WHERE asset_id = ? ORDER BY cvss_score DESC', [req.params.id])
  asset.advisories = advisoryService.getAdvisoriesForAsset(asset.vendor || '')
  res.json(asset)
})

// PUT /api/assets/:id
router.put('/:id', (req, res) => {
  const { vendor, device_type, device_model, firmware_version, security_zone, criticality, notes } = req.body
  db.run(
    `UPDATE assets SET vendor=?, device_type=?, device_model=?, firmware_version=?, security_zone=?, criticality=?, notes=? WHERE id=?`,
    [vendor, device_type, device_model, firmware_version, security_zone, criticality, notes, req.params.id]
  )
  res.json(db.get('SELECT * FROM assets WHERE id = ?', [req.params.id]))
})

// DELETE /api/assets/:id
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM open_ports WHERE asset_id = ?', [req.params.id])
  db.run('DELETE FROM assets WHERE id = ?', [req.params.id])
  res.json({ ok: true })
})

// GET /api/assets/:id/ports
router.get('/:id/ports', (req, res) => {
  res.json(db.all('SELECT * FROM open_ports WHERE asset_id = ? ORDER BY port', [req.params.id]))
})

// PUT /api/assets/:id/ports/:portId
router.put('/:id/ports/:portId', (req, res) => {
  const { is_required, notes } = req.body
  db.run('UPDATE open_ports SET is_required=? WHERE id=?', [is_required ? 1 : 0, req.params.portId])
  res.json({ ok: true })
})

module.exports = router
