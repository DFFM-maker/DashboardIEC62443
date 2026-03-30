const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const db = require('../db/database')

const ASSETS_DIR = path.join(__dirname, '../../assets')
const REPORTS_DIR = path.join(__dirname, '../reports/output')

function getLogoBase64() {
  const p = path.join(ASSETS_DIR, 'logo-tecnopack-light.svg')
  if (!fs.existsSync(p)) return null
  return 'data:image/svg+xml;base64,' + fs.readFileSync(p).toString('base64')
}

function getLogoInlineForPdf() {
  const p = path.join(ASSETS_DIR, 'logo-tecnopack-light.svg')
  if (!fs.existsSync(p)) return '<span style="font-size:24px;font-weight:bold;color:#2e9650">TECNOPACK</span>'
  const svg = fs.readFileSync(p, 'utf8')
  return svg
    .replace(/\s+height="[^"]*"/, '')
    .replace(/\s+width="[^"]*"/, '')
    .replace('<svg ', '<svg viewBox="0 0 949.6 205.44" height="44" style="width:auto;display:block" ')
}

function severityColor(sev) {
  const map = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#16a34a', info: '#2563eb' }
  return map[(sev || '').toLowerCase()] || '#6b7280'
}

function severityBg(sev) {
  const map = { critical: '#fef2f2', high: '#fff7ed', medium: '#fffbeb', low: '#f0fdf4', info: '#eff6ff' }
  return map[(sev || '').toLowerCase()] || '#f9fafb'
}

