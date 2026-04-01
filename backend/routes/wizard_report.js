const express = require('express')
const router = express.Router({ mergeParams: true })
const db = require('../db/database')
const reportService = require('../services/reportService')

const SL_NUM = { 'SL-1': 1, 'SL-2': 2, 'SL-3': 3, 'SL-4': 4 }

function buildWizardData(assessmentId) {
  const assessment = db.get('SELECT * FROM assessments WHERE id = ?', [assessmentId])
  if (!assessment) return null

  const zones = db.all(
    'SELECT * FROM zones WHERE assessment_id = ? AND (excluded_from_assessment IS NULL OR excluded_from_assessment = 0) ORDER BY name',
    [assessmentId]
  )
  const excludedZones = db.all(
    'SELECT name FROM zones WHERE assessment_id = ? AND excluded_from_report = 1',
    [assessmentId]
  )
  const conduits = db.all('SELECT * FROM conduits WHERE assessment_id = ?', [assessmentId])
  const riskEvents = db.all('SELECT * FROM risk_events WHERE assessment_id = ? ORDER BY calculated_risk DESC', [assessmentId])
  const assets = db.all('SELECT * FROM assets WHERE assessment_id = ? ORDER BY ip', [assessmentId])
  const findings = db.all('SELECT * FROM findings WHERE assessment_id = ? ORDER BY cvss_score DESC', [assessmentId])
  const policies = db.all('SELECT * FROM policies WHERE assessment_id = ? ORDER BY created_at', [assessmentId])

  const enrichedZones = zones.map(zone => {
    const slT = SL_NUM[zone.security_level] || 1
    const applicable = db.all(
      `SELECT c.* FROM iec_controls c
       WHERE (? >= 1 AND c.sl1=1) OR (? >= 2 AND c.sl2=1) OR (? >= 3 AND c.sl3=1) OR (? >= 4 AND c.sl4=1)`,
      [slT, slT, slT, slT]
    )
    const zoneControls = db.all('SELECT * FROM zone_controls WHERE zone_id = ?', [zone.id])
    const zcMap = {}
    for (const zc of zoneControls) zcMap[zc.control_id] = zc
    const covered = applicable.filter(c => zcMap[c.id]?.present).length
    return {
      ...zone,
      controls_total: applicable.length,
      controls_covered: covered,
      gap_count: applicable.length - covered,
      gap_controls: applicable
        .filter(c => !zcMap[c.id]?.present)
        .map(c => ({ ...c, policy_text: zcMap[c.id]?.policy_text || '' })),
    }
  })

  return { assessment, zones: enrichedZones, conduits, riskEvents, assets, findings, policies, excludedZones }
}

