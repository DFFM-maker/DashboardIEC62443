const express = require('express')
const router = express.Router()
const db = require('../db/database')

// GET /api/iec-controls
// Restituisce tutti i controlli IEC 62443-3-3 (SR + RE)
// Query params: category, sl (1|2|3|4), sr_code
router.get('/', (req, res) => {
  const { category, sl, sr_code } = req.query

  let sql = 'SELECT * FROM iec_controls WHERE 1=1'
  const params = []

  if (category) {
    sql += ' AND category = ?'
    params.push(category)
  }

  if (sr_code) {
    sql += ' AND sr_code = ?'
    params.push(sr_code)
  }

  // Filtro per SL: restituisce controlli applicabili al livello richiesto
  if (sl && ['1', '2', '3', '4'].includes(sl)) {
    sql += ` AND sl${sl} = 1`
  }

  sql += ' ORDER BY sr_code, re_code'

  const controls = db.all(sql, params)
  res.json(controls)
})

// GET /api/iec-controls/:id
router.get('/:id', (req, res) => {
  const ctrl = db.get('SELECT * FROM iec_controls WHERE id = ?', [req.params.id])
  if (!ctrl) return res.status(404).json({ error: 'Control not found' })
  res.json(ctrl)
})

module.exports = router
