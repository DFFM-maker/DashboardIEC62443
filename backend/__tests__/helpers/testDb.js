/**
 * Helper: crea un DB SQLite in-memory per i test.
 * Applica lo schema base e tutte le migrations come farebbe database.js.
 */

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

function createTestDb() {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Schema base
  const schema = fs.readFileSync(path.join(__dirname, '../../db/schema.sql'), 'utf8')
  db.exec(schema)

  // Migrations inline (stesso approccio di database.js)
  const migrationsDir = path.join(__dirname, '../../migrations')
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      // Ogni statement ALTER TABLE wrapped in try/catch perché SQLite non supporta IF NOT EXISTS su ALTER
      const statements = sql.split(';').map(s => s.trim()).filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt)
        } catch (e) {
          // Ignora "duplicate column" — idempotente
          if (!e.message.includes('duplicate column')) throw e
        }
      }
    }
  }

  // Wrapper compatibilità
  db.get = (sql, params = []) => db.prepare(sql).get(...(Array.isArray(params) ? params : [params]))
  db.all = (sql, params = []) => db.prepare(sql).all(...(Array.isArray(params) ? params : [params]))
  db.run = (sql, params = []) => db.prepare(sql).run(...(Array.isArray(params) ? params : [params]))

  return db
}

module.exports = { createTestDb }
