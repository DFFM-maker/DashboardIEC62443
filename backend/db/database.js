const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DB_PATH = path.join(__dirname, 'ot_dashboard.db')
const SCHEMA_PATH = path.join(__dirname, 'schema.sql')
const MIGRATIONS_DIR = path.join(__dirname, '../migrations')

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Init schema base
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8')
db.exec(schema)

// Migrations inline legacy (mantenute per compatibilità con DB esistenti)
try { db.exec("ALTER TABLE assets ADD COLUMN classified_by TEXT DEFAULT 'auto'") } catch (e) {}
try { db.exec("ALTER TABLE assessments ADD COLUMN snmp_community TEXT DEFAULT 'public'") } catch (e) {}

// Migrations file-based: esegue tutti i file .sql in /migrations/ in ordine alfabetico
if (fs.existsSync(MIGRATIONS_DIR)) {
  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    const statements = sql.split(';').map(s => {
      // Rimuove righe di commento dal singolo statement
      return s.split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .trim()
    }).filter(Boolean)

    for (const stmt of statements) {
      try {
        db.exec(stmt)
      } catch (e) {
        // Ignora errori "duplicate column name" — idempotente
        if (!e.message.includes('duplicate column name')) throw e
      }
    }
  }
}

// Seed IEC 62443-3-3 controls (idempotente — non duplica se già presenti)
try {
  const { seedIecControls } = require('../data/iec_controls_seed')
  seedIecControls(db)
} catch (e) {
  console.warn('[DB] Seed IEC controls skipped:', e.message)
}

// Wrapper per compatibilità .get / .all / .run stile async
db.get = (sql, params = []) => db.prepare(sql).get(...(Array.isArray(params) ? params : [params]))
db.all = (sql, params = []) => db.prepare(sql).all(...(Array.isArray(params) ? params : [params]))
db.run = (sql, params = []) => db.prepare(sql).run(...(Array.isArray(params) ? params : [params]))

module.exports = db