function buildMarkdown(data) {
  const { assessment, zones, conduits, riskEvents, assets, findings, policies, excludedZones = [] } = data
  const date = new Date().toLocaleDateString('it-IT')
  const sucName = assessment.suc_name || assessment.name

  let md = `# Cybersecurity Risk Assessment Report — ${sucName}\n\n`
  md += `**Data:** ${date}  \n`
  md += `**Assessor:** ${assessment.assessor || '—'}  \n`
  md += `**Subnet:** ${assessment.subnet}  \n`
  md += `**SL Target:** ${assessment.iec62443_target_sl || 'SL-2'}  \n\n`
  md += `---\n\n`

  // 1. SUC
  md += `## 1. System Under Consideration (SUC)\n\n`
  const sucFields = [
    ['Nome SUC', assessment.suc_name],
    ['Funzione', assessment.suc_function],
    ['Operatività macchina', assessment.machine_operation],
    ['Data sharing', assessment.data_sharing],
    ['Access points', assessment.access_points],
    ['Confine fisico', assessment.physical_boundary],
    ['Assumptions', assessment.assumptions],
  ]
  for (const [label, val] of sucFields) {
    if (val) md += `**${label}:** ${val}  \n`
  }
  md += `\n`

  // 2. Risk Assessment
  md += `## 2. Risk Assessment\n\n`
  if (riskEvents.length === 0) {
    md += `_Nessun risk event definito._\n\n`
  } else {
    md += `| # | Descrizione | L | I | Score | Livello |\n`
    md += `|---|-------------|---|---|-------|---------|\n`
    riskEvents.forEach((e, i) => {
      md += `| ${i + 1} | ${e.risk_description} | ${e.likelihood} | ${e.safety_impact} | ${e.calculated_risk} | ${e.calculated_risk_label} |\n`
    })
    md += `\n`
  }

  // 3. Zone e Condotti
  md += `## 3. Zone e Condotti\n\n`
  if (excludedZones.length > 0) {
    md += `> **Nota:** ${excludedZones.length} zona/e escluse dal report (solo inventario): ${excludedZones.map(z => z.name).join(', ')}.\n\n`
  }
  zones.forEach(z => {
    const pct = z.controls_total > 0 ? Math.round((z.controls_covered / z.controls_total) * 100) : 0
    md += `### ${z.name} (${z.security_level})\n`
    md += `- Controlli applicabili: ${z.controls_total}\n`
    md += `- Controlli implementati: ${z.controls_covered} (${pct}%)\n`
    md += `- Gap residui: ${z.gap_count}\n\n`
  })
  if (conduits.length > 0) {
    md += `**Condotti:**\n`
    conduits.forEach(c => {
      md += `- ${c.label || c.id} — tipo: ${c.type || '—'}, encryption: ${c.encryption || '—'}\n`
    })
    md += `\n`
  }

  // 4. Gap Analysis
  md += `## 4. Gap Analysis\n\n`
  const allGaps = zones.flatMap(z => z.gap_controls.map(g => ({ ...g, zone_name: z.name })))
  if (allGaps.length === 0) {
    md += `_Nessun gap residuo._\n\n`
  } else {
    md += `| Zona | SR | Titolo | Policy |\n`
    md += `|------|----|--------|--------|\n`
    allGaps.forEach(g => {
      const policySnippet = g.policy_text ? g.policy_text.replace(/\n/g, ' ').slice(0, 60) + '…' : '—'
      md += `| ${g.zone_name} | ${g.sr_code} | ${g.title} | ${policySnippet} |\n`
    })
    md += `\n`
  }

  // 5. Policy di Sicurezza
  md += `## 5. Policy di Sicurezza\n\n`
  const finalPolicies = policies.filter(p => p.final)
  const allPoliciesForMd = finalPolicies.length > 0 ? finalPolicies : policies
  if (allPoliciesForMd.length === 0) {
    md += `_Nessuna policy generata._\n\n`
  } else {
    allPoliciesForMd.forEach(p => {
      let params = {}
      try { params = JSON.parse(p.parameters_json || '{}') } catch (_) {}
      md += `### ${params.sr_code || 'Policy'} — ${params.title || ''}\n`
      if (p.final) md += `_(Finalizzata)_\n`
      md += `\n${p.policy_markdown}\n\n`
    })
  }

  // 6. Asset Inventory
  md += `## 6. Asset Inventory\n\n`
  if (assets.length === 0) {
    md += `_Nessun asset rilevato._\n\n`
  } else {
    md += `| IP | Vendor | Tipo | Modello | Zona | Criticità |\n`
    md += `|----|--------|------|---------|------|-----------|\n`
    assets.forEach(a => {
      md += `| ${a.ip} | ${a.vendor || '—'} | ${a.device_type || '—'} | ${a.device_model || '—'} | ${a.security_zone || '—'} | ${a.criticality || '—'} |\n`
    })
    md += `\n`
  }

  // 7. Finding di Sicurezza
  md += `## 7. Finding di Sicurezza\n\n`
  if (findings.length === 0) {
    md += `_Nessun finding rilevato._\n\n`
  } else {
    md += `| # | Titolo | Severity | CVSS | Remediation |\n`
    md += `|---|--------|----------|------|-------------|\n`
    findings.forEach((f, i) => {
      md += `| ${i + 1} | ${f.title} | ${f.severity || '—'} | ${f.cvss_score || '—'} | ${(f.remediation || '—').replace(/\n/g, ' ').slice(0, 60)} |\n`
    })
    md += `\n`
  }

  md += `---\n_Report IEC 62443 generato il ${date} — Tecnopack OT Security Dashboard_\n`
  return md
}

// GET /api/assessments/:assessmentId/wizard-report
// Returns markdown text
router.get('/', (req, res) => {
  const data = buildWizardData(req.params.assessmentId)
  if (!data) return res.status(404).json({ error: 'Assessment non trovato' })
  const md = buildMarkdown(data)
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
  const safeName = (data.assessment.suc_name || data.assessment.name).replace(/[^a-z0-9]/gi, '_')
  res.setHeader('Content-Disposition', `attachment; filename="wizard-report-${safeName}.md"`)
  res.send(md)
})

// POST /api/assessments/:assessmentId/wizard-report/pdf
router.post('/pdf', async (req, res) => {
  try {
    const data = buildWizardData(req.params.assessmentId)
    if (!data) return res.status(404).json({ error: 'Assessment non trovato' })
    const result = await reportService.generateWizardPdf(data)
    res.setHeader('Content-Type', 'application/octet-stream')
    res.download(result.filePath, result.fileName)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = { router, buildWizardData, buildMarkdown }
