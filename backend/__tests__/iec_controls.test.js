/**
 * TASK 0.3 — Test IEC 62443-3-3 Controls Seed
 * TDD: scritti PRIMA dell'implementazione del seed.
 * Usa un DB in-memory con seed applicato.
 */

const { createTestDb } = require('./helpers/testDb')
const { seedIecControls } = require('../data/iec_controls_seed')

let db

beforeAll(() => {
  db = createTestDb()
  seedIecControls(db)
})

describe('IEC 62443-3-3 Controls seed', () => {
  it('la tabella iec_controls contiene più di 100 controlli (SR + RE)', () => {
    const result = db.prepare('SELECT COUNT(*) as n FROM iec_controls').get()
    expect(result.n).toBeGreaterThan(100)
  })

  it('SR 1.1 esiste (Identification and Authentication — Human Users)', () => {
    const ctrl = db.prepare("SELECT * FROM iec_controls WHERE sr_code='SR 1.1' AND re_code IS NULL").get()
    expect(ctrl).toBeDefined()
    expect(ctrl.title).toBeTruthy()
    expect(ctrl.category).toBe('IAC')
  })

  it('SR 1.1 è applicabile a tutti i SL (sl1=1, sl2=1, sl3=1, sl4=1)', () => {
    const ctrl = db.prepare("SELECT * FROM iec_controls WHERE sr_code='SR 1.1' AND re_code IS NULL").get()
    expect(ctrl.sl1).toBe(1)
    expect(ctrl.sl2).toBe(1)
    expect(ctrl.sl3).toBe(1)
    expect(ctrl.sl4).toBe(1)
  })

  it('SR 7.1 esiste (Denial of Service Protection — categoria RA)', () => {
    const ctrl = db.prepare("SELECT * FROM iec_controls WHERE sr_code='SR 7.1' AND re_code IS NULL").get()
    expect(ctrl).toBeDefined()
    expect(ctrl.category).toBe('RA')
  })

  it('tutte le 7 categorie sono presenti: IAC, UC, SI, DC, RDF, TRE, RA', () => {
    const categories = db.prepare('SELECT DISTINCT category FROM iec_controls WHERE re_code IS NULL').all()
    const cats = categories.map(c => c.category)
    expect(cats).toContain('IAC')
    expect(cats).toContain('UC')
    expect(cats).toContain('SI')
    expect(cats).toContain('DC')
    expect(cats).toContain('RDF')
    expect(cats).toContain('TRE')
    expect(cats).toContain('RA')
  })

  it('ogni SR-level record ha sr_code non null', () => {
    const nullSR = db.prepare("SELECT COUNT(*) as n FROM iec_controls WHERE sr_code IS NULL").get()
    expect(nullSR.n).toBe(0)
  })

  it('esistono i RE (Requirement Enhancements) come record con re_code non null', () => {
    const reCount = db.prepare("SELECT COUNT(*) as n FROM iec_controls WHERE re_code IS NOT NULL").get()
    expect(reCount.n).toBeGreaterThan(20)
  })

  it('SR 3.3 ha almeno un RE — Security Functionality Verification', () => {
    const re = db.prepare("SELECT * FROM iec_controls WHERE sr_code='SR 3.3' AND re_code IS NOT NULL").get()
    expect(re).toBeDefined()
  })

  it('tutti i controlli hanno title non vuoto', () => {
    const empty = db.prepare("SELECT COUNT(*) as n FROM iec_controls WHERE title IS NULL OR title=''").get()
    expect(empty.n).toBe(0)
  })

  it('tutti i controlli di categoria IAC (SR 1.x) hanno sr_code che inizia con SR 1', () => {
    const wrong = db.prepare("SELECT COUNT(*) as n FROM iec_controls WHERE category='IAC' AND sr_code NOT LIKE 'SR 1%'").get()
    expect(wrong.n).toBe(0)
  })
})
