const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DB_PATH = path.join(__dirname, 'ot_dashboard.db')
const SCHEMA_PATH = path.join(__dirname, 'schema.sql')

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Init schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8')
db.exec(schema)

// Wrapper per compatibilità .get / .all / .run stile async
db.get = (sql, params = []) => db.prepare(sql).get(...(Array.isArray(params) ? params : [params]))
db.all = (sql, params = []) => db.prepare(sql).all(...(Array.isArray(params) ? params : [params]))
db.run = (sql, params = []) => db.prepare(sql).run(...(Array.isArray(params) ? params : [params]))

module.exports = db
