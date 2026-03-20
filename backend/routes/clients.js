const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')

// GET /api/clients
router.get('/', (req, res) => {
  const clients = db.all(`
    SELECT c.*,
      COUNT(DISTINCT a.id) as assessment_count,
      MAX(a.created_at) as last_assessment_at
    FROM clients c LEFT JOIN assessments a ON c.id = a.client_id
    GROUP BY c.id ORDER BY c.name
  `)
  res.json(clients)
})

// POST /api/clients
router.post('/', (req, res) => {
  const { name, address, city, country, contact_name, contact_email, contact_phone, notes } = req.body
  if (!name) return res.status(400).json({ error: 'name è obbligatorio' })
  const id = uuidv4()
  db.run(
    `INSERT INTO clients (id, name, address, city, country, contact_name, contact_email, contact_phone, notes) VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, name, address || '', city || '', country || 'IT', contact_name || '', contact_email || '', contact_phone || '', notes || '']
  )
  res.json(db.get('SELECT * FROM clients WHERE id = ?', [id]))
})

// GET /api/clients/:id
router.get('/:id', (req, res) => {
  const client = db.get('SELECT * FROM clients WHERE id = ?', [req.params.id])
  if (!client) return res.status(404).json({ error: 'Cliente non trovato' })
  client.assessments = db.all(
    `SELECT a.*,
       (SELECT COUNT(*) FROM assets WHERE assessment_id = a.id) as asset_count,
       (SELECT COUNT(*) FROM findings WHERE assessment_id = a.id) as finding_count
     FROM assessments a WHERE a.client_id = ? ORDER BY a.created_at DESC`,
    [req.params.id]
  )
  res.json(client)
})

// PUT /api/clients/:id
router.put('/:id', (req, res) => {
  const { name, address, city, country, contact_name, contact_email, contact_phone, notes } = req.body
  db.run(
    `UPDATE clients SET name=?, address=?, city=?, country=?, contact_name=?, contact_email=?, contact_phone=?, notes=? WHERE id=?`,
    [name, address, city, country, contact_name, contact_email, contact_phone, notes, req.params.id]
  )
  res.json(db.get('SELECT * FROM clients WHERE id = ?', [req.params.id]))
})

// DELETE /api/clients/:id
router.delete('/:id', (req, res) => {
  const count = db.get('SELECT COUNT(*) as n FROM assessments WHERE client_id = ?', [req.params.id])
  if (count && count.n > 0) return res.status(409).json({ error: 'Impossibile eliminare: cliente ha assessment associati' })
  db.run('DELETE FROM clients WHERE id = ?', [req.params.id])
  res.json({ ok: true })
})

module.exports = router
