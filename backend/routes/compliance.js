const express = require('express')
const router = express.Router({ mergeParams: true })
const db = require('../db/database')
const { COMPLIANCE_MAPPING, NORMATIVE_REFERENCES } = require('../data/normative_mappings')

// GET /api/compliance/:assessmentId
router.get('/:assessmentId', (req, res) => {
  const { assessmentId } = req.params

  // 1. Get assessment info
  const assessment = db.get('SELECT * FROM assessments WHERE id = ?', [assessmentId])
  if (!assessment) return res.status(404).json({ error: 'Assessment non trovato' })

  // 2. Get all zones and their controls for this assessment
  const zones = db.all('SELECT * FROM zones WHERE assessment_id = ?', [assessmentId])
  
  // Stats per normativa
  const stats = {
    nis2: NORMATIVE_REFERENCES.NIS2.art18.items.map(item => ({ ...item, satisfied: 0, total: 0, percentage: 0 })),
    cra: NORMATIVE_REFERENCES.CRA.annexI.items.map(item => ({ ...item, satisfied: 0, total: 0, percentage: 0 })),
    machinery: [
      { id: '1.1.9', title: 'Protection against corruption', satisfied: 0, total: 0 },
      { id: '1.2.1', title: 'Safety and reliability of control systems', satisfied: 0, total: 0 }
    ]
  }

  // Pre-load all iec_controls for mapping
  const iecControls = db.all('SELECT * FROM iec_controls')
  const iecMap = {}
  for (const c of iecControls) iecMap[c.id] = c

  // 3. Process each zone's controls and aggregate to compliance stats
  for (const zone of zones) {
    const zoneControls = db.all('SELECT * FROM zone_controls WHERE zone_id = ?', [zone.id])
    
    for (const zc of zoneControls) {
      const control = iecMap[zc.control_id]
      if (!control) continue

      const mapping = COMPLIANCE_MAPPING[control.sr_code]
      if (!mapping) continue

      // Se il controllo è APPLICABILE, incrementiamo il Totale per quella normativa
      if (zc.applicable) {
        // NIS2 logic
        if (mapping.nis2) {
          for (const itemIdx of mapping.nis2) {
            const stat = stats.nis2.find(s => s.id === itemIdx)
            if (stat) {
              stat.total++
              if (zc.present) stat.satisfied++
            }
          }
        }
        // CRA logic
        if (mapping.cra) {
          for (const itemIdx of mapping.cra) {
            const stat = stats.cra.find(s => s.id === itemIdx)
            if (stat) {
              stat.total++
              if (zc.present) stat.satisfied++
            }
          }
        }
        // Machinery logic
        if (mapping.machinery) {
          for (const itemIdx of mapping.machinery) {
            const stat = stats.machinery.find(s => s.id === itemIdx)
            if (stat) {
              stat.total++
              if (zc.present) stat.satisfied++
            }
          }
        }
      }
    }
  }

  // 4. Final percentage calculation
  const calculatePerc = (list) => list.map(item => ({
    ...item,
    percentage: item.total > 0 ? Math.round((item.satisfied / item.total) * 100) : 0
  }))

  res.json({
    assessment_id: assessmentId,
    timestamp: new Date().toISOString(),
    stats: {
      nis2: calculatePerc(stats.nis2),
      cra: calculatePerc(stats.cra),
      machinery: calculatePerc(stats.machinery)
    }
  })
})

module.exports = router
