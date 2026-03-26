/**
 * TASK 1.1 — Test PATCH /api/assessments/:id (auto-save wizard)
 * Testa direttamente il DB per verificare che i campi wizard vengano salvati.
 * Usa il DB in-memory isolato.
 */

const { createTestDb } = require('./helpers/testDb')
const { v4: uuidv4 } = require('uuid')

// Campi wizard consentiti (whitelist — come implementato nella route)
const ALLOWED_WIZARD_FIELDS = [
  'suc_name', 'suc_function', 'machine_operation',
  'data_sharing', 'access_points', 'physical_boundary',
  'name', 'assessor', 'notes', 'iec62443_target_sl', 'snmp_community'
]

/**
 * Simula la logica PATCH dell'endpoint (da implementare nella route).
 * Aggiorna solo i campi nella whitelist — nessuna SQL injection possibile.
 */
function patchAssessment(db, id, body) {
  const allowed = Object.fromEntries(
    Object.entries(body).filter(([k]) => ALLOWED_WIZARD_FIELDS.includes(k))
  )
  if (Object.keys(allowed).length === 0) return null

  const sets = Object.keys(allowed).map(k => `${k} = ?`).join(', ')
  const values = [...Object.values(allowed), id]
  const result = db.prepare(`UPDATE assessments SET ${sets} WHERE id = ?`).run(...values)
  if (result.changes === 0) return null
  return db.prepare('SELECT * FROM assessments WHERE id = ?').get(id)
}

describe('PATCH /api/assessments/:id — wizard fields (logica)', () => {
  let db
  let assessmentId

  beforeAll(() => {
    db = createTestDb()
    assessmentId = uuidv4()
    db.prepare(`
      INSERT INTO assessments (id, name, subnet, status)
      VALUES (?, 'Test Assessment', '192.168.1.0/24', 'pending')
    `).run(assessmentId)
  })

  it('aggiorna suc_name correttamente', () => {
    const result = patchAssessment(db, assessmentId, { suc_name: 'Linea Produzione Test' })
    expect(result).not.toBeNull()
    expect(result.suc_name).toBe('Linea Produzione Test')
  })

  it('aggiorna più campi wizard contemporaneamente', () => {
    const result = patchAssessment(db, assessmentId, {
      suc_name: 'SUC Test',
      suc_function: 'Controllo macchina CNC',
      machine_operation: 'Lavorazione metalli'
    })
    expect(result.suc_name).toBe('SUC Test')
    expect(result.suc_function).toBe('Controllo macchina CNC')
    expect(result.machine_operation).toBe('Lavorazione metalli')
  })

  it('restituisce null per assessment inesistente', () => {
    const result = patchAssessment(db, uuidv4(), { suc_name: 'Test' })
    expect(result).toBeNull()
  })

  it('non sovrascrive campi non inclusi nel body', () => {
    patchAssessment(db, assessmentId, { suc_function: 'Valore da preservare' })
    patchAssessment(db, assessmentId, { suc_name: 'Solo questo cambia' })
    const row = db.prepare('SELECT * FROM assessments WHERE id = ?').get(assessmentId)
    expect(row.suc_function).toBe('Valore da preservare')
    expect(row.suc_name).toBe('Solo questo cambia')
  })

  it('ignora campi non consentiti (whitelist enforcement)', () => {
    const originalId = assessmentId
    patchAssessment(db, assessmentId, { suc_name: 'OK', status: 'hacked', id: 'evil' })
    const row = db.prepare('SELECT * FROM assessments WHERE id = ?').get(assessmentId)
    expect(row.id).toBe(originalId)
    expect(row.status).not.toBe('hacked')
  })

  it('tutti e 6 i campi SUC sono aggiornabili', () => {
    const sucFields = {
      suc_name: 'Test SUC',
      suc_function: 'Test function',
      machine_operation: 'Test operation',
      data_sharing: 'Test data sharing',
      access_points: 'Test access points',
      physical_boundary: 'Test boundary'
    }
    const result = patchAssessment(db, assessmentId, sucFields)
    expect(result.suc_name).toBe('Test SUC')
    expect(result.suc_function).toBe('Test function')
    expect(result.machine_operation).toBe('Test operation')
    expect(result.data_sharing).toBe('Test data sharing')
    expect(result.access_points).toBe('Test access points')
    expect(result.physical_boundary).toBe('Test boundary')
  })
})
