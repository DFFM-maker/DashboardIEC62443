const { exec } = require('child_process')
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')
const analysisService = require('./analysisService')
const advisoryService = require('./advisoryService')

function emitLog(io, assessmentId, level, message) {
  console.log(`[${level.toUpperCase()}] ${message}`)
  if (io) {
    io.to(assessmentId).emit('log', { level, message, timestamp: new Date() })
  }
  db.run(
    'INSERT INTO scan_logs (id, assessment_id, level, message) VALUES (?,?,?,?)',
    [uuidv4(), assessmentId, level, message]
  )
}

function runCommand(cmd, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const proc = exec(cmd, { timeout }, (err, stdout, stderr) => {
      if (err && err.killed) {
        reject(new Error(`Timeout: ${cmd}`))
      } else {
        resolve({ stdout: stdout || '', stderr: stderr || '', code: err?.code || 0 })
      }
    })
  })
}

function parseNmapXml(xmlStr) {
  const hosts = []
  const hostBlocks = xmlStr.match(/<host[\s\S]*?<\/host>/g) || []

  for (const block of hostBlocks) {
    const statusMatch = block.match(/<status state="([^"]+)"/)
    if (!statusMatch || statusMatch[1] !== 'up') continue

    const addrMatch = block.match(/<address addr="([^"]+)" addrtype="ipv4"/)
    const macMatch = block.match(/<address addr="([^"]+)" addrtype="mac"/)
    const vendorMatch = block.match(/addrtype="mac" vendor="([^"]+)"/)

    const ip = addrMatch ? addrMatch[1] : null
    if (!ip) continue

    const ports = []
    const portBlocks = block.match(/<port[\s\S]*?<\/port>/g) || []
    for (const pb of portBlocks) {
      const portId = pb.match(/portid="(\d+)"/)
      const proto = pb.match(/protocol="([^"]+)"/)
      const state = pb.match(/<state state="([^"]+)"/)
      const service = pb.match(/<service name="([^"]+)"/)
      const version = pb.match(/version="([^"]+)"/)
      const product = pb.match(/product="([^"]+)"/)
      if (portId && state && state[1] === 'open') {
        ports.push({
          port: parseInt(portId[1]),
          protocol: proto ? proto[1] : 'tcp',
          service: service ? service[1] : '',
          version: [product?.[1], version?.[1]].filter(Boolean).join(' '),
          state: 'open'
        })
      }
    }

    // Hostname
    const hostnameMatch = block.match(/<hostname name="([^"]+)"/)

    hosts.push({
      ip,
      mac: macMatch ? macMatch[1] : null,
      vendor: vendorMatch ? vendorMatch[1] : null,
      hostname: hostnameMatch ? hostnameMatch[1] : null,
      ports
    })
  }

  return hosts
}

function guessDeviceType(host) {
  const vendor = (host.vendor || '').toLowerCase()
  const ports = host.ports.map(p => p.port)

  if (vendor.includes('omron') || vendor.includes('siemens') || vendor.includes('rockwell') || vendor.includes('schneider')) {
    return 'PLC'
  }
  if (vendor.includes('hakko') || vendor.includes('weintek') || vendor.includes('proface')) {
    return 'HMI'
  }
  if (vendor.includes('b&r') || vendor.includes('bernecker') || vendor.includes('idecon')) {
    return 'PLC'
  }
  if (vendor.includes('secomea') || vendor.includes('tosibox') || vendor.includes('ewon')) {
    return 'Router'
  }
  if (vendor.includes('hewlett') || vendor.includes('cisco') || vendor.includes('hirschmann')) {
    return 'Switch'
  }
  if (ports.includes(445) || ports.includes(135) || ports.includes(902)) {
    return 'Workstation'
  }
  return 'Unknown'
}

function guessZone(host) {
  const vendor = (host.vendor || '').toLowerCase()
  const ports = host.ports.map(p => p.port)

  if (vendor.includes('omron') || vendor.includes('b&r') || vendor.includes('idecon')) return 'PLC Zone'
  if (vendor.includes('hakko') || vendor.includes('weintek')) return 'HMI Zone'
  if (vendor.includes('secomea') || vendor.includes('tosibox')) return 'Remote Access Zone'
  if (vendor.includes('hewlett') || vendor.includes('cisco') || vendor.includes('hirschmann')) return 'Infrastructure Zone'
  return 'Unclassified'
}

