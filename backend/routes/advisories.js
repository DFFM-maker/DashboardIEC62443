const express = require('express')
const router = express.Router()
const db = require('../db/database')
const advisoryService = require('../services/advisoryService')

// GET /api/advisories
router.get('/', (req, res) => {
  const { vendor, source } = req.query
  let sql = 'SELECT * FROM advisories WHERE 1=1'
  const params = []
  if (vendor) { sql += ' AND vendor = ?'; params.push(vendor) }
  if (source) { sql += ' AND source = ?'; params.push(source) }
  sql += ' ORDER BY cvss_score DESC, published_at DESC LIMIT 200'
  res.json(db.all(sql, params))
})

// POST /api/advisories/refresh
router.post('/refresh', async (req, res) => {
  res.json({ ok: true, message: 'Refresh avviato in background' })
  const vendors = Object.keys(advisoryService.VENDOR_CONFIG)
  advisoryService.fetchAndCacheAdvisories(vendors, null, null).catch(err => {
    console.error('Advisory refresh error:', err)
  })
})

// GET /api/advisories/asset/:assetId
router.get('/asset/:assetId', (req, res) => {
  const asset = db.get('SELECT vendor FROM assets WHERE id = ?', [req.params.assetId])
  if (!asset) return res.status(404).json({ error: 'Asset non trovato' })
  res.json(advisoryService.getAdvisoriesForAsset(asset.vendor || ''))
})

// GET /api/advisories/stats
router.get('/stats', (req, res) => {
  const total = db.get('SELECT COUNT(*) as n FROM advisories')
  const kev = db.get("SELECT COUNT(*) as n FROM advisories WHERE source = 'CISA-KEV'")
  const nvd = db.get("SELECT COUNT(*) as n FROM advisories WHERE source = 'NVD-CISA'")
  const last = db.get('SELECT MAX(fetched_at) as last FROM advisories')
  res.json({ total: total?.n || 0, kev: kev?.n || 0, nvd: nvd?.n || 0, lastFetch: last?.last || null })
})

module.exports = router
