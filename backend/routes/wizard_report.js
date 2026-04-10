const express = require('express')
const router = express.Router({ mergeParams: true })
const db = require('../db/database')
const reportService = require('../services/reportService')

const SL_NUM = { 'SL-0': 0, 'SL-1': 1, 'SL-2': 2, 'SL-3': 3, 'SL-4': 4 }

function buildWizardData(assessmentId) {
  const assessment = db.get('SELECT * FROM assessments WHERE id = ?', [assessmentId])
  if (!assessment) return null

  const zones = db.all(
    `SELECT * FROM zones WHERE assessment_id = ?
     AND (excluded_from_assessment IS NULL OR excluded_from_assessment = 0)
     AND (excluded_from_report IS NULL OR excluded_from_report = 0)
     ORDER BY name`,
    [assessmentId]
  )
  const excludedZones = db.all(
    `SELECT name FROM zones WHERE assessment_id = ?
     AND (excluded_from_assessment = 1 OR excluded_from_report = 1)`,
    [assessmentId]
  )

  // PROBLEMA 1: JOIN with zones to get readable names instead of raw UUIDs
  const conduits = db.all(
    `SELECT c.*,
            COALESCE(zf.name, c.zone_from_id) as zone_from_name,
            COALESCE(zt.name, c.zone_to_id) as zone_to_name
     FROM conduits c
     LEFT JOIN zones zf ON c.zone_from_id = zf.id
     LEFT JOIN zones zt ON c.zone_to_id = zt.id
     WHERE c.assessment_id = ?`,
    [assessmentId]
  )

  const riskEvents = db.all('SELECT * FROM risk_events WHERE assessment_id = ? ORDER BY calculated_risk DESC', [assessmentId])
  const assets = db.all(
    `SELECT a.*, z.name as security_zone
     FROM assets a
     JOIN zone_assets za ON a.id = za.asset_id
     JOIN zones z ON za.zone_id = z.id
     WHERE a.assessment_id = ?
     ORDER BY a.ip`,
    [assessmentId]
  )
  const findings = db.all('SELECT * FROM findings WHERE assessment_id = ? ORDER BY cvss_score DESC', [assessmentId])

  // PROBLEMA 4: Load all policies with zone/control metadata, excluding excluded zones
  const policies = db.all(
    `SELECT p.*,
            ic.sr_code as ctrl_sr_code,
            ic.title as ctrl_title,
            z.name as zone_name
     FROM policies p
     LEFT JOIN iec_controls ic ON p.control_id = ic.id
     LEFT JOIN zones z ON p.zone_id = z.id
     WHERE p.assessment_id = ?
       AND (p.zone_id IS NULL
            OR z.id IS NULL
            OR (z.excluded_from_report IS NULL OR z.excluded_from_report = 0))
     ORDER BY z.name, ic.sr_code`,
    [assessmentId]
  )

  // Build policy lookup by (zone_id, control_id) — prefer final over draft
  const policyMap = {}
  for (const p of policies) {
    const key = `${p.zone_id}::${p.control_id}`
    if (!policyMap[key] || p.final) policyMap[key] = p
  }

  const enrichedZones = zones.map(zone => {
    // Detect if the zone has ever been through wizard Step 5 (any zone_controls row exists)
    const totalZoneControls = db.get(
      'SELECT COUNT(*) as cnt FROM zone_controls WHERE zone_id = ?',
      [zone.id]
    ).cnt

    // Zone not initialized: no zone_controls at all → mark as unanalyzed
    if (totalZoneControls === 0) {
      return {
        ...zone,
        analyzed: false,
        controls_total: null,
        controls_covered: null,
        gap_count: null,
        sl_achieved: null,
        implemented_controls: [],
        gap_controls: [],
      }
    }

    // Query only applicable=1 controls, JOIN iec_controls for metadata
    const applicable_controls = db.all(
      `SELECT zc.*, ic.sr_code, ic.title, ic.category, ic.sl1, ic.sl2, ic.sl3, ic.sl4
       FROM zone_controls zc
       JOIN iec_controls ic ON zc.control_id = ic.id
       WHERE zc.zone_id = ? AND zc.applicable = 1
       ORDER BY ic.sr_code`,
      [zone.id]
    )

    const implemented = applicable_controls.filter(c => c.present === 1)
    const gaps = applicable_controls.filter(c => c.present !== 1)

    // Pull policy text from policies table (prefer final over draft)
    const withPolicy = (controls) => controls.map(c => {
      const key = `${zone.id}::${c.control_id}`
      const policy = policyMap[key]
      return { ...c, policy_text: policy ? policy.policy_markdown : null }
    })

    // Compute SL-A: highest level where all required controls at that level are present
    const slT = SL_NUM[zone.security_level] != null ? SL_NUM[zone.security_level] : 1
    let slA = 0
    for (let level = 1; level <= slT; level++) {
      const slKey = `sl${level}`
      const reqAtLevel = applicable_controls.filter(c => c[slKey] === 1)
      const covAtLevel = implemented.filter(c => c[slKey] === 1)
      if (reqAtLevel.length > 0 && covAtLevel.length === reqAtLevel.length) {
        slA = level
      } else if (reqAtLevel.length === 0) {
        continue
      } else {
        break
      }
    }

    return {
      ...zone,
      analyzed: true,
      controls_total: applicable_controls.length,
      controls_covered: implemented.length,
      gap_count: gaps.length,
      sl_achieved: applicable_controls.length === 0 ? 'N/A' : `SL-${slA}`,
      implemented_controls: withPolicy(implemented),
      gap_controls: withPolicy(gaps),
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
    md += `### ${z.name} (${z.security_level})\n`
    if (!z.analyzed) {
      md += `- Controlli applicabili: N/D\n`
      md += `- Controlli implementati: N/D\n`
      md += `- Gap residui: N/D\n`
      md += `- ⚠ _Gap analysis non completata — eseguire il wizard Step 5_\n\n`
    } else {
      const pct = z.controls_total > 0 ? Math.round((z.controls_covered / z.controls_total) * 100) : 0
      md += `- Controlli applicabili: ${z.controls_total}\n`
      md += `- Controlli implementati: ${z.controls_covered} (${pct}%)\n`
      md += `- Gap residui: ${z.gap_count}\n\n`
    }
  })
  if (conduits.length > 0) {
    md += `**Condotti:**\n`
    conduits.forEach(c => {
      const fromName = c.zone_from_name || '?'
      const toName = c.zone_to_name || '?'
      md += `- ${fromName} → ${toName}${c.name ? ` (${c.name})` : ''} — tipo: ${c.type || '—'}, encryption: ${c.encryption || '—'}\n`
    })
    md += `\n`
  }

  // 4. Gap Analysis — per-zone dual table (implemented ✓ + gap ⚠), only applicable=1
  md += `## 4. Gap Analysis\n\n`
  const analyzedZones = zones.filter(z => z.analyzed)
  if (analyzedZones.length === 0) {
    md += `_Gap analysis non disponibile — nessuna zona ha completato il wizard Step 5._\n\n`
  } else {
    zones.forEach(z => {
      if (!z.analyzed) {
        md += `### ${z.name} — SL-T: ${z.security_level}\n\n`
        md += `> ⚠ Gap analysis non disponibile per questa zona — eseguire il wizard Step 5.\n\n`
        return
      }

      md += `### ${z.name} — SL-T: ${z.security_level} | SL-A: ${z.sl_achieved} | Gap: ${z.gap_count}\n\n`

      if (z.implemented_controls.length > 0) {
        md += `**Controlli implementati (✓):**\n\n`
        md += `| SR | Titolo | Policy |\n`
        md += `|----|--------|--------|\n`
        z.implemented_controls.forEach(c => {
          const snippet = c.policy_text
            ? c.policy_text.replace(/\n/g, ' ').slice(0, 100) + (c.policy_text.length > 100 ? '...' : '')
            : '—'
          md += `| ${c.sr_code} | ${c.title} | ${snippet} |\n`
        })
        md += `\n`
      } else {
        md += `**Controlli implementati (✓):** _nessuno_\n\n`
      }

      if (z.gap_controls.length > 0) {
        md += `**Controlli in GAP (⚠):**\n\n`
        md += `| SR | Titolo | Policy |\n`
        md += `|----|--------|--------|\n`
        z.gap_controls.forEach(g => {
          const snippet = g.policy_text
            ? g.policy_text.replace(/\n/g, ' ').slice(0, 100) + (g.policy_text.length > 100 ? '...' : '')
            : '—'
          md += `| ${g.sr_code} | ${g.title} | ${snippet} |\n`
        })
        md += `\n`
      } else {
        md += `**Controlli in GAP (⚠):** _nessun gap residuo_\n\n`
      }
    })
  }

  // 5. Policy di Sicurezza
  // PROBLEMA 4: show all policies (final and draft) with full structured output
  md += `## 5. Policy di Sicurezza\n\n`
  if (policies.length === 0) {
    md += `_Nessuna policy generata._\n\n`
  } else {
    policies.forEach(p => {
      const srCode = p.ctrl_sr_code || (() => { try { return JSON.parse(p.parameters_json || '{}').sr_code || '' } catch (_) { return '' } })()
      const title = p.ctrl_title || (() => { try { return JSON.parse(p.parameters_json || '{}').title || '' } catch (_) { return '' } })()
      const zoneName = p.zone_name || null
      const status = p.final ? 'FINALE' : 'BOZZA'
      const header = [srCode || 'Policy', title, zoneName ? `(${zoneName})` : ''].filter(Boolean).join(' — ')
      md += `### ${header}\n`
      md += `**Stato:** ${status}\n\n`
      md += `${p.policy_markdown || '_Testo non disponibile._'}\n\n`
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

// GET /api/assessments/:assessmentId/wizard-report/pdf
router.get('/pdf', async (req, res) => {
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

// GET /api/assessments/:assessmentId/report/html  (also /wizard-report/html)
// Serves a styled HTML report in the browser
router.get('/html', (req, res) => {
  const data = buildWizardData(req.params.assessmentId)
  if (!data) return res.status(404).json({ error: 'Assessment non trovato' })
  const { assessment, zones, conduits, riskEvents, assets, findings, policies } = data

  const date = new Date().toLocaleDateString('it-IT')
  const sucName = assessment.suc_name || assessment.name

  const RISK_COLOR = { LOW: '#16a34a', MEDIUM: '#d97706', HIGH: '#ea580c', CRITICAL: '#dc2626', CATASTROPHIC: '#7c3aed' }
  const SL_COLOR   = { 'SL-1': '#2563eb', 'SL-2': '#16a34a', 'SL-3': '#d97706', 'SL-4': '#dc2626' }

  function badge(text, color) {
    return `<span style="display:inline-block;background:${color || '#6b7280'};color:#fff;padding:1px 8px;border-radius:12px;font-size:11px;font-weight:700">${text}</span>`
  }

  function row(...cells) {
    return `<tr>${cells.map(c => `<td>${c ?? '—'}</td>`).join('')}</tr>`
  }

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>Report IEC 62443 — ${sucName}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 960px; margin: 40px auto; padding: 0 24px; color: #1f2937; font-size: 14px; line-height: 1.6; }
  h1 { font-size: 24px; color: #111827; border-bottom: 3px solid #2e9650; padding-bottom: 8px; margin-bottom: 4px; }
  h2 { font-size: 16px; color: #2e9650; border-bottom: 1px solid #d1fae5; padding-bottom: 4px; margin: 32px 0 12px; }
  h3 { font-size: 14px; color: #374151; margin: 16px 0 6px; }
  .meta { color: #6b7280; font-size: 13px; margin-bottom: 32px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f3f4f6; text-align: left; padding: 8px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
  td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  tr:hover td { background: #f9fafb; }
  .policy-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; font-size: 13px; white-space: pre-wrap; }
  .empty { color: #9ca3af; font-style: italic; }
  footer { margin-top: 48px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
</style>
</head>
<body>
<h1>Cybersecurity Risk Assessment — ${sucName}</h1>
<p class="meta">Data: ${date} &nbsp;|&nbsp; Assessor: ${assessment.assessor || '—'} &nbsp;|&nbsp; Subnet: ${assessment.subnet} &nbsp;|&nbsp; SL Target: ${assessment.iec62443_target_sl || 'SL-2'}</p>

<h2>1. System Under Consideration</h2>
<table>
  ${[['Nome SUC', assessment.suc_name], ['Funzione', assessment.suc_function], ['Operatività', assessment.machine_operation],
     ['Data sharing', assessment.data_sharing], ['Access points', assessment.access_points], ['Confine fisico', assessment.physical_boundary]]
    .filter(([,v]) => v).map(([l,v]) => `<tr><th style="width:30%;background:none;color:#6b7280">${l}</th><td>${v}</td></tr>`).join('')}
  ${assessment.assumptions ? `<tr><th style="background:none;color:#6b7280">Assumptions</th><td style="white-space:pre-wrap">${assessment.assumptions}</td></tr>` : ''}
</table>

<h2>2. Risk Assessment</h2>
${riskEvents.length === 0 ? '<p class="empty">Nessun risk event definito.</p>' : `
<table>
  <tr><th>#</th><th>Descrizione</th><th>L</th><th>I</th><th>Score</th><th>Livello</th></tr>
  ${riskEvents.map((e,i) => `<tr><td>${i+1}</td><td>${e.risk_description}</td><td>${e.likelihood}</td><td>${e.safety_impact}</td><td><b>${e.calculated_risk}</b></td><td>${badge(e.calculated_risk_label, RISK_COLOR[e.calculated_risk_label])}</td></tr>`).join('')}
</table>`}

<h2>3. Zone di Sicurezza</h2>
<table>
  <tr><th>Zona</th><th>SL-T</th><th>Controlli</th><th>Copertura</th><th>Gap</th></tr>
  ${zones.map(z => {
    if (!z.analyzed) {
      return `<tr><td><b>${z.name}</b></td><td>${badge(z.security_level, SL_COLOR[z.security_level])}</td><td colspan="3" style="color:#d97706;font-style:italic">⚠ Gap analysis non completata — eseguire wizard Step 5</td></tr>`
    }
    const pct = z.controls_total > 0 ? Math.round((z.controls_covered/z.controls_total)*100) : 0
    return `<tr><td><b>${z.name}</b></td><td>${badge(z.security_level, SL_COLOR[z.security_level])}</td><td>${z.controls_covered}/${z.controls_total}</td><td><b style="color:${pct>=80?'#16a34a':pct>=50?'#d97706':'#dc2626'}">${pct}%</b></td><td>${z.gap_count === 0 ? '✅' : `<b style="color:#dc2626">${z.gap_count}</b>`}</td></tr>`
  }).join('')}
</table>

<h2>4. Gap Analysis</h2>
${zones.filter(z => z.analyzed).length === 0 ? '<p class="empty">Gap analysis non disponibile — nessuna zona ha completato il wizard Step 5.</p>' :
  zones.map(z => {
    if (!z.analyzed) {
      return `<h3>${z.name} — SL-T: ${z.security_level}</h3>
        <p style="color:#d97706;font-style:italic">⚠ Gap analysis non disponibile per questa zona — eseguire il wizard Step 5.</p>`
    }
    return `
    <h3>${z.name} — SL-T: ${z.security_level} | SL-A: ${z.sl_achieved} | Gap: ${z.gap_count}</h3>
    ${z.implemented_controls.length > 0 ? `
      <p style="font-weight:600;color:#16a34a;margin:6px 0 2px">✓ Controlli implementati</p>
      <table>
        <tr><th>SR</th><th>Titolo</th><th>Policy</th></tr>
        ${z.implemented_controls.map(c => `<tr><td><code>${c.sr_code}</code></td><td>${c.title}</td><td class="${c.policy_text?'':'empty'}">${c.policy_text ? c.policy_text.replace(/\n/g,' ').slice(0,100)+'…' : '—'}</td></tr>`).join('')}
      </table>` : '<p class="empty" style="margin:4px 0">✓ Nessun controllo implementato</p>'}
    ${z.gap_controls.length > 0 ? `
      <p style="font-weight:600;color:#dc2626;margin:10px 0 2px">⚠ Controlli in GAP</p>
      <table>
        <tr><th>SR</th><th>Titolo</th><th>Policy</th></tr>
        ${z.gap_controls.map(g => `<tr><td><code style="color:#dc2626">${g.sr_code}</code></td><td>${g.title}</td><td class="${g.policy_text?'':'empty'}">${g.policy_text ? g.policy_text.replace(/\n/g,' ').slice(0,100)+'…' : '—'}</td></tr>`).join('')}
      </table>` : '<p style="color:#16a34a;margin:4px 0">⚠ Nessun gap residuo ✅</p>'}
  `}).join('')}

<h2>5. Policy di Sicurezza</h2>
${policies.length === 0 ? '<p class="empty">Nessuna policy generata.</p>' :
  policies.map(p => {
    const srCode = p.ctrl_sr_code || (() => { try { return JSON.parse(p.parameters_json || '{}').sr_code || '' } catch(_) { return '' } })()
    const title = p.ctrl_title || (() => { try { return JSON.parse(p.parameters_json || '{}').title || '' } catch(_) { return '' } })()
    const zoneName = p.zone_name || null
    return `<h3>${srCode ? srCode + ' — ' : ''}${title || 'Policy'}${zoneName ? ` <small style="color:#6b7280">(${zoneName})</small>` : ''} ${p.final ? badge('FINALE','#16a34a') : badge('BOZZA','#d97706')}</h3><div class="policy-box">${p.policy_markdown || ''}</div>`
  }).join('')}

<h2>6. Asset Inventory</h2>
${assets.length === 0 ? '<p class="empty">Nessun asset rilevato.</p>' : `
<table>
  <tr><th>IP</th><th>Vendor</th><th>Tipo</th><th>Modello</th><th>Zona</th><th>Criticità</th></tr>
  ${assets.map(a => `<tr><td><code>${a.ip}</code></td><td>${a.vendor||'—'}</td><td>${a.device_type||'—'}</td><td>${a.device_model||'—'}</td><td>${a.security_zone||'—'}</td><td>${a.criticality||'—'}</td></tr>`).join('')}
</table>`}

<h2>7. Finding di Sicurezza</h2>
${findings.length === 0 ? '<p class="empty">Nessun finding rilevato.</p>' : `
<table>
  <tr><th>#</th><th>Titolo</th><th>Severity</th><th>CVSS</th><th>Remediation</th></tr>
  ${findings.map((f,i) => `<tr><td>${i+1}</td><td>${f.title}</td><td>${f.severity||'—'}</td><td>${f.cvss_score||'—'}</td><td>${(f.remediation||'—').slice(0,80)}</td></tr>`).join('')}
</table>`}

<footer>Report IEC 62443 generato il ${date} — Tecnopack OT Security Dashboard</footer>
</body></html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

module.exports = { router, buildWizardData, buildMarkdown }
