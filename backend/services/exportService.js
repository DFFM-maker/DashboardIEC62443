const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')

const REPORTS_DIR = path.join(__dirname, '../reports/output')

async function exportAssessment(assessmentId) {
  const assessment = db.get(
    'SELECT a.*, c.name as client_name FROM assessments a LEFT JOIN clients c ON a.client_id = c.id WHERE a.id = ?',
    [assessmentId]
  )
  if (!assessment) throw new Error('Assessment non trovato')

  const assets = db.all('SELECT * FROM assets WHERE assessment_id = ?', [assessmentId])
  const ports = db.all(
    `SELECT op.* FROM open_ports op JOIN assets a ON op.asset_id = a.id WHERE a.assessment_id = ?`,
    [assessmentId]
  )
  const findings = db.all('SELECT * FROM findings WHERE assessment_id = ?', [assessmentId])
  const zones = db.all('SELECT * FROM zones WHERE assessment_id = ?', [assessmentId])
  const conduits = db.all('SELECT * FROM conduits WHERE assessment_id = ?', [assessmentId])
  const zoneAssets = db.all(
    `SELECT za.* FROM zone_assets za JOIN zones z ON za.zone_id = z.id WHERE z.assessment_id = ?`,
    [assessmentId]
  )

  const exportData = {
    format: 'otsa',
    version: '2.0',
    exported_at: new Date().toISOString(),
    exported_by: 'Tecnopack OT Security Dashboard',
    assessment,
    assets,
    ports,
    findings,
    zones,
    conduits,
    zone_assets: zoneAssets
  }

  const fileName = `${assessment.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.otsa`
  const filePath = path.join(REPORTS_DIR, fileName)
  fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2))
  return { filePath, fileName }
}

async function importAssessment(otsaFilePath, newClientId = null) {
  const raw = fs.readFileSync(otsaFilePath, 'utf8')
  const data = JSON.parse(raw)

  if (data.format !== 'otsa') throw new Error('File non valido — formato non riconosciuto')

  const idMap = {}
  const newAssessmentId = uuidv4()
  idMap[data.assessment.id] = newAssessmentId

  db.run(
    `INSERT INTO assessments (id, client_id, name, subnet, status, created_at, completed_at, assessor, iec62443_target_sl, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [newAssessmentId, newClientId || data.assessment.client_id,
     `[IMPORTATO] ${data.assessment.name}`, data.assessment.subnet,
     data.assessment.status, data.assessment.created_at, data.assessment.completed_at,
     data.assessment.assessor, data.assessment.iec62443_target_sl, data.assessment.notes]
  )

  for (const asset of (data.assets || [])) {
    const newAssetId = uuidv4()
    idMap[asset.id] = newAssetId
    db.run(
      `INSERT INTO assets (id, assessment_id, ip, mac, vendor, device_type, device_model, firmware_version, serial_number, security_zone, criticality, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [newAssetId, newAssessmentId, asset.ip, asset.mac, asset.vendor,
       asset.device_type, asset.device_model, asset.firmware_version,
       asset.serial_number, asset.security_zone, asset.criticality, asset.notes]
    )
  }

  for (const port of (data.ports || [])) {
    if (idMap[port.asset_id]) {
      db.run(
        `INSERT INTO open_ports (id, asset_id, port, protocol, service, version, state, is_required) VALUES (?,?,?,?,?,?,?,?)`,
        [uuidv4(), idMap[port.asset_id], port.port, port.protocol, port.service, port.version, port.state, port.is_required || 0]
      )
    }
  }

  for (const finding of (data.findings || [])) {
    db.run(
      `INSERT INTO findings (id, assessment_id, asset_id, finding_code, title, description, cvss_score, cvss_vector, severity, iec62443_sr, evidence, remediation, remediation_priority, status, cve_ids, advisory_urls)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [uuidv4(), newAssessmentId, idMap[finding.asset_id] || null,
       finding.finding_code, finding.title, finding.description,
       finding.cvss_score, finding.cvss_vector, finding.severity,
       finding.iec62443_sr, finding.evidence, finding.remediation,
       finding.remediation_priority, finding.status, finding.cve_ids, finding.advisory_urls]
    )
  }

  const zoneIdMap = {}
  for (const zone of (data.zones || [])) {
    const newZoneId = uuidv4()
    zoneIdMap[zone.id] = newZoneId
    db.run(
      `INSERT INTO zones (id, assessment_id, name, security_level, description, color) VALUES (?,?,?,?,?,?)`,
      [newZoneId, newAssessmentId, zone.name, zone.security_level, zone.description, zone.color]
    )
  }

  for (const za of (data.zone_assets || [])) {
    if (zoneIdMap[za.zone_id] && idMap[za.asset_id]) {
      db.run('INSERT OR IGNORE INTO zone_assets (zone_id, asset_id) VALUES (?,?)', [zoneIdMap[za.zone_id], idMap[za.asset_id]])
    }
  }

  for (const conduit of (data.conduits || [])) {
    db.run(
      `INSERT INTO conduits (id, assessment_id, name, zone_from_id, zone_to_id, protocols, direction) VALUES (?,?,?,?,?,?,?)`,
      [uuidv4(), newAssessmentId, conduit.name, zoneIdMap[conduit.zone_from_id], zoneIdMap[conduit.zone_to_id], conduit.protocols, conduit.direction]
    )
  }

  return newAssessmentId
}

module.exports = { exportAssessment, importAssessment }
