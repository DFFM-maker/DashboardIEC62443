/**
 * TASK 0.2 — Test DB Migrations
 * TDD: questi test vengono scritti PRIMA dell'implementazione delle migrations.
 * Usa un DB in-memory per isolamento completo dal DB di produzione.
 */

const { createTestDb } = require('./helpers/testDb')

let db

beforeAll(() => {
  db = createTestDb()
})

describe('Migration 001 — Wizard fields su assessments', () => {
  it('la tabella assessments ha la colonna suc_name', () => {
    const cols = db.prepare("PRAGMA table_info(assessments)").all()
    const names = cols.map(c => c.name)
    expect(names).toContain('suc_name')
  })

  it('la tabella assessments ha la colonna suc_function', () => {
    const cols = db.prepare("PRAGMA table_info(assessments)").all()
    const names = cols.map(c => c.name)
    expect(names).toContain('suc_function')
  })

  it('la tabella assessments ha la colonna machine_operation', () => {
    const cols = db.prepare("PRAGMA table_info(assessments)").all()
    const names = cols.map(c => c.name)
    expect(names).toContain('machine_operation')
  })

  it('la tabella assessments ha la colonna data_sharing', () => {
    const cols = db.prepare("PRAGMA table_info(assessments)").all()
    const names = cols.map(c => c.name)
    expect(names).toContain('data_sharing')
  })

  it('la tabella assessments ha la colonna access_points', () => {
    const cols = db.prepare("PRAGMA table_info(assessments)").all()
    const names = cols.map(c => c.name)
    expect(names).toContain('access_points')
  })

  it('la tabella assessments ha la colonna physical_boundary', () => {
    const cols = db.prepare("PRAGMA table_info(assessments)").all()
    const names = cols.map(c => c.name)
    expect(names).toContain('physical_boundary')
  })
})

describe('Migration 002 — Canvas coords su zones e conduits', () => {
  it('la tabella zones ha la colonna x', () => {
    const cols = db.prepare("PRAGMA table_info(zones)").all()
    const names = cols.map(c => c.name)
    expect(names).toContain('x')
  })

  it('la tabella zones ha la colonna y', () => {
    const cols = db.prepare("PRAGMA table_info(zones)").all()
    const names = cols.map(c => c.name)
    expect(names).toContain('y')
  })

  it('la tabella zones ha la colonna width', () => {
    const cols = db.prepare("PRAGMA table_info(zones)").all()
    const names = cols.map(c => c.name)
    expect(names).toContain('width')
  })

  it('la tabella zones ha la colonna height', () => {
    const cols = db.prepare("PRAGMA table_info(zones)").all()
    const names = cols.map(c => c.name)
    expect(names).toContain('height')
  })

  it('la tabella conduits ha la colonna type', () => {
    const cols = db.prepare("PRAGMA table_info(conduits)").all()
    const names = cols.map(c => c.name)
    expect(names).toContain('type')
  })

  it('la tabella conduits ha la colonna label', () => {
    const cols = db.prepare("PRAGMA table_info(conduits)").all()
    const names = cols.map(c => c.name)
    expect(names).toContain('label')
  })

  it('la tabella conduits ha la colonna encryption', () => {
    const cols = db.prepare("PRAGMA table_info(conduits)").all()
    const names = cols.map(c => c.name)
    expect(names).toContain('encryption')
  })
})

describe('Migration 003 — Nuove tabelle wizard', () => {
  it('la tabella risk_events esiste', () => {
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='risk_events'"
    ).get()
    expect(result).toBeDefined()
    expect(result.name).toBe('risk_events')
  })

  it('la tabella iec_controls esiste', () => {
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='iec_controls'"
    ).get()
    expect(result).toBeDefined()
    expect(result.name).toBe('iec_controls')
  })

  it('la tabella zone_controls esiste', () => {
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='zone_controls'"
    ).get()
    expect(result).toBeDefined()
    expect(result.name).toBe('zone_controls')
  })

  it('la tabella policies esiste', () => {
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='policies'"
    ).get()
    expect(result).toBeDefined()
    expect(result.name).toBe('policies')
  })

  it('risk_events ha colonne obbligatorie', () => {
    const cols = db.prepare("PRAGMA table_info(risk_events)").all()
    const names = cols.map(c => c.name)
    expect(names).toContain('assessment_id')
    expect(names).toContain('likelihood')
    expect(names).toContain('calculated_risk')
    expect(names).toContain('calculated_risk_label')
  })

  it('iec_controls ha colonne sr_code, sl1, sl2, sl3, sl4, category', () => {
    const cols = db.prepare("PRAGMA table_info(iec_controls)").all()
    const names = cols.map(c => c.name)
    expect(names).toContain('sr_code')
    expect(names).toContain('sl1')
    expect(names).toContain('sl2')
    expect(names).toContain('sl3')
    expect(names).toContain('sl4')
    expect(names).toContain('category')
  })

  it('zone_controls ha colonne applicable, present, implements', () => {
    const cols = db.prepare("PRAGMA table_info(zone_controls)").all()
    const names = cols.map(c => c.name)
    expect(names).toContain('applicable')
    expect(names).toContain('present')
    expect(names).toContain('implements')
  })

  it('policies ha colonne parameters_json, policy_markdown, final', () => {
    const cols = db.prepare("PRAGMA table_info(policies)").all()
    const names = cols.map(c => c.name)
    expect(names).toContain('parameters_json')
    expect(names).toContain('policy_markdown')
    expect(names).toContain('final')
  })
})
