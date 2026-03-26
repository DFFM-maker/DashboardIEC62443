const express = require('express')
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')

const router = express.Router({ mergeParams: true }) // mergeParams to access :assessmentId

const ALLOWED_FIELDS = [
  'consequence', 'dangerous_situation', 'dangerous_activity',
  'risk_description', 'consequence_text', 'type',
  'likelihood', 'safety_impact', 'operational_impact',
  'financial_impact', 'reputational_impact',
  'calculated_risk', 'calculated_risk_label',
]

// GET /api/assessments/:assessmentId/risk-events
router.get('/', (req, res) => {
  const { assessmentId } = req.params
  const events = db.all(
    'SELECT * FROM risk_events WHERE assessment_id = ? ORDER BY created_at ASC',
    [assessmentId]
  )
  res.json(events)
})

// POST /api/assessments/:assessmentId/risk-events
router.post('/', (req, res) => {
  const { assessmentId } = req.params
  const assessment = db.get('SELECT id FROM assessments WHERE id = ?', [assessmentId])
  if (!assessment) return res.status(404).json({ error: 'Assessment non trovato' })

  const id = uuidv4()
  const allowed = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => ALLOWED_FIELDS.includes(k))
  )

  db.prepare(`
    INSERT INTO risk_events (id, assessment_id, ${Object.keys(allowed).join(', ')})
    VALUES (?, ?, ${Object.keys(allowed).map(() => '?').join(', ')})
  `).run(id, assessmentId, ...Object.values(allowed))

  res.status(201).json(db.get('SELECT * FROM risk_events WHERE id = ?', [id]))
})

// PUT /api/assessments/:assessmentId/risk-events/:eventId
router.put('/:eventId', (req, res) => {
  const { assessmentId, eventId } = req.params
  const event = db.get('SELECT id FROM risk_events WHERE id = ? AND assessment_id = ?', [eventId, assessmentId])
  if (!event) return res.status(404).json({ error: 'Risk event non trovato' })

  const allowed = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => ALLOWED_FIELDS.includes(k))
  )
  if (Object.keys(allowed).length === 0) return res.status(400).json({ error: 'Nessun campo valido' })

  const sets = Object.keys(allowed).map(k => `${k} = ?`).join(', ')
  db.prepare(`UPDATE risk_events SET ${sets} WHERE id = ?`).run(...Object.values(allowed), eventId)

  res.json(db.get('SELECT * FROM risk_events WHERE id = ?', [eventId]))
})

// DELETE /api/assessments/:assessmentId/risk-events/:eventId
router.delete('/:eventId', (req, res) => {
  const { assessmentId, eventId } = req.params
  const event = db.get('SELECT id FROM risk_events WHERE id = ? AND assessment_id = ?', [eventId, assessmentId])
  if (!event) return res.status(404).json({ error: 'Risk event non trovato' })

  db.prepare('DELETE FROM risk_events WHERE id = ?').run(eventId)
  res.json({ success: true })
})

module.exports = router
