const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const exportService = require('../services/exportService')

const upload = multer({ dest: '/tmp/otsa-uploads/' })

// POST /api/export/:assessmentId
router.post('/:assessmentId', async (req, res) => {
  try {
    const result = await exportService.exportAssessment(req.params.assessmentId)
    res.download(result.filePath, result.fileName)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/import
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nessun file caricato' })
  try {
    const newId = await exportService.importAssessment(req.file.path, req.body.client_id || null)
    fs.unlinkSync(req.file.path)
    res.json({ ok: true, assessment_id: newId })
  } catch (err) {
    try { fs.unlinkSync(req.file.path) } catch (e) {}
    res.status(400).json({ error: err.message })
  }
})

module.exports = router