function generateHtml(assessment, client, assets, portsMap, findings, zones, conduits) {
  const critCount = findings.filter(f => f.severity === 'critical').length
  const highCount = findings.filter(f => f.severity === 'high').length
  const medCount = findings.filter(f => f.severity === 'medium').length
  const lowCount = findings.filter(f => f.severity === 'low').length

  const svgBarWidth = 280
  const maxCount = Math.max(critCount, highCount, medCount, lowCount, 1)
  const barScale = svgBarWidth / maxCount

  const docDate = new Date(assessment.created_at).toLocaleDateString('it-IT')
  const docTitle = `${assessment.name} — OT Security Assessment`
  const docRev = '1.0'

  // Check if any asset has open ports (to conditionally show the column)
  const hasAnyPorts = assets.some(a => (portsMap[a.id] || []).length > 0)

  // ── Severity badge helper ──────────────────────────────────────────────────
  function badge(sev) {
    const cfg = {
      critical: { bg: '#dc2626', text: 'white' },
      high: { bg: '#ea580c', text: 'white' },
      medium: { bg: '#d97706', text: 'white' },
      low: { bg: '#16a34a', text: 'white' },
      info: { bg: '#2563eb', text: 'white' },
    }
    const c = cfg[(sev || '').toLowerCase()] || { bg: '#6b7280', text: 'white' }
    return `<span style="display:inline-block;background:${c.bg};color:${c.text};padding:2px 8px;border-radius:3px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">${sev || '—'}</span>`
  }

  // ── Asset rows ─────────────────────────────────────────────────────────────
  const assetRows = assets.map((a, i) => {
    const ports = (portsMap[a.id] || []).map(p => `${p.port}/${p.protocol}`).join(', ')
    const bg = i % 2 === 0 ? '#ffffff' : '#f8f9fa'
    return `<tr style="background:${bg}">
      <td style="font-family:monospace;font-weight:600">${a.ip}</td>
      <td style="font-family:monospace;font-size:11px">${a.mac || '—'}</td>
      <td>${a.vendor || '—'}</td>
      <td>${a.device_type || '—'}</td>
      <td>${a.device_model || '—'}</td>
      <td>${a.security_zone || '—'}</td>
      <td style="text-align:center">${badge(a.criticality || 'medium')}</td>
      ${hasAnyPorts ? `<td style="font-size:10px;font-family:monospace">${ports || '—'}</td>` : ''}
    </tr>`
  }).join('')

  // ── Findings ───────────────────────────────────────────────────────────────
  const findingsSections = findings.map((f, i) => {
    const srList = (() => { try { return JSON.parse(f.iec62443_sr || '[]') } catch (_) { return [] } })()
    return `
    <div style="border-left:4px solid ${severityColor(f.severity)};background:${severityBg(f.severity)};margin:12px 0;padding:14px 16px;page-break-inside:avoid">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        ${badge(f.severity)}
        <strong style="font-size:13px">F-${String(i + 1).padStart(3, '0')} — ${f.title}</strong>
        <span style="margin-left:auto;font-size:11px;color:#6b7280">CVSS ${f.cvss_score || 'N/A'}</span>
      </div>
      <p style="margin:6px 0;font-size:13px;color:#374151">${f.description || ''}</p>
      <table style="width:100%;margin-top:10px;font-size:12px;border-collapse:collapse">
        <tr>
          <td style="width:50%;vertical-align:top;padding-right:12px">
            <span style="color:#6b7280;font-size:11px;text-transform:uppercase">IP affetti</span><br>
            <code style="font-size:12px">${f.asset_ip || '—'}</code><br><br>
            <span style="color:#6b7280;font-size:11px;text-transform:uppercase">SR IEC 62443</span><br>
            ${srList.length ? srList.map(sr => `<code style="font-size:11px;background:#e5e7eb;padding:1px 5px;border-radius:3px;margin-right:4px">${sr}</code>`).join(' ') : '—'}
          </td>
          <td style="width:50%;vertical-align:top">
            <span style="color:#6b7280;font-size:11px;text-transform:uppercase">Remediation (${f.remediation_priority || '—'})</span><br>
            <span style="font-size:12px;white-space:pre-line">${f.remediation || '—'}</span>
          </td>
        </tr>
      </table>
    </div>`
  }).join('')

  // ── Zone SVG map ───────────────────────────────────────────────────────────
  const zoneColors = { 'PLC Zone': '#3b82f6', 'HMI Zone': '#22c55e', 'Infrastructure Zone': '#06b6d4', 'Remote Access Zone': '#f97316', 'Unclassified': '#6b7280' }
  const zoneList = [...new Set(assets.map(a => a.security_zone).filter(Boolean))]
  const svgHeight = Math.max(160, Math.ceil(zoneList.length / 3) * 130 + 40)
  const zoneBoxes = zoneList.map((zone, i) => {
    const x = 20 + (i % 3) * 220
    const y = 20 + Math.floor(i / 3) * 120
    const color = zoneColors[zone] || '#6b7280'
    const za = assets.filter(a => a.security_zone === zone)
    return `
      <rect x="${x}" y="${y}" width="200" height="100" rx="6" fill="${color}18" stroke="${color}" stroke-width="1.5"/>
      <text x="${x + 100}" y="${y + 18}" text-anchor="middle" font-weight="bold" font-size="12" fill="${color}">${zone}</text>
      <text x="${x + 100}" y="${y + 34}" text-anchor="middle" font-size="10" fill="#374151">${za.length} asset</text>
      ${za.slice(0, 3).map((a, ai) => `<text x="${x + 8}" y="${y + 52 + ai * 14}" font-size="9" fill="#4b5563">${a.ip} (${a.device_type || '?'})</text>`).join('')}
      ${za.length > 3 ? `<text x="${x + 8}" y="${y + 52 + 42}" font-size="9" fill="#9ca3af">+${za.length - 3} altri...</text>` : ''}`
  }).join('')

  // ── SR Compliance ──────────────────────────────────────────────────────────
  const srMapping = [
    { sr: 'SR 1.1', title: 'Human user identification and authentication' },
    { sr: 'SR 1.2', title: 'Software process and device identification' },
    { sr: 'SR 2.1', title: 'Authorization enforcement' },
    { sr: 'SR 2.4', title: 'Mobile code' },
    { sr: 'SR 3.1', title: 'Communication integrity' },
    { sr: 'SR 3.2', title: 'Malicious code protection' },
    { sr: 'SR 3.6', title: 'Network and security configuration settings' },
    { sr: 'SR 4.1', title: 'Information confidentiality' },
    { sr: 'SR 4.2', title: 'Use of cryptography' },
    { sr: 'SR 5.1', title: 'Network segmentation' },
    { sr: 'SR 7.6', title: 'Network and security configuration settings backup' },
    { sr: 'SR 7.7', title: 'Least functionality' },
  ]
  const violatedSRs = new Set()
  for (const f of findings) { try { JSON.parse(f.iec62443_sr || '[]').forEach(s => violatedSRs.add(s)) } catch (_) { } }
  const srRows = srMapping.map(({ sr, title }, i) => {
    const violated = violatedSRs.has(sr)
    const bg = i % 2 === 0 ? '#ffffff' : '#f8f9fa'
    return `<tr style="background:${bg}">
      <td style="font-family:monospace;font-weight:600;color:#1f2937">${sr}</td>
      <td>${title}</td>
      <td style="text-align:center">${badge(violated ? 'high' : 'low')}</td>
      <td style="color:${violated ? '#dc2626' : '#16a34a'};font-weight:600;font-size:12px">${violated ? 'Non Conforme' : 'Conforme'}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>${docTitle}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',system-ui,-apple-system,sans-serif; color:#1f2937; background:#fff; font-size:13px; line-height:1.5; }

  /* ── Cover ── */
  .cover {
    min-height:100vh; display:flex; flex-direction:column;
    padding:0; page-break-after:always; background:#fff;
  }
  .cover-top {
    display:flex; align-items:center; justify-content:space-between;
    padding:24px 40px 18px; border-bottom:3px solid #2e9650;
  }
  .cover-body {
    flex:1; display:flex; flex-direction:column; align-items:center;
    justify-content:center; padding:60px 60px 40px;
  }
  .cover-title { font-size:30px; font-weight:800; color:#1f2937; text-align:center; margin-bottom:6px; }
  .cover-sub   { font-size:16px; font-weight:400; color:#6b7280; margin-bottom:40px; }
  .cover-meta  { border-collapse:collapse; width:100%; max-width:560px; font-size:13px; }
  .cover-meta td { padding:8px 16px; border-bottom:1px solid #e5e7eb; }
  .cover-meta td:first-child { color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:.05em; width:38%; }
  .cover-meta td:last-child  { font-weight:600; color:#1f2937; }
  .cover-class { margin-top:28px; padding:10px 24px; border:1.5px solid #dc2626; border-radius:4px; }
  .cover-bottom {
    padding:16px 40px; border-top:1px solid #e5e7eb;
    font-size:11px; color:#9ca3af; display:flex; justify-content:space-between;
  }

  /* ── Page body ── */
  .page { padding:0 0 32px; }

  /* ── Section headings (numbered) ── */
  h1.sec {
    font-size:17px; font-weight:700; color:#2e9650;
    border-bottom:2px solid #2e9650; padding-bottom:6px;
    margin:32px 0 16px; page-break-after:avoid;
  }
  h2.sec {
    font-size:14px; font-weight:700; color:#2e9650;
    border-bottom:1px solid #d1fae5; padding-bottom:4px;
    margin:20px 0 10px; page-break-after:avoid;
  }

  /* ── Summary cards ── */
  .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin:16px 0; }
  .kpi-card  { padding:16px 12px; border:1px solid #e5e7eb; border-radius:6px; text-align:center; }
  .kpi-count { font-size:36px; font-weight:800; line-height:1; }
  .kpi-label { font-size:11px; margin-top:4px; font-weight:600; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; }

  /* ── Tables ── */
  table.data { width:100%; border-collapse:collapse; font-size:12px; margin:12px 0; }
  table.data th {
    background:#2e9650; color:#fff; padding:8px 12px;
    text-align:left; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:.04em;
  }
  table.data td { padding:7px 12px; border:1px solid #dee2e6; vertical-align:top; }

  /* ── Misc ── */
  ul,ol { padding-left:20px; }
  li { margin-bottom:4px; }
  code { font-family:monospace; font-size:12px; }

  /* ── Page margins: no header/footer on cover (page 1), full margins on pages 2+ ── */
  @page :first { margin-top: 0; margin-bottom: 0; }
  @page { margin-top: 20mm; margin-bottom: 14mm; }

  @media print {
    .cover { page-break-after:always; }
    h1.sec,h2.sec { page-break-after:avoid; }
  }
</style>
</head>
<body>

<!-- ══════════════════════════════════════════════════
     COVER PAGE
══════════════════════════════════════════════════ -->
<div class="cover">
  <div class="cover-body">
    <p class="cover-title">OT Security Assessment Report</p>
    <p class="cover-sub">Conformità IEC 62443-3-3</p>

    <table class="cover-meta">
      <tr><td>Cliente</td><td>${client?.name || '—'}</td></tr>
      <tr><td>Impianto / Progetto</td><td>${assessment.name}</td></tr>
      ${client?.address ? `<tr><td>Indirizzo</td><td>${client.address}${client.city ? ', ' + client.city : ''}</td></tr>` : ''}
      ${client?.contact_name ? `<tr><td>Referente cliente</td><td>${client.contact_name}</td></tr>` : ''}
      <tr><td>Assessor</td><td>${assessment.assessor || '—'}</td></tr>
      <tr><td>Data assessment</td><td>${docDate}</td></tr>
      <tr><td>Subnet analizzata</td><td><code>${assessment.subnet}</code></td></tr>
      <tr><td>SL Target IEC 62443</td><td><strong>${assessment.iec62443_target_sl || 'SL-2'}</strong></td></tr>
      <tr><td>Revisione documento</td><td>${docRev}</td></tr>
    </table>

    <div class="cover-class">
      <span style="color:#dc2626;font-weight:700;font-size:13px">RISERVATO — Solo uso interno e cliente autorizzato</span>
    </div>
  </div>

  <div class="cover-bottom">
    <span>Generato da Tecnopack OT Security Dashboard v2.0 · ${docDate}</span>
  </div>
</div>

<!-- ══════════════════════════════════════════════════
     BODY
══════════════════════════════════════════════════ -->
<div class="page">

<!-- 1. EXECUTIVE SUMMARY -->
<h1 class="sec">1&nbsp;&nbsp;Executive Summary</h1>
<div class="kpi-grid">
  <div class="kpi-card">
    <div class="kpi-count" style="color:#2563eb">${assets.length}</div>
    <div class="kpi-label">Asset rilevati</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-count" style="color:#dc2626">${critCount}</div>
    <div class="kpi-label">Critical</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-count" style="color:#ea580c">${highCount}</div>
    <div class="kpi-label">High</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-count" style="color:#d97706">${medCount}</div>
    <div class="kpi-label">Medium</div>
  </div>
</div>

<svg width="100%" height="110" viewBox="0 0 620 110" style="margin:8px 0 16px">
  ${[
      { label: 'Critical', count: critCount, color: '#dc2626', y: 6 },
      { label: 'High', count: highCount, color: '#ea580c', y: 31 },
      { label: 'Medium', count: medCount, color: '#d97706', y: 56 },
      { label: 'Low', count: lowCount, color: '#16a34a', y: 81 },
    ].map(({ label, count, color, y }) => `
    <text x="0" y="${y + 14}" font-size="11" fill="#374151" font-family="sans-serif">${label}</text>
    <rect x="68" y="${y}" width="${Math.max(2, Math.round(count * barScale))}" height="16" rx="2" fill="${color}"/>
    <text x="${70 + Math.round(count * barScale)}" y="${y + 13}" font-size="11" fill="${color}" font-weight="bold">${count}</text>
  `).join('')}
</svg>

<h2 class="sec">1.1&nbsp;&nbsp;Principali Gap di Conformità</h2>
<ul>
  ${critCount > 0 ? `<li><strong>CRITICO:</strong> ${critCount} finding richiedono intervento immediato</li>` : ''}
  ${highCount > 0 ? `<li><strong>ALTO:</strong> Protocolli OT esposti senza autenticazione (FINS, EtherNet/IP, SMB)</li>` : ''}
  <li>Asset non documentati nell'inventario OT</li>
  <li>Firmware e versioni software obsolete</li>
</ul>

<h2 class="sec">1.2&nbsp;&nbsp;Top Raccomandazioni</h2>
<ol>
  ${critCount > 0 ? '<li>Correggere immediatamente tutti i finding CRITICAL prima di riportare il sistema in produzione</li>' : ''}
  <li>Bloccare via ACL i protocolli OT esposti su rete non segregata</li>
  <li>Inventariare e documentare tutti gli asset non classificati</li>
</ol>

<!-- 2. ASSET INVENTORY -->
<h1 class="sec">2&nbsp;&nbsp;Asset Inventory</h1>
<table class="data">
  <thead><tr>
    <th>IP</th><th>MAC</th><th>Vendor</th><th>Tipo</th><th>Modello</th>
    <th>Zona</th><th>Criticità</th>${hasAnyPorts ? '<th>Porte aperte</th>' : ''}
  </tr></thead>
  <tbody>${assetRows || `<tr><td colspan="${hasAnyPorts ? 8 : 7}" style="text-align:center;color:#9ca3af;padding:20px">Nessun asset rilevato</td></tr>`}</tbody>
</table>

<!-- 3. SECURITY FINDINGS -->
<h1 class="sec">3&nbsp;&nbsp;Security Findings (${findings.length})</h1>
${findingsSections || '<p style="color:#9ca3af;font-style:italic">Nessun finding rilevato.</p>'}

<!-- 4. ZONE & CONDUIT MAP -->
<h1 class="sec">4&nbsp;&nbsp;Zone &amp; Conduit Map</h1>
<svg width="100%" viewBox="0 0 700 ${svgHeight}" style="border:1px solid #dee2e6;border-radius:6px;background:#fafafa;margin:8px 0">
  ${zoneBoxes || '<text x="350" y="80" text-anchor="middle" font-size="13" fill="#9ca3af">Nessuna zona definita</text>'}
</svg>

<!-- 5. IEC 62443-3-3 SR COMPLIANCE -->
<h1 class="sec">5&nbsp;&nbsp;Mappatura IEC 62443-3-3 SR</h1>
<table class="data">
  <thead><tr><th style="width:100px">SR</th><th>Titolo</th><th style="width:80px;text-align:center">Livello</th><th style="width:110px">Stato</th></tr></thead>
  <tbody>${srRows}</tbody>
</table>

${findings.length > 0 ? `
<!-- 6. REMEDIATION ROADMAP -->
<h1 class="sec">6&nbsp;&nbsp;Remediation Roadmap</h1>
${['Immediate', 'Short-term', 'Long-term'].map((priority, pi) => {
      const pf = findings.filter(f => f.remediation_priority === priority)
      if (pf.length === 0) return ''
      const labels = { Immediate: 'Immediata (< 2 settimane)', 'Short-term': 'Breve termine (< 3 mesi)', 'Long-term': 'Lungo termine (> 3 mesi)' }
      return `
  <h2 class="sec">6.${pi + 1}&#160;&#160;${labels[priority]} — ${pf.length} finding</h2>
  <ul>
    ${pf.map(f => `<li>${badge(f.severity)} <strong>${f.title}</strong> — ${f.remediation || '—'}</li>`).join('')}
  </ul>`
    }).join('')}
` : ''}

</div><!-- /page -->
</body>
</html>`
}

async function generatePdf(htmlPath, pdfPath, logoBase64) {
  const puppeteer = require('puppeteer-core')

  const logoImg = logoBase64
    ? `<img src="${logoBase64}" style="height:22px;width:auto;display:block" />`
    : `<span style="font-size:11px;font-weight:700;color:#2e9650">TECNOPACK</span>`

  // Header: "OT Security Assessment — Riservato" left, logo right.
  // Hidden on page 1 via @page :first { margin-top: 0 } in the HTML CSS.
  const headerTemplate = `
    <div style="width:100%;font-family:'Segoe UI',Arial,sans-serif;font-size:9px;
                padding:4px 18mm 4px;box-sizing:border-box;
                display:flex;justify-content:space-between;align-items:center;
                border-bottom:2px solid #2e9650">
      <span style="color:#666666">OT Security Assessment — Riservato</span>
      ${logoImg}
    </div>`

  const footerTemplate = `
    <div style="width:100%;font-family:'Segoe UI',Arial,sans-serif;font-size:8px;
                color:#9ca3af;padding:4px 18mm 2px;box-sizing:border-box;
                display:flex;justify-content:space-between;align-items:center;
                border-top:1px solid #dee2e6">
      <span></span>
      <span><span class="pageNumber"></span> di <span class="totalPages"></span></span>
    </div>`

  const CHROMIUM_PATHS = [
    '/snap/chromium/current/usr/lib/chromium-browser/chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ]
  const executablePath = CHROMIUM_PATHS.find(p => fs.existsSync(p))
  if (!executablePath) throw new Error('Chromium non trovato — installa puppeteer o chromium')

  const browser = await puppeteer.launch({
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    headless: true,
  })

  try {
    const page = await browser.newPage()
    await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0', timeout: 30000 })
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: { top: '20mm', bottom: '14mm', left: '18mm', right: '18mm' },
    })
  } finally {
    await browser.close()
  }

  // Fallback: if puppeteer failed to write (permissions), try weasyprint
  if (!fs.existsSync(pdfPath) || fs.statSync(pdfPath).size === 0) {
    await new Promise((resolve, reject) => {
      exec(`weasyprint "${htmlPath}" "${pdfPath}" 2>/dev/null`, { timeout: 60000 }, (err) => {
        if (err) reject(new Error('PDF generation failed: puppeteer e weasyprint entrambi falliti'))
        else resolve()
      })
    })
  }
}

async function generateReport(assessmentId, format) {
  const assessment = db.get(
    'SELECT a.*, c.name as client_name, c.address, c.city, c.contact_name FROM assessments a LEFT JOIN clients c ON a.client_id = c.id WHERE a.id = ?',
    [assessmentId]
  )
  if (!assessment) throw new Error('Assessment non trovato')

  const client = assessment.client_id ? db.get('SELECT * FROM clients WHERE id = ?', [assessment.client_id]) : null
  const assets = db.all('SELECT * FROM assets WHERE assessment_id = ? ORDER BY ip', [assessmentId])
  const findings = db.all('SELECT * FROM findings WHERE assessment_id = ? ORDER BY cvss_score DESC', [assessmentId])
  const zones = db.all('SELECT * FROM zones WHERE assessment_id = ?', [assessmentId])
  const conduits = db.all('SELECT * FROM conduits WHERE assessment_id = ?', [assessmentId])

  const portsMap = {}
  for (const asset of assets) {
    portsMap[asset.id] = db.all('SELECT * FROM open_ports WHERE asset_id = ? ORDER BY port', [asset.id])
  }

  // Add asset_ip to findings
  const assetIpMap = {}
  for (const a of assets) assetIpMap[a.id] = a.ip
  for (const f of findings) {
    f.asset_ip = f.asset_id ? assetIpMap[f.asset_id] : null
  }

  const ts = Date.now()
  const safeName = assessment.name.replace(/[^a-z0-9]/gi, '_')

  if (format === 'html' || format === 'pdf') {
    const htmlContent = generateHtml(assessment, client, assets, portsMap, findings, zones, conduits)
    const htmlPath = path.join(REPORTS_DIR, `${safeName}_${ts}.html`)
    fs.writeFileSync(htmlPath, htmlContent)

    if (format === 'html') {
      return { filePath: htmlPath, fileName: path.basename(htmlPath), mimeType: 'text/html' }
    }

    const pdfPath = path.join(REPORTS_DIR, `${safeName}_${ts}.pdf`)
    await generatePdf(path.resolve(htmlPath), pdfPath, getLogoBase64())
    return { filePath: pdfPath, fileName: path.basename(pdfPath), mimeType: 'application/pdf' }
  }

  if (format === 'excel') {
    const ExcelJS = require('exceljs')
    const wb = new ExcelJS.Workbook()
    wb.creator = 'Tecnopack OT Security Dashboard'
    wb.created = new Date()

    // Sheet 1: Asset Inventory
    const ws1 = wb.addWorksheet('Asset Inventory')
    ws1.columns = [
      { header: 'ID Asset', key: 'id', width: 12 },
      { header: 'IP', key: 'ip', width: 16 },
      { header: 'MAC Address', key: 'mac', width: 20 },
      { header: 'Vendor', key: 'vendor', width: 22 },
      { header: 'Tipo Device', key: 'device_type', width: 14 },
      { header: 'Modello', key: 'device_model', width: 22 },
      { header: 'Firmware', key: 'firmware_version', width: 16 },
      { header: 'Security Zone', key: 'security_zone', width: 22 },
      { header: 'Criticità', key: 'criticality', width: 12 },
      { header: 'Note', key: 'notes', width: 40 },
      { header: 'Data Rilevamento', key: 'last_seen', width: 18 },
    ]
    ws1.getRow(1).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
    })
    assets.forEach((a, i) => {
      ws1.addRow({
        id: `A-${String(i + 1).padStart(3, '0')}`,
        ip: a.ip, mac: a.mac || '', vendor: a.vendor || '',
        device_type: a.device_type || '', device_model: a.device_model || '',
        firmware_version: a.firmware_version || '',
        security_zone: a.security_zone || '', criticality: (a.criticality || 'medium').toUpperCase(),
        notes: a.notes || '', last_seen: a.last_seen
      })
      const row = ws1.getRow(i + 2)
      if (i % 2 === 1) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } } })
      const critCell = row.getCell('criticality')
      const critVal = (a.criticality || '').toLowerCase()
      critCell.font = { color: { argb: critVal === 'high' ? 'FFFF0000' : critVal === 'medium' ? 'FFFF6600' : 'FF00AA00' }, bold: true }
    })

    // Sheet 2: Open Ports
    const ws2 = wb.addWorksheet('Open Ports Detail')
    ws2.columns = [
      { header: 'IP', key: 'ip', width: 16 },
      { header: 'Porta', key: 'port', width: 8 },
      { header: 'Protocollo', key: 'protocol', width: 12 },
      { header: 'Servizio', key: 'service', width: 18 },
      { header: 'Versione', key: 'version', width: 24 },
      { header: 'Stato', key: 'state', width: 10 },
      { header: 'Necessario', key: 'is_required', width: 12 },
    ]
    ws2.getRow(1).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
    })
    let rowIdx2 = 2
    for (const asset of assets) {
      const ports = portsMap[asset.id] || []
      for (const p of ports) {
        ws2.addRow({ ip: asset.ip, port: p.port, protocol: p.protocol, service: p.service, version: p.version, state: p.state, is_required: p.is_required ? 'SI' : 'NO' })
        if (rowIdx2 % 2 === 1) {
          ws2.getRow(rowIdx2).eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } } })
        }
        rowIdx2++
      }
    }

    // Sheet 3: Vulnerability Summary
    const ws3 = wb.addWorksheet('Vulnerability Summary')
    ws3.columns = [
      { header: 'Finding ID', key: 'fid', width: 12 },
      { header: 'IP', key: 'ip', width: 16 },
      { header: 'Titolo', key: 'title', width: 40 },
      { header: 'Severità', key: 'severity', width: 12 },
      { header: 'CVSS Score', key: 'cvss_score', width: 12 },
      { header: 'CVSS Vector', key: 'cvss_vector', width: 40 },
      { header: 'IEC 62443 SR', key: 'iec62443_sr', width: 24 },
      { header: 'Remediation', key: 'remediation', width: 50 },
      { header: 'Priorità', key: 'priority', width: 14 },
      { header: 'Stato', key: 'status', width: 10 },
    ]
    ws3.getRow(1).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
    })
    findings.forEach((f, i) => {
      let srStr = ''
      try { srStr = JSON.parse(f.iec62443_sr || '[]').join(', ') } catch (e) { }
      ws3.addRow({
        fid: `F-${String(i + 1).padStart(3, '0')}`,
        ip: f.asset_ip || '', title: f.title,
        severity: (f.severity || '').toUpperCase(),
        cvss_score: f.cvss_score, cvss_vector: f.cvss_vector,
        iec62443_sr: srStr, remediation: f.remediation,
        priority: f.remediation_priority, status: f.status
      })
      const row = ws3.getRow(i + 2)
      if (i % 2 === 1) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } } })
      const sevCell = row.getCell('severity')
      const sevVal = (f.severity || '').toLowerCase()
      const sevColors = { critical: 'FFFF0000', high: 'FFFF6600', medium: 'FFFFCC00', low: 'FF00AA00' }
      sevCell.font = { color: { argb: sevColors[sevVal] || 'FF000000' }, bold: true }
    })

    const xlsxPath = path.join(REPORTS_DIR, `${safeName}_${ts}.xlsx`)
    await wb.xlsx.writeFile(xlsxPath)
    return { filePath: xlsxPath, fileName: path.basename(xlsxPath), mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  }

  throw new Error(`Formato non supportato: ${format}`)
}