async function runScan(assessmentId, subnet, io) {
  emitLog(io, assessmentId, 'info', `Avvio scansione subnet ${subnet}...`)

  // Update assessment status
  db.run('UPDATE assessments SET status = ? WHERE id = ?', ['scanning', assessmentId])

  try {
    // Phase 1: Host discovery
    emitLog(io, assessmentId, 'info', 'Fase 1/4: Host discovery (ARP scan)...')
    const discoveryXml = `/tmp/discovery_${assessmentId}.xml`
    await runCommand(
      `sudo nmap -sn ${subnet} -oX ${discoveryXml} --max-rate 100 2>/dev/null`,
      120000
    )

    const { stdout: discoveryContent } = await runCommand(`cat ${discoveryXml}`)
    const discoveredHosts = parseNmapXml(discoveryContent)
    emitLog(io, assessmentId, 'info', `  → ${discoveredHosts.length} host attivi trovati`)

    if (discoveredHosts.length === 0) {
      emitLog(io, assessmentId, 'warning', 'Nessun host trovato. Verifica subnet e connettività.')
      db.run('UPDATE assessments SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?', ['completed', assessmentId])
      return
    }

    // Phase 2: Port scan
    emitLog(io, assessmentId, 'info', 'Fase 2/4: Port scan su porte OT critiche...')
    const ipList = discoveredHosts.map(h => h.ip).join(',')
    const portscanXml = `/tmp/portscan_${assessmentId}.xml`
    await runCommand(
      `sudo nmap -sS -p 21,22,23,25,80,102,443,502,515,4840,8080,9600,20000,44818,50000 ` +
      `--max-rate 50 -T2 --open ${ipList} -oX ${portscanXml} 2>/dev/null`,
      240000
    )

    const { stdout: portscanContent } = await runCommand(`cat ${portscanXml}`)
    const scannedHosts = parseNmapXml(portscanContent)

    // Phase 3: Service detection
    emitLog(io, assessmentId, 'info', 'Fase 3/4: Service version detection...')
    const versionsXml = `/tmp/versions_${assessmentId}.xml`
    await runCommand(
      `sudo nmap -sV --version-intensity 5 -p 80,443,22,23,4840,9600,44818,50000,8080 ` +
      `--max-rate 30 -T2 ${ipList} -oX ${versionsXml} 2>/dev/null`,
      300000
    )
    const { stdout: versionsContent } = await runCommand(`cat ${versionsXml}`)
    const versionedHosts = parseNmapXml(versionsContent)

    // Merge port and version data
    const hostMap = {}
    for (const h of scannedHosts) {
      hostMap[h.ip] = { ...h }
    }
    for (const h of versionedHosts) {
      if (hostMap[h.ip]) {
        // Merge version info into ports
        for (const vp of h.ports) {
          const existing = hostMap[h.ip].ports.find(p => p.port === vp.port)
          if (existing && vp.version) existing.version = vp.version
        }
      }
    }
    // Merge discovery host info (MAC, vendor) for hosts not in portscan
    for (const dh of discoveredHosts) {
      if (!hostMap[dh.ip]) {
        hostMap[dh.ip] = { ...dh }
      } else {
        if (!hostMap[dh.ip].mac && dh.mac) hostMap[dh.ip].mac = dh.mac
        if (!hostMap[dh.ip].vendor && dh.vendor) hostMap[dh.ip].vendor = dh.vendor
      }
    }

    // Phase 4: Save to DB
    emitLog(io, assessmentId, 'info', 'Fase 4/4: Analisi e salvataggio risultati...')

    const savedAssets = []
    const portsMap = {}

    for (const [ip, host] of Object.entries(hostMap)) {
      // Skip Kali itself
      if (ip === '172.16.224.250') continue

      const assetId = uuidv4()
      const deviceType = guessDeviceType(host)
      const zone = guessZone(host)

      db.run(
        `INSERT INTO assets (id, assessment_id, ip, mac, vendor, device_type, security_zone, criticality, notes)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [assetId, assessmentId, ip, host.mac || null, host.vendor || null,
         deviceType, zone, 'medium', host.hostname ? `Hostname: ${host.hostname}` : '']
      )

      const portRows = []
      for (const port of (host.ports || [])) {
        const portId = uuidv4()
        db.run(
          `INSERT INTO open_ports (id, asset_id, port, protocol, service, version, state, is_required)
           VALUES (?,?,?,?,?,?,?,?)`,
          [portId, assetId, port.port, port.protocol, port.service, port.version, port.state, 0]
        )
        portRows.push({ ...port, id: portId, asset_id: assetId })
      }

      savedAssets.push({ id: assetId, ...host, device_type: deviceType, security_zone: zone })
      portsMap[assetId] = portRows
    }

    // Run analysis rules
    const findings = analysisService.analyze(savedAssets, portsMap)
    for (const finding of findings) {
      db.run(
        `INSERT INTO findings
         (id, assessment_id, asset_id, finding_code, title, description,
          cvss_score, cvss_vector, severity, iec62443_sr, iec62443_part,
          evidence, remediation, remediation_priority, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [uuidv4(), assessmentId, finding.asset_id, finding.finding_code,
         finding.title, finding.description, finding.cvss_score, finding.cvss_vector,
         finding.severity, finding.iec62443_sr, finding.iec62443_part,
         finding.evidence, finding.remediation, finding.remediation_priority, 'open']
      )
    }

    emitLog(io, assessmentId, 'info', `  → ${savedAssets.length} asset salvati, ${findings.length} finding rilevati`)

    // Fetch advisories
    const vendors = [...new Set(savedAssets.map(a => a.vendor).filter(Boolean))]
    if (vendors.length > 0) {
      emitLog(io, assessmentId, 'info', `Recupero advisory CISA/NVD per: ${vendors.join(', ')}...`)
      await advisoryService.fetchAndCacheAdvisories(vendors, io, assessmentId)
    }

    // Complete
    db.run(
      'UPDATE assessments SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', assessmentId]
    )
    emitLog(io, assessmentId, 'success', `Scansione completata: ${savedAssets.length} asset, ${findings.length} finding`)

    if (io) {
      io.to(assessmentId).emit('scan_complete', {
        assets: savedAssets.length,
        findings: findings.length
      })
    }

  } catch (err) {
    emitLog(io, assessmentId, 'error', `Errore durante la scansione: ${err.message}`)
    db.run('UPDATE assessments SET status = ? WHERE id = ?', ['error', assessmentId])
  }

  // Cleanup temp files
  try {
    await runCommand(`rm -f /tmp/discovery_${assessmentId}.xml /tmp/portscan_${assessmentId}.xml /tmp/versions_${assessmentId}.xml`)
  } catch (e) {}
}

module.exports = { runScan }
