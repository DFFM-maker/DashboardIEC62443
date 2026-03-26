const express = require('express')
const router = express.Router({ mergeParams: true })
const db = require('../db/database')

// GET /api/assessments/:assessmentId/report
router.get('/', (req, res) => {
  const { assessmentId } = req.params
  const assessment = db.get('SELECT * FROM assessments WHERE id = ?', [assessmentId])
  if (!assessment) return res.status(404).json({ error: 'Assessment non trovato' })

  const zones = db.all('SELECT * FROM zones WHERE assessment_id = ? ORDER BY name', [assessmentId])
  const riskEvents = db.all('SELECT * FROM risk_events WHERE assessment_id = ? ORDER BY created_at', [assessmentId])

  // Enrich zones with gap stats
  const enrichedZones = zones.map(zone => {
    const SL_NUM = { 'SL-1': 1, 'SL-2': 2, 'SL-3': 3, 'SL-4': 4 }
    const slT = SL_NUM[zone.security_level] || 1

    // Controls applicable for this zone's SL-T
    const applicable = db.all(
      `SELECT c.* FROM iec_controls c
       WHERE (? >= 1 AND c.sl1=1) OR (? >= 2 AND c.sl2=1) OR (? >= 3 AND c.sl3=1) OR (? >= 4 AND c.sl4=1)`,
      [slT, slT, slT, slT]
    )

    const zoneControls = db.all('SELECT * FROM zone_controls WHERE zone_id = ?', [zone.id])
    const zcMap = {}
    for (const zc of zoneControls) zcMap[zc.control_id] = zc

    const covered = applicable.filter(c => zcMap[c.id]?.present).length
    const gapCount = applicable.length - covered

    return { ...zone, controls_total: applicable.length, controls_covered: covered, gap_count: gapCount }
  })

  // Gap controls with policies
  const gapControls = []
  for (const zone of enrichedZones) {
    const SL_NUM = { 'SL-1': 1, 'SL-2': 2, 'SL-3': 3, 'SL-4': 4 }
    const slT = SL_NUM[zone.security_level] || 1
    const applicable = db.all(
      `SELECT c.* FROM iec_controls c
       WHERE (? >= 1 AND c.sl1=1) OR (? >= 2 AND c.sl2=1) OR (? >= 3 AND c.sl3=1) OR (? >= 4 AND c.sl4=1)`,
      [slT, slT, slT, slT]
    )
    const zoneControls = db.all('SELECT * FROM zone_controls WHERE zone_id = ?', [zone.id])
    const zcMap = {}
    for (const zc of zoneControls) zcMap[zc.control_id] = zc

    for (const c of applicable) {
      const zc = zcMap[c.id]
      if (!zc?.present) {
        gapControls.push({
          zone_id: zone.id,
          zone_name: zone.name,
          sr_code: c.sr_code,
          re_code: c.re_code,
          title: c.title,
          category: c.category,
          sl_target: slT,
          sl_achieved: zc?.sl_achieved ?? 0,
          policy_text: zc?.policy_text ?? '',
        })
      }
    }
  }

  res.json({
    assessment,
    suc: {
      suc_name: assessment.suc_name,
      suc_function: assessment.suc_function,
      machine_operation: assessment.machine_operation,
      data_sharing: assessment.data_sharing,
      access_points: assessment.access_points,
      physical_boundary: assessment.physical_boundary,
      assumptions: assessment.assumptions,
    },
    risk_events: riskEvents,
    zones: enrichedZones,
    gap_controls: gapControls,
    generated_at: new Date().toISOString(),
  })
})

module.exports = router
