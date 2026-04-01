const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')
const scannerService = require('../services/scannerService')
const reportService = require('../services/reportService')
const { ZONE_TEMPLATES, BASELINE_SR } = require('../data/zone_templates')

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
  const { name, subnet, client_id, assessor, iec62443_target_sl, notes, snmp_community } = req.body
  if (!name || !subnet) return res.status(400).json({ error: 'name e subnet sono obbligatori' })
  const id = uuidv4()
  db.run(
    `INSERT INTO assessments (id, client_id, name, subnet, status, assessor, iec62443_target_sl, notes, snmp_community)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, client_id || null, name, subnet, 'pending', assessor || '', iec62443_target_sl || 'SL-2', notes || '', snmp_community || 'public']
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
  const { name, subnet, client_id, assessor, iec62443_target_sl, notes, status, snmp_community } = req.body
  db.run(
    `UPDATE assessments SET name=?, subnet=?, client_id=?, assessor=?, iec62443_target_sl=?, notes=?, status=?, snmp_community=? WHERE id=?`,
    [name, subnet, client_id || null, assessor, iec62443_target_sl, notes, status, snmp_community || 'public', req.params.id]
  )
  res.json(db.get('SELECT * FROM assessments WHERE id = ?', [req.params.id]))
})

// PATCH /api/assessments/:id — auto-save wizard (aggiornamento parziale)
const PATCH_ALLOWED_FIELDS = [
  'suc_name', 'suc_function', 'machine_operation',
  'data_sharing', 'access_points', 'physical_boundary',
  'assumptions',
  'name', 'assessor', 'notes', 'iec62443_target_sl', 'snmp_community'
]

router.patch('/:id', (req, res) => {
  const assessment = db.get('SELECT id FROM assessments WHERE id = ?', [req.params.id])
  if (!assessment) return res.status(404).json({ error: 'Assessment non trovato' })

  const allowed = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => PATCH_ALLOWED_FIELDS.includes(k))
  )
  if (Object.keys(allowed).length === 0) return res.status(400).json({ error: 'Nessun campo valido' })

  const sets = Object.keys(allowed).map(k => `${k} = ?`).join(', ')
  db.prepare(`UPDATE assessments SET ${sets} WHERE id = ?`).run(...Object.values(allowed), req.params.id)
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
    res.setHeader('Content-Type', 'application/octet-stream')
    res.download(result.filePath, result.fileName)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/assessments/:id/init-zones
// Creates the 5 standard IEC 62443 zone templates if the assessment has no zones yet.
router.post('/:id/init-zones', (req, res) => {
  const assessmentId = req.params.id

  const assessment = db.get('SELECT id FROM assessments WHERE id = ?', [assessmentId])
  if (!assessment) return res.status(404).json({ error: 'Assessment non trovato' })

  const existing = db.all('SELECT id FROM zones WHERE assessment_id = ?', [assessmentId])
  if (existing.length > 0) return res.json({ skipped: true, reason: 'Zone già presenti' })

  const createdZones = []

  for (const [templateKey, tpl] of Object.entries(ZONE_TEMPLATES)) {
    const zoneId = uuidv4()
    db.run(
      `INSERT INTO zones
        (id, assessment_id, name, security_level, color, x, y, width, height,
         excluded_from_assessment, excluded_from_report, inventory_only, zone_template)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        zoneId, assessmentId, tpl.name, tpl.security_level, tpl.color,
        tpl.x, tpl.y, 200, 150,
        tpl.excluded_from_assessment ? 1 : 0,
        tpl.excluded_from_report ? 1 : 0,
        tpl.inventory_only ? 1 : 0,
        templateKey
      ]
    )

    // Insert default zone_controls for non-excluded zones
    if (!tpl.excluded_from_assessment && tpl.defaultSR.length > 0) {
      for (const srCode of tpl.defaultSR) {
        const control = db.get('SELECT id FROM iec_controls WHERE sr_code = ? LIMIT 1', [srCode])
        if (control) {
          const zcId = uuidv4()
          db.run(
            `INSERT OR IGNORE INTO zone_controls
              (id, zone_id, control_id, applicable, present, sl_achieved, sl_target)
             VALUES (?,?,?,1,0,0,?)`,
            [zcId, zoneId, control.id, 2]
          )
        }
      }
    }

    createdZones.push(db.get('SELECT * FROM zones WHERE id = ?', [zoneId]))
  }

  res.json({ created: createdZones.length, zones: createdZones })
})

module.exports = { router, setIo }
