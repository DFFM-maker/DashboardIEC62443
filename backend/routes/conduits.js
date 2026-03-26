const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')

// GET /api/conduits?assessment_id=...
router.get('/', (req, res) => {
  const { assessment_id } = req.query
  let sql = `SELECT c.*, zf.name as from_zone_name, zt.name as to_zone_name
             FROM conduits c
             LEFT JOIN zones zf ON c.zone_from_id = zf.id
             LEFT JOIN zones zt ON c.zone_to_id = zt.id
             WHERE 1=1`
  const params = []
  if (assessment_id) { sql += ' AND c.assessment_id = ?'; params.push(assessment_id) }
  res.json(db.all(sql, params))
})

// POST /api/conduits
router.post('/', (req, res) => {
  const { assessment_id, zone_from_id, zone_to_id, type, label, encryption, protocols, notes } = req.body
  if (!assessment_id || !zone_from_id || !zone_to_id) {
    return res.status(400).json({ error: 'assessment_id, zone_from_id e zone_to_id obbligatori' })
  }
  const id = uuidv4()
  db.prepare(
    'INSERT INTO conduits (id, assessment_id, zone_from_id, zone_to_id, type, label, encryption, protocols, notes) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(id, assessment_id, zone_from_id, zone_to_id, type || 'wired', label || '', encryption || 'none', protocols || '', notes || '')
  res.status(201).json(db.get('SELECT * FROM conduits WHERE id = ?', [id]))
})

// DELETE /api/conduits/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM conduits WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

module.exports = router
