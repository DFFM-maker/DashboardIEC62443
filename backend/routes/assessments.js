const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')
const scannerService = require('../services/scannerService')
const reportService = require('../services/reportService')

let io = null
function setIo(socketIo) { io = socketIo }

// GET /api/assessments
router.get('/', (req, res) => {
  const assessments = db.all(`
    SELECT a.*, c.name as client_name,
      (SELECT COUNT(*) FROM assets WHERE assessment_id = a.id) as asset_count,
      (SELECT COUNT(*) FROM findings WHERE assessment_id = a.id) as finding_count,
      (SELECT COUNT(*) FROM findings WHERE assessment_id = a.id AND severity = 'critical') as critical_count
    FROM assessments a LEFT JOIN clients c ON a.client_id = c.id
    ORDER BY a.created_at DESC
  `)
  res.json(assessments)
})

// POST /api/assessments
router.post('/', (req, res) => {
  const { name, subnet, client_id, assessor, iec62443_target_sl, notes } = req.body
  if (!name || !subnet) return res.status(400).json({ error: 'name e subnet sono obbligatori' })
  const id = uuidv4()
  db.run(
    `INSERT INTO assessments (id, client_id, name, subnet, status, assessor, iec62443_target_sl, notes)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, client_id || null, name, subnet, 'pending', assessor || '', iec62443_target_sl || 'SL-2', notes || '']
  )
  res.json(db.get('SELECT * FROM assessments WHERE id = ?', [id]))
})

// GET /api/assessments/:id
router.get('/:id', (req, res) => {
  const assessment = db.get(
    `SELECT a.*, c.name as client_name FROM assessments a LEFT JOIN clients c ON a.client_id = c.id WHERE a.id = ?`,
    [req.params.id]
  )
  if (!assessment) return res.status(404).json({ error: 'Assessment non trovato' })
  res.json(assessment)
})

// PUT /api/assessments/:id
router.put('/:id', (req, res) => {
  const { name, subnet, client_id, assessor, iec62443_target_sl, notes, status } = req.body
  db.run(
    `UPDATE assessments SET name=?, subnet=?, client_id=?, assessor=?, iec62443_target_sl=?, notes=?, status=? WHERE id=?`,
    [name, subnet, client_id || null, assessor, iec62443_target_sl, notes, status, req.params.id]
  )
  res.json(db.get('SELECT * FROM assessments WHERE id = ?', [req.params.id]))
})

// DELETE /api/assessments/:id
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM assessments WHERE id = ?', [req.params.id])
  res.json({ ok: true })
})

// POST /api/assessments/:id/scan
router.post('/:id/scan', async (req, res) => {
  const assessment = db.get('SELECT * FROM assessments WHERE id = ?', [req.params.id])
  if (!assessment) return res.status(404).json({ error: 'Assessment non trovato' })
  if (assessment.status === 'scanning') return res.status(409).json({ error: 'Scansione già in corso' })

  // Clear existing data
  const assets = db.all('SELECT id FROM assets WHERE assessment_id = ?', [req.params.id])
  for (const a of assets) {
    db.run('DELETE FROM open_ports WHERE asset_id = ?', [a.id])
  }
  db.run('DELETE FROM assets WHERE assessment_id = ?', [req.params.id])
  db.run('DELETE FROM findings WHERE assessment_id = ?', [req.params.id])
  db.run('DELETE FROM scan_logs WHERE assessment_id = ?', [req.params.id])

  res.json({ ok: true, message: 'Scansione avviata' })

  // Run async
  scannerService.runScan(req.params.id, assessment.subnet, io).catch(err => {
    console.error('Scan error:', err)
  })
})

// GET /api/assessments/:id/logs
router.get('/:id/logs', (req, res) => {
  const logs = db.all('SELECT * FROM scan_logs WHERE assessment_id = ? ORDER BY timestamp DESC LIMIT 200', [req.params.id])
  res.json(logs)
})

// GET /api/assessments/:id/stats
router.get('/:id/stats', (req, res) => {
  const assessment = db.get('SELECT * FROM assessments WHERE id = ?', [req.params.id])
  if (!assessment) return res.status(404).json({ error: 'Not found' })

  const assets = db.all('SELECT * FROM assets WHERE assessment_id = ? ORDER BY ip', [req.params.id])
  const findings = db.all('SELECT * FROM findings WHERE assessment_id = ?', [req.params.id])
  const zones = db.all('SELECT * FROM zones WHERE assessment_id = ?', [req.params.id])

  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
  for (const f of findings) bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1

  const byZone = {}
  for (const a of assets) {
    if (a.security_zone) byZone[a.security_zone] = (byZone[a.security_zone] || 0) + 1
  }

  const byType = {}
  for (const a of assets) {
    if (a.device_type) byType[a.device_type] = (byType[a.device_type] || 0) + 1
  }

  res.json({
    assessment,
    totals: { assets: assets.length, findings: findings.length },
    bySeverity,
    byZone,
    byType,
    topFindings: findings.filter(f => f.severity === 'critical' || f.severity === 'high').slice(0, 5)
  })
})

// POST /api/assessments/:id/report/:format
router.post('/:id/report/:format', async (req, res) => {
  try {
    const result = await reportService.generateReport(req.params.id, req.params.format)
    res.download(result.filePath, result.fileName)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = { router, setIo }
