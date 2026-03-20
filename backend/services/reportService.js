const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const db = require('../db/database')

const ASSETS_DIR = path.join(__dirname, '../../assets')
const REPORTS_DIR = path.join(__dirname, '../reports/output')

function getLogoLightSvg() {
  const p = path.join(ASSETS_DIR, 'logo-tecnopack-light.svg')
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null
}

function getLogoInlineForPdf() {
  const svg = getLogoLightSvg()
  if (!svg) return '<span style="font-size:24px;font-weight:bold;color:#2e9650">TECNOPACK</span>'
  return svg.replace('<svg ', '<svg height="60" ')
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

  const svgBarWidth = 300
  const maxCount = Math.max(critCount, highCount, medCount, lowCount, 1)
  const barScale = svgBarWidth / maxCount

  const logoHtml = getLogoInlineForPdf()

  const assetRows = assets.map(a => {
    const ports = (portsMap[a.id] || []).map(p => `${p.port}/${p.protocol}`).join(', ')
    return `<tr>
      <td>${a.ip}</td>
      <td>${a.mac || '—'}</td>
      <td>${a.vendor || '—'}</td>
      <td>${a.device_type || '—'}</td>
      <td>${a.device_model || '—'}</td>
      <td>${a.security_zone || '—'}</td>
      <td><span style="color:${a.criticality === 'high' ? '#dc2626' : a.criticality === 'medium' ? '#d97706' : '#16a34a'};font-weight:600">${(a.criticality || 'medium').toUpperCase()}</span></td>
      <td style="font-size:11px">${ports}</td>
      <td style="font-size:11px">${a.notes || ''}</td>
    </tr>`
  }).join('')

  const findingsSections = findings.map((f, i) => {
    const srList = (() => { try { return JSON.parse(f.iec62443_sr || '[]') } catch (e) { return [] } })()
    return `
    <div class="finding" style="border-left: 4px solid ${severityColor(f.severity)};background:${severityBg(f.severity)};margin:16px 0;padding:16px;border-radius:4px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <span style="background:${severityColor(f.severity)};color:white;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:700;text-transform:uppercase">${f.severity}</span>
        <strong>F-${String(i + 1).padStart(3, '0')} — ${f.title}</strong>
        <span style="margin-left:auto;font-size:12px;color:#6b7280">CVSS ${f.cvss_score || 'N/A'}</span>
      </div>
      <p style="margin:8px 0;color:#374151">${f.description}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <div>
          <strong style="font-size:12px;color:#6b7280">IP AFFETTI:</strong>
          <p style="margin:4px 0;font-family:monospace;font-size:13px">${f.asset_ip || '—'}</p>
          <strong style="font-size:12px;color:#6b7280">SR IEC 62443:</strong>
          <p style="margin:4px 0;font-size:13px">${srList.join(', ')}</p>
          <strong style="font-size:12px;color:#6b7280">CVSS Vector:</strong>
          <p style="margin:4px 0;font-family:monospace;font-size:11px">${f.cvss_vector || '—'}</p>
        </div>
        <div>
          <strong style="font-size:12px;color:#6b7280">REMEDIATION (${f.remediation_priority}):</strong>
          <p style="margin:4px 0;font-size:13px;white-space:pre-line">${f.remediation || '—'}</p>
        </div>
      </div>
      ${f.evidence ? `<details style="margin-top:12px"><summary style="cursor:pointer;font-size:12px;color:#6b7280">Evidence</summary><pre style="margin-top:8px;padding:8px;background:#f3f4f6;border-radius:4px;font-size:11px;overflow-x:auto">${f.evidence}</pre></details>` : ''}
    </div>`
  }).join('')

  // SVG Zone Map
  const zoneColors = {
    'PLC Zone': '#3b82f6',
    'HMI Zone': '#22c55e',
    'Infrastructure Zone': '#06b6d4',
    'Remote Access Zone': '#f97316',
    'Unclassified': '#6b7280'
  }
  const zoneList = [...new Set(assets.map(a => a.security_zone).filter(Boolean))]
  const zoneBoxes = zoneList.map((zone, i) => {
    const x = 20 + (i % 3) * 220
    const y = 20 + Math.floor(i / 3) * 120
    const color = zoneColors[zone] || '#6b7280'
    const zoneAssets = assets.filter(a => a.security_zone === zone)
    return `
      <rect x="${x}" y="${y}" width="200" height="100" rx="8" fill="${color}22" stroke="${color}" stroke-width="2"/>
      <text x="${x + 100}" y="${y + 20}" text-anchor="middle" font-weight="bold" font-size="13" fill="${color}">${zone}</text>
      <text x="${x + 100}" y="${y + 38}" text-anchor="middle" font-size="11" fill="#374151">${zoneAssets.length} asset</text>
      ${zoneAssets.slice(0, 3).map((a, ai) =>
        `<text x="${x + 10}" y="${y + 55 + ai * 14}" font-size="10" fill="#4b5563">${a.ip} (${a.device_type || '?'})</text>`
      ).join('')}
      ${zoneAssets.length > 3 ? `<text x="${x + 10}" y="${y + 55 + 3 * 14}" font-size="10" fill="#9ca3af">+${zoneAssets.length - 3} altri...</text>` : ''}
    `
  }).join('')

  const svgHeight = Math.max(200, Math.ceil(zoneList.length / 3) * 130 + 40)

  // SR Compliance table (subset of IEC 62443-3-3)
  const srMapping = [
    { sr: 'SR 1.1', title: 'Human user identification and authentication' },
    { sr: 'SR 1.2', title: 'Software process and device identification and authentication' },
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
  for (const f of findings) {
    try {
      const srs = JSON.parse(f.iec62443_sr || '[]')
      srs.forEach(sr => violatedSRs.add(sr))
    } catch (e) {}
  }

  const srRows = srMapping.map(({ sr, title }) => {
    const violated = violatedSRs.has(sr)
    const status = violated ? 'Non Conforme' : 'Conforme'
    const statusColor = violated ? '#dc2626' : '#16a34a'
    const statusBg = violated ? '#fef2f2' : '#f0fdf4'
    return `<tr>
      <td style="font-family:monospace;font-weight:600">${sr}</td>
      <td>${title}</td>
      <td style="background:${statusBg};color:${statusColor};font-weight:600;text-align:center">${status}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OT Security Assessment Report — ${assessment.name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; background: #fff; }
  .cover { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 60px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%); color: white; text-align: center; page-break-after: always; }
  .cover h1 { font-size: 36px; margin: 24px 0 8px; }
  .cover h2 { font-size: 20px; font-weight: 400; opacity: 0.8; margin-bottom: 40px; }
  .cover table { border-collapse: collapse; text-align: left; margin: 0 auto; }
  .cover td { padding: 6px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .cover td:first-child { opacity: 0.7; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; }
  .cover td:last-child { font-weight: 600; }
  .cover-footer { margin-top: 60px; opacity: 0.6; font-size: 13px; }
  .page { max-width: 1100px; margin: 0 auto; padding: 40px 40px; }
  h1.section { font-size: 28px; color: #1e3a5f; border-bottom: 3px solid #2e9650; padding-bottom: 12px; margin: 40px 0 24px; }
  h2.section { font-size: 20px; color: #1e3a5f; margin: 28px 0 16px; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
  .summary-card { padding: 20px; border-radius: 8px; text-align: center; }
  .summary-card .count { font-size: 48px; font-weight: 800; line-height: 1; }
  .summary-card .label { font-size: 13px; margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  table.data { width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0; }
  table.data th { background: #1e3a5f; color: white; padding: 10px 12px; text-align: left; font-weight: 600; font-size: 12px; }
  table.data td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
  table.data tr:nth-child(even) td { background: #f9fafb; }
  .print-btn { position: fixed; bottom: 24px; right: 24px; background: #2e9650; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 100; }
  @media print {
    .print-btn { display: none; }
    .cover { page-break-after: always; }
    .finding { page-break-inside: avoid; }
    body { font-size: 12px; }
  }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div style="margin-bottom:32px">${logoHtml}</div>
  <h1>OT Security Assessment Report</h1>
  <h2>Conformità IEC 62443</h2>
  <table>
    <tr><td>Cliente</td><td>${client?.name || '—'}</td></tr>
    <tr><td>Impianto</td><td>${assessment.name}</td></tr>
    ${client?.address ? `<tr><td>Indirizzo</td><td>${client.address}, ${client.city}</td></tr>` : ''}
    ${client?.contact_name ? `<tr><td>Referente</td><td>${client.contact_name}</td></tr>` : ''}
    <tr><td>Assessor</td><td>${assessment.assessor || '—'}</td></tr>
    <tr><td>Data</td><td>${new Date(assessment.created_at).toLocaleDateString('it-IT')}</td></tr>
    <tr><td>Subnet analizzata</td><td>${assessment.subnet}</td></tr>
    <tr><td>SL Target IEC 62443</td><td>${assessment.iec62443_target_sl || 'SL-2'}</td></tr>
  </table>
  <div class="cover-footer">
    <p>Documento riservato — Tecnopack S.r.l.</p>
    <p>Generato da Tecnopack OT Security Dashboard v2.0</p>
  </div>
</div>

<div class="page">

<!-- EXECUTIVE SUMMARY -->
<h1 class="section">Executive Summary</h1>
<div class="summary-grid">
  <div class="summary-card" style="background:#eff6ff;color:#1e40af">
    <div class="count">${assets.length}</div>
    <div class="label">Asset trovati</div>
  </div>
  <div class="summary-card" style="background:#fef2f2;color:#dc2626">
    <div class="count">${critCount}</div>
    <div class="label">Critical</div>
  </div>
  <div class="summary-card" style="background:#fff7ed;color:#ea580c">
    <div class="count">${highCount}</div>
    <div class="label">High</div>
  </div>
  <div class="summary-card" style="background:#fffbeb;color:#d97706">
    <div class="count">${medCount}</div>
    <div class="label">Medium</div>
  </div>
</div>

<svg width="100%" height="120" viewBox="0 0 700 120" style="margin:16px 0">
  ${[
    { label: 'Critical', count: critCount, color: '#dc2626', y: 10 },
    { label: 'High', count: highCount, color: '#ea580c', y: 35 },
    { label: 'Medium', count: medCount, color: '#d97706', y: 60 },
    { label: 'Low', count: lowCount, color: '#16a34a', y: 85 },
  ].map(({ label, count, color, y }) => `
    <text x="0" y="${y + 14}" font-size="12" fill="#374151" font-family="sans-serif">${label}</text>
    <rect x="70" y="${y}" width="${Math.round(count * barScale)}" height="18" rx="3" fill="${color}"/>
    <text x="${72 + Math.round(count * barScale)}" y="${y + 14}" font-size="12" fill="${color}" font-weight="bold">${count}</text>
  `).join('')}
</svg>

<h2 class="section">Principali Gap di Conformità</h2>
<ul style="padding-left:20px;line-height:2">
  ${critCount > 0 ? `<li><strong>CRITICO:</strong> ${critCount} finding critici richiedono azione immediata (Telnet, accesso non autenticato)</li>` : ''}
  ${highCount > 0 ? `<li><strong>ALTO:</strong> Protocolli OT esposti senza autenticazione (FINS, EtherNet/IP, SMB)</li>` : ''}
  <li>Asset non documentati nell'inventario OT ufficiale</li>
  <li>Firmware e versioni software obsolete su infrastruttura di rete</li>
</ul>

<h2 class="section">Top 3 Raccomandazioni</h2>
<ol style="padding-left:20px;line-height:2">
  <li>Disabilitare <strong>Telnet</strong> su switch OT e aggiornare firmware HPE 2530</li>
  <li>Bloccare via ACL <strong>TCP/50000</strong> (B&R bilance) e <strong>FINS/9600</strong> (Omron PLC)</li>
  <li>Isolare e documentare i <strong>3 asset non inventariati</strong> (.10, .111, .121)</li>
</ol>

<!-- ASSET INVENTORY -->
<h1 class="section">Asset Inventory</h1>
<table class="data">
  <thead><tr>
    <th>IP</th><th>MAC</th><th>Vendor</th><th>Tipo</th><th>Modello</th>
    <th>Zona</th><th>Criticità</th><th>Porte</th><th>Note</th>
  </tr></thead>
  <tbody>${assetRows}</tbody>
</table>

<!-- FINDINGS -->
<h1 class="section">Security Findings (${findings.length})</h1>
${findingsSections || '<p style="color:#6b7280">Nessun finding rilevato.</p>'}

<!-- ZONE MAP -->
<h1 class="section">Zone &amp; Conduit Map</h1>
<svg width="100%" viewBox="0 0 700 ${svgHeight}" style="border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;margin:16px 0">
  ${zoneBoxes}
</svg>

<!-- IEC 62443 COMPLIANCE -->
<h1 class="section">Mappatura IEC 62443-3-3 SR</h1>
<table class="data">
  <thead><tr><th>SR</th><th>Titolo</th><th>Stato</th></tr></thead>
  <tbody>${srRows}</tbody>
</table>

<!-- REMEDIATION ROADMAP -->
<h1 class="section">Remediation Roadmap</h1>
<div style="margin:16px 0">
  ${['Immediate', 'Short-term', 'Long-term'].map(priority => {
    const pf = findings.filter(f => f.remediation_priority === priority)
    if (pf.length === 0) return ''
    const colors = { Immediate: '#dc2626', 'Short-term': '#d97706', 'Long-term': '#2563eb' }
    return `
      <div style="margin-bottom:16px">
        <h3 style="color:${colors[priority]};margin-bottom:8px">${priority} (${pf.length} finding)</h3>
        <ul style="padding-left:20px;line-height:1.8">
          ${pf.map(f => `<li>${f.title} — <em style="color:${severityColor(f.severity)}">${f.severity.toUpperCase()}</em></li>`).join('')}
        </ul>
      </div>`
  }).join('')}
</div>

</div><!-- /page -->

<button class="print-btn" onclick="window.print()">Stampa / Esporta PDF</button>
</body>
</html>`
}

async function generatePdf(htmlPath, pdfPath) {
  return new Promise((resolve, reject) => {
    // Try chromium first (installed on Kali)
    const chromiumPaths = [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/snap/bin/chromium'
    ]
    const fs2 = require('fs')
    const chromium = chromiumPaths.find(p => fs2.existsSync(p)) || 'chromium'

    const cmd = `${chromium} --headless --disable-gpu --no-sandbox --print-to-pdf="${pdfPath}" "file://${htmlPath}" 2>/dev/null`
    exec(cmd, { timeout: 60000 }, (err) => {
      if (err) {
        // Try weasyprint
        exec(`weasyprint "${htmlPath}" "${pdfPath}" 2>/dev/null`, { timeout: 60000 }, (err2) => {
          if (err2) reject(new Error('PDF generation failed: install weasyprint or chromium'))
          else resolve(pdfPath)
        })
      } else {
        resolve(pdfPath)
      }
    })
  })
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
    await generatePdf(path.resolve(htmlPath), pdfPath)
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
      try { srStr = JSON.parse(f.iec62443_sr || '[]').join(', ') } catch (e) {}
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

module.exports = { generateReport }
