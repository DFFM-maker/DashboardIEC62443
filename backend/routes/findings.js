const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')

// GET /api/findings?assessment_id=...&severity=...&status=...
router.get('/', (req, res) => {
  const { assessment_id, severity, status } = req.query
  let sql = `SELECT f.*, a.ip as asset_ip, a.vendor, a.device_type FROM findings f
             LEFT JOIN assets a ON f.asset_id = a.id WHERE 1=1`
  const params = []
  if (assessment_id) { sql += ' AND f.assessment_id = ?'; params.push(assessment_id) }
  if (severity) { sql += ' AND f.severity = ?'; params.push(severity) }
  if (status) { sql += ' AND f.status = ?'; params.push(status) }
  sql += ' ORDER BY f.cvss_score DESC'
  res.json(db.all(sql, params))
})

// GET /api/findings/:id
router.get('/:id', (req, res) => {
  const finding = db.get(
    `SELECT f.*, a.ip as asset_ip, a.vendor, a.device_model FROM findings f LEFT JOIN assets a ON f.asset_id = a.id WHERE f.id = ?`,
    [req.params.id]
  )
  if (!finding) return res.status(404).json({ error: 'Finding non trovato' })
  try { finding.iec62443_sr = JSON.parse(finding.iec62443_sr || '[]') } catch (e) {}
  try { finding.cve_ids = JSON.parse(finding.cve_ids || '[]') } catch (e) {}
  try { finding.advisory_urls = JSON.parse(finding.advisory_urls || '[]') } catch (e) {}
  res.json(finding)
})

// PUT /api/findings/:id
router.put('/:id', (req, res) => {
  const { status, notes, resolved_at } = req.body
  db.run(
    `UPDATE findings SET status=?, resolved_at=? WHERE id=?`,
    [status, resolved_at || null, req.params.id]
  )
  res.json(db.get('SELECT * FROM findings WHERE id = ?', [req.params.id]))
})

// POST /api/findings (manual finding)
router.post('/', (req, res) => {
  const { assessment_id, asset_id, title, description, cvss_score, cvss_vector, severity, iec62443_sr, evidence, remediation, remediation_priority } = req.body
  if (!assessment_id || !title) return res.status(400).json({ error: 'assessment_id e title obbligatori' })
  const id = uuidv4()
  db.run(
    `INSERT INTO findings (id, assessment_id, asset_id, finding_code, title, description, cvss_score, cvss_vector, severity, iec62443_sr, evidence, remediation, remediation_priority, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, assessment_id, asset_id || null, 'MANUAL', title, description, cvss_score, cvss_vector, severity, JSON.stringify(iec62443_sr || []), evidence, remediation, remediation_priority || 'Short-term', 'open']
  )
  res.json(db.get('SELECT * FROM findings WHERE id = ?', [id]))
})

// DELETE /api/findings/:id
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM findings WHERE id = ?', [req.params.id])
  res.json({ ok: true })
})

module.exports = router
