const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')

// GET /api/zone-controls?zone_id=... OR ?assessment_id=...
router.get('/', (req, res) => {
  const { zone_id, assessment_id } = req.query
  let sql = 'SELECT zc.* FROM zone_controls zc'
  const params = []

  if (assessment_id) {
    sql += ' JOIN zones z ON zc.zone_id = z.id WHERE z.assessment_id = ?'
    params.push(assessment_id)
    if (zone_id) { sql += ' AND zc.zone_id = ?'; params.push(zone_id) }
  } else if (zone_id) {
    sql += ' WHERE zc.zone_id = ?'
    params.push(zone_id)
  }

  res.json(db.all(sql, params))
})

// POST /api/zone-controls (upsert by zone_id + control_id)
router.post('/', (req, res) => {
  const { zone_id, control_id, applicable, present, sl_achieved, sl_target, policy_text } = req.body
  if (!zone_id || !control_id) return res.status(400).json({ error: 'zone_id e control_id obbligatori' })

  const existing = db.get('SELECT id FROM zone_controls WHERE zone_id = ? AND control_id = ?', [zone_id, control_id])

  if (existing) {
    db.prepare(`
      UPDATE zone_controls
      SET applicable=?, present=?, sl_achieved=?, sl_target=?, policy_text=?
      WHERE id=?
    `).run(
      applicable ?? 1,
      present ?? 0,
      sl_achieved ?? 0,
      sl_target ?? 0,
      policy_text ?? null,
      existing.id
    )
    return res.json(db.get('SELECT * FROM zone_controls WHERE id = ?', [existing.id]))
  }

  const id = uuidv4()
  db.prepare(`
    INSERT INTO zone_controls (id, zone_id, control_id, applicable, present, sl_achieved, sl_target, policy_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, zone_id, control_id, applicable ?? 1, present ?? 0, sl_achieved ?? 0, sl_target ?? 0, policy_text ?? null)

  res.status(201).json(db.get('SELECT * FROM zone_controls WHERE id = ?', [id]))
})

module.exports = router
