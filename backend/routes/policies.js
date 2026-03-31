const express = require('express')
const router = express.Router({ mergeParams: true })
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')

// POST /api/assessments/:assessmentId/generate-policy
// Body: { zone_id, control_id, sr_code, title, suc_function }
router.post('/generate-policy', async (req, res) => {
  const { assessmentId } = req.params
  const { zone_id, control_id, sr_code, title, suc_function } = req.body

  if (!zone_id || !control_id || !sr_code || !title) {
    return res.status(400).json({ error: 'zone_id, control_id, sr_code, title sono richiesti' })
  }

  const baseUrl = process.env.ANTHROPIC_BASE_URL || 'http://172.16.238.200:1234'
  const token = process.env.ANTHROPIC_AUTH_TOKEN || 'lmstudio'
  const model = process.env.ANTHROPIC_MODEL || 'qwen2.5-coder-7b-instruct'

  try {
    const prompt = `Genera una policy di sicurezza IEC 62443 per il
controllo ${sr_code} '${title}' per un sistema IACS con funzione:
${suc_function || 'non specificata'}.
Rispondi SOLO in italiano, massimo 150 parole, con questa struttura:
**Obiettivo:** [testo]
**Ambito:** [testo]
**Requisiti:**
- [requisito 1]
- [requisito 2]
- [requisito 3]`

    const lmRes = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      })
    })

    if (!lmRes.ok) {
      const errText = await lmRes.text()
      throw new Error(`LM Studio error ${lmRes.status}: ${errText}`)
    }

    const lmData = await lmRes.json()
    const generatedText = lmData.choices[0].message.content

    // Find existing policy to get the same ID for REPLACE if it exists
    const existing = db.get(
      'SELECT id FROM policies WHERE assessment_id = ? AND zone_id = ? AND control_id = ?',
      [assessmentId, zone_id, control_id]
    )

    const id = existing ? existing.id : uuidv4()
    
    // As per user request, saving text in parameters_json as well or instead?
    // User said: INSERT OR REPLACE INTO policies (id, assessment_id, zone_id, control_id, parameters_json, final)
    // VALUES (uuid, :assessment_id, :zone_id, :control_id, json({text: generatedText}), 0)
    // We'll also keep policy_markdown for compatibility if it exists.
    
    const parametersJson = JSON.stringify({ text: generatedText, sr_code, title, suc_function })
    
    db.run(
      'INSERT OR REPLACE INTO policies (id, assessment_id, zone_id, control_id, parameters_json, policy_markdown, final) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [id, assessmentId, zone_id, control_id, parametersJson, generatedText]
    )

    // Update zone_controls as well for backward compatibility
    const zc = db.get('SELECT id FROM zone_controls WHERE zone_id = ? AND control_id = ?', [zone_id, control_id])
    if (zc) {
      db.run('UPDATE zone_controls SET policy_text = ? WHERE id = ?', [generatedText, zc.id])
    }

    res.json({ policy_markdown: generatedText })
  } catch (err) {
    console.error('[AI] Policy generation error:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/assessments/:assessmentId/policies
router.get('/policies', (req, res) => {
  const { assessmentId } = req.params
  const rows = db.all('SELECT * FROM policies WHERE assessment_id = ? ORDER BY created_at', [assessmentId])
  res.json(rows)
})

// PATCH /api/assessments/:assessmentId/policies/:policyId
router.patch('/policies/:policyId', (req, res) => {
  const { policyId } = req.params
  const { final, policy_markdown } = req.body

  const fields = []
  const values = []
  if (final !== undefined) { fields.push('final = ?'); values.push(final ? 1 : 0) }
  if (policy_markdown !== undefined) { fields.push('policy_markdown = ?'); values.push(policy_markdown) }

  if (fields.length === 0) return res.status(400).json({ error: 'Nessun campo da aggiornare' })

  values.push(policyId)
  db.run(`UPDATE policies SET ${fields.join(', ')} WHERE id = ?`, values)

  const updated = db.get('SELECT * FROM policies WHERE id = ?', [policyId])
  res.json(updated)
})

module.exports = router