async function generateWizardPdf(data) {
  const { assessment, zones, conduits, riskEvents, assets, findings, policies } = data

  const logoBase64 = getLogoBase64()
  const docDate = new Date().toLocaleDateString('it-IT')
  const sucName = assessment.suc_name || assessment.name

  function badge(sev) {
    const map = { critical:'#dc2626', high:'#ea580c', medium:'#d97706', low:'#16a34a', info:'#2563eb' }
    const bg = map[(sev||'').toLowerCase()] || '#6b7280'
    return `<span style="display:inline-block;background:${bg};color:#fff;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:700;text-transform:uppercase">${sev||'—'}</span>`
  }

  function riskBadge(label) {
    const map = { LOW:'#16a34a', MEDIUM:'#d97706', HIGH:'#ea580c', CRITICAL:'#dc2626', CATASTROPHIC:'#7c3aed' }
    const bg = map[(label||'').toUpperCase()] || '#6b7280'
    return `<span style="display:inline-block;background:${bg};color:#fff;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:700">${label||'—'}</span>`
  }

  const finalPolicies = policies.filter(p => p.final)
  const displayPolicies = finalPolicies.length > 0 ? finalPolicies : policies

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>Wizard Report — ${sucName}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',system-ui,-apple-system,sans-serif; color:#1f2937; background:#fff; font-size:13px; line-height:1.5; }
  @page :first { margin-top:0; margin-bottom:0; }
  @page { margin-top:20mm; margin-bottom:14mm; }

  /* Cover */
  .cover { min-height:100vh; display:flex; flex-direction:column; background:#fff; page-break-after:always; }
  .cover-body { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px; }
  .cover-title { font-size:28px; font-weight:800; color:#1f2937; text-align:center; margin-bottom:8px; }
  .cover-sub { font-size:14px; color:#6b7280; margin-bottom:40px; }
  .cover-meta { border-collapse:collapse; width:100%; max-width:560px; font-size:13px; }
  .cover-meta td { padding:8px 16px; border-bottom:1px solid #e5e7eb; }
  .cover-meta td:first-child { color:#6b7280; font-size:11px; text-transform:uppercase; letter-spacing:.05em; width:40%; }
  .cover-meta td:last-child { font-weight:600; }
  .cover-bottom { padding:16px 40px; border-top:1px solid #e5e7eb; font-size:11px; color:#9ca3af; display:flex; justify-content:flex-end; }

  /* Sections */
  .page { padding:0 0 32px; }
  h1.sec { font-size:16px; font-weight:700; color:#2e9650; border-bottom:2px solid #2e9650; padding-bottom:6px; margin:32px 0 14px; page-break-after:avoid; }
  h2.sec { font-size:13px; font-weight:700; color:#2e9650; border-bottom:1px solid #d1fae5; padding-bottom:3px; margin:18px 0 8px; page-break-after:avoid; }

  /* Tables */
  table.data { width:100%; border-collapse:collapse; font-size:11px; margin:10px 0; }
  table.data th { background:#2e9650; color:#fff; padding:7px 10px; text-align:left; font-weight:600; font-size:10px; text-transform:uppercase; letter-spacing:.04em; }
  table.data td { padding:6px 10px; border:1px solid #dee2e6; vertical-align:top; }

  /* KPI */
  .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin:12px 0; }
  .kpi-card { padding:14px 10px; border:1px solid #e5e7eb; border-radius:6px; text-align:center; }
  .kpi-count { font-size:30px; font-weight:800; line-height:1; }
  .kpi-label { font-size:10px; margin-top:4px; font-weight:600; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; }

  /* Policy box */
  .policy-box { border-left:3px solid #2e9650; background:#f0fdf4; padding:10px 14px; margin:8px 0; font-size:12px; white-space:pre-wrap; border-radius:0 4px 4px 0; }

  @media print { .cover { page-break-after:always; } h1.sec,h2.sec { page-break-after:avoid; } }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="cover-body">
    <p class="cover-title">Cybersecurity Risk Assessment</p>
    <p class="cover-sub">IEC 62443-3-3 — ${sucName}</p>
    <table class="cover-meta">
      ${assessment.suc_name ? `<tr><td>SUC</td><td>${assessment.suc_name}</td></tr>` : ''}
      ${assessment.suc_function ? `<tr><td>Funzione</td><td>${assessment.suc_function}</td></tr>` : ''}
      <tr><td>Assessment</td><td>${assessment.name}</td></tr>
      <tr><td>Assessor</td><td>${assessment.assessor || '—'}</td></tr>
      <tr><td>Data</td><td>${docDate}</td></tr>
      <tr><td>Subnet</td><td><code>${assessment.subnet}</code></td></tr>
      <tr><td>SL Target</td><td><strong>${assessment.iec62443_target_sl || 'SL-2'}</strong></td></tr>
    </table>
    <div style="margin-top:28px;padding:10px 24px;border:1.5px solid #dc2626;border-radius:4px">
      <span style="color:#dc2626;font-weight:700;font-size:12px">RISERVATO — Solo uso interno e cliente autorizzato</span>
    </div>
  </div>
  <div class="cover-bottom">
    <span>Generato da Tecnopack OT Security Dashboard v2.0 · ${docDate}</span>
  </div>
</div>

<!-- BODY -->
<div class="page">

<!-- 1. SUC -->
<h1 class="sec">1&nbsp;&nbsp;System Under Consideration (SUC)</h1>
<table class="data">
  <thead><tr><th>Campo</th><th>Valore</th></tr></thead>
  <tbody>
    ${[
      ['Nome SUC', assessment.suc_name],
      ['Funzione IACS', assessment.suc_function],
      ['Operatività macchina', assessment.machine_operation],
      ['Data sharing', assessment.data_sharing],
      ['Access points', assessment.access_points],
      ['Confine fisico', assessment.physical_boundary],
      ['SL Target', assessment.iec62443_target_sl],
      ['Assumptions', assessment.assumptions],
    ].filter(([,v]) => v).map(([k,v],i) => `<tr style="background:${i%2===0?'#fff':'#f8f9fa'}"><td style="color:#6b7280;width:35%">${k}</td><td>${v}</td></tr>`).join('')}
  </tbody>
</table>

<!-- 2. Risk Assessment -->
<h1 class="sec">2&nbsp;&nbsp;Risk Assessment</h1>
${riskEvents.length === 0 ? '<p style="color:#9ca3af;font-style:italic">Nessun risk event definito.</p>' : `
<table class="data">
  <thead><tr><th>#</th><th>Descrizione rischio</th><th style="width:40px;text-align:center">L</th><th style="width:40px;text-align:center">I</th><th style="width:50px;text-align:center">Score</th><th style="width:90px">Livello</th></tr></thead>
  <tbody>${riskEvents.map((e,i) => `
    <tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
      <td style="text-align:center;font-weight:700">${i+1}</td>
      <td>${e.risk_description}</td>
      <td style="text-align:center">${e.likelihood}</td>
      <td style="text-align:center">${e.safety_impact}</td>
      <td style="text-align:center;font-weight:700">${e.calculated_risk}</td>
      <td>${riskBadge(e.calculated_risk_label)}</td>
    </tr>`).join('')}</tbody>
</table>`}

<!-- 3. Zone e Condotti -->
<h1 class="sec">3&nbsp;&nbsp;Zone e Condotti</h1>
<table class="data">
  <thead><tr><th>Zona</th><th>SL-T</th><th style="text-align:center">Controlli</th><th style="text-align:center">Copertura</th><th style="text-align:center">Gap</th></tr></thead>
  <tbody>${zones.map((z,i) => {
    const pct = z.controls_total > 0 ? Math.round((z.controls_covered/z.controls_total)*100) : 0
    const pctColor = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'
    return `<tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
      <td><strong>${z.name}</strong></td>
      <td><strong>${z.security_level || '—'}</strong></td>
      <td style="text-align:center">${z.controls_covered}/${z.controls_total}</td>
      <td style="text-align:center;font-weight:700;color:${pctColor}">${pct}%</td>
      <td style="text-align:center;font-weight:700;color:${z.gap_count===0?'#16a34a':'#dc2626'}">${z.gap_count}</td>
    </tr>`
  }).join('')}</tbody>
</table>

<!-- 4. Gap Analysis -->
<h1 class="sec">4&nbsp;&nbsp;Gap Analysis</h1>
${zones.flatMap(z => z.gap_controls).length === 0
  ? '<p style="color:#9ca3af;font-style:italic">Nessun gap residuo.</p>'
  : zones.filter(z => z.gap_controls.length > 0).map(z => `
    <h2 class="sec">${z.name}</h2>
    <table class="data">
      <thead><tr><th style="width:80px">SR</th><th>Titolo</th><th style="width:80px">Categoria</th></tr></thead>
      <tbody>${z.gap_controls.map((g,i) => `
        <tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
          <td style="font-family:monospace;font-weight:600">${g.sr_code}</td>
          <td>${g.title}</td>
          <td style="font-size:10px">${g.category||'—'}</td>
        </tr>`).join('')}</tbody>
    </table>`).join('')}

<!-- 5. Policy di Sicurezza -->
<h1 class="sec">5&nbsp;&nbsp;Policy di Sicurezza${finalPolicies.length > 0 ? ' (Finalizzate)' : ''}</h1>
${displayPolicies.length === 0
  ? '<p style="color:#9ca3af;font-style:italic">Nessuna policy generata.</p>'
  : displayPolicies.map(p => {
      let params = {}
      try { params = JSON.parse(p.parameters_json || '{}') } catch(_) {}
      return `<div style="margin-bottom:16px;page-break-inside:avoid">
        <div style="font-size:12px;font-weight:700;margin-bottom:4px">${params.sr_code || ''} — ${params.title || ''} ${p.final ? '<span style="color:#16a34a;font-size:10px">✓ Finalizzata</span>' : ''}</div>
        <div class="policy-box">${(p.policy_markdown||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
      </div>`
    }).join('')}

<!-- 6. Asset Inventory -->
<h1 class="sec">6&nbsp;&nbsp;Asset Inventory</h1>
${assets.length === 0
  ? '<p style="color:#9ca3af;font-style:italic">Nessun asset rilevato.</p>'
  : `<table class="data">
      <thead><tr><th>IP</th><th>Vendor</th><th>Tipo</th><th>Modello</th><th>Zona</th><th>Criticità</th></tr></thead>
      <tbody>${assets.map((a,i) => `
        <tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
          <td style="font-family:monospace;font-weight:600">${a.ip}</td>
          <td>${a.vendor||'—'}</td><td>${a.device_type||'—'}</td>
          <td>${a.device_model||'—'}</td><td>${a.security_zone||'—'}</td>
          <td style="text-align:center">${badge(a.criticality||'medium')}</td>
        </tr>`).join('')}</tbody>
    </table>`}

<!-- 7. Finding di Sicurezza -->
${findings.length > 0 ? `
<h1 class="sec">7&nbsp;&nbsp;Finding di Sicurezza</h1>
<table class="data">
  <thead><tr><th>#</th><th>Titolo</th><th style="width:75px">Severity</th><th style="width:50px;text-align:center">CVSS</th><th>Remediation</th></tr></thead>
  <tbody>${findings.map((f,i) => `
    <tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
      <td style="text-align:center;font-weight:700">F-${String(i+1).padStart(3,'0')}</td>
      <td>${f.title}</td>
      <td>${badge(f.severity)}</td>
      <td style="text-align:center;font-family:monospace">${f.cvss_score||'—'}</td>
      <td style="font-size:11px">${(f.remediation||'—').slice(0,80)}</td>
    </tr>`).join('')}</tbody>
</table>` : ''}

</div><!-- /page -->
</body>
</html>`

  const ts = Date.now()
  const safeName = (assessment.suc_name || assessment.name).replace(/[^a-z0-9]/gi, '_')
  const htmlPath = path.join(REPORTS_DIR, `wizard_${safeName}_${ts}.html`)
  fs.writeFileSync(htmlPath, html)

  const pdfPath = path.join(REPORTS_DIR, `wizard_${safeName}_${ts}.pdf`)
  await generatePdf(path.resolve(htmlPath), pdfPath, logoBase64)

  return { filePath: pdfPath, fileName: `wizard-report-${safeName}.pdf`, mimeType: 'application/pdf' }
}

module.exports = { generateReport, generateWizardPdf }
