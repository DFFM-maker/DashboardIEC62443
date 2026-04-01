/**
 * Tests for POST /api/assessments/:id/init-zones
 * Verifies that the 5 IEC 62443 zone templates are created correctly.
 */

const { createTestDb } = require('./helpers/testDb')
const { v4: uuidv4 } = require('uuid')
const { ZONE_TEMPLATES, BASELINE_SR } = require('../data/zone_templates')

/**
 * Replicate the init-zones logic in-process so we can test it without
 * spinning up Express.
 */
function initZones(db, assessmentId) {
  const existing = db.all('SELECT id FROM zones WHERE assessment_id = ?', [assessmentId])
  if (existing.length > 0) return { skipped: true }

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

    if (!tpl.excluded_from_assessment && tpl.defaultSR.length > 0) {
      for (const srCode of tpl.defaultSR) {
        const control = db.get('SELECT id FROM iec_controls WHERE sr_code = ? LIMIT 1', [srCode])
        if (control) {
          const zcId = uuidv4()
          db.run(
            `INSERT OR IGNORE INTO zone_controls
              (id, zone_id, control_id, applicable, present, sl_achieved, sl_target)
             VALUES (?,?,?,1,0,0,2)`,
            [zcId, zoneId, control.id]
          )
        }
      }
    }

    createdZones.push(db.get('SELECT * FROM zones WHERE id = ?', [zoneId]))
  }

  return { created: createdZones.length, zones: createdZones }
}

describe('init-zones', () => {
  let db
  let assessmentId

  beforeEach(() => {
    db = createTestDb()
    assessmentId = uuidv4()
    db.run(
      `INSERT INTO assessments (id, name, subnet, status) VALUES (?, 'Test', '10.0.0.0/24', 'pending')`,
      [assessmentId]
    )
    // Seed a minimal set of iec_controls so defaultSR lookups succeed
    const srs = [
      'SR 1.2', 'SR 1.3', 'SR 1.7', 'SR 2.1', 'SR 2.8',
      'SR 3.2', 'SR 3.4', 'SR 4.1', 'SR 4.3', 'SR 5.1',
      'SR 5.2', 'SR 6.2', 'SR 7.1', 'SR 7.3', 'SR 7.8'
    ]
    for (const sr of srs) {
      db.run(
        `INSERT OR IGNORE INTO iec_controls (id, sr_code, title, sl1, sl2) VALUES (?,?,?,1,1)`,
        [uuidv4(), sr, `Title for ${sr}`]
      )
    }
  })

  it('crea esattamente 5 zone template', () => {
    const result = initZones(db, assessmentId)
    expect(result.created).toBe(5)
    expect(result.zones).toHaveLength(5)
  })

  it('Management-Zone ha excluded_from_assessment = 1', () => {
    initZones(db, assessmentId)
    const mgmt = db.get(`SELECT * FROM zones WHERE assessment_id = ? AND name = 'Management-Zone'`, [assessmentId])
    expect(mgmt).toBeTruthy()
    expect(mgmt.excluded_from_assessment).toBe(1)
  })

  it('Management-Zone ha excluded_from_report = 1 e inventory_only = 1', () => {
    initZones(db, assessmentId)
    const mgmt = db.get(`SELECT * FROM zones WHERE assessment_id = ? AND name = 'Management-Zone'`, [assessmentId])
    expect(mgmt.excluded_from_report).toBe(1)
    expect(mgmt.inventory_only).toBe(1)
  })

  it('le 4 zone operative non sono escluse dal report', () => {
    initZones(db, assessmentId)
    const reportZones = db.all(
      `SELECT * FROM zones WHERE assessment_id = ? AND (excluded_from_report IS NULL OR excluded_from_report = 0)`,
      [assessmentId]
    )
    expect(reportZones).toHaveLength(4)
  })

  it('Gap Analysis conta solo 4 zone (esclusa Management-Zone)', () => {
    initZones(db, assessmentId)
    const gapZones = db.all(
      `SELECT * FROM zones WHERE assessment_id = ? AND (excluded_from_assessment IS NULL OR excluded_from_assessment = 0)`,
      [assessmentId]
    )
    expect(gapZones).toHaveLength(4)
  })

  it('SR default PLC-Zone include SR 4.1', () => {
    initZones(db, assessmentId)
    const plcZone = db.get(`SELECT * FROM zones WHERE assessment_id = ? AND name = 'PLC-Zone'`, [assessmentId])
    expect(plcZone).toBeTruthy()
    const srControl = db.get(`SELECT id FROM iec_controls WHERE sr_code = 'SR 4.1'`)
    expect(srControl).toBeTruthy()
    const zc = db.get(
      `SELECT * FROM zone_controls WHERE zone_id = ? AND control_id = ?`,
      [plcZone.id, srControl.id]
    )
    expect(zc).toBeTruthy()
    expect(zc.applicable).toBe(1)
  })

  it('zone_controls pre-caricati con present = 0 e applicable = 1', () => {
    initZones(db, assessmentId)
    const allZc = db.all(
      `SELECT zc.* FROM zone_controls zc
       JOIN zones z ON z.id = zc.zone_id
       WHERE z.assessment_id = ?`,
      [assessmentId]
    )
    expect(allZc.length).toBeGreaterThan(0)
    for (const zc of allZc) {
      expect(zc.applicable).toBe(1)
      expect(zc.present).toBe(0)
    }
  })

  it('Management-Zone non ha zone_controls (nessun SR di default)', () => {
    initZones(db, assessmentId)
    const mgmt = db.get(`SELECT * FROM zones WHERE assessment_id = ? AND name = 'Management-Zone'`, [assessmentId])
    const zc = db.all(`SELECT * FROM zone_controls WHERE zone_id = ?`, [mgmt.id])
    expect(zc).toHaveLength(0)
  })

  it('ritorna skipped: true se le zone esistono già', () => {
    initZones(db, assessmentId)
    const secondCall = initZones(db, assessmentId)
    expect(secondCall.skipped).toBe(true)
    // Verifica che non siano state duplicate
    const zones = db.all(`SELECT * FROM zones WHERE assessment_id = ?`, [assessmentId])
    expect(zones).toHaveLength(5)
  })

  it('BASELINE_SR contiene esattamente 15 SR', () => {
    expect(BASELINE_SR).toHaveLength(15)
  })
})
